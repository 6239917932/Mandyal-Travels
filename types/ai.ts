export type TripPlannerInput = {
  adults: number;
  checkInDate: string;
  checkOutDate: string;
  destination: string;
  destinationAirport?: string;
  interests: string[];
  origin: string;
  originAirport?: string;
};

export type TripPlannerDay = { day: number; date: string; guidance: string; title: string };
export type TripPlannerLink = {
  href: string;
  label: string;
  product: 'BUS' | 'CAR' | 'FLIGHT' | 'HOTEL';
};
export type TripPlannerResult = {
  days: TripPlannerDay[];
  disclosure: string;
  links: TripPlannerLink[];
  summary: string;
};
