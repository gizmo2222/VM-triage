import type { Asset } from '@engine/types';
import { copy } from '@content/copy/smallbiz';
import { Icon } from './Icon';

export interface TileInfo {
  asset: Asset;
  /** Open problems on this asset. */
  open: number;
  /** Problems picked for fixing this round. */
  picked: number;
  /** Incidents on this asset so far this game. */
  hits: number;
}

interface Props {
  tiles: TileInfo[];
  icons: Record<string, string>;
  activeId?: string;
  onSelect?: (id: string) => void;
  /** Tiles currently being probed in the reveal. */
  shaking?: ReadonlySet<string>;
  /** Tiles that broke in the current reveal step. */
  breaking?: ReadonlySet<string>;
  compact?: boolean;
}

export function BusinessMap({ tiles, icons, activeId, onSelect, shaking, breaking, compact }: Props) {
  return (
    <ul class={`map${compact ? ' map--compact' : ''}`} aria-label={copy.a11y.map}>
      {tiles.map((t) => {
        const cls = [
          'tile',
          t.asset.id === activeId ? 'tile--active' : '',
          t.hits > 0 ? 'tile--hit' : '',
          t.open === 0 ? 'tile--clean' : '',
          shaking?.has(t.asset.id) ? 'tile--shake' : '',
          breaking?.has(t.asset.id) ? 'tile--break' : '',
        ]
          .filter(Boolean)
          .join(' ');
        const status =
          t.open === 0 ? copy.round.tileClean : t.picked > 0 ? copy.round.tilePicked(t.picked) : copy.round.tileOpen(t.open);
        const inner = (
          <>
            <span class="tile__icon">
              <Icon name={icons[t.asset.id] ?? 'monitor'} size="1.6rem" />
            </span>
            <span class="tile__name">{t.asset.name}</span>
            <span class="tile__status">{status}</span>
            {t.hits > 0 && <span class="tile__hits">{copy.round.tileHit(t.hits)}</span>}
            {t.open > 0 && (
              <span class="tile__count" aria-hidden="true">
                {t.picked > 0 ? `${t.picked}/${t.open}` : t.open}
              </span>
            )}
          </>
        );
        return (
          <li key={t.asset.id}>
            {onSelect ? (
              <button type="button" class={cls} aria-pressed={t.asset.id === activeId} onClick={() => onSelect(t.asset.id)}>
                {inner}
              </button>
            ) : (
              <div class={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
