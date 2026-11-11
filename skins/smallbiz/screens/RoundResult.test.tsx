// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { autoPick, commitFixes, createGame, nextRound } from '@engine/index';
import type { Game } from '@engine/types';
import { dental } from '@content/scenarios/dental';
import { manufacturer } from '@content/scenarios/manufacturer';
import { ecommerce } from '@content/scenarios/ecommerce';
import { copy } from '@content/copy/smallbiz';
import { dollars } from '@skins/shared/format';
import type { ScenarioPack } from '@content/types';
import { RoundResult } from './RoundResult';
import { BREAK_MS, MONTH_MS } from '../reveal';

const packs: ScenarioPack[] = [dental, manufacturer, ecommerce];

function played(pack: ScenarioPack, seed: number, strategy: 'blended' | 'none' | 'complianceFirst', rounds = 1): Game {
  let g = createGame(pack, seed);
  for (let r = 1; ; r++) {
    g = commitFixes(g, pack, strategy === 'none' ? [] : autoPick(g, strategy));
    if (r >= rounds || g.state.phase !== 'resolved') return g;
    g = nextRound(g, pack);
  }
}

/** Search packs and seeds for a first round matching the predicate. */
function find(pred: (g: Game) => boolean, minExploited = 0, maxRounds = 1) {
  for (const pack of packs) {
    for (let seed = 1; seed < 400; seed++) {
      for (const strategy of ['blended', 'none', 'complianceFirst'] as const) {
        for (let rounds = 1; rounds <= maxRounds; rounds++) {
          const g = played(pack, seed, strategy, rounds);
          const inc = g.state.history[g.state.history.length - 1]!.incidents;
          if (inc.filter((i) => i.cause === 'exploited').length >= minExploited && pred(g)) return { pack, game: g };
        }
      }
    }
  }
  throw new Error('no seed found');
}

const hasAudit = (g: Game) => g.state.history.at(-1)!.incidents.some((i) => i.cause === 'audit');
const exploitedOf = (g: Game) => g.state.history.at(-1)!.incidents.filter((i) => i.cause === 'exploited');

let root: HTMLDivElement;
const realMatchMedia = window.matchMedia;
let listeners: (() => void)[];
let mq: { matches: boolean };

function mockMotion(reduced: boolean) {
  listeners = [];
  mq = {
    matches: reduced,
    addEventListener: vi.fn((_t: string, fn: () => void) => listeners.push(fn)),
    removeEventListener: vi.fn((_t: string, fn: () => void) => {
      listeners = listeners.filter((l) => l !== fn);
    }),
  } as never;
  window.matchMedia = vi.fn(() => mq) as never;
}

function mount(pack: ScenarioPack, game: Game, onNext = vi.fn()) {
  act(() => {
    render(<RoundResult game={game} pack={pack} cashBefore={100000} onNext={onNext} />, root);
  });
  return onNext;
}

const buttons = () => Array.from(root.querySelectorAll('button'));
const byText = (t: string) => buttons().find((b) => b.textContent?.trim() === t);
const hits = () => root.querySelectorAll('li.hit:not(.hit--audit)').length;

beforeEach(() => {
  vi.useFakeTimers();
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  act(() => {
    render(null, root);
  });
  root.remove();
  window.matchMedia = realMatchMedia;
  vi.useRealTimers();
});

describe('RoundResult', () => {
  it('with reduced motion shows the whole summary at once', () => {
    const { pack, game } = find((g) => exploitedOf(g).length >= 1, 1);
    mockMotion(true);
    mount(pack, game);
    expect(hits()).toBe(exploitedOf(game).length);
    expect(byText(copy.reveal.next)).toBeTruthy();
    expect(byText(copy.reveal.skip)).toBeUndefined();
  });

  it('with motion on lists nothing at first, then reveals hits one by one, then Next', () => {
    const { pack, game } = find((g) => exploitedOf(g).length >= 2, 2);
    const total = exploitedOf(game).length;
    mockMotion(false);
    mount(pack, game);
    expect(hits()).toBe(0);
    expect(byText(copy.reveal.skip)).toBeTruthy();
    expect(byText(copy.reveal.next)).toBeUndefined();
    let last = 0;
    for (let i = 0; i < total; i++) {
      act(() => {
        vi.advanceTimersByTime(MONTH_MS + BREAK_MS);
      });
      expect(hits()).toBeGreaterThanOrEqual(last);
      last = hits();
    }
    expect(hits()).toBe(total);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(byText(copy.reveal.next)).toBeTruthy();
    expect(byText(copy.reveal.skip)).toBeUndefined();
  });

  it('reveals incrementally: first hit shows before the last', () => {
    const { pack, game } = find((g) => exploitedOf(g).length >= 2, 2);
    mockMotion(false);
    mount(pack, game);
    act(() => {
      vi.advanceTimersByTime(200 + MONTH_MS + 10);
    });
    expect(hits()).toBe(1);
  });

  it('Skip finishes at once and moves focus to Next', () => {
    const { pack, game } = find((g) => exploitedOf(g).length >= 1, 1);
    mockMotion(false);
    mount(pack, game);
    const skip = byText(copy.reveal.skip)!;
    skip.focus();
    act(() => {
      skip.click();
    });
    expect(hits()).toBe(exploitedOf(game).length);
    const next = byText(copy.reveal.next)!;
    expect(next).toBeTruthy();
    expect(document.activeElement).toBe(next);
    // The played-out schedule must not fire afterwards.
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(hits()).toBe(exploitedOf(game).length);
  });

  it('does not steal focus from another element when the reveal ends', () => {
    const { pack, game } = find((g) => exploitedOf(g).length >= 1, 1);
    mockMotion(false);
    mount(pack, game);
    const other = document.createElement('input');
    document.body.appendChild(other);
    other.focus();
    act(() => {
      byText(copy.reveal.skip)!.click();
    });
    expect(document.activeElement).toBe(other);
    other.remove();
  });

  it('finishes when reduced motion is switched on mid-reveal', () => {
    const { pack, game } = find((g) => exploitedOf(g).length >= 2, 2);
    mockMotion(false);
    mount(pack, game);
    act(() => {
      vi.advanceTimersByTime(200 + MONTH_MS + 10);
    });
    expect(byText(copy.reveal.next)).toBeUndefined();
    expect(listeners.length).toBeGreaterThan(0);
    mq.matches = true;
    act(() => {
      listeners.forEach((l) => l());
    });
    expect(hits()).toBe(exploitedOf(game).length);
    expect(byText(copy.reveal.next)).toBeTruthy();
    expect(byText(copy.reveal.skip)).toBeUndefined();
  });

  it('unmounting mid-reveal leaves no timers firing', () => {
    const { pack, game } = find((g) => exploitedOf(g).length >= 1, 1);
    mockMotion(false);
    mount(pack, game);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    act(() => {
      render(null, root);
    });
    expect(vi.getTimerCount()).toBe(0);
    expect(() => vi.advanceTimersByTime(20000)).not.toThrow();
    expect(root.innerHTML).toBe('');
    expect(listeners.length).toBe(0);
  });

  it('shows the audit row once done, and not before', () => {
    const { pack, game } = find(hasAudit, 0, 8);
    mockMotion(false);
    mount(pack, game);
    expect(root.querySelector('.hit--audit')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(30000);
    });
    const row = root.querySelector('.hit--audit')!;
    expect(row).toBeTruthy();
    expect(row.textContent).toContain(pack.meta.audit.label);
  });

  it('shows the audit row at once with reduced motion', () => {
    const { pack, game } = find(hasAudit, 0, 8);
    mockMotion(true);
    mount(pack, game);
    expect(root.querySelector('.hit--audit')).toBeTruthy();
  });

  it('shows the emergency line when debt is owed, and calls onNext on click', () => {
    const { pack, game } = find((g) => g.state.emergencyDebt > 0 && g.state.phase !== 'finished', 1);
    mockMotion(true);
    const onNext = mount(pack, game);
    expect(root.textContent).toContain(copy.reveal.emergencyNext(game.state.emergencyDebt));
    act(() => {
      byText(copy.reveal.next)!.click();
    });
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('leads the summary with what the quarter cost', () => {
    const { pack, game } = find((g) => exploitedOf(g).length >= 1, 1);
    mockMotion(true);
    mount(pack, game);
    const lost = exploitedOf(game).reduce((s, i) => s + i.impact.dollars, 0) +
      game.state.history.at(-1)!.incidents.filter((i) => i.cause === 'audit').reduce((s, i) => s + i.impact.dollars, 0);
    const first = root.querySelector('.reveal__done')!.firstElementChild!;
    expect(first.textContent).toBe(copy.reveal.quarterLost(dollars(lost)));
  });

  it('says so when the audit ran and passed, and not otherwise', () => {
    const auditRan = (g: Game) => g.state.modifiers.some((m) => m.effect.kind === 'audit' && m.expiresAfterRound >= g.state.round);
    // Take a failed audit and strip the incident: the questionnaire ran and found nothing.
    const failed = find((g) => auditRan(g) && hasAudit(g), 0, 8);
    const { pack } = failed;
    const history = failed.game.state.history.map((r, i, all) =>
      i === all.length - 1 ? { ...r, incidents: r.incidents.filter((x) => x.cause !== 'audit') } : r);
    const game: Game = { ...failed.game, state: { ...failed.game.state, history } };
    mockMotion(true);
    mount(pack, game);
    expect(root.querySelector('.reveal__done')!.textContent).toContain(copy.reveal.auditPassed);
    act(() => {
      render(null, root);
    });
    const quiet = find((g) => !auditRan(g) && !hasAudit(g));
    mount(quiet.pack, quiet.game);
    expect(root.textContent).not.toContain(copy.reveal.auditPassed);
  });

  it('keeps Skip out of the live region and announces a summary once done', () => {
    const { pack, game } = find((g) => exploitedOf(g).length >= 1, 1);
    mockMotion(false);
    mount(pack, game);
    const status = root.querySelector('[role="status"]')!;
    expect(status.textContent).toBe('');
    expect(status.contains(byText(copy.reveal.skip)!)).toBe(false);
    expect(root.querySelectorAll('[role="status"]').length).toBe(1);
    act(() => {
      byText(copy.reveal.skip)!.click();
    });
    expect(root.querySelector('[role="status"]')).toBe(status);
    expect(status.textContent).toContain(copy.reveal.doneSummary(exploitedOf(game).length, status.textContent!.match(/\$[\d,]+/)![0]));
  });

  it('shows the quiet message when nothing broke', () => {
    const { pack, game } = find((g) => exploitedOf(g).length === 0 && !hasAudit(g));
    mockMotion(true);
    mount(pack, game);
    expect(root.textContent).toContain(copy.reveal.quiet);
    expect(hits()).toBe(0);
  });
});
