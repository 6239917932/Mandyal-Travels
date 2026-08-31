export const POLICY_KINDS = [
  'privacy',
  'terms',
  'marketplace-suppliers',
  'cancellation-refunds',
  'safety-grievances',
  'partner-standards',
  'cookies',
] as const;

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

export const PRIVACY_CONSENT_VERSION = 'privacy-v3.0-pending-legal-approval';

const commonContact =
  'Contact Mandyal Travels at contact@mandyaltravels.com or +91 80693 77940. Include the booking reference, the supplier name, a description of the issue, and any supporting records. Do not send passwords, one-time codes, or full payment-card details.';

const policyDocuments: Record<PolicyKind, PolicyDocument> = {
  privacy: {
    kind: 'privacy',
    title: 'Privacy notice',
    summary:
      'How Mandyal Travels collects, uses, protects, and shares personal information across customer and partner services.',
    version: PRIVACY_CONSENT_VERSION,
    status: 'DRAFT',
    lastUpdated: '2026-08-31',
    sections: [
      {
        heading: 'Who this notice covers',
        paragraphs: [
          'This notice covers visitors, account holders, travellers, hotel and vehicle partners, partner staff, drivers, and people who contact Mandyal Travels. A listed supplier may separately control personal data that it collects to deliver accommodation or transport; its own privacy notice should explain that processing.',
          'Mandyal Travels acts as the data fiduciary for personal data processed for its accounts, marketplace, booking-facilitation, security, support, and compliance functions. The identity and contact details required for the final public notice must be completed and legally reviewed before commercial launch.',
        ],
      },
      {
        heading: 'Information we collect',
        paragraphs: [
          'Depending on the service, we may collect identity and contact information, account credentials, traveller details, booking requests and confirmations, preferences, support communications, consent records, device and security events, approximate location, and payment or refund references.',
          'Partners may provide business identity, ownership, tax, bank-settlement, licence, permit, insurance, property, vehicle, driver, staff, inventory, pricing, availability, safety, incident, and compliance records. We should collect only information reasonably required for the stated purpose.',
          'Full card credentials should be entered only in an approved payment provider interface. Mandyal Travels is intended to retain governed transaction references, amounts, status, and reconciliation evidence rather than raw card details.',
        ],
      },
      {
        heading: 'Why we use information',
        paragraphs: [
          'We use information to create and secure accounts, display and transmit availability, facilitate or record bookings, identify the contracting supplier, process or reconcile payments and refunds, communicate service updates, respond to complaints, investigate incidents and fraud, meet accounting and legal duties, and improve service reliability.',
          'Marketing is optional and requires the applicable recorded consent. Booking, safety, security, legal, and account messages may still be sent where necessary to provide or protect a requested service.',
        ],
      },
      {
        heading: 'Sharing and independent suppliers',
        paragraphs: [
          'We may share the minimum relevant information with the selected hotel, vehicle operator, driver or other named supplier; payment and notification providers; identity, fraud-prevention, infrastructure, and professional advisers; insurers; and public authorities when required by law or necessary to protect people and the service.',
          'A supplier receives traveller information to deliver its own service and may have independent legal obligations. Suppliers must not use marketplace data for unrelated marketing, sell it, or disclose it except as authorized or legally required.',
        ],
      },
      {
        heading: 'Retention and security',
        paragraphs: [
          'Records are retained only as long as reasonably needed for the stated purpose and applicable booking, tax, accounting, payment, dispute, fraud, safety, audit, and legal requirements. Retention schedules must be reviewed against the Digital Personal Data Protection Act, 2023 and the phased commencement of the Digital Personal Data Protection Rules, 2025.',
          'Mandyal Travels uses access controls, scoped integrations, encryption or tokenisation where appropriate, audit trails, backups, validation, monitoring, and incident procedures. No system can promise absolute security; suspected compromise should be reported immediately.',
        ],
      },
      {
        heading: 'Your choices and rights',
        paragraphs: [
          'Subject to applicable law and identity verification, a person may request access to a summary of processing, correction, completion, updating, erasure, withdrawal of consent, grievance redressal, or nomination. Some records may be retained where required for bookings, payments, disputes, security, or law.',
          'Withdrawing consent must be as easy as giving it for processing that depends on consent. Withdrawal does not invalidate processing already lawfully completed and may prevent an optional feature from continuing.',
        ],
      },
      {
        heading: 'Children and other travellers',
        paragraphs: [
          'An adult making a booking for another traveller must have authority to provide that traveller’s information and must share relevant notices with them. Child data requires age-appropriate handling and verifiable parental or lawful guardian consent where applicable; commercial child-account functionality must remain disabled until that control is implemented.',
        ],
      },
      {
        heading: 'Privacy contact and complaints',
        paragraphs: [
          commonContact,
          'The final notice must prominently identify the person responsible for answering data-processing questions and the statutory grievance route before personal-data processing is commercially launched. Unresolved statutory complaints may be taken to the competent authority where applicable.',
        ],
      },
    ],
  },
  terms: {
    kind: 'terms',
    title: 'Terms of use and booking',
    summary:
      'The rules for accounts, referrals, platform-facilitated bookings, payments, and use of Mandyal Travels.',
    version: 'terms-v2.0-pending-legal-approval',
    status: 'DRAFT',
    lastUpdated: '2026-08-31',
    sections: [
      {
        heading: 'Agreement and eligibility',
        paragraphs: [
          'These terms apply when a person visits, creates an account, requests a referral, or uses a booking-facilitation feature. The booking summary and the named supplier’s displayed conditions also form part of the transaction. If they conflict, mandatory law prevails, followed by the confirmed booking terms for that service.',
          'Users must have legal capacity to transact, provide accurate information, protect their credentials, and act only for themselves or for another traveller whom they are authorized to represent.',
        ],
      },
      {
        heading: 'Mandyal Travels has two possible roles',
        paragraphs: [
          'Supplier-direct referral: Mandyal Travels provides discovery or a route to an independent supplier. The customer completes the reservation and payment with that supplier. The supplier is the contracting service provider and its displayed terms govern the service.',
          'Platform-facilitated booking: Mandyal Travels transmits the reservation and may facilitate payment, communications, support, or refund processing for the named supplier. Unless a confirmation expressly says Mandyal Travels is the service provider, the supplier remains responsible for delivering the hotel stay or vehicle service.',
          'Every commercial offer must identify the applicable role before commitment. Mandyal Travels must not describe a supplier-direct referral as a platform-confirmed booking or represent an unverified listing as approved, guaranteed, or insured by Mandyal Travels.',
        ],
      },
      {
        heading: 'Independent hotels and vehicle providers',
        paragraphs: [
          'Listed hotels, property operators, vehicle owners, fleet operators, and drivers are independent businesses and are not employees, branches, or agents of Mandyal Travels merely because they use the platform. They control and are responsible for their premises, vehicles, staff, drivers, licences, permits, insurance, safety, service quality, inventory, descriptions, taxes, and fulfilment.',
          'Mandyal Travels may review documents or remove a listing, but onboarding, verification, badges, rankings, reviews, or continued listing do not guarantee safety, legality, quality, identity, availability, or future conduct. Customers should review the named supplier’s information and raise inconsistencies before travel.',
        ],
      },
      {
        heading: 'Prices, taxes, payment, and confirmation',
        paragraphs: [
          'Before commitment, the customer should see the supplier, service, dates, total price, taxes and fees, currency, payment recipient, cancellation terms, material restrictions, and whether confirmation is immediate or subject to supplier acceptance. Preview, crossed-out, or demonstration prices are not final offers.',
          'A request is not confirmed until a confirmation reference is issued by the responsible party. Mandyal Travels is responsible for correcting its own transmission or platform errors and for safeguarding funds it actually receives, subject to applicable law and payment-provider processing.',
        ],
      },
      {
        heading: 'Customer conduct and travel responsibility',
        paragraphs: [
          'Customers must review the confirmation, arrive on time, carry required identification, comply with lawful supplier rules, disclose relevant accessibility or assistance needs, and avoid unlawful, unsafe, abusive, or damaging conduct. A supplier may refuse service where lawfully permitted, but must not discriminate unlawfully.',
          'Customers remain responsible for personal travel decisions, valuables, required documents, and suitable insurance. This does not excuse a supplier or Mandyal Travels from duties imposed by law or from its own negligence or misrepresentation.',
        ],
      },
      {
        heading: 'Platform availability and changes',
        paragraphs: [
          'Maintenance, communication failures, supplier changes, weather, road closures, government action, disasters, labour disruption, and other events may affect availability. Mandyal Travels will take reasonable steps within its role to communicate known material changes and support the available remedy.',
          'Access may be restricted to protect customers, suppliers, funds, data, or platform integrity. Fraud, false listings, unauthorized access, scraping, interference, impersonation, manipulated reviews, and misuse of personal data are prohibited.',
        ],
      },
      {
        heading: 'Responsibility and limits',
        paragraphs: [
          'The supplier is primarily responsible for injury, loss, damage, service failure, misconduct, unsafe premises, unsafe driving, or other events arising from the supplier’s hotel or vehicle service, to the extent caused by that supplier or persons under its control. Complaints should still be reported to Mandyal Travels so the listing, support record, and any facilitated payment can be reviewed.',
          'Mandyal Travels remains responsible for obligations that law places on the platform and for loss directly caused by its own fraud, wilful misconduct, negligence, misleading representation, data-security failure, payment handling, or material breach. Nothing in these terms excludes or limits liability or a consumer remedy that cannot lawfully be excluded.',
          'To the extent lawful, Mandyal Travels is not responsible for indirect or consequential loss that was not reasonably foreseeable from a breach of its platform obligations. No clause limits emergency, regulatory, consumer-forum, or other statutory rights.',
        ],
      },
      {
        heading: 'Complaints, governing law, and changes',
        paragraphs: [
          commonContact,
          'These terms are governed by the laws of India. Nothing restricts a consumer from approaching a consumer commission, regulator, court, or other forum available under applicable law. The final terms must identify the legal entity, complete principal address, grievance officer, and any proposed contractual venue before approval.',
          'Material changes apply prospectively and should be versioned and communicated. Confirmed bookings remain governed by the terms accepted at confirmation unless a lawful change is agreed or required.',
        ],
      },
    ],
  },
  'marketplace-suppliers': {
    kind: 'marketplace-suppliers',
    title: 'Marketplace and supplier responsibility policy',
    summary:
      'Who provides each service, what Mandyal Travels verifies, and where supplier responsibility begins and ends.',
    version: 'marketplace-suppliers-v1.0-pending-legal-approval',
    status: 'DRAFT',
    lastUpdated: '2026-08-31',
    sections: [
      {
        heading: 'Purpose',
        paragraphs: [
          'Mandyal Travels provides technology for property or fleet management, marketplace discovery, referral, and, when specifically enabled, booking or payment facilitation. This policy is intended to make the responsible party visible rather than hide responsibility behind a general disclaimer.',
        ],
      },
      {
        heading: 'Disclosure required on every listing and confirmation',
        paragraphs: [
          'Before a customer commits, the listing and confirmation should prominently show the supplier’s legal or business name, geographic address, customer contact details, grievance contact and designation, service description, material restrictions, licence or registration information where required, price breakdown, payment recipient, cancellation terms, and booking mode.',
          'Supplier information must be supplied and kept current by the supplier. Mandyal Travels must provide an accessible route to report inaccurate, unsafe, unlawful, or misleading information and must take proportionate action on substantiated reports.',
        ],
      },
      {
        heading: 'Supplier responsibility',
        paragraphs: [
          'The named hotel or vehicle provider is responsible for the actual stay or transport service, including truthful listing content, lawful operation, premises and vehicle condition, staff and driver conduct, accessibility information, hygiene, fire and life safety, permits, insurance, taxes, emergency response, customer property in its custody, and performance of the confirmed service.',
          'The supplier must handle service-level complaints, incidents, and approved remedies promptly and must cooperate with Mandyal Travels, payment providers, insurers, authorities, and affected customers as lawfully required.',
        ],
      },
      {
        heading: 'Mandyal Travels responsibility',
        paragraphs: [
          'Mandyal Travels is responsible for operating its technology with reasonable care, clearly disclosing its role, transmitting information and reservations accurately, presenting supplier information without knowing distortion, protecting data within its control, providing its grievance channel, and handling funds, records, or refunds that it actually facilitates.',
          'Mandyal Travels must not ignore known safety or fraud risks merely because a supplier is independent. It may pause or remove listings, preserve evidence, warn affected users, hold unsettled amounts where legally and contractually permitted, and report matters to competent authorities.',
        ],
      },
      {
        heading: 'Verification is not a guarantee',
        paragraphs: [
          'Document checks are point-in-time risk controls. A submitted registration, licence, permit, insurance certificate, ownership record, inspection, rating, or review may later expire, be suspended, be inaccurate, or fail to predict conduct. Mandyal Travels should state what was checked and when, and should not use a verification label that implies a broader guarantee.',
        ],
      },
      {
        heading: 'Consumer rights remain protected',
        paragraphs: [
          'A customer may have rights against the supplier, Mandyal Travels, or both depending on the facts and applicable law. Referring a complaint to the supplier does not remove Mandyal Travels’ own marketplace, payment, data, advertising, or grievance duties. Blanket “platform is never responsible” statements are not part of this policy.',
        ],
      },
    ],
  },
  'cancellation-refunds': {
    kind: 'cancellation-refunds',
    title: 'Cancellation and refund policy',
    summary:
      'How supplier terms, cancellations, refund decisions, payment returns, and disputes are handled.',
    version: 'cancellation-refunds-v2.0-pending-commercial-approval',
    status: 'DRAFT',
    lastUpdated: '2026-08-31',
    sections: [
      {
        heading: 'Terms shown before booking',
        paragraphs: [
          'Each offer must display whether it is refundable, the cancellation deadline and supplier timezone, applicable deductions or no-show charge, excluded components, amendment rules, platform or payment fees, and who decides the refund. A general promotion cannot override the specific terms accepted at confirmation.',
          'A term described only after payment, a hidden fee, or a misleading urgency or availability message must not be used to reduce a customer’s lawful remedy.',
        ],
      },
      {
        heading: 'Supplier-direct referrals',
        paragraphs: [
          'Where the customer booked and paid the supplier directly, cancellation and refund requests are decided and paid by that supplier under the confirmed terms and applicable law. Mandyal Travels can transmit or support a complaint but cannot return money it did not receive or control.',
        ],
      },
      {
        heading: 'Platform-facilitated bookings',
        paragraphs: [
          'Where Mandyal Travels facilitated payment, the customer may submit the request through the platform. Mandyal Travels will record the request, apply the displayed rule, obtain supplier confirmation where the supplier controls eligibility, and communicate the decision and available escalation.',
          'Supplier approval is not required where law, the confirmed terms, a duplicate or unauthorized payment, a platform error, or a supplier’s failure to provide the confirmed service independently establishes the customer’s remedy.',
        ],
      },
      {
        heading: 'Supplier cancellation, disruption, and no-show',
        paragraphs: [
          'If the supplier cancels or materially fails to provide a confirmed service, available remedies may include a comparable replacement accepted by the customer, travel credit voluntarily accepted by the customer, partial refund, or full refund as required by the confirmed terms and applicable law. Credit must not be forced where a refund is legally due.',
          'A customer no-show or late cancellation is handled under the displayed rule, except where law or documented exceptional circumstances require a different review.',
        ],
      },
      {
        heading: 'Refund authorization and settlement',
        paragraphs: [
          'When a supplier-controlled refund is approved in writing, Mandyal Travels will initiate the facilitated refund after receiving the supplier funds or applying an authorized settlement adjustment, unless Mandyal Travels is independently required to refund sooner. The customer should receive a refund reference or a clear explanation of any unresolved dependency.',
          'Supplier contracts must authorize recovery or set-off of customer refunds, chargebacks, and service failures from amounts payable to that supplier, subject to applicable law. Supplier settlement must not be treated as final while a linked refund or material dispute remains unresolved.',
        ],
      },
      {
        heading: 'Method, timing, and fees',
        paragraphs: [
          'Approved refunds should return to the original supported payment method where possible. Bank and payment-provider processing time begins after initiation and must be communicated as an estimate, not a guarantee. Mandyal Travels must publish the actual operational review and payment timelines before commercial launch.',
          'Any non-refundable platform fee must be separately disclosed before payment and must remain subject to mandatory consumer rights. A customer will not receive duplicate recovery through both a refund and a chargeback for the same amount.',
        ],
      },
      {
        heading: 'Disputes and evidence',
        paragraphs: [
          'The customer and supplier may be asked for the confirmation, communications, cancellation timestamp, service evidence, incident report, or payment record. Reviews must be impartial, access-controlled, and documented. A rejected request must state the applicable reason and escalation path.',
          commonContact,
        ],
      },
    ],
  },
  'safety-grievances': {
    kind: 'safety-grievances',
    title: 'Safety, incidents, and grievance policy',
    summary:
      'What customers should do in an emergency and how safety, service, and platform complaints are escalated.',
    version: 'safety-grievances-v1.0-pending-legal-approval',
    status: 'DRAFT',
    lastUpdated: '2026-08-31',
    sections: [
      {
        heading: 'Emergency first',
        paragraphs: [
          'For immediate danger, injury, fire, violence, missing persons, unsafe driving, or suspected crime, contact the local emergency service or police first and move to safety where possible. Then notify the hotel or vehicle operator and Mandyal Travels. The platform is not an emergency-response service.',
        ],
      },
      {
        heading: 'Supplier incident responsibility',
        paragraphs: [
          'The supplier must maintain legally required emergency procedures, trained staff or drivers, incident records, insurance, permits, and cooperation with authorities. It is primarily responsible for immediate response and for harm caused by unsafe premises, vehicles, staff, drivers, or operational failures under its control.',
        ],
      },
      {
        heading: 'Reporting to Mandyal Travels',
        paragraphs: [
          'Report the booking reference, supplier, date and location, people affected, immediate action taken, and available evidence. Avoid publishing sensitive identity, medical, or payment information in a public review. Mandyal Travels may preserve records, restrict a listing, contact the supplier, support payment review, and refer credible risks to an insurer or authority.',
          commonContact,
        ],
      },
      {
        heading: 'Complaint ownership and escalation',
        paragraphs: [
          'A service complaint will be shared with the named supplier for response while Mandyal Travels tracks the marketplace or facilitated-booking aspects. A platform, privacy, payment, misleading-content, or grievance-handling complaint remains owned by Mandyal Travels within its role.',
          'The commercial service must acknowledge consumer complaints within forty-eight hours and redress them within one month where the Consumer Protection (E-Commerce) Rules, 2020 apply. The final launch page must prominently name the Mandyal Travels grievance officer and display each seller’s grievance details.',
        ],
      },
      {
        heading: 'Transport regulation warning',
        paragraphs: [
          'If Mandyal Travels controls or facilitates passenger transport in a manner that makes it a motor-vehicle aggregator, commercial launch must wait until the required State licence, passenger insurance, driver and vehicle controls, safety features, grievance process, and other applicable Motor Vehicle Aggregator Guidelines, 2025 requirements are confirmed. Describing the service as a referral does not decide its legal classification; actual operations do.',
        ],
      },
      {
        heading: 'No retaliation and no waiver',
        paragraphs: [
          'A supplier must not retaliate against a customer for a good-faith safety report or lawful complaint. Confidentiality may protect sensitive investigations, but no policy prevents a person from contacting emergency services, regulators, insurers, consumer forums, or courts.',
        ],
      },
    ],
  },
  'partner-standards': {
    kind: 'partner-standards',
    title: 'Hotel and vehicle partner standards',
    summary:
      'Minimum onboarding, listing, safety, service, data, and refund duties for independent partners.',
    version: 'partner-standards-v1.0-pending-legal-approval',
    status: 'DRAFT',
    lastUpdated: '2026-08-31',
    sections: [
      {
        heading: 'No public listing before approval and agreement',
        paragraphs: [
          'A hotel, property, vehicle, fleet, or driver must not become publicly bookable merely by creating an account or submitting a form. Mandyal Travels must complete the applicable review and both parties must accept a versioned partner agreement before a listing is activated.',
          'These public standards are not the partner contract. The signed agreement must allocate service, payment, tax, refund, insurance, data, audit, indemnity, suspension, complaint, and termination responsibilities and must be reviewed by qualified Indian counsel.',
        ],
      },
      {
        heading: 'Identity, authority, and compliance evidence',
        paragraphs: [
          'Partners must provide accurate legal identity, ownership or operating authority, address, tax and bank details, customer and grievance contacts, licences, registrations, permits, insurance, and other records required for their service and State. Records must be current and promptly updated after expiry, suspension, investigation, ownership change, or material incident.',
        ],
      },
      {
        heading: 'Hotel and property duties',
        paragraphs: [
          'A property partner is responsible for lawful occupancy, fire and life safety, building and local approvals, hygiene and sanitation, staff conduct, room and amenity accuracy, accessibility disclosures, security, guest registration, emergency procedures, taxes, insurance, and the confirmed stay.',
        ],
      },
      {
        heading: 'Vehicle and driver duties',
        paragraphs: [
          'A vehicle or fleet partner is responsible for lawful commercial operation, vehicle registration and fitness, required permits, insurance, maintenance, driver licensing and background controls, hours and fitness to drive, safety equipment, fare and route disclosures, incident response, and compliance with Central and State transport requirements.',
          'Mandyal Travels must separately determine whether its intended car workflow is legally an aggregator service. Partner warranties alone do not replace a licence or platform duty imposed by transport law.',
        ],
      },
      {
        heading: 'Listings, availability, and customer treatment',
        paragraphs: [
          'Partners must keep descriptions, images, location, inclusions, exclusions, inventory, price, tax, fees, availability, cancellation rules, accessibility, and restrictions accurate. Bait pricing, fake scarcity, undisclosed fees, fabricated reviews, discriminatory conduct, and substitution without informed customer agreement are prohibited.',
        ],
      },
      {
        heading: 'Payments, refunds, and records',
        paragraphs: [
          'Partners must honour confirmed rates and lawful refunds, provide timely decisions and evidence, maintain sufficient settlement details, and authorize contractual recovery or set-off where applicable. They must retain and produce booking, service, tax, safety, complaint, cancellation, and refund records for the required period.',
        ],
      },
      {
        heading: 'Data and confidentiality',
        paragraphs: [
          'Customer data may be used only to fulfil, support, secure, or lawfully account for the service. Partners must restrict access, protect credentials, report suspected breaches promptly, follow deletion or return instructions where lawful, and must not sell customer data or add travellers to unrelated marketing lists without valid permission.',
        ],
      },
      {
        heading: 'Monitoring, suspension, and responsibility',
        paragraphs: [
          'Mandyal Travels may request updated evidence, investigate credible complaints, pause bookings or settlement where contractually and legally permitted, correct or remove content, suspend access, or terminate a partner for safety, fraud, expired documents, repeated service failure, non-payment of refunds, or legal non-compliance.',
          'The partner remains responsible for its service and for acts or omissions of its owners, staff, contractors, and drivers. The final agreement should contain a proportionate indemnity for third-party claims caused by the partner’s breach, negligence, misconduct, legal non-compliance, or inaccurate listing, while preserving non-waivable law and Mandyal Travels’ responsibility for its own conduct.',
        ],
      },
    ],
  },
  cookies: {
    kind: 'cookies',
    title: 'Cookie and storage notice',
    summary:
      'How browser storage supports authentication, security, preferences, and measured product improvement.',
    version: 'cookies-v1.1-pending-legal-approval',
    status: 'DRAFT',
    lastUpdated: '2026-08-31',
    sections: [
      {
        heading: 'Essential storage',
        paragraphs: [
          'Essential cookies or equivalent storage may maintain authenticated sessions, security protections, consent choices, language or currency choices, booking continuity, and other features requested by the user. Disabling them may prevent core services from working.',
        ],
      },
      {
        heading: 'Optional storage',
        paragraphs: [
          'Analytics, personalization, or advertising storage must remain disabled until each provider, purpose, retention period, recipient, and consent control is approved and accurately disclosed. Optional consent must not be bundled with essential service or obtained through deceptive design.',
        ],
      },
      {
        heading: 'Controls and retention',
        paragraphs: [
          'Users can accept, reject, or later change optional choices through the provided control and can also remove browser storage. Account communication preferences are separate from browser-storage consent. The final notice must list actual cookie names, providers, purposes, and lifetimes before optional cookies are enabled.',
        ],
      },
      {
        heading: 'Contact',
        paragraphs: [commonContact],
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
