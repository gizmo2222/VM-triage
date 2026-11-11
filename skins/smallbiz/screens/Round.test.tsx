// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { autoPick, commitFixes, createGame, nextRound, rankBacklog } from '@engine/index';
import type { Game } from '@engine/index';
import type { Asset } from '@engine/index';
import { getPack } from '@content/index';
import { copy } from '@content/copy/smallbiz';
import { Round } from './Round';

const pack = getPack('dental')!;
let root: HTMLDivElement;
let onCommit: ReturnType<typeof vi.fn<(ids: string[]) => void>>;
const origMatchMedia = window.matchMedia;

function mount(seed = 7, debug = false, given?: Game) {
  const game = given ?? createGame(pack, seed);
  act(() => {
    render(
      <Round game={game} pack={pack} cash={pack.meta.cashOnHand} cashPrev={pack.meta.cashOnHand} debug={debug} onCommit={onCommit} />,
      root,
    );
  });
  return game;
}
const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
const qa = (sel: string) => [...root.querySelectorAll<HTMLElement>(sel)];
const click = (el: Element | null | undefined) => {
  expect(el).toBeTruthy();
  act(() => {
    (el as HTMLElement).click();
  });
};
const press = (el: Element, key: string) =>
  act(() => {
    el.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
const openAsset = (id: string) => click(q(`.tile[data-asset="${id}"]`));
const left = () => Number(/(\d+) of \d+ left/.exec(q('.meter__value')!.textContent!)![1]);
const cardTitles = () => qa('.fcard__headline').map((e) => e.textContent);
const headline = (f: { headline?: string; plainTitle: string }) => f.headline ?? f.plainTitle;
const chipNamed = (name: string) => qa('.chips .chip').find((c) => c.textContent === name)!;
const cardFor = (f: { headline?: string; plainTitle: string }) =>
  qa('.fcard__main').find((b) => b.querySelector('.fcard__headline')!.textContent === headline(f))!;

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  }) as unknown as typeof window.matchMedia;
  root = document.createElement('div');
  document.body.appendChild(root);
  onCommit = vi.fn();
});

afterEach(() => {
  act(() => {
    render(null, root);
  });
  root.remove();
  window.matchMedia = origMatchMedia;
});

describe('Round', () => {
  it('starts with a full budget, no panel and a skip button', () => {
    mount();
    expect(q('.meter__value')!.textContent).toBe(`${copy.round.pointsLabel}: ${copy.round.points(5, 5)}`);
    expect(q('.meter')!.hasAttribute('aria-label')).toBe(false);
    expect(q('.panel')).toBeNull();
    expect(q('.panel-empty')).toBeTruthy();
    expect(q('.commit-bar .btn')!.textContent).toBe(copy.round.commit(0));
    expect(q('.picks')).toBeNull();
  });

  it('toggling a card picks then unpicks it and updates points left', () => {
    const game = mount();
    const f = game.state.backlog.find((x) => x.fixCost <= 5)!;
    openAsset(f.assetId);
    click(cardFor(f));
    expect(cardFor(f).getAttribute('aria-pressed')).toBe('true');
    expect(left()).toBe(5 - f.fixCost);
    expect(q('.picks')).toBeTruthy();
    expect(q('.commit-bar .btn')!.textContent).toBe(copy.round.commit(1));
    click(cardFor(f));
    expect(cardFor(f).getAttribute('aria-pressed')).toBe('false');
    expect(left()).toBe(5);
    expect(q('.picks')).toBeNull();
  });

  it('refuses a pick that does not fit the remaining points', () => {
    const game = mount();
    // Fill the budget greedily, one asset panel at a time.
    for (const a of game.state.assets) {
      openAsset(a.id);
      for (const b of qa('.fcard__main')) {
        if (b.getAttribute('aria-disabled') !== 'true' && b.getAttribute('aria-pressed') === 'false') click(b);
      }
    }
    expect(left()).toBeGreaterThanOrEqual(0);
    let refused: HTMLElement | undefined;
    for (const a of game.state.assets) {
      openAsset(a.id);
      refused = qa('.fcard__main').find((b) => b.getAttribute('aria-disabled') === 'true');
      if (refused) break;
    }
    expect(refused).toBeTruthy();
    const before = left();
    const picksBefore = qa('.pick').length;
    expect(refused!.textContent).toContain(copy.round.tooExpensive);
    click(refused);
    expect(left()).toBe(before);
    expect(qa('.pick').length).toBe(picksBefore);
  });

  it('commit passes exactly the picked ids', () => {
    const game = mount();
    const f = game.state.backlog.find((x) => x.fixCost <= 5)!;
    openAsset(f.assetId);
    click(cardFor(f));
    click(q('.commit-bar .btn'));
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith([f.id]);
  });

  it('skipping with no picks needs a second tap, and picking resets the confirm', () => {
    const game = mount();
    const btn = q('#commit')!;
    click(btn);
    expect(onCommit).not.toHaveBeenCalled();
    expect(btn.textContent).toBe(copy.round.skipConfirm);
    expect(q('.commit-bar__hint')!.textContent).toBe(copy.round.skipHint(5));
    click(btn);
    expect(onCommit).toHaveBeenCalledWith([]);
    const f = game.state.backlog.find((x) => x.fixCost <= 5)!;
    onCommit.mockClear();
    openAsset(f.assetId);
    click(cardFor(f));
    click(cardFor(f));
    expect(btn.textContent).toBe(copy.round.commit(0));
    click(btn);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('says nothing else fits when points remain but no card is cheap enough', () => {
    const base = createGame(pack, 7);
    const costly = base.state.backlog.filter((f) => f.assetId === base.state.assets[0]!.id).slice(0, 2);
    const game = {
      ...base,
      state: { ...base.state, backlog: costly.map((f, i) => ({ ...f, fixCost: i === 0 ? 3 : 4 })) },
    };
    mount(7, false, game);
    expect(q('.commit-bar__hint')!.textContent).toBe(copy.round.commitHint(5));
    openAsset(costly[0]!.assetId);
    click(qa('.fcard__main')[0]);
    expect(q('.commit-bar__hint')!.textContent).toBe(copy.round.nothingFits(2));
  });

  it('commit with no picks passes an empty list after confirming', () => {
    mount();
    click(q('.commit-bar .btn'));
    click(q('.commit-bar .btn'));
    expect(onCommit).toHaveBeenCalledWith([]);
  });

  it('shows a still-on slip for a two-quarter event in its second quarter', () => {
    for (let seed = 1; seed < 200; seed++) {
      let g = createGame(pack, seed);
      g = nextRound(commitFixes(g, pack, []), pack);
      if ((g.state.currentEvent as { duration?: number } | undefined)?.duration !== 2) continue;
      g = nextRound(commitFixes(g, pack, []), pack);
      mount(seed, false, g);
      const ev = pack.events.find((e) => e.duration === 2 && g.state.history.some((h) => h.eventId === e.id))!;
      const slips = qa('.slip');
      expect(slips.some((s) => s.textContent!.includes(copy.round.stillOn(ev.plainTitle)))).toBe(true);
      return;
    }
    throw new Error('no seed drew a two-quarter event in round 2');
  });

  it('a new event slip opens by default', () => {
    const g = nextRound(commitFixes(createGame(pack, 3), pack, []), pack);
    mount(3, false, g);
    expect(q<HTMLDetailsElement>('.slip')!.open).toBe(true);
  });

  it('the Go to Fix link focuses the commit button', () => {
    const game = mount();
    openAsset(game.state.assets[0]!.id);
    click(qa('.panel__head a').find((a) => a.textContent === copy.round.goToFix));
    expect(document.activeElement).toBe(q('#commit'));
  });

  it('an asset with nothing open shows the clean note', () => {
    const game = mount();
    const clean = game.state.assets.find((a) => !game.state.backlog.some((f) => f.assetId === a.id));
    if (!clean) return;
    openAsset(clean.id);
    expect(q('.panel .small:not(.muted)')!.textContent).toBe(copy.round.panelClean);
    expect(q('.fcards')).toBeNull();
  });

  it('a sort chip picks what autoPick would and marks itself pressed', () => {
    const game = mount();
    const chip = chipNamed('Cheapest');
    click(chip);
    const ids = autoPick(game, 'cheapestFirst');
    expect(ids.length).toBeGreaterThan(0);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(qa('.pick').length).toBe(ids.length);
    click(q('.commit-bar .btn'));
    expect([...onCommit.mock.calls[0]![0]].sort()).toEqual([...ids].sort());
  });

  it('a sort chip reorders the cards in an open panel', () => {
    const game = mount();
    const ranked = rankBacklog(game, 'cheapestFirst').map((f) => f.id);
    const asset = game.state.assets.find((a) => game.state.backlog.filter((f) => f.assetId === a.id).length > 1)!;
    openAsset(asset.id);
    click(chipNamed('Cheapest'));
    const expected = ranked
      .map((id) => game.state.backlog.find((f) => f.id === id)!)
      .filter((f) => f.assetId === asset.id)
      .map(headline);
    expect(cardTitles()).toEqual(expected);
  });

  it('removing a pick clears the pressed chip', () => {
    const game = mount();
    const chip = chipNamed('Scariest');
    click(chip);
    const n = autoPick(game, 'severityFirst').length;
    click(q('.pick'));
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    expect(qa('.pick').length).toBe(n - 1);
  });

  it('Clear empties picks, restores the budget and hides itself', () => {
    mount();
    expect(qa('.chip--ghost').length).toBe(0);
    click(qa('.chips .chip')[0]);
    expect(left()).toBeLessThan(5);
    click(q('.chip--ghost'));
    expect(left()).toBe(5);
    expect(q('.picks')).toBeNull();
    expect(q('.chip--ghost')).toBeNull();
    expect(qa('.chips .chip').every((c) => c.getAttribute('aria-pressed') === 'false')).toBe(true);
    click(q('.commit-bar .btn'));
    click(q('.commit-bar .btn'));
    expect(onCommit).toHaveBeenCalledWith([]);
  });

  it('Clear returns focus to the first sort chip', () => {
    mount();
    click(qa('.chips .chip')[0]);
    click(q('.chip--ghost'));
    expect(document.activeElement).toBe(qa('.chips .chip')[0]);
  });

  it('opens a panel for an asset, switches assets, and closes on a second tap', () => {
    const game = mount();
    const [a, b] = game.state.assets as [Asset, Asset];
    openAsset(a.id);
    expect(q('.panel__title')!.textContent).toContain(a.name);
    expect(q(`.tile[data-asset="${a.id}"]`)!.getAttribute('aria-expanded')).toBe('true');
    expect(q(`.tile[data-asset="${a.id}"]`)!.getAttribute('aria-controls')).toBe(q('.panel')!.id);
    const n = game.state.backlog.filter((f) => f.assetId === a.id).length;
    expect(qa('.fcard').length).toBe(n);
    openAsset(b.id);
    expect(q('.panel__title')!.textContent).toContain(b.name);
    openAsset(b.id);
    expect(q('.panel')).toBeNull();
  });

  it('Close button closes the panel and returns focus to its tile', () => {
    const game = mount();
    const a = game.state.assets[0]!;
    openAsset(a.id);
    click(qa('.panel__head .btn').find((x) => x.textContent === copy.round.close));
    expect(q('.panel')).toBeNull();
    expect(document.activeElement).toBe(q(`.tile[data-asset="${a.id}"]`));
  });

  it('Escape inside the panel closes it, other keys do not', () => {
    const game = mount();
    openAsset(game.state.assets[0]!.id);
    press(q('.panel__title')!, 'Enter');
    expect(q('.panel')).toBeTruthy();
    press(q('.panel__title')!, 'Escape');
    expect(q('.panel')).toBeNull();
  });

  it('opening a panel moves focus to its title', () => {
    const game = mount();
    openAsset(game.state.assets[0]!.id);
    expect(document.activeElement).toBe(q('#panel-title'));
  });

  it('removing a pick from the strip unpicks it and moves focus to the next pick', () => {
    mount();
    click(chipNamed('Cheapest'));
    const n = qa('.pick').length;
    expect(n).toBeGreaterThan(1);
    click(qa('.pick')[0]);
    expect(qa('.pick').length).toBe(n - 1);
    expect(document.activeElement).toBe(qa('.pick')[0]);
  });

  it('removing the only pick focuses the commit button', () => {
    const game = mount();
    const f = game.state.backlog.find((x) => x.fixCost <= 5)!;
    openAsset(f.assetId);
    click(cardFor(f));
    click(q('.pick'));
    expect(document.activeElement).toBe(q('.commit-bar .btn'));
  });

  it('the ? button on a card reveals and hides the plain explanation', () => {
    const game = mount();
    const f = game.state.backlog[0]!;
    openAsset(f.assetId);
    const more = cardFor(f).closest('.fcard')!.querySelector<HTMLElement>('.fcard__more')!;
    expect(more.getAttribute('aria-expanded')).toBe('false');
    expect(more.getAttribute('aria-label')).toBe(copy.round.more(headline(f)));
    expect(q('.fcard__detail')).toBeNull();
    click(more);
    expect(more.getAttribute('aria-expanded')).toBe('true');
    const detail = q('.fcard__detail')!;
    expect(detail.textContent).toBe(f.plainTitle);
    expect(more.getAttribute('aria-controls')).toBe(detail.id);
    click(more);
    expect(more.hasAttribute('aria-controls')).toBe(false);
    expect(q('.fcard__detail')).toBeNull();
  });

  it('shows hidden exploit odds only in debug mode', () => {
    const game = mount(7, false);
    const id = game.state.assets[0]!.id;
    openAsset(id);
    expect(q('.fcard__debug')).toBeNull();
    act(() => {
      render(null, root);
    });
    mount(7, true);
    openAsset(id);
    expect(q('.fcard__debug')!.textContent).toMatch(/^p \d+%$/);
  });

  it('shows first-round coaching that goes away after a pick', () => {
    mount();
    expect(q('.coach')!.textContent).toBe(copy.round.coach.tapRoom);
    click(qa('.chips .chip')[0]);
    expect(q('.coach')).toBeNull();
    expect(q('.commit-bar__hint')!.textContent).toBe(copy.round.coach.pressFix);
  });

  it('cost label on a pick matches the finding cost', () => {
    const game = mount();
    const f = game.state.backlog.find((x) => x.fixCost <= 5)!;
    openAsset(f.assetId);
    click(cardFor(f));
    expect(q('.pick__cost')!.textContent).toBe(copy.round.cost(f.fixCost));
  });
});
