# Car supplier activation

The portal already normalizes car offers, pickup/drop-off timing, vehicle attributes, pricing, driver eligibility, extras, availability, booking, and cancellation rules. A live supplier adapter must call only allow-listed HTTPS endpoints and preserve the portal's validation and audit boundaries.

Before activation, certify location and vehicle-code mapping, real-time price and availability, taxes/deposits, mileage/fuel rules, driver-age restrictions, extras, idempotent reservation and cancellation, supplier confirmation references, signed callbacks, reconciliation, support escalation, and production credential rotation. Demonstration inventory must remain explicitly non-live until certification is complete.

Customer result controls operate only on the normalized offers already returned for the exact search criteria. Category, provider, transmission, minimum seats, and maximum total price are deterministic local filters; sorting is limited to total price or vehicle name with stable tie-breakers. Applying or clearing controls preserves every pickup, drop-off, timing, driver, and rental-mode field. The controls never reinterpret fuel or cancellation wording, infer refundability, alter an offer or its identifier, or call a supplier.
