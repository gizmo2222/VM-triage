import type { Asset, Finding, GameEvent } from '@engine/types';
import type { ScenarioPack } from '../types';
import { applyHeadlines } from '../types';

/**
 * Kessler Precision Machining. A job shop: forty-five people on two shifts,
 * eleven CNC machines, about three hundred active customers, engineering
 * drawings that belong to those customers. IT is Dave, a contractor you pay
 * by the hour.
 *
 * Where the dental office bleeds through notification letters, the shop
 * bleeds through downtime. Few records, high daily revenue, and the audit is
 * the biggest customer's supplier questionnaire rather than an insurer.
 */

const assets: Asset[] = [
  { id: 'erp', name: 'Order and inventory system', criticality: 5, internetExposed: false, sensitivity: 'customer', records: 300 },
  { id: 'cnc', name: 'Shop floor machines', criticality: 5, internetExposed: false, sensitivity: 'none', records: 0 },
  { id: 'fileserver', name: 'Engineering drawings server', criticality: 4, internetExposed: false, sensitivity: 'customer', records: 300 },
  { id: 'email', name: 'Company email', criticality: 4, internetExposed: true, sensitivity: 'customer', records: 300 },
  { id: 'remote', name: 'Remote access', criticality: 4, internetExposed: true, sensitivity: 'customer', records: 300 },
  { id: 'payroll', name: 'Payroll and HR computer', criticality: 3, internetExposed: false, sensitivity: 'regulated', records: 45 },
  { id: 'wifi', name: 'Office and shop Wi-Fi', criticality: 3, internetExposed: true, sensitivity: 'internal', records: 0 },
  { id: 'cameras', name: 'Cameras and door badges', criticality: 2, internetExposed: true, sensitivity: 'none', records: 0 },
  { id: 'website', name: 'Website and quote form', criticality: 1, internetExposed: true, sensitivity: 'customer', records: 150 },
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
  // ---- Order and inventory system ----------------------------------------
  f('erp-eol-server', 'erp',
    'The order system runs on a server so old its maker stopped fixing it years ago',
    'ERP on Windows Server 2008 R2, end of life, no ESU',
    9.0, 0.2, 4, { compliance: true, tags: ['erp', 'eol', 'windows'] }),
  f('erp-shared-admin', 'erp',
    'Everyone in the office logs into the order system as the same all-powerful user',
    'Shared ERP administrator account, no per-user accountability',
    6.5, 0.2, 2, { compliance: true, tags: ['erp', 'password', 'access'] }),
  f('erp-database-open', 'erp',
    "The order system's database answers to anyone on the network, shop floor included, with a password Dave calls \"the usual\"",
    'SQL Server listening on all interfaces, sa account with weak password',
    8.5, 0.3, 2, { tags: ['erp', 'database', 'password'] }),
  f('erp-unpatched', 'erp',
    'The order system software is two years behind on updates',
    'ERP application unpatched, vendor security advisories outstanding',
    7.0, 0.25, 2, { tags: ['erp', 'vendor:fabtrak'] }),
  f('erp-no-recovery-plan', 'erp',
    'If the order system died tonight, nobody knows how long it would take to get it back',
    'No tested recovery plan for ERP; backup restore never exercised',
    7.0, 0.1, 2, { compliance: true, tags: ['erp', 'backup'] }),

  // ---- Shop floor machines -----------------------------------------------
  f('cnc-windows-xp', 'cnc',
    'Two of the big machines are run by computers on Windows XP',
    'CNC HMIs on Windows XP, unpatched since 2014',
    8.0, 0.15, 3, { compliance: true, tags: ['cnc', 'eol', 'windows'] }),
  f('cnc-flat-network', 'cnc',
    'The shop floor machines are on the same network as the office computers and the printers',
    'No segmentation between OT and IT networks',
    7.5, 0.2, 3, { compliance: true, tags: ['cnc', 'segmentation'] }),
  f('cnc-vendor-remote', 'cnc',
    'The machine vendor has a permanent remote line into the shop floor that nobody watches',
    'Vendor remote-support agent with unattended access on CNC controllers',
    8.0, 0.4, 1, { tags: ['cnc', 'remote', 'vendor:hausmann'] }),
  f('cnc-usb-programs', 'cnc',
    'Operators load programs from USB sticks that also go home with them',
    'Uncontrolled removable media on OT equipment',
    5.5, 0.3, 1, { compliance: true, tags: ['cnc', 'usb'] }),

  // ---- Engineering drawings server ---------------------------------------
  f('files-everyone-full', 'fileserver',
    'Every employee can open, change or delete every customer drawing on the server',
    'Engineering share grants Everyone: Full Control',
    6.0, 0.2, 1, { compliance: true, tags: ['fileserver', 'access'] }),
  f('files-smbv1', 'fileserver',
    'The drawings server speaks an old file-sharing language that ransomware was built for',
    'SMBv1 enabled on file server, EternalBlue-class exposure',
    8.5, 0.5, 1, { kev: true, tags: ['fileserver', 'smb', 'windows'] }),
  f('files-backup-attached', 'fileserver',
    'The only backup of your drawings is a drive plugged into the same server, all the time',
    'No offline or offsite backup; backup volume permanently mounted',
    8.0, 0.3, 2, { compliance: true, tags: ['fileserver', 'backup', 'ransomware'] }),
  f('files-admin-daily', 'fileserver',
    'Dave uses his all-powerful admin login for everyday email and web browsing',
    'Domain admin account used as a daily driver',
    8.0, 0.3, 1, { compliance: true, tags: ['fileserver', 'access', 'password'] }),

  // ---- Company email ------------------------------------------------------
  f('email-mfa', 'email',
    "Anyone who guesses a password can read that person's email. There is no second check",
    'Microsoft 365 tenant without MFA enforced',
    8.0, 0.55, 2, { compliance: true, tags: ['email', 'mfa'] }),
  f('email-payment-changes', 'email',
    'Accounts payable will change a vendor\'s bank details on the strength of an email, with no phone call',
    'No out-of-band verification for payment detail changes; BEC exposure',
    7.5, 0.6, 1, { compliance: true, tags: ['email', 'bec', 'process'] }),
  f('email-owner-forward', 'email',
    "The owner's email auto-forwards everything to a personal Gmail account",
    'External auto-forward rule on executive mailbox',
    6.5, 0.35, 1, { tags: ['email'] }),
  f('email-training', 'email',
    'Nobody has been shown what a fake purchase order email looks like',
    'No phishing awareness training on record',
    4.0, 0.4, 1, { compliance: true, tags: ['email', 'training'] }),

  // ---- Remote access ------------------------------------------------------
  f('remote-vpn-eol', 'remote',
    'The remote-access box is a model the maker no longer supports, and there is a known way in',
    'End-of-life VPN appliance with KEV-listed pre-auth RCE',
    9.8, 0.8, 2, { kev: true, compliance: true, tags: ['remote', 'vpn', 'vendor:gatekeeper'] }),
  f('remote-owner-rdp', 'remote',
    "The owner's office computer is reachable from the internet so he can work from the lake house",
    'RDP exposed to the internet on executive workstation',
    9.0, 0.7, 1, { kev: true, tags: ['remote', 'rdp'] }),
  f('remote-shared-login', 'remote',
    'All the sales reps share one remote-access login',
    'Shared VPN credentials, no MFA',
    7.0, 0.4, 1, { compliance: true, tags: ['remote', 'password'] }),

  // ---- Payroll and HR computer -------------------------------------------
  f('payroll-shared-pc', 'payroll',
    "Payroll is run on the receptionist's computer, between the visitor log and the radio",
    'HR and payroll processed on a general-use workstation',
    5.5, 0.2, 2, { compliance: true, tags: ['payroll'] }),
  f('payroll-w2-share', 'payroll',
    "Last year's W-2s are in a shared folder anyone in the building can open",
    'Employee PII stored on an open network share',
    6.0, 0.15, 1, { compliance: true, tags: ['payroll', 'access'] }),
  f('payroll-av-off', 'payroll',
    "The payroll computer's antivirus was switched off because it slowed things down",
    'Endpoint protection disabled on HR workstation',
    6.5, 0.35, 1, { compliance: true, tags: ['payroll', 'av'] }),

  // ---- Office and shop Wi-Fi ---------------------------------------------
  f('wifi-whiteboard', 'wifi',
    'The shop Wi-Fi password is written on the break-room whiteboard',
    'WPA2-PSK shared with visitors and written in a public area',
    5.0, 0.3, 1, { compliance: true, tags: ['wifi', 'password'] }),
  f('wifi-router-eol', 'wifi',
    'The internet router is past end of life and there is a known break-in trick for it',
    'SOHO router on end-of-life firmware with public exploit, KEV-listed',
    8.5, 0.55, 2, { kev: true, tags: ['wifi', 'router', 'vendor:netlink'] }),
  f('wifi-guest-flat', 'wifi',
    'Truck drivers waiting at the dock use the guest Wi-Fi, which sits on the same network as the order system',
    'Guest SSID not isolated from production network',
    6.0, 0.2, 2, { compliance: true, tags: ['wifi', 'segmentation'] }),

  // ---- Cameras and door badges -------------------------------------------
  f('cameras-default-password', 'cameras',
    'The security cameras still use the factory password and can be watched from the internet',
    'IP cameras with default credentials, internet-exposed, KEV-listed',
    7.5, 0.75, 1, { kev: true, tags: ['cameras', 'password', 'iot'] }),
  f('badges-old-pc', 'cameras',
    "The door badge system runs on a PC under the receptionist's desk that has not been updated in years",
    'Access control server unpatched, vendor software EOL',
    5.5, 0.15, 2, { tags: ['cameras', 'eol'] }),

  // ---- Website and quote form --------------------------------------------
  f('web-cms', 'website',
    'The website runs an old version of its software with a hole that is being attacked right now',
    'WordPress core outdated, KEV-listed CVE unpatched',
    8.8, 0.7, 1, { kev: true, tags: ['website', 'wordpress'] }),
  f('web-quote-uploads', 'website',
    'Every drawing a customer uploads through the quote form lands in a folder anyone on the internet can browse',
    'Upload directory web-accessible with directory listing enabled',
    6.5, 0.4, 1, { tags: ['website'] }),
];

const newMachine: Asset = {
  id: 'newcnc',
  name: 'The new five-axis machine',
  criticality: 4,
  internetExposed: false,
  sensitivity: 'none',
  records: 0,
};

const events: GameEvent[] = [
  {
    id: 'vendor-tool-zero-day',
    plainTitle: "The machine vendor's remote tool is in the news",
    techTitle: 'Vendor zero-day: OT remote-support agent',
    plainBody:
      'The remote-support tool your machine vendor installed on the shop floor has a serious flaw. Criminals were using it before it was announced. Every shop with that vendor is a target this quarter.',
    techBody: 'Hausmann remote-support agent pre-auth RCE disclosed, added to KEV. Active exploitation confirmed. Patch available.',
    effects: [
      { kind: 'likelihoodBoost', tag: 'vendor:hausmann', multiplier: 3 },
      { kind: 'markKnownExploited', findingId: 'cnc-vendor-remote' },
    ],
    duration: 2,
  },
  {
    id: 'rush-order',
    plainTitle: 'A rush order',
    techTitle: 'Capacity cut',
    plainBody: 'Your biggest customer moved a delivery up six weeks. Every machine is on double shifts and Dave is told not to touch anything. You can only afford three fixes this quarter.',
    techBody: 'Remediation capacity reduced by 2 this round.',
    effects: [{ kind: 'capacityDelta', delta: -2 }],
  },
  {
    id: 'slow-quarter',
    plainTitle: 'A slow quarter',
    techTitle: 'Capacity windfall',
    plainBody: 'Orders are thin. Dave has hours to spare and offers to squeeze in two extra fixes.',
    techBody: 'Remediation capacity increased by 2 this round.',
    effects: [{ kind: 'capacityDelta', delta: 2 }],
  },
  {
    id: 'customer-questionnaire',
    plainTitle: 'Your biggest customer sent a security questionnaire',
    techTitle: 'Supplier security assessment',
    plainBody:
      'Sixty questions about how you protect their drawings, due at the end of the quarter. Their purchasing manager was blunt: fail it and next year\'s contract goes out to bid. Anything on the list they ask about that is still open counts against you.',
    techBody: 'Customer supplier-security attestation due end of round. Any open compliance-flagged finding fails it.',
    effects: [{ kind: 'audit' }],
  },
  {
    id: 'po-phishing',
    plainTitle: 'Fake purchase orders are going around',
    techTitle: 'Regional phishing campaign',
    plainBody:
      'Shops across the region are getting emails that look like purchase orders from a real customer, with a link to "review the drawing". Two competitors have already had their email taken over.',
    techBody: 'Targeted phishing campaign against job shops; email-related findings see 2.5x exposure this round.',
    effects: [{ kind: 'likelihoodBoost', tag: 'email', multiplier: 2.5 }],
  },
  {
    id: 'new-machine',
    plainTitle: 'The new five-axis machine arrived',
    techTitle: 'New OT asset commissioned',
    plainBody: 'It came with its own cellular modem so the vendor can dial in for support. The installer left it switched on and left the controller password at the default.',
    techBody: 'New CNC controller with vendor cellular backhaul active and default credentials.',
    effects: [
      {
        kind: 'addAsset',
        asset: newMachine,
        findings: [
          f('newcnc-modem', 'newcnc',
            'The new machine has its own cellular line for the vendor to dial in, and it is on',
            'Vendor cellular modem active on new controller, bypasses perimeter',
            7.5, 0.4, 1, { tags: ['cnc', 'remote', 'vendor:hausmann'] }),
          f('newcnc-default-password', 'newcnc',
            "The new machine's controller still has the password from the manual",
            'Default credentials on new CNC controller',
            6.0, 0.25, 1, { compliance: true, tags: ['cnc', 'password'] }),
        ],
      },
    ],
  },
  {
    id: 'shop-floor-exposed',
    plainTitle: 'The shop floor is now reachable from outside',
    techTitle: 'OT network exposed for vendor telemetry',
    plainBody:
      'To let the machine vendor track spindle hours for the service contract, Dave opened the shop floor network to the internet. He says the vendor insisted.',
    techBody: 'Inbound rule added for OT network. Shop floor assets are now internet-exposed.',
    effects: [{ kind: 'setExposure', assetId: 'cnc', internetExposed: true }],
  },
];

const base: ScenarioPack = {
  id: 'manufacturer',
  ready: true,
  assets,
  findings,
  events,
  config: {
    rounds: 4,
    capacityPerRound: 5,
    firstEventRound: 2,
    economics: {
      dailyRevenue: 24000,
      costPerRecord: 40,
      auditFailureCost: 40000,
    },
  },
  meta: {
    name: 'Kessler Precision Machining',
    kind: 'a machine shop',
    tagline: 'Forty-five people, two shifts, eleven CNC machines, and an IT contractor you pay by the hour.',
    intro: [
      'You own the shop. Dave, the IT contractor, just handed you a list of thirty things that are wrong with your computers and walked out to his truck.',
      'You can afford about five fixes a quarter. The rest will have to wait.',
      'Pick what gets fixed. Then find out what happens to the rest.',
    ],
    itPersonName: 'Dave',
    people: 'customer',
    audit: {
      label: 'Customer questionnaire',
      badge: 'On the customer questionnaire',
      instinct: 'What the customer questionnaire asks about',
      name: "your biggest customer's security questionnaire",
      penalty: 'in lost business',
    },
    roundLabel: 'Quarter',
    assetIcons: {
      erp: '🗂️',
      cnc: '⚙️',
      fileserver: '📐',
      email: '✉️',
      remote: '🔑',
      payroll: '💵',
      wifi: '📶',
      cameras: '📹',
      website: '🌐',
      newcnc: '🛠️',
    },
    cashOnHand: 400000,
    voice: {
      handover: "That's everything. I bill by the hour, so pick your five.",
      quiet: ["Nothing broke. Don't thank me, thank the calendar.", "Quiet. I'll keep the invoice short."],
      breach: ["Told you that one would bite.", "I'll be here all night. That's the double rate.", "Vendor says it's not their problem. Of course."],
      audit: "Their purchasing guy called. He did not sound happy.",
      emergency: "Cleanup ate half my hours. You get what's left.",
    },
    assetNotes: {
      erp: 'Every order, every part number, every invoice. If it stops, the shop stops.',
      cnc: 'Eleven machines. When they run, you make money. When they do not, you pay forty-five people to stand around.',
      fileserver: 'Ten years of customer drawings. Most of them are under NDA.',
      email: 'Where purchase orders, quotes, and vendor invoices arrive.',
      remote: 'How the owner, the sales reps, and Dave get in from outside.',
      payroll: 'Names, addresses, Social Security numbers, and bank details for everyone on the floor.',
      wifi: 'The router the internet company installed, the office Wi-Fi, and the guest network at the dock.',
      cameras: 'Cameras over the floor and the doors, plus the badge reader.',
      website: 'A brochure site with a "request a quote" form that takes drawing uploads.',
      newcnc: 'The newest machine on the floor. Still under the vendor\'s warranty.',
    },
  },
};

const headlines: Record<string, string> = {
  'erp-eol-server': "Order system on an unsupported server",
  'erp-shared-admin': "Everyone uses the same order-system login",
  'erp-database-open': "Order database open to the whole network",
  'erp-unpatched': "Order software two years behind",
  'erp-no-recovery-plan': "No plan to recover the order system",
  'cnc-windows-xp': "Two machines run on Windows XP",
  'cnc-flat-network': "Shop floor shares the office network",
  'cnc-vendor-remote': "Vendor has an unwatched line to the floor",
  'cnc-usb-programs': "Programs loaded from take-home USB sticks",
  'files-everyone-full': "Anyone can delete any drawing",
  'files-smbv1': "Drawings server speaks ransomware's language",
  'files-backup-attached': "Only backup is plugged into the server",
  'files-admin-daily': "Dave browses with the master login",
  'email-mfa': "Email has no second check",
  'email-payment-changes': "Bank details changed on an email's say-so",
  'email-owner-forward': "Owner's email forwards to Gmail",
  'email-training': "Nobody trained on fake purchase orders",
  'remote-vpn-eol': "Remote-access box has a known way in",
  'remote-owner-rdp': "Owner's PC open to the internet",
  'remote-shared-login': "Sales reps share one remote login",
  'payroll-shared-pc': "Payroll runs on the receptionist's PC",
  'payroll-w2-share': "W-2s in a folder anyone can open",
  'payroll-av-off': "Payroll antivirus switched off",
  'wifi-whiteboard': "Wi-Fi password on the whiteboard",
  'wifi-router-eol': "Router has a known break-in",
  'wifi-guest-flat': "Guest Wi-Fi shares the order network",
  'cameras-default-password': "Cameras on the factory password, online",
  'badges-old-pc': "Door badge PC years out of date",
  'web-cms': "Website software under active attack",
  'web-quote-uploads': "Customer drawings in a public folder",
  'newcnc-modem': "New machine's vendor modem is on",
  'newcnc-default-password': "New machine on the manual's password",
};

export const manufacturer: ScenarioPack = applyHeadlines(base, headlines);
