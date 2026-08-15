export type BusRouteInput = { boardingPoint: string; destination: string; droppingPoint: string; origin: string };
export type BusTripInput = { amenities: string[]; arrivalTime: string; busType: string; cancellationPolicy: string; departureTime: string; pricePerSeat: number; refundable: boolean; seatCapacity: number; serviceDate: string };
export type BusTripControls = { pricePerSeat: number; seatCapacity: number; status: string };
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const text = (value: string, min: number, max: number) => { const normalized = value.trim().replace(/\s+/g, ' '); if (normalized.length < min || normalized.length > max) throw new Error('Complete all route and trip details within the allowed limits.'); return normalized; };
export function normalizeBusRoute(input: BusRouteInput): BusRouteInput {
  const route = { boardingPoint: text(input.boardingPoint, 2, 160), destination: text(input.destination, 2, 100), droppingPoint: text(input.droppingPoint, 2, 160), origin: text(input.origin, 2, 100) };
  if (route.origin.localeCompare(route.destination, undefined, { sensitivity: 'base' }) === 0) throw new Error('Route origin and destination must be different.');
  return route;
}
export function normalizeBusTrip(input: BusTripInput, today?: string): BusTripInput {
  if (!DATE.test(input.serviceDate) || !TIME.test(input.departureTime) || !TIME.test(input.arrivalTime)) throw new Error('Enter a valid service date and 24-hour departure and arrival times.');
  if (today && input.serviceDate < today) throw new Error('Bus services cannot be scheduled in the past.');
  if (!Number.isInteger(input.seatCapacity) || input.seatCapacity < 1 || input.seatCapacity > 80) throw new Error('Seat capacity must be between 1 and 80.');
  if (!Number.isInteger(input.pricePerSeat) || input.pricePerSeat < 100 || input.pricePerSeat > 100000) throw new Error('Seat price must be between ₹100 and ₹1,00,000.');
  return { ...input, amenities: [...new Set(input.amenities.map((value) => text(value, 2, 60)))].slice(0, 20), busType: text(input.busType, 2, 100), cancellationPolicy: text(input.cancellationPolicy, 10, 300) };
}
export function normalizeBusTripControls(input: BusTripControls): BusTripControls {
  const status = input.status.trim().toUpperCase();
  if (!['ACTIVE', 'PAUSED'].includes(status)) throw new Error('Trip status must be active or paused.');
  if (!Number.isInteger(input.seatCapacity) || input.seatCapacity < 1 || input.seatCapacity > 80) throw new Error('Seat capacity must be between 1 and 80.');
  if (!Number.isInteger(input.pricePerSeat) || input.pricePerSeat < 100 || input.pricePerSeat > 100000) throw new Error('Seat price must be between ₹100 and ₹1,00,000.');
  return { pricePerSeat: input.pricePerSeat, seatCapacity: input.seatCapacity, status };
}
export function normalizeBusRouteStatus(value: string): 'ACTIVE' | 'PAUSED' {
  const status = value.trim().toUpperCase();
  if (status !== 'ACTIVE' && status !== 'PAUSED') throw new Error('Route status must be active or paused.');
  return status;
}
