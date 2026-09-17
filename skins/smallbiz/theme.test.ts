import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Contrast gate on the theme. Every pairing the skin uses for text must
 * clear WCAG AA (4.5:1). Change a colour, this tells you what broke.
 */
const css = readFileSync(resolve(import.meta.dirname, 'theme.css'), 'utf-8');

function token(name: string): string {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found in theme.css`);
  return m[1]!;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** [text token, surface token, where it is used] */
const textPairs: [string, string, string][] = [
  ['ink', 'paper', 'body text'],
  ['ink', 'card', 'card text'],
  ['ink', 'brass', 'brass button label'],
  ['ink', 'brass-soft', 'picked card text'],
  ['paper', 'ink', 'primary button, coach bubble'],
  ['brass', 'ink', 'stamp, CTA kicker'],
  ['slate-soft', 'ink', 'CTA fine print'],
  ['brass-text', 'paper', 'kickers'],
  ['brass-text', 'card', 'badge, bar chart you row'],
  ['brass-text', 'brass-soft', 'cash label'],
  ['slate', 'paper', 'masthead subtitle, hints'],
  ['slate', 'card', 'tile status, card meta'],
  ['slate', 'paper-deep', 'report totals labels'],
  ['bad', 'card', 'break-in kicker'],
  ['bad', 'bad-soft', 'cleanup strip, negative cash'],
  ['warn', 'card', 'event kicker'],
  ['good', 'good-soft', 'quiet quarter'],
];

describe('theme contrast', () => {
  it.each(textPairs)('%s on %s (%s) clears 4.5:1', (fg, bg) => {
    expect(contrast(token(fg), token(bg))).toBeGreaterThanOrEqual(4.5);
  });
});
