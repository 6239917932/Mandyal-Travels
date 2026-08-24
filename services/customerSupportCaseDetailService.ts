import { prisma } from '@/lib/prisma';
import {
  CUSTOMER_SUPPORT_TIMELINE_LIMIT,
  customerSupportCategoryLabel,
  customerSupportEventLabel,
  customerSupportStatusLabel,
  normalizeCustomerSupportCaseNumber,
} from '@/services/customerSupportCaseDetailRules';
import type { CustomerSupportCaseDetail } from '@/types/customerSupportCaseDetail';

export async function getCustomerSupportCaseDetail({
  caseNumber,
  userId,
}: {
  caseNumber: string;
  userId: string;
}): Promise<CustomerSupportCaseDetail | null> {
  const normalizedCaseNumber = normalizeCustomerSupportCaseNumber(caseNumber);
  if (!normalizedCaseNumber) return null;

  const supportCase = await prisma.customerSupportCase.findFirst({
    select: {
      bookingReference: true,
      caseNumber: true,
      category: true,
      createdAt: true,
      events: {
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select: { action: true, createdAt: true, id: true },
        take: CUSTOMER_SUPPORT_TIMELINE_LIMIT + 1,
      },
      message: true,
      resolutionNote: true,
      status: true,
      subject: true,
      updatedAt: true,
    },
    where: { caseNumber: normalizedCaseNumber, userId },
  });
  if (!supportCase) return null;

  const hasEarlierEvents = supportCase.events.length > CUSTOMER_SUPPORT_TIMELINE_LIMIT;
  const visibleEvents = supportCase.events.slice(0, CUSTOMER_SUPPORT_TIMELINE_LIMIT).reverse();

  return {
    bookingReference: supportCase.bookingReference,
    caseNumber: supportCase.caseNumber,
    categoryLabel: customerSupportCategoryLabel(supportCase.category),
    createdAt: supportCase.createdAt,
    events: visibleEvents.map((event) => ({
      label: customerSupportEventLabel(event.action),
      recordedAt: event.createdAt,
    })),
    hasEarlierEvents,
    message: supportCase.message,
    resolutionNote: supportCase.resolutionNote,
    statusLabel: customerSupportStatusLabel(supportCase.status),
    subject: supportCase.subject,
    updatedAt: supportCase.updatedAt,
  };
}
