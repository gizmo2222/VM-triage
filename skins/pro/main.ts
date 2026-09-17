import '../smallbiz/theme.css';
import { dailySeed, seedToParam } from '@skins/shared/seed';

/**
 * Skin 2 stub. Renders "coming soon" and shows today's daily seed so the
 * mechanism is visibly wired. See README.md in this folder for scope.
 */
const root = document.getElementById('app');
if (!root) throw new Error('Missing #app');

const seed = dailySeed();
root.innerHTML = `
  <main style="max-width:40rem;margin:0 auto;padding:2rem 1rem;font-family:var(--font-body);color:var(--ink)">
    <p style="text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:var(--brass-deep);font-size:.875rem;margin:0 0 .25rem">Practitioner edition</p>
    <h1 style="font-family:var(--font-display);font-size:2rem;margin:0 0 1rem">Coming soon</h1>
    <p>Same engine, real terminology: CVSS, EPSS, KEV, SSVC-style decisions and a blended method, side by side on the same backlog.</p>
    <p>Everyone gets the same seed each day, so scores compare.</p>
    <p style="color:var(--slate)">Today's seed: <code>${seedToParam(seed)}</code></p>
    <p><a href="../">Play the five-minute version</a></p>
  </main>
`;
