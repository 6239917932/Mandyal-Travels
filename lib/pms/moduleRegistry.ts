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
    description: 'Owner-focused financial, occupancy, performance and receivables snapshot.',
    group: 'Overview',
    name: 'Owner overview',
    phase: 2,
    status: 'FOUNDATION',
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
    href: '/partner/bookings',
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
    description: 'Restaurant, room-service and outlet orders tied to guests and rooms.',
    group: 'Front office and operations',
    name: 'Point of sale',
    phase: 2,
    status: 'PLANNED',
  },
  {
    code: 'KD',
    description: 'Kitchen tickets progressing through accepted, preparing and ready states.',
    group: 'Front office and operations',
    name: 'Kitchen display',
    phase: 2,
    status: 'PLANNED',
  },
  {
    code: 'BQ',
    description: 'Function spaces, event diary, quotations, menus and banquet event orders.',
    group: 'Front office and operations',
    name: 'Banquets and events',
    phase: 3,
    status: 'PLANNED',
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
    description: 'Mobile-first attendant assignments, rush rooms, issues and supplies.',
    group: 'Front office and operations',
    name: 'Attendant view',
    phase: 2,
    status: 'PLANNED',
  },
  {
    code: 'LD',
    description: 'Guest laundry orders and hotel-linen processing cycles.',
    group: 'Front office and operations',
    name: 'Laundry',
    phase: 2,
    status: 'PLANNED',
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
    description: 'Multi-property reservation, availability and performance control.',
    group: 'Revenue and distribution',
    name: 'Central reservations',
    phase: 3,
    status: 'PLANNED',
  },
  {
    code: 'BE',
    description: 'Direct-booking widget, promotions, availability, payments and upsells.',
    group: 'Revenue and distribution',
    name: 'Booking engine',
    phase: 3,
    status: 'PLANNED',
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
    code: 'GT',
    description: 'GST-ready invoices, credit notes, tax registers and e-invoice preparation.',
    group: 'Finance and back office',
    href: '/partner/tax',
    name: 'GST billing',
    phase: 2,
    status: 'FOUNDATION',
  },
  {
    code: 'AL',
    description: 'Double-entry journals, ledgers, expenses, receivables and day book.',
    group: 'Finance and back office',
    name: 'Accounting and ledgers',
    phase: 3,
    status: 'PLANNED',
  },
  {
    code: 'SI',
    description: 'SKU stock, department issues, requisitions and reorder levels.',
    group: 'Finance and back office',
    name: 'Stock and inventory',
    phase: 3,
    status: 'PLANNED',
  },
  {
    code: 'PR',
    description: 'Vendors, quotations, purchase orders, goods receipt and approvals.',
    group: 'Finance and back office',
    name: 'Procurement',
    phase: 3,
    status: 'PLANNED',
  },
  {
    code: 'FA',
    description: 'Asset register, tagging, depreciation and physical audit.',
    group: 'Finance and back office',
    name: 'Fixed assets',
    phase: 4,
    status: 'PLANNED',
  },
  {
    code: 'GC',
    description: 'Guest profiles, preferences, stay history, recognition and consent.',
    group: 'Guest and communication',
    name: 'Guest CRM',
    phase: 3,
    status: 'PLANNED',
  },
  {
    code: 'GP',
    description: 'Secure pre-arrival registration, requests and stay self-service.',
    group: 'Guest and communication',
    name: 'Guest portal',
    phase: 3,
    status: 'PLANNED',
  },
  {
    code: 'TP',
    description: 'Call logs, room extensions, wake-up calls and charge posting.',
    group: 'Guest and communication',
    name: 'Telephone and EPABX',
    phase: 4,
    status: 'PLANNED',
  },
  {
    code: 'RP',
    description: 'Operational, statutory, revenue and management exports.',
    group: 'Analytics and staff',
    href: '/partner/reports',
    name: 'Reports',
    phase: 2,
    status: 'FOUNDATION',
  },
  {
    code: 'AK',
    description: 'Occupancy, ADR, RevPAR, channel mix, booking pace and outlet performance.',
    group: 'Analytics and staff',
    href: '/partner/reports',
    name: 'Analytics and KPI',
    phase: 2,
    status: 'FOUNDATION',
  },
  {
    code: 'HR',
    description: 'Staff directory, shifts, attendance, leave and payroll inputs.',
    group: 'Analytics and staff',
    name: 'HR and payroll',
    phase: 4,
    status: 'PLANNED',
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
    description: 'Property-scoped roles, least-privilege permissions and audit history.',
    group: 'System and administration',
    href: '/partner/activity',
    name: 'Access control',
    phase: 1,
    status: 'FOUNDATION',
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
