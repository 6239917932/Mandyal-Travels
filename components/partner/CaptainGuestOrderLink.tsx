'use client';

import Image from 'next/image';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/Button';

export function CaptainGuestOrderLink({
  confirmationCode,
  guestName,
}: {
  confirmationCode: string;
  guestName: string;
}) {
  const [status, setStatus] = useState<string>();
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    const guestUrl = new URL(
      `/qr-order/${encodeURIComponent(confirmationCode)}`,
      window.location.origin,
    ).toString();
    void QRCode.toDataURL(guestUrl, {
      color: { dark: '#082745', light: '#ffffff' },
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 320,
    })
      .then(setQrDataUrl)
      .catch(() => setStatus('The QR image could not be generated. Use the secure link instead.'));
  }, [confirmationCode]);

  async function share() {
    const guestUrl = new URL(
      `/qr-order/${encodeURIComponent(confirmationCode)}`,
      window.location.origin,
    ).toString();
    try {
      if (navigator.share) {
        await navigator.share({
          text: `Open the secure restaurant menu for ${guestName}.`,
          title: 'Guest restaurant order',
          url: guestUrl,
        });
        setStatus('Guest order link shared.');
      } else {
        await navigator.clipboard.writeText(guestUrl);
        setStatus('Guest order link copied.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setStatus('The link could not be shared. Copy it from the address below.');
    }
  }

  const path = `/qr-order/${confirmationCode}`;
  return (
    <div className="captain-guest-qr">
      {qrDataUrl ? (
        <a download={`mandyal-guest-order-${confirmationCode}.png`} href={qrDataUrl}>
          <Image
            alt={`Guest ordering QR code for ${guestName}`}
            height={180}
            src={qrDataUrl}
            unoptimized
            width={180}
          />
        </a>
      ) : (
        <span className="captain-guest-qr__loading" role="status">
          Preparing QR code…
        </span>
      )}
      <div>
        <code>{path}</code>
        <p>
          Scan to open the secure guest menu. The link still requires authorized booking access.
        </p>
        <div className="manage-booking__document-actions">
          <Button onClick={share} size="small" variant="secondary">
            Share guest order link
          </Button>
          <a className="ui-button ui-button--ghost ui-button--small" href={path} target="_blank">
            Preview
          </a>
          {qrDataUrl ? (
            <a
              className="ui-button ui-button--ghost ui-button--small"
              download={`mandyal-guest-order-${confirmationCode}.png`}
              href={qrDataUrl}
            >
              Download QR
            </a>
          ) : null}
        </div>
        {status ? <small role="status">{status}</small> : null}
      </div>
    </div>
  );
}
