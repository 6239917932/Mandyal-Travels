import {
  amadeusApiOrigin,
  buildAmadeusFlightSearchUrl,
  mapAmadeusFlightOffers,
  type AmadeusFlightConfiguration,
  type AmadeusFlightResponse,
} from '@/lib/flight/amadeusRules';
import type { FlightSupplierAdapter } from '@/repositories/flightOfferRepository';
import type { FlightOffer, FlightSearchCriteria } from '@/types/flight';

interface AmadeusTokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
}

type ProviderFetch = typeof fetch;

export class AmadeusFlightSupplierAdapter implements FlightSupplierAdapter {
  private accessToken?: { expiresAt: number; value: string };
  private readonly origin: string;

  constructor(
    private readonly configuration: AmadeusFlightConfiguration,
    private readonly providerFetch: ProviderFetch = fetch,
    private readonly now: () => number = Date.now,
  ) {
    this.origin = amadeusApiOrigin(configuration.environment);
  }

  private async token(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt - 60_000 > this.now()) {
      return this.accessToken.value;
    }
    const body = new URLSearchParams({
      client_id: this.configuration.clientId,
      client_secret: this.configuration.clientSecret,
      grant_type: 'client_credentials',
    });
    const response = await this.providerFetch(`${this.origin}/v1/security/oauth2/token`, {
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error('Flight supplier authentication is temporarily unavailable.');
    const payload = (await response.json()) as AmadeusTokenResponse;
    const value = typeof payload.access_token === 'string' ? payload.access_token : undefined;
    const expiresIn =
      typeof payload.expires_in === 'number' && payload.expires_in > 0
        ? payload.expires_in
        : undefined;
    if (!value || !expiresIn) throw new Error('Flight supplier returned an invalid access token.');
    this.accessToken = { expiresAt: this.now() + expiresIn * 1000, value };
    return value;
  }

  async search(criteria: FlightSearchCriteria): Promise<FlightOffer[]> {
    const endpoint = buildAmadeusFlightSearchUrl(this.origin, criteria);
    if (!endpoint) return [];
    const response = await this.providerFetch(endpoint, {
      headers: { Authorization: `Bearer ${await this.token()}` },
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error('Live flight search is temporarily unavailable.');
    const payload = (await response.json()) as AmadeusFlightResponse;
    return mapAmadeusFlightOffers(payload, criteria, this.configuration.environment);
  }
}
