export interface CarSearchCriteria {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  dropoffDate: string;
  drivers: number;
}

export interface CarOffer {
  id: string;
  providerName: string;
  vehicleName: string;
  category: string;
  transmission: 'Automatic' | 'Manual';
  seats: number;
  bags: number;
  fuelPolicy: string;
  mileagePolicy: string;
  cancellationPolicy: string;
  features: string[];
  pricePerDay: number;
  totalPrice: number;
  currency: 'INR';
  source: string;
  carsRemaining: number;
  pickupLocation: string;
  dropoffLocation: string;
}
