import { describe, expect, it, vi } from 'vitest';
import { render } from 'preact-render-to-string';

vi.mock('@skins/shared/playtest', async (orig) => ({
  ...(await orig<typeof import('@skins/shared/playtest')>()),
  applyPlaytest: () => {
    throw new Error('Duplicate finding ids');
  },
}));

const noop = () => {};
(globalThis as unknown as { window: unknown }).window = {
  matchMedia: () => ({ matches: true, addEventListener: noop, removeEventListener: noop }),
  location: { href: 'http://localhost/?b=dental&s=7&fix=q1:wifi-password', search: '?b=dental&s=7&fix=q1:wifi-password', pathname: '/' },
  history: { replaceState: noop },
};

describe('App playtest link', () => {
  it('falls back to a fresh game when applying the playtest throws', async () => {
    const { App } = await import('./App');
    const html = render(<App />);
    expect(html).toContain('class="shell');
  });
});
