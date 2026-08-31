export type JournalDirection = 'CREDIT' | 'DEBIT';

export interface PaymentAllocationDraft {
  allocationKey: 'platform-commission' | 'supplier-payable' | 'tax-payable';
  allocationType: 'PLATFORM_COMMISSION' | 'SUPPLIER_PAYABLE' | 'TAX_PAYABLE';
  amount: number;
}

type MarketplaceCaptureBreakdown = {
  commissionGrossAmount: number;
  commissionGstAmount: number;
  commissionTaxableAmount: number;
  customerTotalAmount: number;
  ecoGstLiabilityAmount: number;
  gstTcsAmount: number;
  incomeTaxTdsAmount: number;
  vendorSettlementAmount: number;
};

export interface JournalPostingDraft {
  accountCode: string;
  amount: number;
  description: string;
  direction: JournalDirection;
  partnerId?: string;
}

function assertMoney(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${field} must be a non-negative integer amount.`);
  }
}

export function createCaptureAccounting(input: {
  amount: number;
  commissionBasisPoints: number;
  partnerId?: string;
  taxAmount: number;
}): { allocations: PaymentAllocationDraft[]; postings: JournalPostingDraft[] } {
  assertMoney(input.amount, 'Captured amount');
  assertMoney(input.taxAmount, 'Tax amount');
  if (input.taxAmount > input.amount) throw new Error('Tax amount cannot exceed captured amount.');
  if (
    !Number.isInteger(input.commissionBasisPoints) ||
    input.commissionBasisPoints < 0 ||
    input.commissionBasisPoints > 10_000
  ) {
    throw new Error('Commission basis points must be between 0 and 10,000.');
  }

  const commissionBase = input.amount - input.taxAmount;
  const commissionAmount = Math.round((commissionBase * input.commissionBasisPoints) / 10_000);
  const supplierAmount = commissionBase - commissionAmount;
  const allocations: PaymentAllocationDraft[] = [
    {
      allocationKey: 'supplier-payable',
      allocationType: 'SUPPLIER_PAYABLE',
      amount: supplierAmount,
    },
    {
      allocationKey: 'platform-commission',
      allocationType: 'PLATFORM_COMMISSION',
      amount: commissionAmount,
    },
    {
      allocationKey: 'tax-payable',
      allocationType: 'TAX_PAYABLE',
      amount: input.taxAmount,
    },
  ];
  const postings: JournalPostingDraft[] = [
    {
      accountCode: 'PAYMENT_PROVIDER_CLEARING',
      amount: input.amount,
      description: 'Captured funds receivable from payment provider',
      direction: 'DEBIT',
    },
    ...(supplierAmount > 0
      ? [
          {
            accountCode: 'SUPPLIER_PAYABLE',
            amount: supplierAmount,
            description: 'Amount owed to the supplying partner',
            direction: 'CREDIT' as const,
            partnerId: input.partnerId,
          },
        ]
      : []),
    ...(commissionAmount > 0
      ? [
          {
            accountCode: 'PLATFORM_REVENUE',
            amount: commissionAmount,
            description: 'Platform commission earned',
            direction: 'CREDIT' as const,
          },
        ]
      : []),
    ...(input.taxAmount > 0
      ? [
          {
            accountCode: 'TAX_PAYABLE',
            amount: input.taxAmount,
            description: 'Taxes and fees held for remittance',
            direction: 'CREDIT' as const,
          },
        ]
      : []),
  ];
  assertBalancedJournal(postings);
  return { allocations, postings };
}

export function createMarketplaceCaptureAccounting(input: {
  breakdown: MarketplaceCaptureBreakdown;
  partnerId: string;
}): { allocations: PaymentAllocationDraft[]; postings: JournalPostingDraft[] } {
  const { breakdown } = input;
  Object.entries(breakdown).forEach(([field, value]) => assertMoney(value, field));
  const governmentPayable =
    breakdown.ecoGstLiabilityAmount + breakdown.gstTcsAmount + breakdown.incomeTaxTdsAmount;
  if (
    breakdown.vendorSettlementAmount + breakdown.commissionGrossAmount + governmentPayable !==
    breakdown.customerTotalAmount
  ) {
    throw new Error('Marketplace allocations do not equal the customer payment.');
  }
  if (
    breakdown.commissionTaxableAmount + breakdown.commissionGstAmount !==
    breakdown.commissionGrossAmount
  ) {
    throw new Error('Commission taxable value and GST do not equal gross commission.');
  }

  const allocations: PaymentAllocationDraft[] = [
    {
      allocationKey: 'supplier-payable',
      allocationType: 'SUPPLIER_PAYABLE',
      amount: breakdown.vendorSettlementAmount,
    },
    {
      allocationKey: 'platform-commission',
      allocationType: 'PLATFORM_COMMISSION',
      amount: breakdown.commissionGrossAmount,
    },
    { allocationKey: 'tax-payable', allocationType: 'TAX_PAYABLE', amount: governmentPayable },
  ];
  const postings: JournalPostingDraft[] = [
    {
      accountCode: 'PAYMENT_PROVIDER_CLEARING',
      amount: breakdown.customerTotalAmount,
      description: 'Captured marketplace funds receivable from payment provider',
      direction: 'DEBIT',
    },
    {
      accountCode: 'SUPPLIER_PAYABLE',
      amount: breakdown.vendorSettlementAmount,
      description: 'Net amount payable to supplying partner after statutory withholding',
      direction: 'CREDIT',
      partnerId: input.partnerId,
    },
    {
      accountCode: 'PLATFORM_REVENUE',
      amount: breakdown.commissionTaxableAmount,
      description: 'Marketplace commission excluding GST',
      direction: 'CREDIT',
    },
    {
      accountCode: 'COMMISSION_GST_PAYABLE',
      amount: breakdown.commissionGstAmount,
      description: 'GST included in marketplace commission',
      direction: 'CREDIT',
    },
    ...(breakdown.ecoGstLiabilityAmount
      ? [
          {
            accountCode: 'ECO_GST_PAYABLE',
            amount: breakdown.ecoGstLiabilityAmount,
            description: 'Section 9(5) accommodation GST payable by platform',
            direction: 'CREDIT' as const,
          },
        ]
      : []),
    ...(breakdown.gstTcsAmount
      ? [
          {
            accountCode: 'GST_TCS_PAYABLE',
            amount: breakdown.gstTcsAmount,
            description: 'GST tax collected at source for partner credit',
            direction: 'CREDIT' as const,
            partnerId: input.partnerId,
          },
        ]
      : []),
    ...(breakdown.incomeTaxTdsAmount
      ? [
          {
            accountCode: 'SECTION_194O_TDS_PAYABLE',
            amount: breakdown.incomeTaxTdsAmount,
            description: 'Income-tax withholding for partner credit',
            direction: 'CREDIT' as const,
            partnerId: input.partnerId,
          },
        ]
      : []),
  ];
  assertBalancedJournal(postings);
  return { allocations, postings };
}

export function createRefundPostings(amount: number): JournalPostingDraft[] {
  assertMoney(amount, 'Refund amount');
  if (amount === 0) throw new Error('Refund amount must be greater than zero.');
  return [
    {
      accountCode: 'CUSTOMER_REFUNDS',
      amount,
      description: 'Customer refund obligation recognized',
      direction: 'DEBIT',
    },
    {
      accountCode: 'PAYMENT_PROVIDER_CLEARING',
      amount,
      description: 'Refund due through the payment provider',
      direction: 'CREDIT',
    },
  ];
}

export function prorateCaptureAllocations(input: {
  capturedAmount: number;
  commissionAmount: number;
  refundedAmount: number;
  taxAmount: number;
}): { commissionAmount: number; grossAmount: number; supplierAmount: number; taxAmount: number } {
  assertMoney(input.capturedAmount, 'Captured amount');
  assertMoney(input.commissionAmount, 'Commission amount');
  assertMoney(input.refundedAmount, 'Refunded amount');
  assertMoney(input.taxAmount, 'Tax amount');
  if (input.capturedAmount === 0 || input.refundedAmount > input.capturedAmount) {
    throw new Error('Refunded amount cannot exceed a positive captured amount.');
  }
  const originalSupplier = input.capturedAmount - input.commissionAmount - input.taxAmount;
  if (originalSupplier < 0)
    throw new Error('Capture allocations cannot exceed the captured amount.');
  const grossAmount = input.capturedAmount - input.refundedAmount;
  const commissionAmount = Math.floor(
    (input.commissionAmount * grossAmount) / input.capturedAmount,
  );
  const taxAmount = Math.floor((input.taxAmount * grossAmount) / input.capturedAmount);
  return {
    commissionAmount,
    grossAmount,
    supplierAmount: grossAmount - commissionAmount - taxAmount,
    taxAmount,
  };
}

export function assertBalancedJournal(postings: readonly JournalPostingDraft[]): void {
  const debit = postings
    .filter((posting) => posting.direction === 'DEBIT')
    .reduce((total, posting) => total + posting.amount, 0);
  const credit = postings
    .filter((posting) => posting.direction === 'CREDIT')
    .reduce((total, posting) => total + posting.amount, 0);
  if (debit <= 0 || debit !== credit) {
    throw new Error(`Journal is not balanced: debit ${debit}, credit ${credit}.`);
  }
}
