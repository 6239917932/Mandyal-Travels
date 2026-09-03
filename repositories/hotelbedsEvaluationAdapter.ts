import { request as httpsRequest } from 'node:https';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';

import {
  createHotelbedsSignature,
  hotelbedsApiOrigin,
  hotelbedsMutualTlsOrigin,
  type HotelbedsConfiguration,
} from '../lib/hotel/hotelbedsRules.ts';
import {
  buildHotelbedsAvailabilityRequest,
  buildHotelbedsBookingRequest,
  buildHotelbedsCheckRateRequest,
  HOTELBEDS_BOOKING_TIMEOUT_MS,
  hotelbedsBookingPath,
  hotelbedsCancellationPath,
  type HotelbedsAvailabilityInput,
  type HotelbedsBookingInput,
  type HotelbedsCancellationFlag,
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
  private readonly providerFetch?: ProviderFetch;

  constructor(
    configuration: HotelbedsConfiguration,
    providerFetch?: ProviderFetch,
    now: () => number = Date.now,
  ) {
    this.configuration = configuration;
    this.providerFetch = providerFetch;
    this.now = now;
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
      true,
    );
  }

  async checkRates(rateKeys: readonly string[]): Promise<unknown> {
    return this.request(
      '/hotel-api/1.0/checkrates',
      'POST',
      20_000,
      buildHotelbedsCheckRateRequest(rateKeys),
      true,
    );
  }

  async createBooking(input: HotelbedsBookingInput): Promise<unknown> {
    return this.request(
      '/hotel-api/1.0/bookings',
      'POST',
      HOTELBEDS_BOOKING_TIMEOUT_MS,
      buildHotelbedsBookingRequest(input),
      true,
    );
  }

  async getBooking(reference: string): Promise<unknown> {
    return this.request(hotelbedsBookingPath(reference), 'GET', 20_000, undefined, true);
  }

  async cancelBooking(reference: string, flag: HotelbedsCancellationFlag): Promise<unknown> {
    return this.request(
      hotelbedsCancellationPath(reference, flag),
      'DELETE',
      20_000,
      undefined,
      true,
    );
  }

  async fetchContentPage(input: HotelbedsContentPageInput): Promise<HotelbedsContentPage> {
    return parseHotelbedsContentPage(
      await this.request(buildHotelbedsContentPath(input), 'GET', 30_000),
    );
  }

  private async request(
    path: string,
    method: 'DELETE' | 'GET' | 'POST',
    timeoutMs: number,
    body?: object,
    mutualTls = false,
  ): Promise<unknown> {
    const epochSeconds = Math.floor(this.now() / 1000);
    const origin = mutualTls
      ? hotelbedsMutualTlsOrigin(this.configuration.environment)
      : hotelbedsApiOrigin(this.configuration.environment);
    const url = `${origin}${path}`;
    const headers = {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'Api-key': this.configuration.apiKey,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      'X-Signature': createHotelbedsSignature(this.configuration, epochSeconds),
    };
    if (mutualTls && !this.configuration.mutualTls && !this.providerFetch) {
      throw new Error('Hotelbeds booking operations require an associated mTLS certificate.');
    }
    if (mutualTls && this.configuration.mutualTls && !this.providerFetch) {
      return this.mutualTlsRequest(url, method, timeoutMs, headers, body);
    }
    const response = await (this.providerFetch ?? fetch)(url, {
      ...(body ? { body: JSON.stringify(body) } : {}),
      headers,
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new Error('Hotelbeds evaluation request was not accepted.');
    }
    return response.json();
  }

  private async mutualTlsRequest(
    url: string,
    method: 'DELETE' | 'GET' | 'POST',
    timeoutMs: number,
    headers: Record<string, string>,
    body?: object,
  ): Promise<unknown> {
    const credentials = this.configuration.mutualTls;
    if (!credentials) throw new Error('Hotelbeds mTLS credentials are unavailable.');
    const payload = body ? JSON.stringify(body) : undefined;
    return new Promise((resolve, reject) => {
      const request = httpsRequest(
        url,
        {
          ...(credentials.ca ? { ca: credentials.ca } : {}),
          cert: credentials.certificate,
          headers: {
            ...headers,
            ...(payload ? { 'Content-Length': Buffer.byteLength(payload).toString() } : {}),
          },
          key: credentials.privateKey,
          method,
          rejectUnauthorized: true,
          timeout: timeoutMs,
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
          response.on('error', reject);
          response.on('end', () => {
            try {
              const compressed = Buffer.concat(chunks);
              const encoding = response.headers['content-encoding'];
              const decoded =
                encoding === 'gzip'
                  ? gunzipSync(compressed)
                  : encoding === 'deflate'
                    ? inflateSync(compressed)
                    : encoding === 'br'
                      ? brotliDecompressSync(compressed)
                      : compressed;
              if (!response.statusCode || response.statusCode < 200 || response.statusCode > 299) {
                throw new Error('Hotelbeds evaluation request was not accepted.');
              }
              resolve(JSON.parse(decoded.toString('utf8')) as unknown);
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      request.on('error', reject);
      request.on('timeout', () => request.destroy(new Error('Hotelbeds request timed out.')));
      if (payload) request.write(payload);
      request.end();
    });
  }
}
