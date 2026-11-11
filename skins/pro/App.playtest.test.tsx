// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';

vi.mock('@skins/shared/playtest', async (orig) => ({
  ...(await orig<typeof import('@skins/shared/playtest')>()),
  applyPlaytest: () => {
    throw new Error('Duplicate finding ids');
  },
}));

describe('pro App playtest link', () => {
  it('falls back to a fresh game when applying the playtest throws', async () => {
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    window.history.replaceState(null, '', '/pro/?b=dental&s=7&fix=q1:wifi-password');
    const { App } = await import('./App');
    const root = document.createElement('div');
    document.body.appendChild(root);
    await act(() => {
      render(<App />, root);
    });
    expect(root.querySelector('h1')?.textContent).toContain('Sprint 1 of 8');
    render(null, root);
    root.remove();
  });
});
