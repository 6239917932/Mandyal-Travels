export const PAYMENT_PROVIDER_IDS = ['payu', 'razorpay'] as const;

export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number] | 'configured-gateway';

export type PaymentProviderCapabilities = Readonly<{
  hostedCheckout: boolean;
  refunds: boolean;
  splitSettlements: boolean;
}>;

const CAPABILITIES: Readonly<Record<PaymentProviderId, PaymentProviderCapabilities>> = {
  'configured-gateway': {
    hostedCheckout: true,
    refunds: true,
    splitSettlements: false,
  },
  payu: {
    hostedCheckout: true,
    refunds: true,
    splitSettlements: false,
  },
  razorpay: {
    hostedCheckout: false,
    refunds: false,
    splitSettlements: false,
  },
};

export function selectedPaymentProvider(value: string | undefined): PaymentProviderId {
  const normalized = value?.trim().toLowerCase();
  if (normalized === 'payu' || normalized === 'razorpay') return normalized;
  return 'configured-gateway';
}

export function paymentProviderCapabilities(
  provider: PaymentProviderId,
): PaymentProviderCapabilities {
  return CAPABILITIES[provider];
}

export function assertPaymentProviderCapability(
  provider: PaymentProviderId,
  capability: keyof PaymentProviderCapabilities,
): void {
  if (!CAPABILITIES[provider][capability]) {
    throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  }
}
