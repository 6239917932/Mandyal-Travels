import { Card } from '@/components/ui/Card';

type BusinessAuditEntry = {
  action: string;
  actorName: string | null;
  createdAt: string;
  id: string;
  summary: string;
};

export function BusinessAuditTimeline({ entries }: { entries: BusinessAuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <Card className="account-trips__empty">
        <strong>No recorded company activity yet.</strong>
        <p>New policy, member, approval, and booking actions will appear here.</p>
      </Card>
    );
  }

  return (
    <Card className="business-audit">
      <ol className="business-audit__list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <div>
              <strong>{entry.summary}</strong>
              <span>{entry.action.replaceAll('_', ' ').toLowerCase()}</span>
            </div>
            <div>
              <span>{entry.actorName ?? 'System'}</span>
              <time dateTime={entry.createdAt}>
                {new Date(entry.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
