'use client';

import { Button } from '@/components/ui/Button';

export function PrintDocumentButton({ label }: { label: string }) {
  return (
    <Button className="booking-document__print-button" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
