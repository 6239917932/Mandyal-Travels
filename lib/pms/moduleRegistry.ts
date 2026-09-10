export type PmsModuleStatus = 'LIVE' | 'FOUNDATION' | 'PLANNED';

export const pmsModuleGroups = [
  'Overview',
  'Front office and operations',
  'Revenue and distribution',
  'Finance and back office',
  'Guest and communication',
  'Analytics and staff',
  'System and administration',
] as const;

export type PmsModuleGroup = (typeof pmsModuleGroups)[number];

export type PmsModule = Readonly<{
  code: string;
  description: string;
  group: PmsModuleGroup;
  href?: string;
  name: string;
  phase: 1 | 2 | 3 | 4;
  status: PmsModuleStatus;
}>;

export const pmsModules: readonly PmsModule[] = [
  {
    code: 'DB',
    description: 'Live occupancy, arrivals, departures, room readiness and pending work.',
    group: 'Overview',
    href: '/partner/pms',
    name: 'Dashboard',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'OE',
    description: 'Property-scoped occupancy, ADR, RevPAR, channel mix and financial posture.',
    group: 'Overview',
    href: '/partner/pms/owner-overview',
    name: 'Owner overview',
    phase: 2,
    status: 'LIVE',
  },
  {
    code: 'FD',
    description: 'Room assignment, arrival, check-in, in-house, departure and no-show control.',
    group: 'Front office and operations',
    href: '/partner/bookings',
    name: 'Front desk',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'RR',
    description: 'Seven-day physical-room occupancy, readiness, arrivals and departures view.',
    group: 'Front office and operations',
    href: '/partner/pms/room-rack',
    name: 'Room rack',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'RS',
    description: 'Search and manage individual, direct, channel and corporate reservations.',
    group: 'Front office and operations',
    href: '/partner/pms/reservations',
    name: 'Reservations',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'WI',
    description: 'Create a direct desk reservation and register an immediate arrival.',
    group: 'Front office and operations',
    href: '/partner/pms/walk-in',
    name: 'Walk-in booking',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'GR',
    description: 'Masked, audited identity references for registered guests on active stays.',
    group: 'Front office and operations',
    href: '/partner/pms/guest-registration',
    name: 'Guest registration',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'NA',
    description: 'Close the operational date through a checked and immutable audit workflow.',
    group: 'Front office and operations',
    href: '/partner/pms/night-audit',
    name: 'Night audit',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'PS',
    description: 'Audited room-service and outlet orders tied to checked-in guest folios.',
    group: 'Front office and operations',
    href: '/partner/pms/point-of-sale',
    name: 'Point of sale',
    phase: 2,
    status: 'LIVE',
  },
  {
    code: 'KD',
    description: 'Kitchen tickets progressing through accepted, preparing and ready states.',
    group: 'Front office and operations',
    href: '/partner/pms/kitchen-display',
    name: 'Kitchen display',
    phase: 2,
    status: 'LIVE',
  },
  {
    code: 'TM',
    description:
      'Conflict-protected table reservations, service areas, menus and availability controls.',
    group: 'Front office and operations',
    href: '/partner/pms/restaurant',
    name: 'Restaurant menus and tables',
    phase: 3,
    status: 'LIVE',
  },
  {
    code: 'QR',
    description:
      'Consent-aware guest QR ordering with verified table or room context and controlled fulfilment.',
    group: 'Front office and operations',
    name: 'QR guest ordering',
    phase: 3,
    status: 'PLANNED',
  },
  {
    code: 'CA',
    description:
      'Least-privilege captain and front-office mobile workflows for orders and guest operations.',
    group: 'Front office and operations',
    name: 'Captain and mobile operations',
    phase: 4,
    status: 'PLANNED',
  },
  {
    code: 'BQ',
    description: 'Audited enquiries, quotations, conflict-checked venue holds and event diary.',
    group: 'Front office and operations',
    href: '/partner/pms/banquets',
    name: 'Group bookings and banquets',
    phase: 3,
    status: 'LIVE',
  },
  {
    code: 'HK',
    description: 'Room turnaround, readiness, inspection and out-of-service controls.',
    group: 'Front office and operations',
    href: '/partner/housekeeping',
    name: 'Housekeeping',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'AT',
    description: 'Prioritized room turnaround, readiness, inspections and maintenance context.',
    group: 'Front office and operations',
    href: '/partner/pms/attendant',
    name: 'Attendant view',
    phase: 2,
    status: 'LIVE',
  },
  {
    code: 'LD',
    description: 'Itemized guest laundry and minibar services with controlled folio posting.',
    group: 'Front office and operations',
    href: '/partner/pms/laundry',
    name: 'Laundry',
    phase: 2,
    status: 'LIVE',
  },
  {
    code: 'MX',
    description: 'Corrective room work orders, controlled downtime and immutable status history.',
    group: 'Front office and operations',
    href: '/partner/pms/maintenance',
    name: 'Maintenance',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'RM',
    description: 'Rates, minimum stays, arrival/departure restrictions and stop-sells.',
    group: 'Revenue and distribution',
    href: '/partner/inventory',
    name: 'Rate management',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'CR',
    description: 'Bounded multi-property reservation, arrival and allocation control.',
    group: 'Revenue and distribution',
    href: '/partner/pms/central-reservations',
    name: 'Central reservations',
    phase: 3,
    status: 'LIVE',
  },
  {
    code: 'BE',
    description: 'Governed public-search, quote, booking and hosted-payment release readiness.',
    group: 'Revenue and distribution',
    href: '/partner/pms/booking-engine',
    name: 'Booking engine',
    phase: 3,
    status: 'LIVE',
  },
  {
    code: 'CH',
    description: 'Provider connections, property mapping and synchronization review.',
    group: 'Revenue and distribution',
    href: '/partner/channels',
    name: 'Channel distribution',
    phase: 2,
    status: 'LIVE',
  },
  {
    code: 'ON',
    description:
      'Contracted OTA connectivity at scale with certified adapters, reconciliation and monitored synchronization.',
    group: 'Revenue and distribution',
    name: 'External OTA network',
    phase: 4,
    status: 'PLANNED',
  },
  {
    code: 'BC',
    description:
      'Append-only guest folios, charges, deposits, payment corrections and cashier shifts.',
    group: 'Finance and back office',
    href: '/partner/pms/billing',
    name: 'Billing and cashier',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'MP',
    description:
      'Controlled cash, card, bank and approved digital payment tendering with reconciliation evidence.',
    group: 'Finance and back office',
    name: 'Multiple payment modes',
    phase: 2,
    status: 'FOUNDATION',
  },
  {
    code: 'SD',
    description:
      'Audited folio splitting, routed charges, bounded discounts and approval-aware corrections.',
    group: 'Finance and back office',
    name: 'Split billing and discounts',
    phase: 3,
    status: 'PLANNED',
  },
  {
    code: 'GT',
    description: 'Controlled GST preparation statements and immutable booking tax register.',
    group: 'Finance and back office',
    href: '/partner/pms/gst-billing',
    name: 'GST billing',
    phase: 2,
    status: 'LIVE',
  },
  {
    code: 'AL',
    description: 'Supplier-scoped immutable double-entry journals, balances and day book.',
    group: 'Finance and back office',
    href: '/partner/pms/accounting',
    name: 'Accounting and ledgers',
    phase: 3,
    status: 'LIVE',
  },
  {
    code: 'SI',
    description: 'Property SKUs, append-only receipts and issues, and reorder controls.',
    group: 'Finance and back office',
    href: '/partner/pms/stock',
    name: 'Stock and inventory',
    phase: 3,
    status: 'LIVE',
  },
  {
    code: 'PR',
    description: 'Reorder worklist and immutable goods-receipt evidence from the stock ledger.',
    group: 'Finance and back office',
    href: '/partner/pms/procurement',
    name: 'Procurement',
    phase: 3,
    status: 'LIVE',
  },
  {
    code: 'VM',
    description:
      'Property-scoped vendor directory, commercial terms and immutable activation history.',
    group: 'Finance and back office',
    href: '/partner/pms/vendors',
    name: 'Vendor management',
    phase: 3,
    status: 'LIVE',
  },
  {
    code: 'FA',
    description:
      'Property asset register with immutable custody and physical-verification evidence.',
    group: 'Finance and back office',
    href: '/partner/pms/fixed-assets',
    name: 'Fixed assets',
    phase: 4,
    status: 'LIVE',
  },
  {
    code: 'GC',
    description: 'Booking-derived guest profiles, stay requests, history and consent posture.',
    group: 'Guest and communication',
    href: '/partner/pms/guest-crm',
    name: 'Guest profiles and CRM',
    phase: 3,
    status: 'LIVE',
  },
  {
    code: 'GF',
    description: 'Verified-stay ratings, moderated guest feedback and audited property responses.',
    group: 'Guest and communication',
    href: '/partner/reviews',
    name: 'Guest feedback',
    phase: 2,
    status: 'LIVE',
  },
  {
    code: 'NM',
    description:
      'Template-controlled email and WhatsApp journeys with consent, suppression and delivery evidence.',
    group: 'Guest and communication',
    name: 'Automated email and WhatsApp',
    phase: 3,
    status: 'FOUNDATION',
  },
  {
    code: 'GP',
    description: 'Secure booking-derived pre-arrival and stay self-service entry points.',
    group: 'Guest and communication',
    href: '/partner/pms/guest-portal',
    name: 'Guest portal',
    phase: 3,
    status: 'LIVE',
  },
  {
    code: 'TP',
    description: 'In-house room readiness for wake-up and telephone workflows.',
    group: 'Guest and communication',
    href: '/partner/pms/telephone',
    name: 'Telephone and EPABX',
    phase: 4,
    status: 'FOUNDATION',
  },
  {
    code: 'RP',
    description: 'Property-scoped operational ledger reports and bounded CSV export.',
    group: 'Analytics and staff',
    href: '/partner/pms/reports',
    name: 'Reports',
    phase: 2,
    status: 'LIVE',
  },
  {
    code: 'PL',
    description:
      'Approved expense capture and management profit-and-loss reporting without claiming statutory books.',
    group: 'Analytics and staff',
    name: 'Expenses and profit/loss',
    phase: 4,
    status: 'PLANNED',
  },
  {
    code: 'HR',
    description: 'Named staff access roster and privacy-safe payroll readiness controls.',
    group: 'Analytics and staff',
    href: '/partner/pms/hr',
    name: 'HR and payroll',
    phase: 4,
    status: 'FOUNDATION',
  },
  {
    code: 'ST',
    description: 'Property, rooms, policies, taxes, rate plans and integration settings.',
    group: 'System and administration',
    href: '/partner/properties',
    name: 'Property settings',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'AC',
    description:
      'Supplier-scoped roles, secure invitations, least-privilege permissions and audit history.',
    group: 'System and administration',
    href: '/partner/access',
    name: 'Access control',
    phase: 1,
    status: 'LIVE',
  },
  {
    code: 'PC',
    description:
      'Consent, retention, access, deletion and export controls supporting accountable privacy operations.',
    group: 'System and administration',
    name: 'Privacy and data rights',
    phase: 3,
    status: 'FOUNDATION',
  },
  {
    code: 'TX',
    description:
      'Versioned, reconciled Tally-compatible XML export after accounting ownership and schema approval.',
    group: 'System and administration',
    name: 'Tally/XML integration',
    phase: 4,
    status: 'PLANNED',
  },
] as const;

export function countPmsModules(status: PmsModuleStatus): number {
  return pmsModules.filter((module) => module.status === status).length;
}

export function getPmsModule(code: string): PmsModule | undefined {
  const normalizedCode = code.trim().toUpperCase();
  return pmsModules.find((module) => module.code === normalizedCode);
}

export function getPmsModuleHref(module: PmsModule): string {
  return module.href ?? `/partner/pms/modules/${module.code.toLowerCase()}`;
}
