import type { Asset, Finding, GameEvent } from '@engine/types';
import type { ScenarioPack } from '../types';
import { applyHeadlines } from '../types';
import { f } from './builder';

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

const findings: Finding[] = [
  // ---- The online store ---------------------------------------------------
  f('store-core-outdated', 'store',
    "The store's software is two versions behind, and the hole in that version is being used against stores right now",
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
    'Updates go straight onto the live store, because there is nowhere else to try them',
    'No staging environment; changes deploy straight to production',
    5.0, 0.15, 3, { tags: ['store', 'process'] }),
  f('store-backups-colocated', 'store',
    "The store's backups sit on the same server as the store",
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
    'Nobody would notice if someone changed the checkout page',
    'No file integrity monitoring on payment page',
    7.0, 0.2, 2, { compliance: true, tags: ['checkout', 'monitoring'] }),
  f('checkout-old-tls', 'checkout',
    'The store still accepts a ten-year-old style of secure connection the card companies banned',
    'TLS 1.0 and 1.1 still enabled',
    5.0, 0.15, 1, { compliance: true, tags: ['checkout', 'tls'] }),

  // ---- The server the store runs on --------------------------------------
  f('server-root-password', 'server',
    "Anyone on the internet can log into the server's master account with nothing but a password",
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
    "Anyone who guesses a staff password can read that person's email, because login has no second check",
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
    'Staff laptops are not encrypted, and someone left one in a rideshare last spring',
    'No full-disk encryption on endpoints',
    6.0, 0.2, 2, { compliance: true, tags: ['laptops', 'encryption'] }),
  f('laptops-updates-deferred', 'laptops',
    'Staff laptops are set to "remind me later" on updates, forever',
    'Endpoint patching deferred indefinitely',
    6.5, 0.25, 1, { compliance: true, tags: ['laptops', 'patching'] }),
  f('laptops-browser', 'laptops',
    "The founder's laptop browser is missing a fix for a flaw criminals use",
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
    'The office router no longer gets updates, and the way in is public knowledge',
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
      'The company behind your payment plugin announced a serious flaw. Criminals were already using it to skim card numbers from checkout pages before the announcement. Every store running it is a target for the next two quarters.',
    techBody: 'PayLane gateway plugin pre-auth vulnerability disclosed, added to KEV. Active skimming campaigns confirmed. Patch available.',
    effects: [
      { kind: 'likelihoodBoost', tag: 'vendor:paylane', multiplier: 5 },
      { kind: 'markKnownExploited', findingId: 'checkout-gateway-plugin' },
    ],
    duration: 2,
  },
  {
    id: 'peak-season',
    plainTitle: 'Peak season',
    techTitle: 'Change freeze',
    plainBody: 'Forty percent of the year\'s sales happen in the next twelve weeks. Nobody touches the store. There is less to spend on fixes this quarter.',
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
      'Your payment processor wants the yearly security self-assessment back by the end of the quarter. Fail it and they raise your rates and start holding a slice of every payout. They will accept up to eight of the items they ask about still open. Any more and every open one counts against you.',
    techBody: 'PCI DSS SAQ due end of round. More than 8 open compliance-flagged findings fails it.',
    effects: [{ kind: 'audit' }],
  },
  {
    id: 'password-dump',
    plainTitle: 'A huge password leak is going around',
    techTitle: 'Credential-stuffing wave',
    plainBody:
      'A big site got breached and its password list is being tried against every store login on the internet. Your customers, your staff, and you reuse passwords like everyone else.',
    techBody: 'Credential-stuffing campaign; password-related findings see 4x exposure this round.',
    effects: [{ kind: 'likelihoodBoost', tag: 'password', multiplier: 4 }],
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
  {
    id: 'loading-dock-wifi',
    plainTitle: 'Strangers are on the office Wi-Fi',
    techTitle: 'Unknown devices on the office wireless network',
    plainBody:
      'Delivery drivers waiting at the loading dock have been passing the Wi-Fi password around, and a car has sat outside after closing two nights running. Priya can see devices on the network that nobody here owns.',
    techBody: 'Shared Wi-Fi key in wide circulation; rogue clients observed on the office network. Wi-Fi-tagged findings see 3x exposure for two rounds.',
    effects: [{ kind: 'likelihoodBoost', tag: 'wifi', multiplier: 3 }],
    duration: 2,
  },
  {
    id: 'market-stall-laptops',
    plainTitle: 'Your laptops are going on the road',
    techTitle: 'Endpoints in transit on untrusted networks',
    plainBody:
      'You booked stalls at four holiday markets, so from now on the staff laptops ride in the car every weekend and run on whatever Wi-Fi the venue offers. A seller two tables down had a laptop stolen last year, and her customer list turned up for sale a month later.',
    techBody: 'Staff laptops now used off-site and on untrusted networks. Laptops asset becomes internet-exposed; the lost-device risk on unencrypted endpoints is now treated as known-exploited.',
    effects: [
      { kind: 'setExposure', assetId: 'laptops', internetExposed: true },
      { kind: 'markKnownExploited', findingId: 'laptops-unencrypted' },
    ],
  },
];

const base: ScenarioPack = {
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
      auditFailureCost: 8000,
      auditFailureCostPerItem: 2500,
      auditAllowance: 8,
    },
  },
  meta: {
    name: 'Hollow Oak Goods',
    kind: 'an online store',
    tagline: 'Twelve people, a warehouse, twenty thousand customers, and a store that never closes.',
    intro: [
      'You founded the store. Priya, the freelancer who built the site and still fixes it on retainer, just sent you a list of thirty things that are wrong, with a note: "we should talk about this before peak season."',
      'You can afford about five points of fixes a quarter. The rest will have to wait.',
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
    assetIcons: {
      store: 'cart',
      checkout: 'card',
      server: 'server',
      marketplace: 'store',
      email: 'mail',
      warehouse: 'box',
      laptops: 'laptop',
      ads: 'megaphone',
      wifi: 'wifi',
      newmarketplace: 'tag',
    },
    cashOnHand: 425000,
    voice: {
      handover: "Sent you the list. We should talk before peak season.",
      quiet: ["All quiet. I still wouldn't ship anything new.", "Nothing this quarter. Somebody was busy elsewhere."],
      breach: ["Saw it in the logs at 2am. Yeah.", "That's the plugin I wanted to update.", "We're going to have to email everyone. Sorry."],
      audit: "The processor's form is due. Half of it we can't honestly tick.",
      emergency: "Cleanup burned most of the retainer. The rest is yours.",
    },
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

const headlines: Record<string, string> = {
  'store-core-outdated': "Store software two versions behind, and targeted",
  'store-abandoned-plugins': "Six plugins abandoned, still installed",
  'store-admin-password': "Admin password is the store name plus 2019",
  'store-shared-admin': "Everyone shares the admin login",
  'store-no-staging': "Updates go straight to the live store",
  'store-backups-colocated': "Backups live on the same server",
  'checkout-gateway-plugin': "Payment plugin ignored a warning",
  'checkout-third-party-scripts': "Eleven mystery scripts on checkout",
  'checkout-no-monitoring': "Nobody watches the checkout page",
  'checkout-old-tls': "Checkout accepts banned old connections",
  'server-root-password': "Server master login needs only a password",
  'server-unpatched': "Server unpatched for 14 months",
  'server-db-panel': "Database panel on the public internet",
  'server-debug-log': "Customer details in a public log file",
  'marketplace-password-reuse': "Amazon account reuses the admin password",
  'marketplace-no-mfa': "Marketplace payouts have no second check",
  'marketplace-api-keys': "Marketplace keys in a text file",
  'email-mfa': "Email has no second check",
  'email-support-shared': "Ex-freelancers still have the support login",
  'email-spoofable': "Anyone can send email as your store",
  'warehouse-windows7': "Label printer PC runs Windows 7",
  'warehouse-no-password': "Warehouse PC has no password",
  'warehouse-printer-exposed': "Label printer reachable from the internet",
  'laptops-unencrypted': "Laptops aren't encrypted",
  'laptops-updates-deferred': "Laptops on 'remind me later' forever",
  'laptops-browser': "Founder's browser missing a fix criminals use",
  'ads-stale-access': "Former interns still run the ads",
  'ads-no-mfa': "Ad accounts hold a $50k card and no second check",
  'wifi-router-eol': "Router unpatched, with a public way in",
  'wifi-slack-password': "Wi-Fi password pinned in Slack",
  'newmarketplace-no-mfa': "New marketplace on a personal email",
  'newmarketplace-full-access': "New marketplace app sees every customer",
};

export const ecommerce: ScenarioPack = applyHeadlines(base, headlines);
