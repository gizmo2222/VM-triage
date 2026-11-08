import { describe, expect, it } from 'vitest';
import { CSP, cspPlugin, cspTag } from './csp';

describe('cspPlugin', () => {
  it('runs only for builds, never the dev server', () => {
    expect(cspPlugin().apply).toBe('build');
  });

  it('injects the policy as the first tag in <head>', () => {
    const hook = cspPlugin().transformIndexHtml as () => unknown;
    expect(hook()).toEqual([cspTag]);
    expect(cspTag.injectTo).toBe('head-prepend');
    expect(cspTag.attrs).toEqual({ 'http-equiv': 'Content-Security-Policy', content: CSP });
  });

  it('blocks network calls and foreign scripts', () => {
    const d = Object.fromEntries(CSP.split('; ').map((p) => [p.split(' ')[0], p]));
    expect(d['default-src']).toBe("default-src 'none'");
    expect(d['connect-src']).toBe("connect-src 'none'");
    expect(d['script-src']).toBe("script-src 'self'");
    expect(d['object-src']).toBe("object-src 'none'");
    expect(d['base-uri']).toBe("base-uri 'none'");
    expect(CSP).not.toMatch(/unsafe-(inline|eval)/);
  });

  it('allows what the game needs: data: favicon and the share image', () => {
    expect(CSP).toContain("img-src 'self' data: blob:");
    expect(CSP).toContain("font-src 'self'");
  });
});
