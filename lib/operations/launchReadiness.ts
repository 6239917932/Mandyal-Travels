export const LAUNCH_READINESS_STATUSES = ['READY', 'ACTION_REQUIRED', 'EXTERNAL_APPROVAL'] as const;

export type LaunchReadinessStatus = (typeof LAUNCH_READINESS_STATUSES)[number];

export type LaunchReadinessEvidence = {
  administratorMfa: boolean;
  completedAutomationJobs: ReadonlySet<string>;
  configuredEnvironmentKeys: ReadonlySet<string>;
  verifiedSupplierCount: number;
};

export type LaunchReadinessGate = {
  category: 'SECURITY' | 'OPERATIONS' | 'COMMERCE' | 'SUPPLY' | 'DELIVERY';
  id: string;
  owner: 'ADMINISTRATOR' | 'ENGINEERING' | 'FINANCE' | 'LEGAL' | 'PROVIDER';
  runbook: `docs/${string}.md`;
  status: LaunchReadinessStatus;
  summary: string;
  title: string;
};

type GateDefinition = Omit<LaunchReadinessGate, 'status'> & {
  evaluate?: (evidence: LaunchReadinessEvidence) => boolean;
};

const configured = (evidence: LaunchReadinessEvidence, ...keys: string[]) =>
  keys.every((key) => evidence.configuredEnvironmentKeys.has(key));

const automationCompleted = (evidence: LaunchReadinessEvidence, jobKey: string) =>
  evidence.completedAutomationJobs.has(jobKey);

const GATES: readonly GateDefinition[] = [
  {
    category: 'SECURITY',
    evaluate: (evidence) => evidence.administratorMfa,
    id: 'administrator-mfa',
    owner: 'ADMINISTRATOR',
    runbook: 'docs/ADMIN_SECURITY_POSTURE.md',
    summary:
      'Enroll the sole platform administrator in authenticator MFA and retain recovery codes offline.',
    title: 'Administrator two-step verification',
  },
  {
    category: 'OPERATIONS',
    evaluate: (evidence) => automationCompleted(evidence, 'DATABASE_RESTORE_VERIFICATION_V1'),
    id: 'database-restore-drill',
    owner: 'ENGINEERING',
    runbook: 'docs/BACKUP_DISASTER_RECOVERY_RUNBOOK.md',
    summary:
      'Restore a production backup into isolation and retain the successful integrity evidence.',
    title: 'Isolated database restore drill',
  },
  {
    category: 'OPERATIONS',
    evaluate: (evidence) => automationCompleted(evidence, 'NOTIFICATION_DELIVERY_V1'),
    id: 'notification-scheduler',
    owner: 'ENGINEERING',
    runbook: 'docs/SCHEDULER_WORKER_RUNBOOK.md',
    summary: 'Schedule bounded notification delivery and verify a successful recorded run.',
    title: 'Notification worker schedule',
  },
  {
    category: 'OPERATIONS',
    evaluate: (evidence) => automationCompleted(evidence, 'SAFE_MAINTENANCE_V1'),
    id: 'maintenance-scheduler',
    owner: 'ENGINEERING',
    runbook: 'docs/SCHEDULER_WORKER_RUNBOOK.md',
    summary: 'Schedule lease-protected expiry and maintenance work and verify a successful run.',
    title: 'Safe-maintenance schedule',
  },
  {
    category: 'OPERATIONS',
    evaluate: (evidence) => automationCompleted(evidence, 'SEARCH_PROJECTION_MAINTENANCE_V1'),
    id: 'search-scheduler',
    owner: 'ENGINEERING',
    runbook: 'docs/SCHEDULER_WORKER_RUNBOOK.md',
    summary: 'Schedule bounded search projection repair and verify a successful run.',
    title: 'Search projection schedule',
  },
  {
    category: 'OPERATIONS',
    evaluate: (evidence) => configured(evidence, 'OBSERVABILITY_PROVIDER_ID', 'ON_CALL_OWNER'),
    id: 'monitoring-alerts',
    owner: 'ENGINEERING',
    runbook: 'docs/OBSERVABILITY_RUNBOOK.md',
    summary:
      'Record the log platform and on-call owner, then verify warning and critical alert delivery.',
    title: 'Production monitoring and alerts',
  },
  {
    category: 'OPERATIONS',
    evaluate: (evidence) =>
      configured(evidence, 'EMAIL_DOMAIN_AUTH_VERIFIED_AT', 'EMAIL_BOUNCE_WEBHOOK_SECRET'),
    id: 'email-deliverability',
    owner: 'ENGINEERING',
    runbook: 'docs/EMAIL_PROVIDER_ACTIVATION.md',
    summary: 'Verify SPF, DKIM, DMARC, bounce/complaint processing and suppression behavior.',
    title: 'Transactional email deliverability',
  },
  {
    category: 'SECURITY',
    evaluate: (evidence) =>
      configured(
        evidence,
        'KYC_DOCUMENT_SIGNING_ENDPOINT',
        'KYC_DOCUMENT_SIGNING_API_KEY',
        'KYC_DOCUMENT_PROVIDER_ALLOWED_HOSTS',
      ),
    id: 'kyc-storage',
    owner: 'ENGINEERING',
    runbook: 'docs/SUPPLIER_ONBOARDING_LAUNCH_GATES.md',
    summary:
      'Provision private KYC storage with signing, scanning, access logging and retention controls.',
    title: 'Private KYC evidence storage',
  },
  {
    category: 'SECURITY',
    evaluate: (evidence) =>
      configured(
        evidence,
        'MEDIA_SIGNING_ENDPOINT',
        'MEDIA_SIGNING_API_KEY',
        'MEDIA_PROVIDER_ALLOWED_HOSTS',
      ),
    id: 'property-media-storage',
    owner: 'ENGINEERING',
    runbook: 'docs/MEDIA_STORAGE.md',
    summary:
      'Provision scanned, metadata-stripped, versioned property media storage and CDN delivery.',
    title: 'Property media storage',
  },
  {
    category: 'COMMERCE',
    evaluate: (evidence) =>
      configured(
        evidence,
        'PAYU_CLIENT_ID',
        'PAYU_CLIENT_SECRET',
        'PAYU_MERCHANT_KEY',
        'PAYU_MERCHANT_SALT',
      ),
    id: 'payu-collection',
    owner: 'FINANCE',
    runbook: 'docs/PAYMENT_GATEWAY.md',
    summary:
      'Obtain live PayU approval and certify checkout, callbacks, webhooks, refunds and reconciliation.',
    title: 'PayU live payment collection',
  },
  {
    category: 'COMMERCE',
    evaluate: (evidence) =>
      configured(
        evidence,
        'PAYOUT_PROVIDER_ID',
        'PAYOUT_PROVIDER_ENDPOINT',
        'PAYOUT_PROVIDER_API_KEY',
      ),
    id: 'supplier-payouts',
    owner: 'FINANCE',
    runbook: 'docs/PARTNER_SETTLEMENT_GOVERNANCE.md',
    summary:
      'Approve split settlement, supplier destinations, payout callbacks and reconciliation.',
    title: 'Supplier payout activation',
  },
  {
    category: 'COMMERCE',
    id: 'legal-approval',
    owner: 'LEGAL',
    runbook: 'docs/legal-launch-readiness.md',
    summary:
      'Indian counsel must approve supplier, marketplace, privacy, cancellation and dispute terms.',
    title: 'Counsel-approved launch documents',
  },
  {
    category: 'COMMERCE',
    id: 'tax-approval',
    owner: 'FINANCE',
    runbook: 'docs/GST_INVOICE_ACTIVATION.md',
    summary: 'A qualified adviser must approve GST, TCS/TDS, place-of-supply and invoice controls.',
    title: 'GST and accounting approval',
  },
  {
    category: 'SUPPLY',
    evaluate: (evidence) => evidence.verifiedSupplierCount > 0,
    id: 'verified-supplier',
    owner: 'ADMINISTRATOR',
    runbook: 'docs/SUPPLIER_ONBOARDING_LAUNCH_GATES.md',
    summary:
      'Complete all required evidence checks for at least one contracted accommodation supplier.',
    title: 'First verified supplier',
  },
  {
    category: 'SUPPLY',
    id: 'supplier-contract',
    owner: 'LEGAL',
    runbook: 'docs/COMMERCIAL_APPROVALS.md',
    summary:
      'Execute at least one direct supplier contract covering rates, service, refunds and settlement.',
    title: 'Direct accommodation supply contract',
  },
  {
    category: 'SUPPLY',
    id: 'hotelbeds-certification',
    owner: 'PROVIDER',
    runbook: 'docs/hotelbeds-certification-readiness.md',
    summary:
      'Receive HBX credentials and certificate, then complete supervised sandbox certification.',
    title: 'Hotelbeds certification',
  },
  {
    category: 'SUPPLY',
    id: 'siteminder-reapplication',
    owner: 'PROVIDER',
    runbook: 'docs/HOTEL_CHANNEL_MANAGER_ACTIVATION.md',
    summary: 'Reapply after live traction; SiteMinder indicated roughly 25 active PMS properties.',
    title: 'SiteMinder reapplication threshold',
  },
  {
    category: 'DELIVERY',
    evaluate: (evidence) => configured(evidence, 'MAPS_PROVIDER_ID', 'MAPS_SERVER_API_KEY'),
    id: 'maps-geocoding',
    owner: 'PROVIDER',
    runbook: 'docs/MAPS_GEOCODING_ACTIVATION.md',
    summary:
      'Contract a maps provider and verify quotas, attribution, locality matching and key isolation.',
    title: 'Maps and geocoding provider',
  },
  {
    category: 'DELIVERY',
    evaluate: (evidence) =>
      configured(evidence, 'MOBILE_MESSAGING_PROVIDER_ID', 'MOBILE_MESSAGING_API_KEY'),
    id: 'mobile-messaging',
    owner: 'PROVIDER',
    runbook: 'docs/MOBILE_MESSAGING_ACTIVATION.md',
    summary:
      'Complete DLT/sender/template approval before enabling customer SMS or WhatsApp delivery.',
    title: 'Mobile messaging provider',
  },
  {
    category: 'DELIVERY',
    id: 'native-mobile-apps',
    owner: 'ENGINEERING',
    runbook: 'docs/ANDROID_APP_DELIVERY.md',
    summary:
      'Build, security-test, sign and release the Android and iOS clients with push configuration.',
    title: 'Native mobile applications',
  },
] as const;

const EXTERNAL_OWNERS = new Set<LaunchReadinessGate['owner']>(['FINANCE', 'LEGAL', 'PROVIDER']);

export function assessLaunchReadiness(evidence: LaunchReadinessEvidence): LaunchReadinessGate[] {
  return GATES.map(({ evaluate, ...gate }) => ({
    ...gate,
    status: evaluate?.(evidence)
      ? 'READY'
      : EXTERNAL_OWNERS.has(gate.owner)
        ? 'EXTERNAL_APPROVAL'
        : 'ACTION_REQUIRED',
  }));
}

export function launchReadinessEnvironmentKeys(): string[] {
  const names = new Set<string>();
  const probe = new Proxy(names, {
    get(target, property) {
      if (property === 'has') {
        return (name: string) => {
          target.add(name);
          return false;
        };
      }
      return Reflect.get(target, property);
    },
  }) as ReadonlySet<string>;
  const evidence: LaunchReadinessEvidence = {
    administratorMfa: false,
    completedAutomationJobs: new Set(),
    configuredEnvironmentKeys: probe,
    verifiedSupplierCount: 0,
  };
  for (const gate of GATES) gate.evaluate?.(evidence);
  return [...names].sort();
}

export const LAUNCH_READINESS_GATE_COUNT = GATES.length;
