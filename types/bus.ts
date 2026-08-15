export interface BusSearchCriteria {
  destination: string;
  origin: string;
  passengers: number;
  travelDate: string;
}

export interface BusOffer {
  amenities: string[];
  arrivalAt: string;
  boardingPoint: string;
  busType: string;
  cancellationPolicy: string;
  currency: 'INR';
  departureAt: string;
  destination: string;
  droppingPoint: string;
  id: string;
  operatorName: string;
  origin: string;
  pricePerSeat: number;
  refundable: boolean;
  rating: number;
  seatsRemaining: number;
  source: string;
  totalPrice: number;
}

export type BusSortOrder = 'price-ascending' | 'duration-ascending' | 'departure-ascending' | 'rating-descending';

export interface BusResultControls {
  busType?: string;
  maximumTotalPrice?: number;
  operator?: string;
  refundableOnly: boolean;
  sort: BusSortOrder;
}
