# Administrator booking operations

`/admin/bookings` is restricted to `PLATFORM_ADMIN` accounts and provides a read-only servicing
directory across Hotel, Flight, Bus, and Car records. Operators can search by booking reference,
traveller, email, hotel, or trip title and combine that search with a closed product catalogue,
closed status catalogue, and valid created-date bounds.

Hotel and transport/rental records use independent 25-row pagination so a large product set cannot
hide or truncate the other set. Filtered totals come from the same server-side predicates as the
tables. End dates are inclusive in the interface and implemented with an exclusive next-day upper
bound. Invalid pages, dates, products, statuses, and overlong searches normalize safely.

The workspace intentionally has no mutation controls. It cannot change booking or operational
status, inventory, payment, refund, settlement, provider, or Cashfree state. Customer links lead to
the existing protected user directory for authorized account servicing.
