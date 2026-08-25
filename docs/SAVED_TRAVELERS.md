# Saved traveler profiles

Authenticated customers can manage up to 12 reusable traveler profiles at
`/account/travelers`. Each record belongs to the exact signed-in user and is returned only through
account-scoped queries.

## Stored fields

The feature accepts a profile label, name, optional date of birth, optional gender, relationship,
and optional booking contact email and phone. It deliberately has no fields for passport or other
government-ID documents, driving-licence details, payment credentials, special requests, or
supplier data.

## Booking prefill boundary

Hotel, flight, bus, and car detail forms load saved profiles only after the customer selects **Use
a saved traveler**. Pressing **Fill empty fields** copies only safe values into fields that are
still empty. Existing entries are preserved. Licence, identification, payment, and special-request
fields are never filled. The booking form remains the final source of truth and customers must
review every value before continuing.

## Security and privacy

- Collection, update, and delete operations re-check the authenticated account.
- Updates and deletes use both traveler ID and current user ID, returning not found for records the
  account does not own.
- Mutations require the dedicated `x-mandyal-csrf: 1` header and remain behind the portal's
  same-origin API proxy protection.
- Creation checks the hard cap in a serializable transaction.
- Account privacy exports include saved profiles. The user relation uses cascade deletion so an
  approved account erasure removes profiles with the account; the existing human-reviewed privacy
  workflow remains authoritative.
