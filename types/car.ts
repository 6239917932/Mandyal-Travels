export interface CarSearchCriteria {
  pickupLocation: string;
  dropoffLocation: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  drivers: number;
  rentalMode: 'self-drive' | 'chauffeur';
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
  rentalMode: CarSearchCriteria['rentalMode'];
}
