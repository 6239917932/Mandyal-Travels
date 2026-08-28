import {
  createHotelbedsSignature,
  hotelbedsApiOrigin,
  type HotelbedsConfiguration,
} from '../lib/hotel/hotelbedsRules.ts';

type ProviderFetch = typeof fetch;

export interface HotelbedsStatusResult {
  environment: HotelbedsConfiguration['environment'];
  reachable: true;
}

export class HotelbedsEvaluationAdapter {
  private readonly configuration: HotelbedsConfiguration;
  private readonly now: () => number;
  private readonly origin: string;
  private readonly providerFetch: ProviderFetch;

  constructor(
    configuration: HotelbedsConfiguration,
    providerFetch: ProviderFetch = fetch,
    now: () => number = Date.now,
  ) {
    this.configuration = configuration;
    this.providerFetch = providerFetch;
    this.now = now;
    this.origin = hotelbedsApiOrigin(configuration.environment);
  }

  async verifyStatus(): Promise<HotelbedsStatusResult> {
    const epochSeconds = Math.floor(this.now() / 1000);
    const response = await this.providerFetch(`${this.origin}/hotel-api/1.0/status`, {
      headers: {
        Accept: 'application/json',
        'Api-key': this.configuration.apiKey,
        'X-Signature': createHotelbedsSignature(this.configuration, epochSeconds),
      },
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      throw new Error('Hotelbeds credential verification was not accepted.');
    }
    return { environment: this.configuration.environment, reachable: true };
  }
}
