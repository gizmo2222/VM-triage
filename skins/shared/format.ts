const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function dollars(n: number): string {
  return usd.format(Math.round(n));
}

export function count(n: number): string {
  return int.format(Math.round(n));
}

/** "half a day", "1 day", "2.5 days" */
export function days(n: number): string {
  if (n <= 0) return '0 days';
  if (n < 0.75) return 'half a day';
  const rounded = Math.round(n * 2) / 2;
  if (rounded === 1) return '1 day';
  return `${rounded} days`;
}

export function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}
