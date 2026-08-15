export type CarReservationState = 'CONFIRMED' | 'PICKED_UP' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED';
export type CarReservationAction = 'PICK_UP' | 'COMPLETE' | 'MARK_NO_SHOW';

export function nextCarReservationState(input: {
  action: CarReservationAction;
  dropoffDate: string;
  pickupDate: string;
  status: string;
  today: string;
}): CarReservationState {
  if (input.action === 'PICK_UP') {
    if (input.status !== 'CONFIRMED') throw new Error('Only a confirmed rental can be picked up.');
    if (input.today < input.pickupDate)
      throw new Error('A rental cannot be picked up before its pickup date.');
    if (input.today >= input.dropoffDate) throw new Error('This rental period has already ended.');
    return 'PICKED_UP';
  }
  if (input.action === 'COMPLETE') {
    if (input.status !== 'PICKED_UP') throw new Error('Only a picked-up rental can be completed.');
    return 'COMPLETED';
  }
  if (input.status !== 'CONFIRMED')
    throw new Error('Only a confirmed rental can be marked as a no-show.');
  if (input.today < input.pickupDate)
    throw new Error('A future rental cannot be marked as a no-show.');
  return 'NO_SHOW';
}
