import type { HotelInventorySource } from '@/types/hotel';

export function inventorySourceLabel(source: HotelInventorySource | string): string {
  return source.toLowerCase() === 'direct'
    ? 'Mandyal PMS/local inventory'
    : 'External API supplier inventory';
}
