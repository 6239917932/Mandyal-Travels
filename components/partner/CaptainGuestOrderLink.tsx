'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';

export function CaptainGuestOrderLink({
  confirmationCode,
  guestName,
}: {
  confirmationCode: string;
  guestName: string;
}) {
  const [status, setStatus] = useState<string>();

  async function share() {
    const url = new URL(
      `/qr-order/${encodeURIComponent(confirmationCode)}`,
      window.location.origin,
    ).toString();
    try {
      if (navigator.share) {
        await navigator.share({
          text: `Open the secure restaurant menu for ${guestName}.`,
          title: 'Guest restaurant order',
          url,
        });
        setStatus('Guest order link shared.');
      } else {
        await navigator.clipboard.writeText(url);
        setStatus('Guest order link copied.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus('The link could not be shared. Copy it from the address below.');
    }
  }

  const path = `/qr-order/${confirmationCode}`;
  return (
    <div>
      <code>{path}</code>
      <div className="manage-booking__document-actions">
        <Button onClick={share} size="small" variant="secondary">
          Share guest order link
        </Button>
        <a className="ui-button ui-button--ghost ui-button--small" href={path} target="_blank">
          Preview
        </a>
      </div>
      {status ? <small role="status">{status}</small> : null}
    </div>
  );
}
