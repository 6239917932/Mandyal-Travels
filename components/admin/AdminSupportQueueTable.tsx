import Link from 'next/link';

import { AdminCustomerSupportAction } from '@/components/admin/AdminCustomerSupportAction';
import { AdminSupportCaseBrief } from '@/components/admin/AdminSupportCaseBrief';
import { AdminSupportAction } from '@/components/admin/AdminSupportAction';
import { buildSupportOperatorBrief } from '@/services/supportOperatorBriefService';

type SupportCreator = {
  email: string;
  firstName: string;
  id: string;
  lastName: string;
};

type CustomerSupportQueueCase = {
  bookingReference: string | null;
  caseNumber: string;
  category: string;
  createdAt: Date;
  createdBy: SupportCreator;
  id: string;
  message: string;
  resolutionNote: string | null;
  status: string;
  subject: string;
  updatedAt: Date;
};

type BusinessSupportQueueCase = Omit<CustomerSupportQueueCase, 'resolutionNote'> & {
  organization: { id: string; name: string };
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

function statusClass(status: string): string {
  return `business-request__status business-request__status--${status.toLowerCase()}`;
}

export function AdminCustomerSupportQueueTable({ cases }: { cases: CustomerSupportQueueCase[] }) {
  return (
    <table className="business-report__table">
      <thead>
        <tr>
          <th>Case</th>
          <th>Customer</th>
          <th>Request</th>
          <th>Booking</th>
          <th>Status and action</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {cases.map((supportCase) => (
          <tr key={supportCase.id}>
            <td>
              <strong>{supportCase.caseNumber}</strong>
              <span>{supportCase.category}</span>
            </td>
            <td>
              <Link href={`/admin/users/${supportCase.createdBy.id}`}>
                <strong>
                  {supportCase.createdBy.firstName} {supportCase.createdBy.lastName}
                </strong>
              </Link>
              <span>{supportCase.createdBy.email}</span>
            </td>
            <td>
              <strong>{supportCase.subject}</strong>
              <span>{supportCase.message}</span>
              {supportCase.resolutionNote ? (
                <span>Resolution: {supportCase.resolutionNote}</span>
              ) : null}
              <AdminSupportCaseBrief
                brief={buildSupportOperatorBrief({
                  bookingReferencePresent: Boolean(supportCase.bookingReference),
                  category: supportCase.category,
                  createdAt: supportCase.createdAt,
                  kind: 'CUSTOMER',
                  status: supportCase.status,
                })}
              />
            </td>
            <td>{supportCase.bookingReference ?? 'Not provided'}</td>
            <td>
              <strong className={statusClass(supportCase.status)}>{supportCase.status}</strong>
              <AdminCustomerSupportAction caseId={supportCase.id} status={supportCase.status} />
            </td>
            <td>
              <time dateTime={supportCase.updatedAt.toISOString()}>
                {formatDate(supportCase.updatedAt)}
              </time>
            </td>
          </tr>
        ))}
        {cases.length === 0 ? (
          <tr>
            <td colSpan={6}>No customer support cases match these filters.</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}

export function AdminBusinessSupportQueueTable({ cases }: { cases: BusinessSupportQueueCase[] }) {
  return (
    <table className="business-report__table">
      <thead>
        <tr>
          <th>Case</th>
          <th>Organization</th>
          <th>Created by</th>
          <th>Request</th>
          <th>Status and action</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {cases.map((supportCase) => (
          <tr key={supportCase.id}>
            <td>
              <strong>{supportCase.caseNumber}</strong>
              <span>{supportCase.category}</span>
            </td>
            <td>
              <Link href={`/admin/organizations/${supportCase.organization.id}`}>
                <strong>{supportCase.organization.name}</strong>
              </Link>
            </td>
            <td>
              <Link href={`/admin/users/${supportCase.createdBy.id}`}>
                <strong>
                  {supportCase.createdBy.firstName} {supportCase.createdBy.lastName}
                </strong>
              </Link>
              <span>{supportCase.createdBy.email}</span>
            </td>
            <td>
              <strong>{supportCase.subject}</strong>
              <span>{supportCase.message}</span>
              <span>{supportCase.bookingReference ?? 'No booking reference'}</span>
              <AdminSupportCaseBrief
                brief={buildSupportOperatorBrief({
                  bookingReferencePresent: Boolean(supportCase.bookingReference),
                  category: supportCase.category,
                  createdAt: supportCase.createdAt,
                  kind: 'BUSINESS',
                  status: supportCase.status,
                })}
              />
            </td>
            <td>
              <strong className={statusClass(supportCase.status)}>{supportCase.status}</strong>
              <AdminSupportAction caseId={supportCase.id} status={supportCase.status} />
            </td>
            <td>
              <time dateTime={supportCase.updatedAt.toISOString()}>
                {formatDate(supportCase.updatedAt)}
              </time>
            </td>
          </tr>
        ))}
        {cases.length === 0 ? (
          <tr>
            <td colSpan={6}>No company support cases match these filters.</td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );
}
