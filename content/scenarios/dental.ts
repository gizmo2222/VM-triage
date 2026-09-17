import type { Asset, Finding, GameEvent } from '@engine/types';
import type { ScenarioPack } from '../types';
import { applyHeadlines } from '../types';

/**
 * Bright Smile Family Dental. Two dentists, two hygienists, a front desk of
 * three, about 4,200 active patients. IT is a guy named Marcus who comes in
 * on Thursdays.
 *
 * Plain titles are what the owner sees. Tech titles are what Marcus sees.
 * Rewrite the plain titles freely; keep ids, numbers and tags unless you are
 * re-running the balance test.
 */

const assets: Asset[] = [
  { id: 'pms', name: 'Patient records computer', criticality: 5, internetExposed: false, sensitivity: 'regulated', records: 4200 },
  { id: 'backup', name: 'Backup drive', criticality: 5, internetExposed: false, sensitivity: 'regulated', records: 4200 },
  { id: 'remote', name: 'Remote access for IT', criticality: 4, internetExposed: true, sensitivity: 'regulated', records: 4200 },
  { id: 'email', name: 'Office email', criticality: 4, internetExposed: true, sensitivity: 'customer', records: 1500 },
  { id: 'payments', name: 'Card terminal and billing', criticality: 4, internetExposed: true, sensitivity: 'regulated', records: 2500 },
  { id: 'xray', name: 'X-ray workstation', criticality: 4, internetExposed: false, sensitivity: 'regulated', records: 3000 },
  { id: 'frontdesk', name: 'Front desk computers', criticality: 3, internetExposed: false, sensitivity: 'customer', records: 500 },
  { id: 'wifi', name: 'Wi-Fi and internet router', criticality: 3, internetExposed: true, sensitivity: 'internal', records: 0 },
  { id: 'website', name: 'Website and online booking', criticality: 2, internetExposed: true, sensitivity: 'customer', records: 800 },
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
  // ---- Wi-Fi and router ---------------------------------------------------
  f('wifi-password', 'wifi',
    "The office Wi-Fi password hasn't changed since 2019, and people who quit still know it",
    'Shared WPA2-PSK unchanged since 2019, known to former employees',
    5.5, 0.35, 1, { compliance: true, tags: ['wifi', 'password'] }),
  f('router-firmware', 'wifi',
    'The internet router runs software its maker stopped fixing, and there is a known break-in trick for it',
    'SOHO router on end-of-life firmware with public RCE, KEV-listed',
    8.8, 0.6, 2, { kev: true, tags: ['wifi', 'router', 'vendor:netlink'] }),
  f('router-admin', 'wifi',
    "The router's settings page can be opened from anywhere on the internet",
    'WAN-side management interface enabled with default credentials',
    9.0, 0.5, 1, { compliance: true, tags: ['wifi', 'router'] }),
  f('guest-wifi', 'wifi',
    "Patients' guest Wi-Fi is on the same network as the X-ray machines",
    'No VLAN segmentation between guest SSID and clinical devices',
    6.5, 0.15, 3, { compliance: true, tags: ['wifi', 'segmentation'] }),

  // ---- Office email -------------------------------------------------------
  f('email-mfa', 'email',
    "Anyone who guesses a staff password can read that person's email. There is no second check",
    'Microsoft 365 tenant without MFA enforced',
    8.0, 0.55, 2, { compliance: true, tags: ['email', 'mfa'] }),
  f('email-training', 'email',
    'Nobody has ever been shown what a fake supplier invoice email looks like',
    'No phishing awareness training on record',
    4.0, 0.4, 1, { compliance: true, tags: ['email', 'training'] }),
  f('email-forwarding', 'email',
    'The billing inbox is quietly forwarding a copy of everything to an outside address nobody recognises',
    'Suspicious mailbox forwarding rule to external domain',
    7.5, 0.7, 1, { tags: ['email'] }),
  f('email-shared-login', 'email',
    'Six people share one login for the front desk email',
    'Shared credentials for frontdesk@ mailbox, no individual accountability',
    5.0, 0.3, 1, { compliance: true, tags: ['email', 'password'] }),

  // ---- Patient records computer ------------------------------------------
  f('pms-eol-os', 'pms',
    'The computer that holds every patient record runs a version of Windows that stopped getting security fixes years ago',
    'Practice management server on Windows Server 2012 R2 (EOL, no ESU)',
    9.1, 0.2, 4, { compliance: true, tags: ['pms', 'eol', 'windows'] }),
  f('pms-default-password', 'pms',
    'The patient records system still uses the password the installer typed in on day one',
    'Vendor default admin credentials on PMS database',
    8.5, 0.3, 1, { compliance: true, tags: ['pms', 'password'] }),
  f('pms-unpatched', 'pms',
    'The patient records software is three versions behind',
    'PMS application three major versions behind, known vulnerabilities',
    7.2, 0.25, 2, { tags: ['pms', 'vendor:dentsoft'] }),
  f('pms-everyone-admin', 'pms',
    'Every staff login in the records system can see and change everything, including billing',
    'All PMS users assigned the administrator role',
    6.0, 0.15, 2, { compliance: true, tags: ['pms', 'access'] }),

  // ---- X-ray workstation --------------------------------------------------
  f('xray-windows7', 'xray',
    'The X-ray computer runs Windows 7',
    'Imaging workstation on Windows 7, no extended support',
    8.0, 0.2, 3, { compliance: true, tags: ['xray', 'eol', 'windows'] }),
  f('xray-usb', 'xray',
    'Staff carry X-ray images to the specialist on a USB stick with no lock on it',
    'Unencrypted removable media used for PHI transfer',
    5.5, 0.2, 1, { compliance: true, tags: ['xray', 'usb'] }),
  f('xray-default-password', 'xray',
    "The X-ray software's admin password is 'admin'",
    'Default credentials on imaging software',
    7.0, 0.25, 1, { tags: ['xray', 'password'] }),

  // ---- Front desk computers ----------------------------------------------
  f('frontdesk-av-expired', 'frontdesk',
    'The antivirus on the front desk computers expired last spring',
    'Endpoint protection subscription lapsed, definitions stale',
    6.0, 0.4, 1, { compliance: true, tags: ['frontdesk', 'av'] }),
  f('frontdesk-browser', 'frontdesk',
    'The front desk web browser has a flaw that criminals are using right now, and the update has been sitting there for weeks',
    'Chrome out of date, KEV-listed CVE unpatched',
    8.8, 0.65, 1, { kev: true, tags: ['frontdesk', 'browser', 'vendor:chrome'] }),
  f('frontdesk-sticky-notes', 'frontdesk',
    'Passwords are on sticky notes at reception, where patients can read them',
    'Credentials written on sticky notes in a public area',
    4.5, 0.2, 1, { compliance: true, tags: ['frontdesk', 'password'] }),
  f('frontdesk-no-lock', 'frontdesk',
    'Front desk screens never lock, even over lunch',
    'No screen lock policy on shared workstations',
    4.0, 0.15, 1, { compliance: true, tags: ['frontdesk'] }),

  // ---- Website and online booking ----------------------------------------
  f('web-booking-plugin', 'website',
    "The online booking tool on the website has a hole that is being attacked across the internet this week",
    'WordPress booking plugin RCE, KEV-listed, unpatched',
    9.8, 0.85, 2, { kev: true, tags: ['website', 'wordpress', 'vendor:bookly'] }),
  f('web-cert', 'website',
    "The website's padlock certificate expires next month",
    'TLS certificate expiring, no auto-renewal',
    3.0, 0.1, 1, { tags: ['website'] }),
  f('web-admin-password', 'website',
    'The website login is the practice name and the word "admin"',
    'Weak WordPress admin credentials, no rate limiting',
    7.5, 0.5, 1, { tags: ['website', 'wordpress', 'password'] }),

  // ---- Card terminal and billing -----------------------------------------
  f('pay-terminal-firmware', 'payments',
    'The card terminal has never had a software update since it was installed',
    'Payment terminal firmware outdated, out of PCI compliance',
    6.5, 0.2, 2, { compliance: true, tags: ['payments', 'vendor:paytech'] }),
  f('pay-shared-pc', 'payments',
    'Billing is done on the same computer staff use for personal browsing at lunch',
    'No separation between cardholder data environment and general-use workstation',
    5.5, 0.3, 2, { compliance: true, tags: ['payments'] }),
  f('pay-paper-slips', 'payments',
    'Old paper card slips are kept in an unlocked drawer',
    'Unsecured physical storage of cardholder data',
    5.0, 0.1, 1, { compliance: true, tags: ['payments', 'physical'] }),

  // ---- Backup drive -------------------------------------------------------
  f('backup-untested', 'backup',
    'Nobody has ever tried restoring anything from the backup',
    'Backups never test-restored, integrity unknown',
    7.0, 0.1, 2, { compliance: true, tags: ['backup'] }),
  f('backup-always-connected', 'backup',
    'The backup drive is always plugged in, so anything that wrecks the main computer wrecks the backup too',
    'Backup NAS permanently mounted with write access, no offline copy',
    8.0, 0.3, 1, { compliance: true, tags: ['backup', 'ransomware'] }),
  f('backup-password-reuse', 'backup',
    'The cloud backup account uses the same password as the office email',
    'Credential reuse between M365 and cloud backup account',
    7.0, 0.35, 1, { tags: ['backup', 'password'] }),

  // ---- Remote access for IT ----------------------------------------------
  f('remote-rdp', 'remote',
    'Marcus connects from home through a door on the internet that criminals scan for around the clock',
    'RDP (3389) exposed to the internet, NLA disabled',
    9.8, 0.8, 2, { kev: true, compliance: true, tags: ['remote', 'rdp'] }),
  f('remote-vpn-firmware', 'remote',
    'The remote-access box has not been updated in two years',
    'VPN appliance firmware two years old, multiple published CVEs',
    8.5, 0.45, 2, { tags: ['remote', 'vpn', 'vendor:gatekeeper'] }),
];

const hygienistLaptop: Asset = {
  id: 'laptop',
  name: "New hygienist's laptop",
  criticality: 2,
  internetExposed: false,
  sensitivity: 'customer',
  records: 200,
};

const events: GameEvent[] = [
  {
    id: 'vpn-zero-day',
    plainTitle: 'The remote-access box is in the news',
    techTitle: 'Vendor zero-day: VPN appliance',
    plainBody:
      'The company that makes your remote-access box announced a serious flaw. Criminals were using it before the announcement. It is in the trade press this week.',
    techBody: 'Gatekeeper VPN pre-auth RCE disclosed, added to KEV. Active exploitation confirmed. Patch available.',
    effects: [
      { kind: 'likelihoodBoost', tag: 'vendor:gatekeeper', multiplier: 3 },
      { kind: 'markKnownExploited', findingId: 'remote-vpn-firmware' },
    ],
    duration: 2,
  },
  {
    id: 'slow-quarter',
    plainTitle: 'A slow quarter',
    techTitle: 'Budget cut',
    plainBody: 'Two hygienists out and a big insurer paying late. You can only afford three fixes this quarter.',
    techBody: 'Remediation capacity reduced by 2 this round.',
    effects: [{ kind: 'capacityDelta', delta: -2 }],
  },
  {
    id: 'quiet-quarter',
    plainTitle: 'A quiet quarter',
    techTitle: 'Capacity windfall',
    plainBody: 'Marcus has a light week and offers to squeeze in two extra fixes.',
    techBody: 'Remediation capacity increased by 2 this round.',
    effects: [{ kind: 'capacityDelta', delta: 2 }],
  },
  {
    id: 'insurance-form',
    plainTitle: 'The insurance renewal arrived',
    techTitle: 'Cyber insurance questionnaire',
    plainBody:
      'Your insurer sent a forty-question security form with the renewal. It is due at the end of the quarter. Anything on the list they ask about that is still open will count against you.',
    techBody: 'Attestation due end of round. Any open compliance-flagged finding fails the questionnaire.',
    effects: [{ kind: 'audit' }],
  },
  {
    id: 'invoice-phishing',
    plainTitle: 'Fake invoices are going around',
    techTitle: 'Regional phishing campaign',
    plainBody:
      'Dental offices across the state are getting emails that look like invoices from a real dental supply company. Two practices in the next town over have already paid one.',
    techBody: 'Targeted phishing campaign against dental practices; email-related findings see 2.5x exposure this round.',
    effects: [{ kind: 'likelihoodBoost', tag: 'email', multiplier: 2.5 }],
  },
  {
    id: 'new-hygienist',
    plainTitle: 'A new hygienist started',
    techTitle: 'New endpoint: unmanaged laptop',
    plainBody: 'She brought her own laptop and Marcus set it up to open patient records so she could chart from the operatory.',
    techBody: 'BYOD laptop joined to the network with PMS access. No endpoint protection.',
    effects: [
      {
        kind: 'addAsset',
        asset: hygienistLaptop,
        findings: [
          f('laptop-no-av', 'laptop',
            "The new hygienist's laptop has no antivirus and nobody checked what else is on it",
            'BYOD endpoint with no EDR or baseline',
            5.5, 0.35, 1, { tags: ['laptop', 'av'] }),
          f('laptop-auto-login', 'laptop',
            "The new laptop opens the patient records system without asking for a password",
            'Saved PMS credentials with auto-login on unmanaged device',
            6.5, 0.25, 1, { compliance: true, tags: ['laptop', 'password', 'pms'] }),
        ],
      },
    ],
  },
  {
    id: 'billing-sync',
    plainTitle: 'The records computer is now reachable from outside',
    techTitle: 'PMS server exposed for third-party sync',
    plainBody:
      'To let the new billing service pull statements overnight, Marcus opened the patient records computer up to the internet. He says it is fine.',
    techBody: 'Inbound rule added for PMS server. Asset is now internet-exposed.',
    effects: [{ kind: 'setExposure', assetId: 'pms', internetExposed: true }],
  },
];

const base: ScenarioPack = {
  id: 'dental',
  ready: true,
  assets,
  findings,
  events,
  config: {
    rounds: 4,
    capacityPerRound: 5,
    firstEventRound: 2,
    economics: {
      dailyRevenue: 4500,
      costPerRecord: 50,
      auditFailureCost: 12000,
    },
  },
  meta: {
    name: 'Bright Smile Family Dental',
    kind: 'a dental office',
    tagline: 'Two dentists, three at the front desk, 4,200 patients, and one IT guy on Thursdays.',
    intro: [
      'You own the practice. Marcus, who does your IT on Thursdays, just handed you a list of thirty things that are wrong with your computers.',
      'You can afford to fix about five a quarter. The rest will have to wait.',
      'Pick what gets fixed. Then find out what happens to the rest.',
    ],
    itPersonName: 'Marcus',
    people: 'patient',
    audit: {
      label: 'Insurance questionnaire',
      badge: 'On the insurance form',
      instinct: 'What the insurance form asks about',
      name: 'the insurance questionnaire',
      penalty: 'premium increase',
    },
    roundLabel: 'Quarter',
    assetIcons: {
      pms: '🗂️',
      backup: '💾',
      remote: '🔑',
      email: '✉️',
      payments: '💳',
      xray: '🦷',
      frontdesk: '🖥️',
      wifi: '📶',
      website: '🌐',
      laptop: '💻',
    },
    cashOnHand: 250000,
    voice: {
      handover: "Here's the list. I know. Pick five and I'll do those Thursday.",
      quiet: ["Quiet quarter. Don't get used to it.", "Nothing this time. The doors are all still there, though."],
      breach: ["Yeah. I told you about that one.", "I'm going to need the weekend for this.", "That's the one I circled."],
      audit: "They ask the same forty questions every year. We just never had the answers.",
      emergency: "I spent the first two weeks cleaning up. That comes out of the budget.",
    },
    assetNotes: {
      pms: 'Every chart, x-ray note, insurance detail and payment history for 4,200 patients.',
      backup: 'A drive on the shelf behind the server. Supposedly a copy of everything.',
      remote: 'How Marcus gets in from home when something breaks.',
      email: 'Where appointment confirmations, insurance letters and supplier invoices arrive.',
      payments: 'The card reader at the desk and the computer that runs billing.',
      xray: 'The computer wired to the X-ray sensor. Also runs the imaging software.',
      frontdesk: 'Three computers at reception for scheduling and check-in.',
      wifi: 'The router your internet provider installed, plus the office and guest Wi-Fi.',
      website: 'Your public website and the "book online" button on it.',
      laptop: 'Personal laptop, now on the office network.',
    },
  },
};

const headlines: Record<string, string> = {
  'wifi-password': "Wi-Fi password unchanged since 2019",
  'router-firmware': "Router has a known break-in",
  'router-admin': "Router settings open to the internet",
  'guest-wifi': "Guest Wi-Fi shares the X-ray network",
  'email-mfa': "Email has no second check",
  'email-training': "Nobody trained on fake invoices",
  'email-forwarding': "Billing inbox forwards to a stranger",
  'email-shared-login': "Six people share one email login",
  'pms-eol-os': "Records computer on unsupported Windows",
  'pms-default-password': "Records system on the installer's password",
  'pms-unpatched': "Records software three versions behind",
  'pms-everyone-admin': "Every staff login can change everything",
  'xray-windows7': "X-ray computer runs Windows 7",
  'xray-usb': "X-rays travel on an unlocked USB stick",
  'xray-default-password': "X-ray software password is 'admin'",
  'frontdesk-av-expired': "Front desk antivirus expired",
  'frontdesk-browser': "Front desk browser under active attack",
  'frontdesk-sticky-notes': "Passwords on sticky notes at reception",
  'frontdesk-no-lock': "Front desk screens never lock",
  'web-booking-plugin': "Booking tool under active attack",
  'web-cert': "Website certificate expires next month",
  'web-admin-password': "Website login is the practice name",
  'pay-terminal-firmware': "Card terminal never updated",
  'pay-shared-pc': "Billing runs on a personal-browsing PC",
  'pay-paper-slips': "Card slips in an unlocked drawer",
  'backup-untested': "Backup never tested",
  'backup-always-connected': "Backup drive always plugged in",
  'backup-password-reuse': "Cloud backup reuses the email password",
  'remote-rdp': "Marcus's remote door is open to the internet",
  'remote-vpn-firmware': "Remote-access box two years unpatched",
  'laptop-no-av': "New laptop has no antivirus",
  'laptop-auto-login': "New laptop opens records with no password",
};

export const dental: ScenarioPack = applyHeadlines(base, headlines);
