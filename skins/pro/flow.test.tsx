// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { pro } from '@content/copy/pro';
import { getProPack, proPacks } from '@content/pro';
import { createGame, rankBacklog } from '@engine/index';
import { dailySeed, seedToParam } from '@skins/shared/seed';
import { App, resolveStart } from './App';

let root: HTMLDivElement;

const mount = async (url: string) => {
  window.history.replaceState(null, '', url);
  root = document.createElement('div');
  document.body.appendChild(root);
  await act(() => {
    render(<App />, root);
  });
};
const click = async (el: Element | null | undefined) => {
  expect(el).toBeTruthy();
  await act(() => {
    (el as HTMLElement).click();
  });
};
const buttonByText = (re: RegExp) => [...root.querySelectorAll('button')].find((b) => re.test(b.textContent ?? ''));
const play = () => buttonByText(new RegExp(`^${pro.intro.play}$`));
const h1 = () => root.querySelector('h1')?.textContent ?? '';
const pickMethod = async (label: string) => {
  const input = [...root.querySelectorAll<HTMLInputElement>('input[name="method"]')].find((i) =>
    (i.getAttribute('aria-label') ?? '').startsWith(label),
  );
  await click(input);
};
const checks = () => [...root.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]')];
const checkedIds = () => checks().filter((c) => c.checked).map((c) => c.id);
const commitBtn = () => root.querySelector<HTMLButtonElement>('.commit button')!;
const DAY = new Date('2026-03-04T12:00:00Z');

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
});
afterEach(() => {
  render(null, root);
  root.remove();
  vi.useRealTimers();
});

describe('pro App flow', () => {
  it('starts on the intro and shows an explicit seed as custom', async () => {
    await mount('/pro/?b=dental&s=7');
    expect(h1()).toBe(pro.intro.heading);
    expect(root.textContent).toContain(pro.intro.seedCustom(seedToParam(7)));
    expect(root.textContent).not.toContain('Daily seed');
  });

  it('defaults to the daily seed for the faked date and writes it to the URL', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(DAY);
    await mount('/pro/?b=dental');
    const want = seedToParam(dailySeed(DAY));
    expect(root.textContent).toContain(pro.intro.seedDaily(want));
    await click(play());
    expect(h1()).toContain('Sprint 1 of 8');
    expect(window.location.search).toContain(`s=${want}`);
  });

  it('an untouched daily box left open past UTC midnight starts the new day', async () => {
    const next = new Date('2026-03-05T00:00:05Z');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(DAY);
    await mount('/pro/?b=dental');
    vi.setSystemTime(next);
    await click(play());
    expect(window.location.search).toContain(`s=${seedToParam(dailySeed(next))}`);
  });

  it('resolveStart treats a missing seed as today and daily, an explicit one as custom', () => {
    expect(resolveStart(undefined, undefined, DAY)).toEqual({ seed: dailySeed(DAY), isDaily: true });
    expect(resolveStart(7, undefined, DAY)).toEqual({ seed: 7, isDaily: false });
    expect(resolveStart(7, true, DAY)).toEqual({ seed: 7, isDaily: true });
    const late = new Date('2026-03-04T23:59:59Z');
    expect(resolveStart(undefined, undefined, late).seed).toBe(dailySeed(late));
  });

  it('daily seed differs between days', async () => {
    const next = new Date('2026-03-05T12:00:00Z');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(next);
    await mount('/pro/?b=dental');
    expect(root.textContent).toContain(pro.intro.seedDaily(seedToParam(dailySeed(next))));
    expect(dailySeed(next)).not.toBe(dailySeed(DAY));
  });

  it('typing a different seed makes it custom and starts that seed', async () => {
    await mount('/pro/?b=dental');
    const input = root.querySelector<HTMLInputElement>('input[type="text"]')!;
    await act(() => {
      input.value = 'abc';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(root.textContent).toContain(pro.intro.seedCustom('abc'));
    expect(root.textContent).not.toContain('Daily seed');
    await click(play());
    expect(window.location.search).toContain('s=abc');
  });

  it('pack buttons toggle aria-pressed and the chosen pack is played', async () => {
    await mount('/pro/?b=dental&s=7');
    const picks = [...root.querySelectorAll<HTMLButtonElement>('.pickbtn')];
    expect(picks.length).toBe(proPacks.length);
    const other = picks.find((b) => b.getAttribute('aria-pressed') === 'false')!;
    await click(other);
    expect(other.getAttribute('aria-pressed')).toBe('true');
    expect(picks.filter((b) => b.getAttribute('aria-pressed') === 'true').length).toBe(1);
    await click(play());
    expect(window.location.search).not.toContain('b=dental');
  });

  it('method buttons fill picks, a manual toggle resets the method, None clears picks', async () => {
    await mount('/pro/?b=dental&s=7');
    await click(play());
    expect(checkedIds()).toEqual([]);
    expect(commitBtn().textContent).toBe(pro.round.commit(0));

    await pickMethod('CVSS-first');
    const cvss = checkedIds();
    expect(cvss.length).toBeGreaterThan(0);
    expect(commitBtn().textContent).toBe(pro.round.commit(cvss.length));
    // The table is reordered into the method's ranking.
    const ranked = rankBacklog(createGame(getProPack('dental')!, 7), 'severityFirst').map((f) => `pick-${f.id}`);
    expect(checks().map((c) => c.id)).toEqual(ranked);

    expect(root.querySelector('input[aria-label^="Cheapest-first"]')).toBeNull();
    await click(root.querySelector('.radio--more'));
    await pickMethod('Cheapest-first');
    const cheapest = checkedIds();
    expect(cheapest.length).toBeGreaterThan(0);

    // Manual toggle: uncheck one pick; the radio group drops back to None.
    await click(root.querySelector(`#${cheapest[0]}`));
    expect(checkedIds().length).toBe(cheapest.length - 1);
    expect(root.querySelector<HTMLInputElement>('input[name="method"]')!.checked).toBe(true);

    await pickMethod('EPSS-first');
    expect(checkedIds().length).toBeGreaterThan(0);
    await click(root.querySelector('input[name="method"]'));
    expect(checkedIds()).toEqual([]);
  });

  it('disables rows that no longer fit the capacity', async () => {
    await mount('/pro/?b=dental&s=7');
    await click(play());
    await pickMethod('SSVC-style');
    const left = root.querySelector('.stat--cap dd')!.textContent!;
    expect(left).toBe(pro.round.capacity(Number(/\d+/.exec(left)![0]), 5));
    for (const c of checks().filter((x) => !x.checked)) {
      expect(c.disabled).toBe(c.closest('tr')!.classList.contains('is-nofit'));
    }
  });

  it('plays eight sprints by method and reaches a report with the ground-truth table', async () => {
    await mount('/pro/?b=dental&s=7');
    await click(play());
    for (let sprint = 1; sprint <= 8; sprint++) {
      expect(h1()).toContain(`Sprint ${sprint} of 8`);
      await pickMethod('Blended');
      await click(commitBtn());
      expect(h1()).not.toContain(`Sprint ${sprint} of 8`);
      await click(root.querySelector('.btn--big'));
    }
    expect(h1()).toBe(pro.report.heading);
    expect(root.textContent).toContain(pro.report.seedLine('7', false));
    const rows = root.querySelectorAll('section[aria-labelledby="truth-title"] tbody tr');
    expect(rows.length).toBeGreaterThan(0);
    for (const tr of rows) expect(tr.querySelectorAll('td').length).toBe(4);
    expect(root.querySelector('.truth-summary')!.textContent).toMatch(/\d/);

    // Same seed again restarts at sprint 1 with the same URL seed.
    await click(buttonByText(new RegExp(pro.report.again)));
    expect(h1()).toContain('Sprint 1 of 8');
    expect(window.location.search).toContain('s=7');
  }, 60000);

  it('Different backlog on the report returns to the intro', async () => {
    await mount('/pro/?b=dental&s=7');
    await click(play());
    for (let i = 0; i < 8; i++) {
      await click(commitBtn());
      await click(root.querySelector('.btn--big'));
    }
    expect(h1()).toBe(pro.report.heading);
    await click(buttonByText(new RegExp(pro.report.other)));
    expect(h1()).toBe(pro.intro.heading);
  }, 60000);

  it('a playtest link on the daily seed marks the report as daily', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(DAY);
    const s = seedToParam(dailySeed(DAY));
    await mount(`/pro/?b=dental&s=${s}&auto=ssvc`);
    expect(h1()).toBe(pro.report.heading);
    expect(root.textContent).toContain(pro.report.seedLine(s, true));
  });
});
