export const ACTIVE_BUSINESS_TRAVEL_REQUEST_KEY = 'mandyal-active-business-travel-request';

export type ActiveBusinessTravelRequest = {
  id: string;
  organizationName: string;
  productType: 'FLIGHT' | 'HOTEL' | 'BUS' | 'CAR';
  title: string;
};

export function readActiveBusinessTravelRequest(): ActiveBusinessTravelRequest | null {
  if (typeof window === 'undefined') return null;

  const stored = window.sessionStorage.getItem(ACTIVE_BUSINESS_TRAVEL_REQUEST_KEY);
  if (!stored) return null;

  try {
    const value = JSON.parse(stored) as Partial<ActiveBusinessTravelRequest>;
    if (
      typeof value.id !== 'string' ||
      typeof value.organizationName !== 'string' ||
      typeof value.title !== 'string' ||
      !['FLIGHT', 'HOTEL', 'BUS', 'CAR'].includes(value.productType ?? '')
    ) {
      return null;
    }
    return value as ActiveBusinessTravelRequest;
  } catch {
    return null;
  }
}

export function saveActiveBusinessTravelRequest(request: ActiveBusinessTravelRequest) {
  window.sessionStorage.setItem(ACTIVE_BUSINESS_TRAVEL_REQUEST_KEY, JSON.stringify(request));
}

export function clearActiveBusinessTravelRequest() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(ACTIVE_BUSINESS_TRAVEL_REQUEST_KEY);
  }
}
