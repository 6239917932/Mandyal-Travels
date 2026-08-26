export type PublicCheckoutIntentInput = Readonly<{
  amount: number;
  checkoutUrl: string;
  currency: string;
  expiresAt: Date;
  id: string;
  status: string;
}>;

export type PublicCheckoutIntent = Readonly<{
  amount: number;
  checkoutUrl: string;
  currency: string;
  expiresAt: string;
  id: string;
  status: string;
}>;

export function isPromotionAuthorizationWithinWindow(expiresAt: Date, authorizedAt: Date): boolean {
  return authorizedAt.getTime() <= expiresAt.getTime();
}

export function isConfirmedFullRefund(paymentAmount: number, approvedRefundTotal: number): boolean {
  return (
    Number.isSafeInteger(paymentAmount) &&
    paymentAmount > 0 &&
    Number.isSafeInteger(approvedRefundTotal) &&
    approvedRefundTotal >= paymentAmount
  );
}

export function publicCheckoutIntent(input: PublicCheckoutIntentInput): PublicCheckoutIntent {
  return {
    amount: input.amount,
    checkoutUrl: input.checkoutUrl,
    currency: input.currency,
    expiresAt: input.expiresAt.toISOString(),
    id: input.id,
    status: input.status,
  };
}
