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
  rating: number;
  seatsRemaining: number;
  source: string;
  totalPrice: number;
}
