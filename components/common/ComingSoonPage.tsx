import Link from 'next/link';

import { Card } from '@/components/ui/Card';

interface ComingSoonPageProps {
  description: string;
  eyebrow: string;
  title: string;
}

export function ComingSoonPage({ description, eyebrow, title }: ComingSoonPageProps) {
  return (
    <div className="coming-soon-page">
      <Card className="coming-soon-page__card" elevated>
        <p className="hotel-page__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <Link className="ui-button ui-button--primary" href="/hotels">
          Explore hotels
        </Link>
      </Card>
    </div>
  );
}
