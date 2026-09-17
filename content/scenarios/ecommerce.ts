import type { Asset, Finding, GameEvent } from '@engine/types';
import type { ScenarioPack } from '../types';

/**
 * Hollow Oak Goods. An online store selling housewares: twelve people, a
 * small warehouse, about twenty thousand customers, a self-hosted store
 * plus marketplace accounts. IT is Priya, the freelancer who built the site
 * and still fixes it on a retainer.
 *
 * Where the dentist bleeds letters and the machine shop bleeds downtime, the
 * store bleeds both, and almost everything it owns faces the internet. The
 * audit is the payment processor's self-assessment questionnaire.
 */

const assets: Asset[] = [
  { id: 'store', name: 'The online store', criticality: 5, internetExposed: true, sensitivity: 'customer', records: 9000 },
  { id: 'checkout', name: 'Checkout and payment page', criticality: 5, internetExposed: true, sensitivity: 'regulated', records: 9000 },
  { id: 'server', name: 'The server the store runs on', criticality: 4, internetExposed: true, sensitivity: 'customer', records: 9000 },
  { id: 'marketplace', name: 'Marketplace seller accounts', criticality: 4, internetExposed: true, sensitivity: 'customer', records: 3000 },
  { id: 'email', name: 'Company email and support inbox', criticality: 3, internetExposed: true, sensitivity: 'customer', records: 5000 },
  { id: 'warehouse', name: 'Warehouse computer and label printer', criticality: 3, internetExposed: false, sensitivity: 'customer', records: 2000 },
  { id: 'laptops', name: 'Staff laptops', criticality: 3, internetExposed: false, sensitivity: 'customer', records: 2000 },
  { id: 'ads', name: 'Ad and social accounts', criticality: 2, internetExposed: true, sensitivity: 'none', records: 0 },
  { id: 'wifi', name: 'Office Wi-Fi and router', criticality: 2, internetExposed: true, sensitivity: 'internal', records: 0 },
];

const f = (
  id: string,
  assetId: string,
  plainTitle: string,
  techTitle: string,
  severity: number,
  likelihood: number,
  fixCost: number,
  opts: { kev?: boolean; compliance?: boolean; tags?: string[] } = {},
): Finding => ({
  id,
  plainTitle,
  techTitle,
  severity,
  likelihood,
  knownExploited: opts.kev ?? false,
  assetId,
  fixCost,
  compliance: opts.compliance ?? false,
  tags: opts.tags ?? [],
});

const findings: Finding[] = [
  // ---- The online store ---------------------------------------------------
  f('store-core-outdated', 'store',
    "The store's software is two versions behind, and the current hole is being attacked across the internet",
    'WooCommerce and WordPress core outdated, KEV-listed CVE unpatched',
    9.0, 0.7, 2, { kev: true, tags: ['store', 'wordpress'] }),
  f('store-abandoned-plugins', 'store',
    'Fourteen plugins are installed. Six have not been updated in three years and two were abandoned by their authors',
    'Abandoned and outdated plugins with known vulnerabilities',
    7.5, 0.40, 2, { tags: ['store', 'wordpress', 'plugins'] }),
  f('store-admin-password', 'store',
    "The store's main admin login is the store name followed by 2019",
    'Weak admin credential, no MFA, no login rate limiting',
    8.0, 0.45, 1, { compliance: true, tags: ['store', 'password'] }),
  f('store-shared-admin', 'store',
    'Everyone from the intern to the founder shares that one admin login',
    'Single shared administrator account',
    6.0, 0.25, 1, { compliance: true, tags: ['store', 'password', 'access'] }),
  f('store-no-staging', 'store',
    'Updates are tested by applying them to the live store and hoping',
    'No staging environment; changes deploy straight to production',
    5.0, 0.15, 3, { tags: ['store', 'process'] }),
  f('store-backups-colocated', 'store',
    'Store backups are saved to the same server the store runs on',
    'Backups colocated with production, no offsite copy',
    7.5, 0.25, 2, { compliance: true, tags: ['store', 'backup'] }),

  // ---- Checkout and payment page -----------------------------------------
  f('checkout-gateway-plugin', 'checkout',
    'The payment plugin has not been updated since the processor sent a warning about it',
    'Payment gateway plugin outdated; vendor security advisory outstanding',
    8.5, 0.35, 1, { compliance: true, tags: ['checkout', 'plugin', 'vendor:paylane'] }),
  f('checkout-third-party-scripts', 'checkout',
    'The checkout page loads eleven scripts from other companies, and nobody knows what they all do',
    'Uncontrolled third-party JavaScript on payment page; no CSP or SRI (Magecart exposure)',
    8.0, 0.30, 2, { compliance: true, tags: ['checkout', 'scripts', 'magecart'] }),
  f('checkout-no-monitoring', 'checkout',
    'Nobody would notice if the checkout page were quietly changed',
    'No file integrity monitoring on payment page',
    7.0, 0.2, 2, { compliance: true, tags: ['checkout', 'monitoring'] }),
  f('checkout-old-tls', 'checkout',
    'The store still accepts a ten-year-old style of secure connection the card companies banned',
    'TLS 1.0 and 1.1 still enabled',
    5.0, 0.15, 1, { compliance: true, tags: ['checkout', 'tls'] }),

  // ---- The server the store runs on --------------------------------------
  f('server-root-password', 'server',
    'The server can be logged into as the all-powerful user with just a password, from anywhere',
    'Root SSH with password authentication, internet-exposed',
    9.0, 0.50, 1, { compliance: true, tags: ['server', 'ssh', 'password'] }),
  f('server-unpatched', 'server',
    "The server's operating system has not been updated in fourteen months",
    'OS unpatched for 14 months, multiple critical CVEs',
    8.5, 0.30, 2, { compliance: true, tags: ['server', 'linux', 'patching'] }),
  f('server-db-panel', 'server',
    'A database control panel is sitting on the public internet, one guess away from every customer record',
    'phpMyAdmin exposed and outdated, KEV-listed',
    8.8, 0.65, 1, { kev: true, tags: ['server', 'database'] }),
  f('server-debug-log', 'server',
    'The store writes a diagnostic log, customer details included, to a file anyone can download',
    'debug.log web-accessible and contains PII',
    6.5, 0.25, 1, { tags: ['server', 'logs'] }),

  // ---- Marketplace seller accounts ---------------------------------------
  f('marketplace-password-reuse', 'marketplace',
    'The Amazon seller account uses the same password as the store admin',
    'Credential reuse across store admin and marketplace account',
    7.5, 0.30, 1, { tags: ['marketplace', 'password'] }),
  f('marketplace-no-mfa', 'marketplace',
    'The marketplace accounts have no second check on login, and they hold your payout bank details',
    'No MFA on seller accounts with payout settings',
    7.0, 0.25, 1, { compliance: true, tags: ['marketplace', 'mfa'] }),
  f('marketplace-api-keys', 'marketplace',
    'The keys that connect the store to the marketplaces are in a text file on the shared drive',
    'API credentials stored in plaintext on a shared drive',
    6.5, 0.2, 1, { tags: ['marketplace', 'secrets'] }),

  // ---- Company email and support inbox -----------------------------------
  f('email-mfa', 'email',
    "Anyone who guesses a staff password can read that person's email. There is no second check",
    'Google Workspace without MFA enforced',
    8.0, 0.45, 2, { compliance: true, tags: ['email', 'mfa'] }),
  f('email-support-shared', 'email',
    'The support inbox login is shared with two freelancers who left last year',
    'Shared mailbox credentials known to former contractors',
    6.0, 0.25, 1, { compliance: true, tags: ['email', 'password'] }),
  f('email-spoofable', 'email',
    'Anyone can send email that looks like it came from your store. Customers have already been fooled by one',
    'No SPF, DKIM or DMARC on the sending domain',
    6.5, 0.40, 1, { tags: ['email', 'dmarc'] }),

  // ---- Warehouse computer and label printer ------------------------------
  f('warehouse-windows7', 'warehouse',
    'The warehouse computer that prints shipping labels runs Windows 7',
    'Shipping workstation on Windows 7, end of life',
    7.0, 0.15, 3, { compliance: true, tags: ['warehouse', 'eol', 'windows'] }),
  f('warehouse-no-password', 'warehouse',
    'The warehouse computer has no password so anyone on the floor can print',
    'No authentication on shipping workstation',
    5.0, 0.15, 1, { compliance: true, tags: ['warehouse', 'password'] }),
  f('warehouse-printer-exposed', 'warehouse',
    "The label printer's settings page is reachable from the internet with the factory password",
    'Network printer admin interface exposed, default credentials, KEV-listed',
    5.5, 0.45, 1, { kev: true, tags: ['warehouse', 'iot'] }),

  // ---- Staff laptops ------------------------------------------------------
  f('laptops-unencrypted', 'laptops',
    'Staff laptops are not encrypted, and one was left in a rideshare last spring',
    'No full-disk encryption on endpoints',
    6.0, 0.2, 2, { compliance: true, tags: ['laptops', 'encryption'] }),
  f('laptops-updates-deferred', 'laptops',
    'Staff laptops are set to "remind me later" on updates, forever',
    'Endpoint patching deferred indefinitely',
    6.5, 0.25, 1, { compliance: true, tags: ['laptops', 'patching'] }),
  f('laptops-browser', 'laptops',
    "The browser on the founder's laptop has a flaw criminals are using right now",
    'Chrome outdated, KEV-listed CVE',
    8.8, 0.6, 1, { kev: true, tags: ['laptops', 'browser', 'vendor:chrome'] }),

  // ---- Ad and social accounts --------------------------------------------
  f('ads-stale-access', 'ads',
    'Three former marketing interns still have access to the ad accounts',
    'Ad platform access not revoked on offboarding',
    6.0, 0.30, 1, { tags: ['ads', 'access'] }),
  f('ads-no-mfa', 'ads',
    'The ad accounts have no second check on login, and a saved card with a $50,000 limit',
    'No MFA on ad platform with stored payment method',
    7.0, 0.35, 1, { tags: ['ads', 'mfa'] }),

  // ---- Office Wi-Fi and router -------------------------------------------
  f('wifi-router-eol', 'wifi',
    'The office router is past end of life and there is a known break-in trick for it',
    'SOHO router on end-of-life firmware, public exploit, KEV-listed',
    8.5, 0.5, 2, { kev: true, tags: ['wifi', 'router', 'vendor:netlink'] }),
  f('wifi-slack-password', 'wifi',
    'The office Wi-Fi password is pinned in a Slack channel every former employee was in',
    'Wi-Fi PSK shared with former staff',
    4.5, 0.20, 1, { compliance: true, tags: ['wifi', 'password'] }),
];

const newMarketplace: Asset = {
  id: 'newmarketplace',
  name: 'The new marketplace account',
  criticality: 3,
  internetExposed: true,
  sensitivity: 'customer',
  records: 1500,
};

const events: GameEvent[] = [
  {
    id: 'payment-plugin-zero-day',
    plainTitle: 'The payment plugin is in the news',
    techTitle: 'Vendor zero-day: payment gateway plugin',
    plainBody:
      'The company behind your payment plugin announced a serious flaw. Criminals were already using it to skim card numbers from checkout pages before the announcement. Every store running it is a target this quarter.',
    techBody: 'PayLane gateway plugin pre-auth vulnerability disclosed, added to KEV. Active skimming campaigns confirmed. Patch available.',
    effects: [
      { kind: 'likelihoodBoost', tag: 'vendor:paylane', multiplier: 3 },
      { kind: 'markKnownExploited', findingId: 'checkout-gateway-plugin' },
    ],
    duration: 2,
  },
  {
    id: 'peak-season',
    plainTitle: 'Peak season',
    techTitle: 'Change freeze',
    plainBody: 'Forty percent of the year\'s sales happen in the next twelve weeks. Nobody touches the store. You can only afford three fixes this quarter.',
    techBody: 'Remediation capacity reduced by 2 this round.',
    effects: [{ kind: 'capacityDelta', delta: -2 }],
  },
  {
    id: 'slow-quarter',
    plainTitle: 'A slow quarter',
    techTitle: 'Capacity windfall',
    plainBody: 'Returns season. Sales are flat and Priya has hours left on the retainer. She offers to squeeze in two extra fixes.',
    techBody: 'Remediation capacity increased by 2 this round.',
    effects: [{ kind: 'capacityDelta', delta: 2 }],
  },
  {
    id: 'processor-questionnaire',
    plainTitle: 'The payment processor sent its annual questionnaire',
    techTitle: 'PCI self-assessment questionnaire',
    plainBody:
      'Your payment processor wants the yearly security self-assessment back by the end of the quarter. Fail it and they raise your rates and start holding a slice of every payout. Anything on the list they ask about that is still open counts against you.',
    techBody: 'PCI DSS SAQ due end of round. Any open compliance-flagged finding fails it.',
    effects: [{ kind: 'audit' }],
  },
  {
    id: 'password-dump',
    plainTitle: 'A huge password leak is going around',
    techTitle: 'Credential-stuffing wave',
    plainBody:
      'A big site got breached and its password list is being tried against every store login on the internet. Your customers, your staff, and you reuse passwords like everyone else.',
    techBody: 'Credential-stuffing campaign; password-related findings see 2.5x exposure this round.',
    effects: [{ kind: 'likelihoodBoost', tag: 'password', multiplier: 2.5 }],
  },
  {
    id: 'new-marketplace',
    plainTitle: 'You opened a shop on a new marketplace',
    techTitle: 'New sales channel connected',
    plainBody: 'The founder set it up in five minutes with a personal email address and gave its app full access to the customer list so the listings would sync.',
    techBody: 'New marketplace account created with personal identity, no MFA, and a full-scope customer data integration.',
    effects: [
      {
        kind: 'addAsset',
        asset: newMarketplace,
        findings: [
          f('newmarketplace-no-mfa', 'newmarketplace',
            "The new marketplace account is on the founder's personal email with no second check",
            'Marketplace account on personal identity, no MFA',
            6.5, 0.30, 1, { compliance: true, tags: ['marketplace', 'mfa'] }),
          f('newmarketplace-full-access', 'newmarketplace',
            "The new marketplace's app was given full access to the store's entire customer list",
            'Third-party integration with full-scope customer data access',
            6.0, 0.20, 1, { tags: ['marketplace', 'access'] }),
        ],
      },
    ],
  },
  {
    id: 'warehouse-exposed',
    plainTitle: 'The warehouse computer is now reachable from outside',
    techTitle: 'Shipping workstation exposed for carrier integration',
    plainBody:
      'To let the new shipping service talk to the label printer, Priya opened the warehouse computer up to the internet. It was quicker than the proper way.',
    techBody: 'Inbound rule added for shipping workstation. Warehouse asset is now internet-exposed.',
    effects: [{ kind: 'setExposure', assetId: 'warehouse', internetExposed: true }],
  },
];

export const ecommerce: ScenarioPack = {
  id: 'ecommerce',
  ready: true,
  assets,
  findings,
  events,
  config: {
    rounds: 4,
    capacityPerRound: 5,
    firstEventRound: 2,
    economics: {
      dailyRevenue: 12000,
      costPerRecord: 25,
      auditFailureCost: 30000,
    },
  },
  meta: {
    name: 'Hollow Oak Goods',
    kind: 'an online store',
    tagline: 'Twelve people, a warehouse, twenty thousand customers, and a store that never closes.',
    intro: [
      'You founded the store. Priya, the freelancer who built the site and still fixes it on retainer, just sent you a list of thirty things that are wrong, with a note: "we should talk about this before peak season."',
      'You can afford about five fixes a quarter. The rest will have to wait.',
      'Pick what gets fixed. Then find out what happens to the rest.',
    ],
    itPersonName: 'Priya',
    people: 'customer',
    audit: {
      label: 'Payment processor questionnaire',
      badge: 'On the processor questionnaire',
      instinct: 'What the payment processor asks about',
      name: "your payment processor's security questionnaire",
      penalty: 'in higher fees and held payouts',
    },
    roundLabel: 'Quarter',
    assetNotes: {
      store: 'The storefront, the product catalogue, and every customer account and order.',
      checkout: 'The page where card numbers get typed in. The one page criminals care about most.',
      server: 'A rented cloud server Priya set up in 2019. It runs everything above.',
      marketplace: 'Amazon and Etsy seller accounts, with your payout bank details in them.',
      email: 'Company email plus the support inbox with five thousand customer conversations.',
      warehouse: 'The computer and label printer at the packing bench.',
      laptops: 'Twelve laptops, some company-bought, some not.',
      ads: 'Meta, Google and TikTok ad accounts with a company card on file.',
      wifi: 'The router your internet company installed and the office Wi-Fi.',
      newmarketplace: 'Opened last week. Nobody has looked at its settings since.',
    },
  },
};
