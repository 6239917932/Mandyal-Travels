import { mockHotels } from '@/constants/hotelData';
import type { Hotel } from '@/types/hotel';

export interface HotelRepository {
  findAll(): Promise<Hotel[]>;
  findById(id: string): Promise<Hotel | undefined>;
  findBySlug(slug: string): Promise<Hotel | undefined>;
}

export class InMemoryHotelRepository implements HotelRepository {
  async findAll(): Promise<Hotel[]> {
    return mockHotels;
  }

  async findById(id: string): Promise<Hotel | undefined> {
    return mockHotels.find((hotel) => hotel.id === id);
  }

  async findBySlug(slug: string): Promise<Hotel | undefined> {
    return mockHotels.find((hotel) => hotel.slug === slug);
  }
}
