export interface HotelAmenityOption {
  label: string;
  value: string;
}

export interface HotelAmenityGroup {
  name: string;
  options: readonly HotelAmenityOption[];
}

const option = (value: string, label = value): HotelAmenityOption => ({ label, value });

export const propertyAmenityGroups = [
  {
    name: 'Amenities for families with kids',
    options: [
      option('Free on-site parking'),
      option('Swimming pool'),
      option(
        'Indoor games',
        'Indoor games (board games, carrom, darts, pool table, puzzles, table tennis)',
      ),
      option('Halal restaurant'),
      option('Steam and sauna'),
    ],
  },
  {
    name: 'Basic facilities',
    options: [
      option('Free on-site parking'),
      option('Swimming pool'),
      option('Power backup'),
      option('Elevator / lift'),
      option('Refrigerator'),
      option('Housekeeping'),
      option('Umbrellas'),
      option('Limited-duration room service'),
      option('Paid laundry service'),
      option('English newspaper'),
      option('Centralized air conditioning'),
      option('In-room smoke detector'),
      option('Free high-speed Wi-Fi'),
    ],
  },
  {
    name: 'General services',
    options: [
      option('Concierge'),
      option('Luggage assistance'),
      option('Doctor on call'),
      option('Facilities for guests with disabilities'),
      option('Free wheelchair'),
      option('Pool / beach towels'),
      option('Multilingual staff'),
    ],
  },
  {
    name: 'Health and wellness',
    options: [option('Yoga'), option('First-aid services'), option('Activity centre')],
  },
  {
    name: 'Transfers',
    options: [option('Paid private airport transfer')],
  },
  {
    name: 'Family and kids',
    options: [option("Kids' club")],
  },
  {
    name: 'Food and drinks',
    options: [option('Halal restaurant'), option('Bar'), option('Dining area'), option('Barbecue')],
  },
  {
    name: 'Payment services',
    options: [option('Currency exchange')],
  },
  {
    name: 'Safety and security',
    options: [
      option('CCTV'),
      option('Fire extinguishers'),
      option('Security alarms'),
      option('Security guard'),
    ],
  },
  {
    name: 'Entertainment',
    options: [option('Entertainment'), option('Music system'), option('Live music')],
  },
  {
    name: 'Media and technology',
    options: [option('LED TV')],
  },
  {
    name: 'Beauty and spa',
    options: [option('Spa'), option('Steam and sauna'), option('Massage')],
  },
  {
    name: 'Outdoor activities and sports',
    options: [
      option('Bonfire on request'),
      option('Outdoor sports', 'Outdoor sports (badminton, swings)'),
    ],
  },
  {
    name: 'Indoor activities and sports',
    options: [
      option(
        'Indoor games',
        'Indoor games (board games, carrom, darts, pool table, puzzles, table tennis)',
      ),
      option('Billiards / pool table'),
      option('Indoor games room'),
    ],
  },
  {
    name: 'Common area',
    options: [
      option('Jacuzzi'),
      option('Living room'),
      option('Balcony / terrace'),
      option('Outdoor furniture'),
      option('24-hour reception'),
      option('Garden'),
    ],
  },
  {
    name: 'Business centre and conferences',
    options: [
      option('Printer'),
      option('Photocopying'),
      option('Business centre'),
      option('Conference room'),
      option('Banquet'),
    ],
  },
  {
    name: 'Other facilities',
    options: [option("Kids' play area"), option('Cloak room')],
  },
] as const satisfies readonly HotelAmenityGroup[];

export const roomAmenityGroups = [
  {
    name: 'Room amenities',
    options: [
      option('Minibar'),
      option('Hairdryer'),
      option('Dental kit'),
      option('Iron / ironing board'),
      option('Bubble bath'),
      option('Mini fridge'),
      option('Geyser / water heater'),
      option(
        'Toiletries',
        'Toiletries (comb, conditioner, moisturiser, shampoo, shower gel, soap)',
      ),
      option('Work desk'),
      option('Centralized air conditioning'),
      option('Free mineral water'),
      option('Free electric heater'),
      option('Private balcony'),
      option('Sofa cum bed'),
      option('Full-length mirror'),
      option('LED TV'),
      option('In-room smoke detector'),
    ],
  },
] as const satisfies readonly HotelAmenityGroup[];

export const searchableHotelAmenities = [
  ...new Set(
    [...propertyAmenityGroups, ...roomAmenityGroups].flatMap((group) =>
      group.options.map((amenity) => amenity.value),
    ),
  ),
].sort((left, right) => left.localeCompare(right));
