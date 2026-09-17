/**
 * Brass line icons, one per asset kind. 24x24, stroke only, currentColor.
 * Packs reference these by id in `meta.assetIcons`. A content test fails if
 * a pack names an id that is not here.
 */
export const ICONS: Record<string, string> = {
  records: 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM4 9h16M4 15h16M10 6.5h4M10 12.5h4M10 18.5h4',
  drive: 'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM7 12h6M17 12h.01',
  key: 'M8 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM11.5 12H21M18 12v3M15 12v2.5',
  mail: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zM3 7l9 6.5L21 7',
  card: 'M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7zM2 10.5h20M6 15.5h4',
  tooth: 'M8 3C5 3 3 5.4 3 8.4c0 3 2.2 4.8 2.6 8L6.5 21h2l1-5.5h5l1 5.5h2l.9-4.6c.4-3.2 2.6-5 2.6-8C21 5.4 19 3 16 3c-1.5 0-2.5.9-4 .9S9.5 3 8 3z',
  monitor: 'M2 5a1 1 0 0 1 1-1h18a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5zM8 21h8M12 17v4',
  wifi: 'M2 9.5a15 15 0 0 1 20 0M5.5 13a10 10 0 0 1 13 0M9 16.5a5 5 0 0 1 6 0M12 20h.01',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3a13.5 13.5 0 0 1 0 18M12 3a13.5 13.5 0 0 0 0 18',
  laptop: 'M4 6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v10H4V6zM2 19h20',
  gear: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  drawing: 'M3 21L21 3M3 21h18V3M8 21v-3M13 21v-3M18 21v-3M21 8h-3M21 13h-3',
  cash: 'M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM6 12h.01M18 12h.01',
  camera: 'M3 9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zM16 10.5l5-3v9l-5-3',
  wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.7 2.7-2.1-2.1 2.8-2.6z',
  cart: 'M2 3h3l2.5 11h11l2-8H6M9 18.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM18 18.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
  server: 'M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v3A1.5 1.5 0 0 1 19.5 10h-15A1.5 1.5 0 0 1 3 8.5v-3zM3 15.5A1.5 1.5 0 0 1 4.5 14h15a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5v-3zM7 7h.01M7 17h.01',
  store: 'M3 9l1.5-5h15L21 9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M4 11v10h16V11M9.5 21v-6h5v6',
  box: 'M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3zM3 7.5l9 4.5 9-4.5M12 12v9',
  megaphone: 'M3 10v4h3l8 5V5L6 10H3zM18 9a4.2 4.2 0 0 1 0 6',
  tag: 'M3 12l9-9h9v9l-9 9-9-9zM16 8h.01',
};

interface Props {
  name: string;
  /** CSS size, default 1em so it follows font-size. */
  size?: string;
  class?: string;
}

export function Icon({ name, size = '1em', class: cls }: Props) {
  const d = ICONS[name] ?? ICONS.monitor!;
  return (
    <svg
      class={`icon${cls ? ` ${cls}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}
