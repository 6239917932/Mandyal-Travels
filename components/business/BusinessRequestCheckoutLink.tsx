'use client';

import Link from 'next/link';

import { saveActiveBusinessTravelRequest } from '@/lib/businessTravelClient';

type ProductType = 'FLIGHT' | 'HOTEL' | 'BUS' | 'CAR';

const productPaths: Record<ProductType, string> = {
  BUS: '/buses',
  CAR: '/cars',
  FLIGHT: '/flights',
  HOTEL: '/hotels',
};

export function BusinessRequestCheckoutLink({
  id,
  organizationName,
  productType,
  title,
}: {
  id: string;
  organizationName: string;
  productType: ProductType;
  title: string;
}) {
  return (
    <Link
      className="ui-button ui-button--primary"
      href={productPaths[productType]}
      onClick={() => saveActiveBusinessTravelRequest({ id, organizationName, productType, title })}
    >
      Continue to {productType.toLowerCase()} booking
    </Link>
  );
}
