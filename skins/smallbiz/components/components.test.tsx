// @vitest-environment happy-dom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Asset } from '@engine/types';
import { dollars } from '@skins/shared/format';
import { dental } from '@content/scenarios/dental';
import { CashPile } from './CashPile';
import { FindingCard } from './FindingCard';
import { Icon, ICONS } from './Icon';
import { LuckStrip } from './LuckStrip';
import { BusinessMap, type TileInfo } from './BusinessMap';
import { ShareImage, type ShareData } from './ShareImage';

let root: HTMLDivElement;
beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});
afterEach(() => {
  act(() => {
    render(null, root);
  });
  root.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const mount = (vnode: preact.ComponentChild) => {
  act(() => {
    render(vnode, root);
  });
};

/* ------------------------------------------------------------------ CashPile */

describe('CashPile', () => {
  let queue: Array<(t: number) => void>;
  let clock: number;
  let cancelSpy: ReturnType<typeof vi.fn>;
  const origMatchMedia = window.matchMedia;

  const frame = (at: number) => {
    clock = at;
    const q = queue;
    queue = [];
    act(() => {
      q.forEach((cb) => cb(at));
    });
  };
  const shown = () => root.querySelector('.cash__value')!.textContent;
  const live = () => root.querySelector('[role="status"]')!.textContent;

  beforeEach(() => {
    queue = [];
    clock = 0;
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
    cancelSpy = vi.fn();
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      queue.push(cb);
      return queue.length;
    });
    vi.stubGlobal('cancelAnimationFrame', cancelSpy);
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
  });
  afterEach(() => {
    window.matchMedia = origMatchMedia;
  });

  it('tweens from the old value to the new one and lands exactly on it', () => {
    mount(<CashPile value={0} ms={700} />);
    expect(shown()).toBe('$0');
    mount(<CashPile value={1000} ms={700} />);
    // Nothing has moved before the first frame.
    expect(shown()).toBe('$0');
    // Halfway in time: ease-out quartic gives 1 - 0.5^4 = 0.9375.
    frame(350);
    expect(shown()).toBe(dollars(937.5));
    frame(700);
    expect(shown()).toBe('$1,000');
    expect(queue.length).toBe(0);
  });

  it('is monotonic on the way up', () => {
    mount(<CashPile value={0} ms={1000} />);
    mount(<CashPile value={400} ms={1000} />);
    const seen: number[] = [];
    for (const t of [100, 300, 600, 1000]) {
      frame(t);
      seen.push(Number(shown()!.replace(/[^0-9]/g, '')));
    }
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(seen[seen.length - 1]).toBe(400);
  });

  it('snaps to the target with the timeout when frames are throttled', () => {
    mount(<CashPile value={0} ms={700} />);
    mount(<CashPile value={1000} ms={700} />);
    expect(shown()).toBe('$0');
    act(() => {
      vi.advanceTimersByTime(759);
    });
    expect(shown()).toBe('$0');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(shown()).toBe('$1,000');
    expect(cancelSpy).toHaveBeenCalled();
  });

  it('starts from the `from` prop on mount and animates to value', () => {
    mount(<CashPile value={500} from={100} ms={400} />);
    expect(shown()).toBe('$100');
    frame(400);
    expect(shown()).toBe('$500');
  });

  it('jumps straight to the value when ms is 0', () => {
    mount(<CashPile value={100} ms={0} />);
    mount(<CashPile value={900} ms={0} />);
    expect(shown()).toBe('$900');
    expect(queue.length).toBe(0);
  });

  it('keeps the live region on the target value while the figure counts', () => {
    mount(<CashPile value={0} ms={700} />);
    mount(<CashPile value={1000} ms={700} />);
    expect(live()).toContain('$1,000');
    expect(shown()).toBe('$0');
    expect(root.querySelector('.cash__value')!.getAttribute('aria-hidden')).toBe('true');
  });

  it('cancels the pending frame and snap timer on unmount', () => {
    mount(<CashPile value={0} ms={700} />);
    mount(<CashPile value={1000} ms={700} />);
    act(() => {
      render(null, root);
    });
    expect(cancelSpy).toHaveBeenCalled();
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
  });

  it('formats and styles negative values', () => {
    mount(<CashPile value={-250} ms={0} />);
    expect(shown()).toBe('−$250');
    expect(root.querySelector('.cash')!.classList.contains('cash--negative')).toBe(true);
    expect(live()).toContain('−$250');
    mount(<CashPile value={250} ms={0} />);
    expect(shown()).toBe('$250');
    expect(root.querySelector('.cash')!.classList.contains('cash--negative')).toBe(false);
  });

  it('does not style zero as negative and adds the big modifier', () => {
    mount(<CashPile value={0} big ms={0} />);
    const el = root.querySelector('.cash')!;
    expect(el.classList.contains('cash--negative')).toBe(false);
    expect(el.classList.contains('cash--big')).toBe(true);
  });

  it('switches style as a tween crosses zero', () => {
    mount(<CashPile value={100} ms={1000} />);
    mount(<CashPile value={-100} ms={1000} />);
    frame(100); // eased 0.3439 -> about +31
    expect(root.querySelector('.cash')!.classList.contains('cash--negative')).toBe(false);
    frame(500); // eased 0.9375 -> -87.5
    expect(root.querySelector('.cash')!.classList.contains('cash--negative')).toBe(true);
    expect(shown()!.startsWith('−')).toBe(true);
    frame(1000);
    expect(shown()).toBe('−$100');
  });

  it('does not animate when the user prefers reduced motion', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    mount(<CashPile value={100} from={0} ms={700} />);
    expect(shown()).toBe('$100');
    mount(<CashPile value={800} from={0} ms={700} />);
    expect(shown()).toBe('$800');
    expect(queue.length).toBe(0);
  });
});

/* --------------------------------------------------------------- FindingCard */

describe('FindingCard', () => {
  const finding = dental.findings[0]!;
  const card = (picked: boolean, fits: boolean, onToggle: () => void) =>
    mount(<FindingCard finding={finding} picked={picked} fits={fits} onToggle={onToggle} />);
  const main = () => root.querySelector<HTMLButtonElement>('.fcard__main')!;

  it('ignores a click on a card that does not fit, but stays focusable', () => {
    const onToggle = vi.fn();
    card(false, false, onToggle);
    act(() => main().click());
    expect(onToggle).not.toHaveBeenCalled();
    expect(main().getAttribute('aria-disabled')).toBe('true');
    expect(main().hasAttribute('disabled')).toBe(false);
  });

  it('toggles when it fits, and when picked even if it no longer fits', () => {
    const onToggle = vi.fn();
    card(false, true, onToggle);
    act(() => main().click());
    card(true, false, onToggle);
    act(() => main().click());
    expect(onToggle).toHaveBeenCalledTimes(2);
  });
});

/* ---------------------------------------------------------------------- Icon */

describe('Icon', () => {
  const pathOf = () => root.querySelector('path')!.getAttribute('d');

  it('draws the named icon', () => {
    mount(<Icon name="key" />);
    expect(pathOf()).toBe(ICONS.key);
  });

  it('falls back to the monitor icon for an unknown name', () => {
    mount(<Icon name="no-such-icon" />);
    expect(pathOf()).toBe(ICONS.monitor);
    expect(pathOf()).toBeTruthy();
  });

  it('applies size and extra class, and is hidden from assistive tech', () => {
    mount(<Icon name="mail" size="2rem" class="extra" />);
    const svg = root.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('2rem');
    expect(svg.getAttribute('height')).toBe('2rem');
    expect(svg.getAttribute('class')).toBe('icon extra');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });

  it('defaults to 1em and a bare icon class', () => {
    mount(<Icon name="mail" />);
    const svg = root.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('1em');
    expect(svg.getAttribute('class')).toBe('icon');
  });
});

/* ----------------------------------------------------------------- LuckStrip */

describe('LuckStrip', () => {
  const norm = (s: string | null) => (s ?? '').replace(/\s/g, '').replace(/;$/, '');
  const left = (sel: string) => norm(root.querySelector(sel)!.getAttribute('style'));

  it('renders nothing for an empty list of costs', () => {
    mount(<LuckStrip costs={[]} actual={0} median={0} label="x" />);
    expect(root.querySelector('figure')).toBeNull();
    expect(root.innerHTML).toBe('');
  });

  it('draws one mark per replay, the label, and the best and worst ends', () => {
    mount(<LuckStrip costs={[1000, 2000, 5000]} actual={2000} median={2000} label="Spoken form" />);
    expect(root.querySelectorAll('.luck__mark').length).toBe(3);
    expect(root.querySelector('figure')!.getAttribute('aria-label')).toBe('Spoken form');
    const ends = root.querySelector('.luck__ends')!.textContent!;
    expect(ends).toContain('Luckiest');
    expect(ends).toContain('$1,000');
    expect(ends).toContain('Unluckiest');
    expect(ends).toContain('$5,000');
  });

  it('positions ticks as a percentage of the span', () => {
    mount(<LuckStrip costs={[0, 100, 200]} actual={50} median={150} label="l" />);
    expect(left('.luck__tick--you')).toContain('left:25.00%');
    expect(left('.luck__tick--typical')).toContain('left:75.00%');
    const marks = [...root.querySelectorAll('.luck__mark')].map((m) => norm(m.getAttribute('style')));
    expect(marks).toEqual(['left:0.00%', 'left:50.00%', 'left:100.00%']);
  });

  it('clamps ticks that fall outside the range', () => {
    mount(<LuckStrip costs={[100, 200]} actual={500} median={-50} label="l" />);
    expect(left('.luck__tick--you')).toContain('left:100.00%');
    expect(left('.luck__tick--typical')).toContain('left:0.00%');
  });

  it('moves the typical label below when the two labels would clash', () => {
    // youLeft 50, typicalLeft 37 -> gap 13 (< 14) clashes.
    mount(<LuckStrip costs={[0, 100]} actual={50} median={37} label="l" />);
    expect(root.querySelector('.luck__tick--typical')!.classList.contains('luck__tick--below')).toBe(true);
  });

  it('leaves the typical label in place at a gap of exactly 14 points', () => {
    mount(<LuckStrip costs={[0, 100]} actual={50} median={36} label="l" />);
    expect(root.querySelector('.luck__tick--typical')!.classList.contains('luck__tick--below')).toBe(false);
  });

  it('survives a single replay or identical costs without NaN', () => {
    mount(<LuckStrip costs={[300]} actual={300} median={300} label="l" />);
    expect(root.innerHTML).not.toMatch(/NaN|undefined|Infinity/);
    expect(left('.luck__tick--you')).toContain('left:0.00%');
    mount(<LuckStrip costs={[300, 300, 300]} actual={300} median={300} label="l" />);
    expect(root.innerHTML).not.toMatch(/NaN|undefined|Infinity/);
  });
});

/* -------------------------------------------------------------- BusinessMap */

describe('BusinessMap', () => {
  const asset = (id: string, name: string) => ({ id, name }) as unknown as Asset;
  const tile = (id: string, over: Partial<TileInfo> = {}): TileInfo => ({
    asset: asset(id, `Name ${id}`),
    open: 3,
    picked: 0,
    hits: 0,
    ...over,
  });
  const icons = { a: 'key', b: 'mail' };

  it('renders plain divs, not buttons, when there is no onSelect', () => {
    mount(<BusinessMap tiles={[tile('a'), tile('b')]} icons={icons} />);
    expect(root.querySelectorAll('button').length).toBe(0);
    expect(root.querySelectorAll('li > div.tile').length).toBe(2);
  });

  it('renders buttons that report their asset id, with aria-pressed on the active one', () => {
    const onSelect = vi.fn();
    mount(<BusinessMap tiles={[tile('a'), tile('b')]} icons={icons} activeId="b" onSelect={onSelect} />);
    const buttons = root.querySelectorAll<HTMLButtonElement>('button.tile');
    expect(buttons.length).toBe(2);
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('false');
    expect(buttons[1]!.getAttribute('aria-pressed')).toBe('true');
    expect(buttons[1]!.classList.contains('tile--active')).toBe(true);
    act(() => {
      buttons[0]!.click();
    });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('shows open, picked and clean states in the status and count', () => {
    mount(
      <BusinessMap
        tiles={[tile('a', { open: 1 }), tile('b', { open: 4, picked: 2 }), tile('c', { open: 0 })]}
        icons={icons}
      />,
    );
    const lis = root.querySelectorAll('li');
    expect(lis[0]!.querySelector('.tile__status')!.textContent).toBe('1 problem');
    expect(lis[0]!.querySelector('.tile__count')!.textContent).toBe('1');
    expect(lis[1]!.querySelector('.tile__status')!.textContent).toBe('2 picked');
    expect(lis[1]!.querySelector('.tile__count')!.textContent).toBe('2/4');
    expect(lis[2]!.querySelector('.tile__status')!.textContent).toBe('all clear');
    expect(lis[2]!.querySelector('.tile__count')).toBeNull();
    expect(lis[2]!.querySelector('.tile')!.classList.contains('tile--clean')).toBe(true);
    expect(lis[0]!.querySelector('.tile')!.classList.contains('tile--clean')).toBe(false);
  });

  it('marks tiles that were hit and prints how often', () => {
    mount(<BusinessMap tiles={[tile('a', { hits: 1 }), tile('b', { hits: 3 }), tile('c')]} icons={icons} />);
    const lis = root.querySelectorAll('li');
    expect(lis[0]!.querySelector('.tile__hits')!.textContent).toBe('hit once');
    expect(lis[1]!.querySelector('.tile__hits')!.textContent).toBe('hit 3 times');
    expect(lis[2]!.querySelector('.tile__hits')).toBeNull();
    expect(lis[0]!.querySelector('.tile')!.classList.contains('tile--hit')).toBe(true);
    expect(lis[2]!.querySelector('.tile')!.classList.contains('tile--hit')).toBe(false);
  });

  it('applies shake and break classes only to the named assets', () => {
    mount(
      <BusinessMap
        tiles={[tile('a'), tile('b'), tile('c')]}
        icons={icons}
        shaking={new Set(['a'])}
        breaking={new Set(['b'])}
      />,
    );
    const tiles = [...root.querySelectorAll('.tile')];
    expect(tiles.map((t) => t.classList.contains('tile--shake'))).toEqual([true, false, false]);
    expect(tiles.map((t) => t.classList.contains('tile--break'))).toEqual([false, true, false]);
  });

  it('adds the compact modifier and uses the monitor icon for an asset with no icon', () => {
    mount(<BusinessMap tiles={[tile('zzz')]} icons={icons} compact />);
    expect(root.querySelector('ul')!.classList.contains('map--compact')).toBe(true);
    expect(root.querySelector('path')!.getAttribute('d')).toBe(ICONS.monitor);
  });

  it('uses the icon mapped to the asset id', () => {
    mount(<BusinessMap tiles={[tile('a')]} icons={icons} />);
    expect(root.querySelector('path')!.getAttribute('d')).toBe(ICONS.key);
  });
});

/* ---------------------------------------------------------------- ShareImage */

describe('ShareImage', () => {
  interface Call {
    fn: string;
    args: unknown[];
  }
  let calls: Call[];
  let styles: string[];
  let fonts: string[];
  let canvasProps: { width: number; height: number };

  const makeCtx = () => {
    const ctx: Record<string, unknown> = {};
    for (const fn of [
      'scale',
      'fillRect',
      'fillText',
      'save',
      'restore',
      'translate',
      'rotate',
      'beginPath',
      'moveTo',
      'arcTo',
      'closePath',
      'fill',
    ]) {
      ctx[fn] = vi.fn((...args: unknown[]) => {
        calls.push({ fn, args });
      });
    }
    ctx.measureText = vi.fn((text: string) => ({ width: text.length * 10 }));
    for (const [prop, sink] of [
      ['fillStyle', styles],
      ['font', fonts],
    ] as const) {
      Object.defineProperty(ctx, prop, {
        set(v: string) {
          sink.push(v);
        },
        get() {
          return sink[sink.length - 1];
        },
      });
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    return ctx;
  };

  const data = (over: Partial<ShareData> = {}): ShareData => ({
    siteTitle: 'What First',
    business: 'Smith & Sons Dental',
    kind: 'Dental practice',
    rank: '1st of 7',
    lost: 12345,
    url: 'https://flintscope.com/game/?b=dental&s=abc',
    rows: [
      { name: 'Your order', cost: 1000, you: true, best: false },
      { name: 'Biggest first', cost: 500, you: false, best: true },
      { name: 'Cheapest first', cost: 0, you: false, best: false },
    ],
    ...over,
  });

  const texts = () => calls.filter((c) => c.fn === 'fillText').map((c) => c.args[0] as string);

  const flush = async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  };
  const clickAsync = async (el: Element) => {
    await act(async () => {
      (el as HTMLElement).click();
      await flush();
    });
  };

  let getContextSpy: ReturnType<typeof vi.fn>;
  let toBlobImpl: (cb: (b: Blob | null) => void) => void;

  beforeEach(() => {
    calls = [];
    styles = [];
    fonts = [];
    canvasProps = { width: 0, height: 0 };
    const ctx = makeCtx();
    getContextSpy = vi.fn(() => ctx);
    HTMLCanvasElement.prototype.getContext = getContextSpy as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,AAAA');
    toBlobImpl = (cb) => cb(new Blob(['png'], { type: 'image/png' }));
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb: (b: Blob | null) => void) => toBlobImpl(cb)) as never;
  });

  const make = async () => {
    mount(<ShareImage data={data()} />);
    await clickAsync(root.querySelector('button')!);
  };

  it('shows only the make button before the picture exists', () => {
    mount(<ShareImage data={data()} />);
    const btns = root.querySelectorAll('button');
    expect(btns.length).toBe(1);
    expect(btns[0]!.textContent).toBe('Make the picture');
    expect(root.querySelector('img')).toBeNull();
  });

  it('draws the grade, business, loss and rows without undefined or NaN', async () => {
    await make();
    const t = texts();
    expect(t).toContain('Smith & Sons Dental');
    expect(t).toContain('1st');
    expect(t).toContain('OF 7');
    expect(t).toContain(dollars(12345));
    expect(t).toContain('LOST');
    expect(t).toContain('Your order');
    expect(t).toContain(dollars(1000));
    expect(t).toContain(dollars(0));
    expect(t).toContain('DENTAL PRACTICE');
    expect(t).toContain('W H A T   F I R S T');
    expect(t).toContain('flintscope.com/game/?b=dental&s=abc');
    for (const s of t) expect(s).not.toMatch(/undefined|NaN/);
    for (const s of [...styles, ...fonts]) expect(s).not.toMatch(/undefined|NaN/);
    for (const c of calls) for (const a of c.args) if (typeof a === 'number') expect(Number.isFinite(a)).toBe(true);
    for (const c of calls) for (const a of c.args) if (typeof a === 'string') expect(a).not.toMatch(/undefined|NaN/);
  });

  it('sizes the canvas at 2x of 1200x630 and scales the context', async () => {
    mount(<ShareImage data={data()} />);
    const canvas = root.querySelector('canvas')!;
    await clickAsync(root.querySelector('button')!);
    expect(canvas.width).toBe(2400);
    expect(canvas.height).toBe(1260);
    expect(calls.find((c) => c.fn === 'scale')!.args).toEqual([2, 2]);
    const bg = calls.find((c) => c.fn === 'fillRect')!;
    expect(bg.args).toEqual([0, 0, 1200, 630]);
  });

  it('scales bars by cost and keeps a minimum width for a zero cost', async () => {
    await make();
    const arcs = calls.filter((c) => c.fn === 'arcTo');
    // Four arcs for the stamp, then per row four for the track and four for the bar.
    const trackEnd = (i: number) => arcs[4 + i * 8]!.args[0] as number;
    const barEnd = (i: number) => arcs[4 + i * 8 + 4]!.args[0] as number;
    expect(trackEnd(0)).toBe(980);
    expect(barEnd(0)).toBe(980); // the most expensive row fills the track
    expect(barEnd(1)).toBe(420 + 280); // half the cost, half the track
    expect(barEnd(2)).toBe(426); // zero cost still shows a 6px stub
  });

  it('draws with all-zero costs and no rows without NaN', async () => {
    mount(<ShareImage data={data({ rows: [{ name: 'Only', cost: 0, you: true, best: true }] })} />);
    await clickAsync(root.querySelector('button')!);
    for (const c of calls) for (const a of c.args) if (typeof a === 'number') expect(Number.isFinite(a)).toBe(true);
    calls = [];
    render(null, root);
    mount(<ShareImage data={data({ rows: [] })} />);
    await clickAsync(root.querySelector('button')!);
    expect(texts()).toContain('Smith & Sons Dental');
    for (const c of calls) for (const a of c.args) if (typeof a === 'number') expect(Number.isFinite(a)).toBe(true);
  });

  it('truncates a long row name with an ellipsis to fit the name column', async () => {
    const long = 'A very long order name that certainly overflows the column width';
    mount(
      <ShareImage data={data({ rows: [{ name: long, cost: 10, you: false, best: false }] })} />,
    );
    await clickAsync(root.querySelector('button')!);
    const drawn = texts().find((s) => s.startsWith('A very long'))!;
    expect(drawn.endsWith('…')).toBe(true);
    expect(drawn.length * 10).toBeLessThanOrEqual(420 - 64 - 16);
    expect(drawn.length).toBeLessThan(long.length);
    // A short name is left alone.
    expect(texts()).not.toContain('Your order…');
  });

  it('shows the preview, a save button with focus, and hides the make button after drawing', async () => {
    await make();
    const img = root.querySelector('img')!;
    expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(img.getAttribute('alt')).toContain('Smith & Sons Dental');
    expect(img.getAttribute('alt')).toContain('1st of 7');
    const btns = root.querySelectorAll('button');
    expect(btns.length).toBe(1);
    expect(btns[0]!.textContent).toBe('Save or share the picture');
    expect(document.activeElement).toBe(btns[0]);
  });

  it('shows the failure line and keeps the make button when there is no 2d context', async () => {
    getContextSpy.mockReturnValue(null);
    mount(<ShareImage data={data()} />);
    await clickAsync(root.querySelector('button')!);
    expect(root.textContent).toContain('could not be drawn');
    expect(root.querySelector('img')).toBeNull();
    const btn = root.querySelector('button')!;
    expect(btn.textContent).toBe('Make the picture');
    expect(btn.hasAttribute('disabled')).toBe(false);
  });

  it('shows the failure line when exporting the canvas throws', async () => {
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => {
      throw new Error('tainted');
    });
    mount(<ShareImage data={data()} />);
    await clickAsync(root.querySelector('button')!);
    expect(root.textContent).toContain('could not be drawn');
    expect(root.querySelector('img')).toBeNull();
  });

  describe('save and share', () => {
    let anchors: HTMLAnchorElement[];
    let createUrl: ReturnType<typeof vi.fn>;
    let revokeUrl: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      anchors = [];
      createUrl = vi.fn(() => 'blob:fake');
      revokeUrl = vi.fn();
      URL.createObjectURL = createUrl as never;
      URL.revokeObjectURL = revokeUrl as never;
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        anchors.push(this);
      });
    });
    afterEach(() => {
      delete (navigator as unknown as Record<string, unknown>).share;
      delete (navigator as unknown as Record<string, unknown>).canShare;
    });

    const save = async () => {
      await make();
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      await clickAsync(root.querySelector('button')!);
    };
    const setShare = (share: unknown, canShare: unknown) => {
      Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
      Object.defineProperty(navigator, 'canShare', { value: canShare, configurable: true, writable: true });
    };

    it('downloads a named png when the browser cannot share', async () => {
      await save();
      expect(anchors.length).toBe(1);
      expect(anchors[0]!.download).toBe('what-first-smith-sons-dental-1st-of-7.png');
      expect(anchors[0]!.getAttribute('href')).toBe('blob:fake');
      expect(createUrl).toHaveBeenCalledTimes(1);
      expect(revokeUrl).not.toHaveBeenCalled();
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(revokeUrl).toHaveBeenCalledWith('blob:fake');
    });

    it('uses the share sheet when it is available and does not download', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      setShare(share, vi.fn(() => true));
      await save();
      expect(share).toHaveBeenCalledTimes(1);
      const arg = share.mock.calls[0]![0] as { files: File[]; title: string; text: string };
      expect(arg.files[0]!.name).toBe('what-first-smith-sons-dental-1st-of-7.png');
      expect(arg.files[0]!.type).toBe('image/png');
      expect(arg.title).toBe('What First');
      expect(arg.text).toContain('The order is the whole game');
      expect(anchors.length).toBe(0);
    });

    it('falls back to a download when sharing is cancelled', async () => {
      setShare(vi.fn().mockRejectedValue(new Error('AbortError')), vi.fn(() => true));
      await save();
      expect(anchors.length).toBe(1);
    });

    it('downloads when the browser cannot share files', async () => {
      const share = vi.fn();
      setShare(share, vi.fn(() => false));
      await save();
      expect(share).not.toHaveBeenCalled();
      expect(anchors.length).toBe(1);
    });

    it('does nothing when the canvas gives no blob', async () => {
      toBlobImpl = (cb) => cb(null);
      await save();
      expect(anchors.length).toBe(0);
      expect(createUrl).not.toHaveBeenCalled();
    });
  });
});
