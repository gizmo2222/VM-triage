import type { HtmlTagDescriptor, Plugin } from 'vite';

/**
 * Content-Security-Policy for the built pages. The game is fully static:
 * same-origin scripts, styles and fonts, a data: favicon, and a canvas share
 * image shown as a data: or blob: URL. Nothing is fetched at runtime, so
 * connect-src is 'none'; that is what backs "nothing leaves your browser".
 *
 * Preact writes string style props through the CSSOM (style.cssText), which a
 * policy without 'unsafe-inline' still allows.
 */
export const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "object-src 'none'",
].join('; ');

export const cspTag: HtmlTagDescriptor = {
  tag: 'meta',
  attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
  injectTo: 'head-prepend',
};

/**
 * Adds the CSP meta tag to every built HTML page. Build only: the dev server
 * injects an inline HMR client and style tags that this policy would block.
 */
export function cspPlugin(): Plugin {
  return {
    name: 'triage-game-csp',
    apply: 'build',
    transformIndexHtml: () => [cspTag],
  };
}
