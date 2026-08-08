export type FlightTripType = 'one-way' | 'return';

export interface FlightSearchCriteria {
  adults: number;
  cabinClass: 'economy' | 'premium-economy' | 'business';
  departureDate: string;
  destination: string;
  origin: string;
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
