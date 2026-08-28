import {
  createHotelbedsSignature,
  hotelbedsApiOrigin,
  type HotelbedsConfiguration,
} from '../lib/hotel/hotelbedsRules.ts';
import {
  buildHotelbedsAvailabilityRequest,
  buildHotelbedsCheckRateRequest,
  type HotelbedsAvailabilityInput,
} from '../lib/hotel/hotelbedsCertification.ts';
import {
  buildHotelbedsContentPath,
  parseHotelbedsContentPage,
  type HotelbedsContentPage,
  type HotelbedsContentPageInput,
} from '../lib/hotel/hotelbedsContentRules.ts';

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
    await this.request('/hotel-api/1.0/status', 'GET', 10_000);
    return { environment: this.configuration.environment, reachable: true };
  }

  async searchAvailability(input: HotelbedsAvailabilityInput): Promise<unknown> {
    return this.request(
      '/hotel-api/1.0/hotels',
      'POST',
      20_000,
      buildHotelbedsAvailabilityRequest(input),
    );
  }

  async checkRates(rateKeys: readonly string[]): Promise<unknown> {
    return this.request(
      '/hotel-api/1.0/checkrates',
      'POST',
      20_000,
      buildHotelbedsCheckRateRequest(rateKeys),
    );
  }

  async fetchContentPage(input: HotelbedsContentPageInput): Promise<HotelbedsContentPage> {
    return parseHotelbedsContentPage(
      await this.request(buildHotelbedsContentPath(input), 'GET', 30_000),
    );
  }

  private async request(
    path: string,
    method: 'GET' | 'POST',
    timeoutMs: number,
    body?: object,
  ): Promise<unknown> {
    const epochSeconds = Math.floor(this.now() / 1000);
    const response = await this.providerFetch(`${this.origin}${path}`, {
      ...(body ? { body: JSON.stringify(body) } : {}),
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'Api-key': this.configuration.apiKey,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        'X-Signature': createHotelbedsSignature(this.configuration, epochSeconds),
      },
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new Error('Hotelbeds evaluation request was not accepted.');
    }
    return response.json();
  }
}
