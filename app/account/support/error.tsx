'use client';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function CustomerSupportError({ retry }: { retry: () => void }) {
  return (
    <section className="account-page">
      <Card>
        <h1>Customer support is temporarily unavailable</h1>
        <p>Your cases could not be loaded. No request was submitted or changed.</p>
        <Button onClick={retry} type="button" variant="primary">
          Try again
        </Button>
      </Card>
    </section>
  );
}
