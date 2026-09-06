export type PmsModuleStatus = 'LIVE' | 'FOUNDATION' | 'PLANNED';

export type PmsModule = Readonly<{
  description: string;
  group: 'Front office' | 'Revenue' | 'Finance' | 'Guest services' | 'People and control';
  href?: string;
  name: string;
  phase: 1 | 2 | 3 | 4;
  status: PmsModuleStatus;
}>;

export const pmsModules: readonly PmsModule[] = [
  {
    description: 'Live property, occupancy, room-readiness, arrival and departure overview.',
    group: 'Front office',
    href: '/partner/pms',
    name: 'Operations dashboard',
    phase: 1,
    status: 'LIVE',
  },
  {
    description: 'Reservation search, room assignment, check-in, check-out and no-show control.',
    group: 'Front office',
    href: '/partner/bookings',
    name: 'Front desk and reservations',
    phase: 1,
    status: 'LIVE',
  },
  {
    description: 'Direct desk reservations and immediate arrival registration.',
    group: 'Front office',
    name: 'Walk-in booking',
    phase: 1,
    status: 'FOUNDATION',
  },
  {
    description: 'Room turnaround, readiness and out-of-service controls.',
    group: 'Front office',
    href: '/partner/housekeeping',
    name: 'Housekeeping board',
    phase: 1,
    status: 'LIVE',
  },
  {
    description: 'Guest accounts, room and service charges, receipts and cashier shifts.',
    group: 'Front office',
    name: 'Folios and cashier',
    phase: 1,
    status: 'FOUNDATION',
  },
  {
    description: 'End-of-day checklist, posting controls and immutable close history.',
    group: 'Front office',
    name: 'Night audit',
    phase: 1,
    status: 'FOUNDATION',
  },
  {
    description: 'Room types, physical rooms, amenities, policies and property information.',
    group: 'Revenue',
    href: '/partner/properties',
    name: 'Property setup',
    phase: 1,
    status: 'LIVE',
  },
  {
    description: 'Rates, minimum stays, arrival/departure restrictions and stop-sells.',
    group: 'Revenue',
    href: '/partner/inventory',
    name: 'Rates and availability',
    phase: 1,
    status: 'LIVE',
  },
  {
    description: 'Provider connections, property mapping and synchronization review.',
    group: 'Revenue',
    href: '/partner/channels',
    name: 'Channel distribution',
    phase: 2,
    status: 'LIVE',
  },
  {
    description: 'Corporate, group, wedding and conference blocks with shared folios.',
    group: 'Revenue',
    name: 'Groups and banquets',
    phase: 3,
    status: 'PLANNED',
  },
  {
    description: 'Restaurant, room-service and outlet orders tied to guests and rooms.',
    group: 'Guest services',
    name: 'Point of sale',
    phase: 2,
    status: 'PLANNED',
  },
  {
    description: 'Kitchen tickets moving through new, accepted, preparing and ready stages.',
    group: 'Guest services',
    name: 'Kitchen display',
    phase: 2,
    status: 'PLANNED',
  },
  {
    description: 'Guest laundry orders and hotel-linen processing cycles.',
    group: 'Guest services',
    name: 'Laundry',
    phase: 2,
    status: 'PLANNED',
  },
  {
    description: 'Corrective work orders, preventive maintenance and room downtime.',
    group: 'Guest services',
    name: 'Maintenance',
    phase: 2,
    status: 'PLANNED',
  },
  {
    description: 'GST-ready invoices, credit notes, tax registers and e-invoice preparation.',
    group: 'Finance',
    href: '/partner/tax',
    name: 'GST and tax control',
    phase: 2,
    status: 'FOUNDATION',
  },
  {
    description: 'Double-entry journals, ledgers, expenses and receivables.',
    group: 'Finance',
    name: 'Accounting',
    phase: 3,
    status: 'PLANNED',
  },
  {
    description: 'SKU stock, department issues, requisitions and reorder levels.',
    group: 'Finance',
    name: 'Stock and inventory',
    phase: 3,
    status: 'PLANNED',
  },
  {
    description: 'Vendors, quotations, purchase orders, goods receipt and approvals.',
    group: 'Finance',
    name: 'Procurement',
    phase: 3,
    status: 'PLANNED',
  },
  {
    description: 'Asset register, tagging, depreciation and audit history.',
    group: 'Finance',
    name: 'Fixed assets',
    phase: 4,
    status: 'PLANNED',
  },
  {
    description: 'Guest profiles, preferences, stay history, recognition and consent.',
    group: 'Guest services',
    name: 'Guest CRM',
    phase: 3,
    status: 'PLANNED',
  },
  {
    description: 'Secure pre-arrival registration, requests and stay self-service.',
    group: 'Guest services',
    name: 'Guest portal',
    phase: 3,
    status: 'PLANNED',
  },
  {
    description: 'Operational, statutory, revenue and management exports.',
    group: 'People and control',
    href: '/partner/reports',
    name: 'Reports and analytics',
    phase: 2,
    status: 'FOUNDATION',
  },
  {
    description: 'Staff directory, shifts, attendance, leave and payroll inputs.',
    group: 'People and control',
    name: 'Staff operations',
    phase: 4,
    status: 'PLANNED',
  },
  {
    description: 'Property-scoped roles, least-privilege permissions and audit history.',
    group: 'People and control',
    href: '/partner/activity',
    name: 'Access and audit',
    phase: 1,
    status: 'FOUNDATION',
  },
] as const;

export function countPmsModules(status: PmsModuleStatus): number {
  return pmsModules.filter((module) => module.status === status).length;
}
