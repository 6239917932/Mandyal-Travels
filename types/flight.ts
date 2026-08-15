export type FlightTripType = 'one-way' | 'return' | 'multi-city';

export interface FlightSearchLeg {
  departureDate: string;
  destination: string;
  origin: string;
}

export interface FlightSearchCriteria {
  adults: number;
  cabinClass: 'economy' | 'premium-economy' | 'business';
  departureDate: string;
  destination: string;
  origin: string;
  multiCitySegments?: FlightSearchLeg[];
  returnDate?: string;
  tripType: FlightTripType;
}

export interface FlightSegment {
  airlineCode: string;
  airlineName: string;
  arrivalAirport: string;
  arrivalAt: string;
  departureAirport: string;
  departureAt: string;
  durationMinutes: number;
  flightNumber: string;
  journeyIndex?: number;
  leg: 'outbound' | 'return' | 'multi-city';
  stops: number;
}

export interface FlightOffer {
  baggage: string;
  cabinClass: FlightSearchCriteria['cabinClass'];
  currency: 'INR';
  fareFamily: string;
  id: string;
  pricePerAdult: number;
  refundable: boolean;
  seatsRemaining: number;
  segments: FlightSegment[];
  supplier: string;
  totalPrice: number;
}

export type FlightSortOrder = 'price-ascending' | 'duration-ascending' | 'departure-ascending';

export interface FlightResultControls {
  airline?: string;
  maximumTotalPrice?: number;
  refundableOnly: boolean;
  sort: FlightSortOrder;
}
