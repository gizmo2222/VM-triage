import { describe, expect, it } from 'vitest';
import { allFindings, validateScenario } from '@engine/game';
import { allPacks } from '@content/index';

/** Words that must never reach a small-business owner's screen. */
const JARGON = /\b(CVE|CVSS|EPSS|KEV|RCE|SQL|SMB|TLS|MFA|VLAN|RDP|VPN|PSK|EOL|PII|PHI|PCI|DMARC|SPF|DKIM|CSP|SRI)\b/;

describe.each(allPacks.map((p) => [p.id, p] as const))('pack %s', (_id, pack) => {
  it('validates', () => {
    expect(() => validateScenario(pack)).not.toThrow();
  });

  it('has a short jargon-free headline and a jargon-free plain title on every finding', () => {
    for (const f of allFindings(pack)) {
      expect(f.headline, `${f.id} headline`).toBeTruthy();
      expect(f.headline!.length, `${f.id} headline length`).toBeLessThanOrEqual(48);
      expect(f.headline, `${f.id} headline jargon`).not.toMatch(JARGON);
      expect(f.plainTitle, `${f.id} plainTitle jargon`).not.toMatch(JARGON);
    }
  });

  it('keeps jargon out of event plain text', () => {
    for (const e of pack.events) {
      expect(e.plainTitle, e.id).not.toMatch(JARGON);
      expect(e.plainBody, e.id).not.toMatch(JARGON);
    }
  });

  it('has an icon and a note for every asset, including event-added ones', () => {
    const ids = pack.assets.map((a) => a.id);
    for (const e of pack.events) for (const eff of e.effects) if (eff.kind === 'addAsset') ids.push(eff.asset.id);
    for (const id of ids) {
      expect(pack.meta.assetIcons[id], `icon for ${id}`).toBeTruthy();
      expect(pack.meta.assetNotes[id], `note for ${id}`).toBeTruthy();
    }
  });

  it('has voice lines and cash', () => {
    expect(pack.meta.voice.quiet.length).toBeGreaterThan(0);
    expect(pack.meta.voice.breach.length).toBeGreaterThan(0);
    expect(pack.meta.cashOnHand).toBeGreaterThan(0);
  });
});
