import { describe, expect, it } from 'vitest';
import { count, dollars, days } from './format';

describe('dollars', () => {
  it('formats zero, whole, large and negative amounts', () => {
    expect(dollars(0)).toBe('$0');
    expect(dollars(950)).toBe('$950');
    expect(dollars(1234567)).toBe('$1,234,567');
    expect(dollars(-1234)).toBe('-$1,234');
  });

  it('rounds to whole dollars', () => {
    expect(dollars(1234.4)).toBe('$1,234');
    expect(dollars(1234.5)).toBe('$1,235');
    expect(dollars(0.4)).toBe('$0');
  });
});

describe('count', () => {
  it('groups thousands and rounds', () => {
    expect(count(0)).toBe('0');
    expect(count(999)).toBe('999');
    expect(count(1000)).toBe('1,000');
    expect(count(12345678)).toBe('12,345,678');
    expect(count(2.5)).toBe('3');
    expect(count(2.4)).toBe('2');
    expect(count(-1500)).toBe('-1,500');
  });
});

describe('days', () => {
  it('says 0 days for zero or negative', () => {
    expect(days(0)).toBe('0 days');
    expect(days(-3)).toBe('0 days');
  });

  it('says half a day below 0.75', () => {
    expect(days(0.01)).toBe('half a day');
    expect(days(0.5)).toBe('half a day');
    expect(days(0.74)).toBe('half a day');
  });

  it('switches to 1 day at 0.75', () => {
    expect(days(0.75)).toBe('1 day');
    expect(days(1)).toBe('1 day');
    expect(days(1.2)).toBe('1 day');
  });

  it('rounds to the nearest half day', () => {
    expect(days(1.25)).toBe('1.5 days');
    expect(days(2)).toBe('2 days');
    expect(days(2.5)).toBe('2.5 days');
    expect(days(2.7)).toBe('2.5 days');
    expect(days(10.3)).toBe('10.5 days');
    expect(days(30)).toBe('30 days');
  });
});
