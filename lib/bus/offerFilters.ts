import type { BusOffer, BusResultControls } from '../../types/bus.ts';

export function applyBusResultControls(offers: BusOffer[], controls: BusResultControls): BusOffer[] {
  return offers.filter((offer) =>
    (!controls.operator || offer.operatorName === controls.operator) &&
    (!controls.busType || offer.busType === controls.busType) &&
    (!controls.refundableOnly || offer.refundable) &&
    (controls.maximumTotalPrice === undefined || offer.totalPrice <= controls.maximumTotalPrice)
  ).sort((first, second) => {
    if (controls.sort === 'duration-ascending') return (Date.parse(first.arrivalAt) - Date.parse(first.departureAt)) - (Date.parse(second.arrivalAt) - Date.parse(second.departureAt));
    if (controls.sort === 'departure-ascending') return Date.parse(first.departureAt) - Date.parse(second.departureAt);
    if (controls.sort === 'rating-descending') return second.rating - first.rating || first.totalPrice - second.totalPrice;
    return first.totalPrice - second.totalPrice;
  });
}
