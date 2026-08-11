'use client';

import { useEffect, useState } from 'react';

import {
  clearActiveBusinessTravelRequest,
  readActiveBusinessTravelRequest,
  type ActiveBusinessTravelRequest,
} from '@/lib/businessTravelClient';

export function BusinessCheckoutNotice({ productType }: { productType: string }) {
  const [request, setRequest] = useState<ActiveBusinessTravelRequest | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRequest(readActiveBusinessTravelRequest());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!request) return null;

  return (
    <div className="business-checkout-notice" role="status">
      <div>
        <strong>Company booking for {request.organizationName}</strong>
        <span>
          {request.title}. The approved request will be checked before this{' '}
          {productType.toLowerCase()} payment is completed.
        </span>
      </div>
      <button
        className="ui-button ui-button--secondary"
        onClick={() => {
          clearActiveBusinessTravelRequest();
          setRequest(null);
        }}
        type="button"
      >
        Switch to personal booking
      </button>
    </div>
  );
}
