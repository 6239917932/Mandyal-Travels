# Public Bus and Car offer-card presentation

Bus and Car search cards show the facts a traveller needs to compare and select an offer. The Bus
card retains the operator name, vehicle type, timings, boarding and dropping points, amenities,
cancellation policy, remaining seats, total price, and the governed seat-selection link. The Car
card retains the customer-facing provider name, vehicle and rental facts, features, cancellation
policy, remaining cars, prices, and the governed booking link.

The cards intentionally omit the normalized offer's technical `source` value. That field identifies
the internal adapter or fixture path and is not a customer decision fact. Removing its label from the
public presentation does not remove or rename the domain field, alter supplier/provider services,
change inventory or validation, or change any offer or search identifiers passed into booking.

The focused regression test checks both the disclosure boundary and the unchanged booking-query
contract. Cashfree and all payment behavior remain untouched.
