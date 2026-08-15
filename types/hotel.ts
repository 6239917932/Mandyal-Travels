export type CurrencyCode = 'INR' | 'USD';

export type HotelInventorySource = 'direct' | 'supplier';

export type MealPlan = 'room-only' | 'breakfast-included' | 'half-board' | 'full-board';

export type HotelAmenityCategory =
  | 'business'
  | 'family'
  | 'food-and-drink'
  | 'general'
  | 'parking'
  | 'pool-and-wellness'
  | 'room'
  | 'transport';

export interface Money {
  amount: number;
  currency: CurrencyCode;
}

export interface HotelAddress {
  city: string;
  country: string;
  district?: string;
  locality?: string;
  postalCode?: string;
  state?: string;
  streetAddress?: string;
  tehsil?: string;
}

export interface HotelLocation {
  address: HotelAddress;
  latitude: number;
  longitude: number;
}

export interface HotelImage {
  alt: string;
  isPrimary?: boolean;
  url: string;
}

export interface HotelAmenity {
  category: HotelAmenityCategory;
  id: string;
  name: string;
}

export interface HotelCancellationPolicy {
  description: string;
  freeCancellationUntilHoursBeforeCheckIn?: number;
  refundable: boolean;
}

export interface HotelRatePlan {
  cancellationPolicy: HotelCancellationPolicy;
  id: string;
  mealPlan: MealPlan;
  maximumStayNights: number;
  minimumStayNights: number;
  name: string;
  nightlyRate: Money;
  taxesAndFees: Money;
}

export interface RoomOccupancy {
  maximumAdults: number;
  maximumChildren: number;
  maximumGuests: number;
}

export interface HotelRoom {
  amenities: HotelAmenity[];
  bedDescription: string;
  description: string;
  images: HotelImage[];
  inventoryCount: number;
  isAvailable: boolean;
  name: string;
  occupancy: RoomOccupancy;
  ratePlans: HotelRatePlan[];
  roomTypeId: string;
}

export interface HotelReviewSummary {
  averageRating: number;
  reviewCount: number;
}

export interface HotelReview {
  body: string;
  createdAt: string;
  id: string;
  partnerReply?: string;
  partnerRepliedAt?: string;
  rating: number;
  reviewerName: string;
  title: string;
  verifiedStay: true;
}

export interface HotelInventory {
  externalPropertyId?: string;
  source: HotelInventorySource;
  supplierName?: string;
}

export interface HotelPropertyProfile {
  childrenAllowed: boolean;
  contactEmail: string;
  contactPhone: string;
  languages: string[];
  landmarks: string[];
  locationAliases: string[];
  minimumCheckInAge: number;
  petsAllowed: boolean;
  propertyType: string;
  smokingAllowed: boolean;
  timezone: string;
}

export interface Hotel {
  amenities: HotelAmenity[];
  checkInTime: string;
  checkOutTime: string;
  description: string;
  id: string;
  images: HotelImage[];
  inventory: HotelInventory;
  location: HotelLocation;
  name: string;
  policies: string[];
  propertyProfile?: HotelPropertyProfile;
  reviewSummary: HotelReviewSummary;
  rooms: HotelRoom[];
  slug: string;
  starRating: 1 | 2 | 3 | 4 | 5;
}

export interface HotelSearchCriteria {
  adults: number;
  checkInDate: string;
  checkOutDate: string;
  children: number;
  destination: string;
  rooms: number;
}

export type HotelSearchSort = 'price-ascending' | 'price-descending' | 'rating-descending';

export interface HotelSearchFilters {
  amenity: string;
  maximumNightlyRate: number;
  minimumStarRating: number;
  page: number;
  refundableOnly: boolean;
  sort: HotelSearchSort;
}

export interface HotelDiscoverySuggestion {
  explanation: string;
  filters: Omit<HotelSearchFilters, 'page'>;
  normalizedDestination: string;
}

export interface HotelSearchPage {
  page: number;
  pageCount: number;
  pageSize: number;
  results: HotelSearchResult[];
  totalResults: number;
}

export interface HotelSearchResult {
  hotel: Hotel;
  isAvailable: boolean;
  minimumNightlyRate: Money;
  nights: number;
  totalStayPrice: Money;
}
