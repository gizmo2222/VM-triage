import { useRef, useState } from 'preact/hooks';
import { copy } from '@content/copy/smallbiz';
import { dollars } from '@skins/shared/format';

export interface ShareRow {
  name: string;
  cost: number;
  you: boolean;
  best: boolean;
}

export interface ShareData {
  siteTitle: string;
  business: string;
  kind: string;
  grade: string;
  lost: number;
  rows: ShareRow[];
  url: string;
}

const W = 1200;
const H = 630;

/** Read a CSS custom property off the document so the image matches the theme. */
function token(name: string, fallback: string): string {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch {
    return fallback;
  }
}

async function draw(canvas: HTMLCanvasElement, d: ShareData): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no canvas context');
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = H * scale;
  ctx.scale(scale, scale);

  const paper = token('--paper', '#f2f0eb');
  const ink = token('--ink', '#0f1620');
  const brass = token('--brass', '#c9a24b');
  const brassText = token('--brass-text', '#6e5312');
  const slate = token('--slate', '#55606d');
  const line = token('--line', '#d8d5cc');
  const good = token('--good', '#2f6b3a');
  const paperDeep = token('--paper-deep', '#ecebe3');

  try {
    await Promise.all([
      document.fonts.load('600 44px Spectral'),
      document.fonts.load('600 16px "IBM Plex Mono"'),
      document.fonts.load('600 18px "IBM Plex Sans"'),
    ]);
  } catch {
    // Fallback stacks below still draw something readable.
  }
  const serif = 'Spectral, Georgia, serif';
  const mono = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
  const sans = '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif';

  // Ground and top rule.
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = brass;
  ctx.fillRect(0, 0, W, 10);

  // Masthead.
  ctx.fillStyle = brassText;
  ctx.font = `600 15px ${mono}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(d.siteTitle.toUpperCase().split('').join(' '), 64, 64);
  ctx.fillStyle = slate;
  ctx.font = `500 15px ${mono}`;
  ctx.fillText(d.kind.toUpperCase(), 64, 88);

  // Business name.
  ctx.fillStyle = ink;
  ctx.font = `600 46px ${serif}`;
  ctx.fillText(d.business, 64, 140);

  // Lost line.
  ctx.fillStyle = slate;
  ctx.font = `500 15px ${mono}`;
  ctx.fillText(copy.report.totals.lost.toUpperCase(), 64, 182);
  ctx.fillStyle = ink;
  ctx.font = `600 34px ${mono}`;
  ctx.fillText(dollars(d.lost), 64, 218);

  // Stamp, rotated.
  ctx.save();
  ctx.translate(1060, 130);
  ctx.rotate(-6 * (Math.PI / 180));
  ctx.fillStyle = ink;
  const s = 150;
  roundRect(ctx, -s / 2, -s / 2, s, s, 14);
  ctx.fill();
  ctx.fillStyle = brass;
  ctx.font = `600 110px ${serif}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(d.grade, 0, 8);
  ctx.restore();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Chart.
  const top = 262;
  const rowH = 44;
  const nameX = 64;
  const barX = 420;
  const barW = 560;
  const valueX = 1136;
  const maxCost = Math.max(1, ...d.rows.map((r) => r.cost));
  ctx.fillStyle = slate;
  ctx.font = `600 13px ${mono}`;
  ctx.fillText(copy.report.compareHeading.toUpperCase(), nameX, top - 14);
  d.rows.forEach((r, i) => {
    const y = top + i * rowH + 18;
    ctx.fillStyle = r.you ? brassText : ink;
    ctx.font = `${r.you ? 700 : 600} 18px ${sans}`;
    ctx.fillText(truncate(ctx, r.name, barX - nameX - 16), nameX, y + 6);
    ctx.fillStyle = paperDeep;
    roundRect(ctx, barX, y - 6, barW, 16, 3);
    ctx.fill();
    ctx.fillStyle = r.you ? brass : r.best ? good : slate;
    roundRect(ctx, barX, y - 6, Math.max(6, (r.cost / maxCost) * barW), 16, 3);
    ctx.fill();
    ctx.fillStyle = r.you ? brassText : ink;
    ctx.font = `600 17px ${mono}`;
    ctx.textAlign = 'right';
    ctx.fillText(dollars(r.cost), valueX, y + 6);
    ctx.textAlign = 'left';
  });

  // Footer rule and URL.
  ctx.fillStyle = line;
  ctx.fillRect(64, H - 62, W - 128, 1);
  ctx.fillStyle = slate;
  ctx.font = `500 15px ${mono}`;
  ctx.fillText(d.url.replace(/^https?:\/\//, ''), 64, H - 32);
  ctx.textAlign = 'right';
  ctx.fillStyle = brassText;
  ctx.fillText(copy.report.lesson, W - 64, H - 32);
  ctx.textAlign = 'left';
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

interface Props {
  data: ShareData;
}

export function ShareImage({ data }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const make = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setBusy(true);
    setFailed(false);
    try {
      await draw(canvas, data);
      setSrc(canvas.toDataURL('image/png'));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const filename = `what-first-${data.business.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${data.grade}.png`;

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
    if (!blob) return;
    const file = new File([blob], filename, { type: 'image/png' });
    const nav = navigator as Navigator & { canShare?: (d: ShareData | { files: File[] }) => boolean };
    if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: data.siteTitle, text: copy.report.lesson });
        return;
      } catch {
        // User cancelled or share failed; fall through to download.
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div class="shareimg">
      <canvas ref={canvasRef} class="visually-hidden" aria-hidden="true" />
      {!src && (
        <button type="button" class="btn" onClick={make} disabled={busy}>
          {busy ? copy.report.imageBusy : copy.report.imageMake}
        </button>
      )}
      {failed && <p class="small muted">{copy.report.imageFailed}</p>}
      {src && (
        <>
          <img class="shareimg__preview" src={src} alt={copy.report.imageAlt(data.business, data.grade)} />
          <div class="btn-row">
            <button type="button" class="btn btn--primary" onClick={share}>
              {copy.report.imageSave}
            </button>
          </div>
          <p class="small muted">{copy.report.imageHint}</p>
        </>
      )}
    </div>
  );
}
