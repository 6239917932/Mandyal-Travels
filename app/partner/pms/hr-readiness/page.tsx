import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/Card';
import { getPartnerAccess } from '@/lib/partnerAuth';
import { getPartnerHrReadiness } from '@/services/partnerHrReadinessService';

export const metadata: Metadata = { title: 'HR and payroll readiness | Mandyal PMS' };

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function readinessLabel(ready: boolean) {
  return ready ? 'Ready' : 'Action required';
}

export default async function PartnerHrReadinessPage() {
  const access = await getPartnerAccess();
  if (!access?.partnerId || access.partnerType !== 'HOTEL') redirect('/partner');
  if (access.memberRole !== 'ADMIN') {
    return (
      <main className="booking-page">
        <div className="booking-page__container">
          <Card>
            <h1>Administrator access required</h1>
            <p>Staff security and payroll readiness are restricted to hotel administrators.</p>
            <Link className="ui-button ui-button--secondary" href="/partner/pms">
              Return to PMS dashboard
            </Link>
          </Card>
        </div>
      </main>
    );
  }
  const workspace = await getPartnerHrReadiness({
    memberRole: access.memberRole,
    partnerId: access.partnerId,
  });
  const allActiveStaffSecure =
    workspace.counts.active > 0 && workspace.counts.securityReady === workspace.counts.active;

  return (
    <main className="booking-page">
      <div className="booking-page__container">
        <header className="partner-page__heading">
          <div>
            <p className="hotel-page__eyebrow">People operations · readiness controls</p>
            <h1>HR and payroll readiness</h1>
            <p className="booking-page__intro">
              Use named PMS accounts as the authoritative access roster, review role and security
              posture, and keep payroll disabled until approved employment and statutory records
              exist.
            </p>
          </div>
          <div className="manage-booking__document-actions">
            <Link className="ui-button ui-button--primary" href="/partner/access">
              Manage team access
            </Link>
            <Link className="ui-button ui-button--secondary" href="/partner/activity">
              Activity log
            </Link>
          </div>
        </header>

        {workspace.safetyLimitReached ? (
          <p className="booking-page__payment-error" role="alert">
            The 500-member safety limit was reached. This roster is incomplete; use the paginated
            access directory before making a staffing decision.
          </p>
        ) : null}

        <div className="partner-bookings__summary">
          <Card>
            <span>Named staff accounts</span>
            <strong>{workspace.safetyLimitReached ? '500+' : workspace.counts.total}</strong>
            <small>{workspace.counts.active} active</small>
          </Card>
          <Card>
            <span>Administrators</span>
            <strong>{workspace.counts.administrators}</strong>
            <small>{workspace.counts.operators} operators</small>
          </Card>
          <Card>
            <span>Verified email</span>
            <strong>
              {workspace.counts.verifiedEmail} / {workspace.counts.total}
            </strong>
          </Card>
          <Card>
            <span>Two-step verification</span>
            <strong>
              {workspace.counts.mfaEnabled} / {workspace.counts.total}
            </strong>
          </Card>
          <Card>
            <span>Payroll execution</span>
            <strong>{workspace.payrollExecutionEnabled ? 'Enabled' : 'Not released'}</strong>
            <small>No salary or bank instruction is stored here</small>
          </Card>
        </div>

        <Card>
          <p className="hotel-page__eyebrow">Access-backed staff roster</p>
          <h2>Named PMS users</h2>
          {workspace.staff.length ? (
            <div className="pms-room-rack__table-wrap">
              <table className="pms-room-rack__table">
                <thead>
                  <tr>
                    <th scope="col">Staff member</th>
                    <th scope="col">Role</th>
                    <th scope="col">Access</th>
                    <th scope="col">Email</th>
                    <th scope="col">Two-step verification</th>
                    <th scope="col">Latest recorded activity</th>
                  </tr>
                </thead>
                <tbody>
                  {workspace.staff.map((member) => (
                    <tr key={member.id}>
                      <th scope="row">
                        {member.name}
                        <small>Access granted {formatDate(member.accessGrantedAt)}</small>
                      </th>
                      <td>{member.role === 'ADMIN' ? 'Administrator' : 'Operator'}</td>
                      <td>{member.accessStatus.toLowerCase().replaceAll('_', ' ')}</td>
                      <td>
                        {member.email}
                        <small>{member.emailVerified ? 'Verified' : 'Verification required'}</small>
                      </td>
                      <td>{member.mfaEnabled ? 'Enabled' : 'Enrollment required'}</td>
                      <td>
                        {member.lastActivity ? (
                          <>
                            {member.lastActivity.action.toLowerCase().replaceAll('_', ' ')}
                            <small>{formatDate(member.lastActivity.createdAt)}</small>
                          </>
                        ) : (
                          'No partner activity recorded'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No named partner members are available.</p>
          )}
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Security readiness</p>
          <h2>Least-privilege prerequisites</h2>
          <ul className="pms-room-rack__queue-list">
            <li>
              <strong>Named user accounts</strong>
              <span>{readinessLabel(workspace.counts.active > 0)}</span>
              <small>Shared front-desk or manager credentials are not a staff roster.</small>
            </li>
            <li>
              <strong>Administrator and operator roles</strong>
              <span>{readinessLabel(workspace.counts.administrators > 0)}</span>
              <small>Assign only the access required for each person’s duties.</small>
            </li>
            <li>
              <strong>Verified email and two-step verification</strong>
              <span>{readinessLabel(allActiveStaffSecure)}</span>
              <small>
                {workspace.counts.securityReady} of {workspace.counts.active} active accounts meet
                both checks.
              </small>
            </li>
            <li>
              <strong>Immutable partner activity</strong>
              <span>Available</span>
              <small>Review sensitive PMS actions in the partner activity log.</small>
            </li>
          </ul>
        </Card>

        <Card>
          <p className="hotel-page__eyebrow">Payroll boundary</p>
          <h2>Required before payroll can be designed or activated</h2>
          <ul>
            <li>Verified employment identity, joining date, work location and contract terms.</li>
            <li>Approved earnings, deductions, overtime, leave and attendance policies.</li>
            <li>
              Validated provident-fund, ESI, professional-tax, income-tax and State-specific rules
              where applicable.
            </li>
            <li>Restricted employee bank details and a maker-checker payment approval process.</li>
            <li>Payslip, correction, arrears, termination and statutory filing controls.</li>
          </ul>
          <p>
            None of these records are inferred from PMS access membership. This workspace does not
            store salary, attendance, tax identifiers, bank details, generate payslips, calculate
            statutory deductions, or transmit payroll payments.
          </p>
        </Card>
      </div>
    </main>
  );
}
