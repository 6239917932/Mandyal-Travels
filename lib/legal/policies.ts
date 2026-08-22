export const POLICY_KINDS = ['privacy', 'terms', 'cancellation-refunds', 'cookies'] as const;

export type PolicyKind = (typeof POLICY_KINDS)[number];
export type PolicyStatus = 'DRAFT' | 'APPROVED';

export interface PolicySection {
  heading: string;
  paragraphs: readonly string[];
}

export interface PolicyDocument {
  kind: PolicyKind;
  title: string;
  summary: string;
  version: string;
  status: PolicyStatus;
  lastUpdated: string;
  sections: readonly PolicySection[];
}

export const PRIVACY_CONSENT_VERSION = 'privacy-v2.1-pending-legal-approval';

const policyDocuments: Record<PolicyKind, PolicyDocument> = {
  privacy: {
    kind: 'privacy',
    title: 'Privacy notice',
    summary:
      'How Mandyal Travels collects, uses, protects, and shares personal information across travel and partner services.',
    version: PRIVACY_CONSENT_VERSION,
    status: 'DRAFT',
    lastUpdated: '2026-08-22',
    sections: [
      {
        heading: 'Information we collect',
        paragraphs: [
          'We collect account, traveller, booking, payment-reference, support, device, and operational information needed to provide and secure the service. Suppliers and business customers may also provide inventory, staff, tax, settlement, and compliance records.',
          'Sensitive payment credentials are intended to remain with approved payment providers. Mandyal Travels stores governed references and transaction evidence required for bookings, reconciliation, refunds, and audit.',
        ],
      },
      {
        heading: 'How information is used',
        paragraphs: [
          'Information is used to create accounts, search and fulfil travel, process bookings, communicate service updates, prevent abuse, support customers, reconcile transactions, meet legal obligations, and improve product reliability.',
          'Marketing communications are optional and are recorded against a versioned consent purpose. Service and security messages may still be sent when required to operate an account or booking.',
        ],
      },
      {
        heading: 'Sharing and service providers',
        paragraphs: [
          'Relevant booking details may be shared with hotels, transport suppliers, payment and notification providers, fraud-prevention services, infrastructure providers, and authorities when legally required. Access is limited to the purpose of providing or safeguarding the service.',
        ],
      },
      {
        heading: 'Retention and security',
        paragraphs: [
          'Records are retained for the period needed for fulfilment, support, accounting, dispute handling, fraud prevention, audit, and applicable law. Mandyal Travels uses role-based access, scoped integrations, audit trails, validation, and operational monitoring to protect data.',
        ],
      },
      {
        heading: 'Your choices and rights',
        paragraphs: [
          'Customers can update communication preferences in their account. Requests concerning access, correction, deletion, restriction, or consent withdrawal can be sent to the support address below and will be assessed against identity, booking, accounting, security, and legal requirements.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [
          'For privacy questions or requests, contact support@mandyaltravels.com and include enough information for the team to locate and securely verify the relevant account or booking.',
        ],
      },
    ],
  },
  terms: {
    kind: 'terms',
    title: 'Terms of use',
    summary:
      'The operating rules for customers, business users, suppliers, and administrators using Mandyal Travels.',
    version: 'terms-v1.0-pending-legal-approval',
    status: 'DRAFT',
    lastUpdated: '2026-08-22',
    sections: [
      {
        heading: 'Using the platform',
        paragraphs: [
          'You must provide accurate information, protect your credentials, use the platform lawfully, and act only within permissions granted to your account or organization. Automated access requires an approved, scoped integration.',
        ],
      },
      {
        heading: 'Bookings and supplier services',
        paragraphs: [
          'Mandyal Travels coordinates search, reservation, payment-reference, communication, and support workflows. Travel services are fulfilled by the identified supplier and remain subject to availability, traveller eligibility, supplier rules, and the confirmed booking terms.',
        ],
      },
      {
        heading: 'Prices, taxes, and payment',
        paragraphs: [
          'The payable amount, taxes, fees, currency, cancellation conditions, and inclusions shown at confirmation govern the booking. Demonstration or preview prices are not final until a booking quote is confirmed.',
        ],
      },
      {
        heading: 'Changes, suspension, and misuse',
        paragraphs: [
          'Access may be restricted to protect travellers, suppliers, funds, data, or platform integrity. Fraud, unauthorized access, abusive content, scraping, interference, and misrepresentation are prohibited.',
        ],
      },
      {
        heading: 'Responsibility and support',
        paragraphs: [
          'Customers should review confirmations and promptly report errors. Service interruptions, supplier changes, and events outside reasonable control will be handled through the applicable support, rebooking, cancellation, and refund processes.',
        ],
      },
    ],
  },
  'cancellation-refunds': {
    kind: 'cancellation-refunds',
    title: 'Cancellation and refund policy',
    summary:
      'How cancellation eligibility, supplier rules, refund review, and payment returns are handled.',
    version: 'cancellation-refunds-v1.0-pending-commercial-approval',
    status: 'DRAFT',
    lastUpdated: '2026-08-22',
    sections: [
      {
        heading: 'Eligibility',
        paragraphs: [
          'Eligibility is calculated from the cancellation terms confirmed for the selected rate or service, the supplier timezone, the scheduled service time, and any non-refundable components. A search label or general promotion does not override confirmed booking terms.',
        ],
      },
      {
        heading: 'Request and review',
        paragraphs: [
          'Cancellation and refund requests must identify the booking and reason. Automated calculations may be reviewed by authorized operations staff when supplier confirmation, disruption evidence, duplicate payment, or exceptional circumstances require investigation.',
        ],
      },
      {
        heading: 'Refund method and timing',
        paragraphs: [
          'Approved refunds are returned through the original supported payment path where possible. Processing time depends on the payment provider, bank, payment method, and required reconciliation. Mandyal Travels records the refund decision and provider reference for audit.',
        ],
      },
      {
        heading: 'Supplier changes and disruption',
        paragraphs: [
          'When a supplier cancels or materially changes a confirmed service, available remedies may include rebooking, travel credit, partial refund, or full refund according to the confirmed service, provider outcome, and applicable law.',
        ],
      },
    ],
  },
  cookies: {
    kind: 'cookies',
    title: 'Cookie and storage notice',
    summary:
      'How browser storage supports authentication, security, preferences, and measured product improvement.',
    version: 'cookies-v1.0-pending-legal-approval',
    status: 'DRAFT',
    lastUpdated: '2026-08-22',
    sections: [
      {
        heading: 'Essential storage',
        paragraphs: [
          'Essential cookies or equivalent storage may maintain authenticated sessions, security protections, language and currency choices, booking continuity, and other features requested by the user. Disabling them may prevent core services from working.',
        ],
      },
      {
        heading: 'Preferences and measurement',
        paragraphs: [
          'Optional storage may remember preferences or measure consent-aware product journeys. It should not be activated for unrelated advertising or analytics until the relevant provider configuration and consent controls are approved.',
        ],
      },
      {
        heading: 'Controls',
        paragraphs: [
          'Browser settings can remove or block stored data. Account communication preferences are managed separately and do not replace browser-level storage controls.',
        ],
      },
    ],
  },
};

export const POLICY_DOCUMENTS: readonly PolicyDocument[] = POLICY_KINDS.map(
  (kind) => policyDocuments[kind],
);

export function getPolicyDocument(value: string): PolicyDocument | undefined {
  return policyDocuments[value as PolicyKind];
}
