import type { SupportOperatorBrief } from '@/services/supportOperatorBriefService';

export function AdminSupportCaseBrief({ brief }: { brief: SupportOperatorBrief }) {
  return (
    <details className="admin-support-brief">
      <summary>Operator brief</summary>
      <div className="admin-support-brief__content">
        <strong>Record-derived context</strong>
        <p>{brief.summary}</p>
        <strong>Human review checklist</strong>
        <ol>
          {brief.checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <small>
          Deterministic guidance only. This brief does not rank the case, decide an outcome, contact
          anyone, or change any record.
        </small>
      </div>
    </details>
  );
}
