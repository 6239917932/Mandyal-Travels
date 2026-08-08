import type { Hotel, HotelAmenity } from '@/types/hotel';

const standardAmenities: HotelAmenity[] = [
  { category: 'general', id: 'wifi', name: 'Free Wi-Fi' },
  { category: 'parking', id: 'parking', name: 'Free parking' },
  { category: 'food-and-drink', id: 'restaurant', name: 'Restaurant' },
  { category: 'general', id: 'front-desk', name: '24-hour front desk' },
];

const wellnessAmenities: HotelAmenity[] = [
  ...standardAmenities,
  { category: 'pool-and-wellness', id: 'spa', name: 'Spa' },
  { category: 'pool-and-wellness', id: 'pool', name: 'Swimming pool' },
];

export const mockHotels: Hotel[] = [
  {
    amenities: wellnessAmenities,
    checkInTime: '14:00',
    checkOutTime: '11:00',
    description:
      'A hillside retreat with valley views, spacious rooms, wellness facilities, and warm Himachali hospitality.',
    id: 'hotel-himalayan-view-retreat',
    images: [
      {
        alt: 'Mountain resort with a view of the Himalayan valley',
        isPrimary: true,
        url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=1600&q=80',
      },
      {
        alt: 'Comfortable hotel room with mountain-view windows',
        url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1600&q=80',
      },
    ],
    inventory: {
      source: 'direct',
    },
    location: {
      address: {
        city: 'Shimla',
        country: 'India',
        state: 'Himachal Pradesh',
      },
      latitude: 31.1048,
      longitude: 77.1734,
    },
    name: 'Himalayan View Retreat',
    policies: [
      'Government-issued photo identification is required at check-in.',
      'Smoking is not permitted in guest rooms.',
      'Pets are not permitted at this property.',
    ],
    reviewSummary: {
      averageRating: 4.6,
      reviewCount: 1248,
    },
    rooms: [
      {
        amenities: standardAmenities,
        bedDescription: '1 king bed',
        description: 'A comfortable room with a private balcony and valley-facing seating area.',
        images: [
          {
            alt: 'Deluxe valley room with a king bed',
            isPrimary: true,
            url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80',
          },
        ],
        inventoryCount: 8,
        isAvailable: true,
        name: 'Deluxe Valley Room',
        occupancy: {
          maximumAdults: 2,
          maximumChildren: 1,
          maximumGuests: 3,
        },
        ratePlans: [
          {
            cancellationPolicy: {
              description: 'Free cancellation until 48 hours before check-in.',
              freeCancellationUntilHoursBeforeCheckIn: 48,
              refundable: true,
            },
            id: 'rate-himalayan-deluxe-breakfast',
            mealPlan: 'breakfast-included',
            name: 'Breakfast Included',
            nightlyRate: {
              amount: 6200,
              currency: 'INR',
            },
            taxesAndFees: {
              amount: 1116,
              currency: 'INR',
            },
          },
        ],
        roomTypeId: 'room-himalayan-deluxe-valley',
      },
      {
        amenities: wellnessAmenities,
        bedDescription: '1 king bed and 1 sofa bed',
        description:
          'A larger suite with a lounge, premium valley view, and additional guest capacity.',
        images: [
          {
            alt: 'Premium mountain suite with a living area',
            isPrimary: true,
            url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
          },
        ],
        inventoryCount: 3,
        isAvailable: true,
        name: 'Premium Mountain Suite',
        occupancy: {
          maximumAdults: 3,
          maximumChildren: 2,
          maximumGuests: 4,
        },
        ratePlans: [
          {
            cancellationPolicy: {
              description: 'Free cancellation until 72 hours before check-in.',
              freeCancellationUntilHoursBeforeCheckIn: 72,
              refundable: true,
            },
            id: 'rate-himalayan-suite-half-board',
            mealPlan: 'half-board',
            name: 'Breakfast and Dinner Included',
            nightlyRate: {
              amount: 9800,
              currency: 'INR',
            },
            taxesAndFees: {
              amount: 1764,
              currency: 'INR',
            },
          },
        ],
        roomTypeId: 'room-himalayan-premium-suite',
      },
    ],
    slug: 'himalayan-view-retreat-shimla',
    starRating: 4,
  },
  {
    amenities: standardAmenities,
    checkInTime: '15:00',
    checkOutTime: '12:00',
    description:
      'A heritage-inspired city stay near Jaipur landmarks, with elegant rooms, local dining, and attentive service.',
    id: 'hotel-royal-jaipur-residency',
    images: [
      {
        alt: 'Heritage-inspired Jaipur hotel exterior',
        isPrimary: true,
        url: 'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1600&q=80',
      },
      {
        alt: 'Elegant heritage hotel room in Jaipur',
        url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1600&q=80',
      },
    ],
    inventory: {
      externalPropertyId: 'supplier-jaipur-8921',
      source: 'supplier',
      supplierName: 'Mandyal Partner Network',
    },
    location: {
      address: {
        city: 'Jaipur',
        country: 'India',
        state: 'Rajasthan',
      },
      latitude: 26.9124,
      longitude: 75.7873,
    },
    name: 'Royal Jaipur Residency',
    policies: [
      'Government-issued photo identification is required at check-in.',
      'Guests must be at least 18 years old to check in.',
      'Property policy may require a refundable incidental deposit.',
    ],
    reviewSummary: {
      averageRating: 4.4,
      reviewCount: 876,
    },
    rooms: [
      {
        amenities: standardAmenities,
        bedDescription: '1 queen bed',
        description:
          'A thoughtfully designed city room with modern essentials and heritage accents.',
        images: [
          {
            alt: 'Heritage queen room with warm lighting',
            isPrimary: true,
            url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
          },
        ],
        inventoryCount: 12,
        isAvailable: true,
        name: 'Heritage Queen Room',
        occupancy: {
          maximumAdults: 2,
          maximumChildren: 1,
          maximumGuests: 2,
        },
        ratePlans: [
          {
            cancellationPolicy: {
              description: 'This promotional rate is non-refundable.',
              refundable: false,
            },
            id: 'rate-jaipur-heritage-room-only',
            mealPlan: 'room-only',
            name: 'Room Only',
            nightlyRate: {
              amount: 4800,
              currency: 'INR',
            },
            taxesAndFees: {
              amount: 864,
              currency: 'INR',
            },
          },
        ],
        roomTypeId: 'room-jaipur-heritage-queen',
      },
    ],
    slug: 'royal-jaipur-residency-jaipur',
    starRating: 4,
  },
];
