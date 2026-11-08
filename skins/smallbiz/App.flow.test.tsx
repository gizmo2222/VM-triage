// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { copy } from '@content/copy/smallbiz';
import { allPacks, defaultPackId, getPack } from '@content/index';
import { App } from './App';

const realMatchMedia = window.matchMedia;
let root: HTMLDivElement;

function go(search: string) {
  window.history.replaceState(null, '', '/' + search);
}

async function mount() {
  root = document.createElement('div');
  document.body.appendChild(root);
  await act(() => {
    render(<App />, root);
  });
}

function button(label: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined;
}

async function click(el: Element | undefined) {
  expect(el).toBeTruthy();
  await act(() => {
    (el as HTMLElement).click();
  });
}

const h1 = () => root.querySelector('h1')?.textContent ?? '';
const onIntro = () => !!root.querySelector('.intro');
const onRound = () => /\d+ of \d+/.test(root.querySelector('.round-head, main')?.textContent ?? '') && !!button(copy.round.commit(0));
const onReport = () => !!button(copy.report.replaySame);

beforeEach(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }) as never;
  window.scrollTo = (() => {}) as never;
});

afterEach(() => {
  render(null, root);
  root.remove();
  window.matchMedia = realMatchMedia;
});

describe('App flow', () => {
  it('plays a whole game through the DOM, writing b and s to the URL', async () => {
    go('?b=dental&s=7');
    await mount();
    const pack = getPack('dental')!;
    expect(onIntro()).toBe(true);
    expect(h1()).toBe(pack.meta.name);

    await click(button(copy.intro.start));
    expect(onIntro()).toBe(false);
    const q = new URLSearchParams(window.location.search);
    expect(q.get('b')).toBe('dental');
    expect(q.get('s')).toBe('7');

    for (let round = 1; round <= pack.config.rounds; round++) {
      expect(root.textContent).toContain(`${pack.meta.roundLabel} ${round} of ${pack.config.rounds}`);
      expect(onRound()).toBe(true);
      await click(button(copy.round.commit(0)));
      // Result screen: round screen's commit button is gone, Next/Finish present.
      expect(button(copy.round.commit(0))).toBeUndefined();
      const next = button(copy.reveal.next) ?? button(copy.reveal.finish);
      expect(next).toBeTruthy();
      if (round < pack.config.rounds) expect(button(copy.reveal.next)).toBeTruthy();
      else expect(button(copy.reveal.finish)).toBeTruthy();
      await click(next);
    }
    expect(onReport()).toBe(true);
    expect(onRound()).toBe(false);
  });

  it('replay same code restarts at round 1 with the same seed; other business returns to the intro', async () => {
    go('?b=dental&s=7&auto=blended');
    await mount();
    expect(onReport()).toBe(true);
    await click(button(copy.report.replaySame));
    expect(root.textContent).toContain(`${getPack('dental')!.meta.roundLabel} 1 of`);
    expect(new URLSearchParams(window.location.search).get('s')).toBe('7');
  });

  it('report offers a way back to the intro', async () => {
    go('?b=dental&s=7&auto=blended');
    await mount();
    await click(button(copy.report.replayOther));
    expect(onIntro()).toBe(true);
  });

  it('a playtest link with auto lands on the report card', async () => {
    go('?b=dental&s=7&auto=blended');
    await mount();
    expect(onReport()).toBe(true);
    expect(onIntro()).toBe(false);
  });

  it('a partial fix script stops on the round screen', async () => {
    go('?b=dental&s=7&fix=q1:wifi-password');
    await mount();
    expect(onIntro()).toBe(false);
    expect(root.textContent).toContain(' 2 of ');
    expect(onReport()).toBe(false);
  });

  it('an unknown ?b= falls back to the default pack without throwing', async () => {
    go('?b=nonsense&s=7');
    await mount();
    expect(onIntro()).toBe(true);
    expect(h1()).toBe(getPack(defaultPackId)!.meta.name);
    expect(new URLSearchParams(window.location.search).get('b')).toBe(defaultPackId);
  });

  it('an unknown ?b= with auto still falls back to the default pack and plays', async () => {
    go('?b=nonsense&s=7&auto=blended');
    await mount();
    expect(onReport()).toBe(true);
  });

  it('the business picker changes the pack shown and the pack started', async () => {
    go('?b=dental&s=7');
    await mount();
    const other = allPacks.find((p) => p.ready && p.id !== 'dental')!;
    expect(h1()).not.toBe(other.meta.name);
    const picker = Array.from(root.querySelectorAll<HTMLButtonElement>('.picker')).find((b) => b.textContent?.includes(other.meta.name));
    expect(picker).toBeTruthy();
    expect(picker!.getAttribute('aria-pressed')).toBe('false');
    await click(picker);
    expect(h1()).toBe(other.meta.name);
    expect(picker!.getAttribute('aria-pressed')).toBe('true');
    expect(root.textContent).toContain(other.meta.tagline);

    await click(button(copy.intro.start));
    expect(new URLSearchParams(window.location.search).get('b')).toBe(other.id);
    expect(root.textContent).toContain(`${other.meta.roundLabel} 1 of ${other.config.rounds}`);
  });

  it('the seed field overrides the URL seed on start', async () => {
    go('?b=dental&s=7');
    await mount();
    const input = root.querySelector<HTMLInputElement>('input#seed')!;
    expect(input.value).toBe('7');
    await act(() => {
      input.value = 'abc';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await click(button(copy.intro.start));
    expect(new URLSearchParams(window.location.search).get('s')).toBe('abc');
  });
});
