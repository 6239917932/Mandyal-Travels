# PMS central reservations

Central Reservations is a read-only, multi-property operational projection over the existing hotel
booking records. It creates no duplicate booking, guest, room, payment or availability store.

## Controls

- The server resolves the authenticated hotel partner before reading data.
- Only active managed properties belonging to that partner are included.
- Property and active-booking reads are capped; the page warns when a cap is reached.
- Each property's arrival and departure counts use its own controlled operational date.
- Unknown property slugs, cancelled bookings and closed stay states fail closed.
- Room assignments are parsed through the same closed, bounded routine as the room rack.
- The forward arrival queue is restricted to fourteen days and sorted deterministically.

Reservation and stay mutations continue through the existing paginated reservation desk and its
audited endpoints. Central Reservations does not introduce a second mutation surface.
