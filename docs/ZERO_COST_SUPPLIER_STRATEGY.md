# Zero-cost supplier strategy

As of 28 August 2026, no verified public API provides anonymous, live, bookable hotel, flight, bus,
and car inventory under one permanently free contract. Provider terms and quotas must be reviewed
again before each production activation. The portal therefore uses a truthful mixed strategy:

- **Flights:** an optional Amadeus Self-Service adapter supports its startup/free-quota path. It is
  disabled until server credentials are configured. Test inventory is labelled non-bookable and is
  rejected in production. Production booking and ticket issuance still require Amadeus production
  approval, an airline consolidator, certified pricing/revalidation, and operational reconciliation.
- **Hotels:** Mandyal PMS/direct partner properties are the zero-fee production source. Amadeus hotel
  discovery may be evaluated after production access, but must not be mixed into booking until room,
  rate, tax, cancellation, revalidation, booking, and servicing contracts are certified.
- **Buses:** direct operator routes and dated inventory remain the safe zero-fee source. No approved
  anonymous Indian bus-booking API has been identified. Scraping operator or aggregator sites is not
  permitted.
- **Cars:** direct supplier fleet and availability remain the safe zero-fee source. External search is
  deferred until a provider grants production API access and booking/cancellation certification.

## Amadeus flight activation

1. Register at the official Amadeus for Developers portal and create a Self-Service application.
2. Put the API key and secret in the server secret store as `AMADEUS_CLIENT_ID` and
   `AMADEUS_CLIENT_SECRET`. Never place them in browser code, support messages, or the repository.
3. For local integration testing only, configure `AMADEUS_FLIGHT_ENABLED=true` and
   `AMADEUS_ENVIRONMENT=test`. Test results are not live inventory and cannot be promoted to
   production.
4. After Amadeus production approval and commercial/legal review, use production credentials,
   configure `AMADEUS_ENVIRONMENT=production`, and complete price confirmation, booking, ticketing,
   webhook/queue, reconciliation, support, and monitoring certification before enabling checkout.
5. Monitor the free monthly quota and configure usage alerts. Never silently exceed a paid threshold.

The adapter uses fixed official HTTPS hosts, OAuth client credentials, bounded timeouts, a maximum of
20 offers, INR-only normalization, and no refundability inference. Multi-city search remains on the
existing non-live path until a separately reviewed POST integration is implemented.
