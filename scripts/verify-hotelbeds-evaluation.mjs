import { config as loadEnvironment } from 'dotenv';

import { readHotelbedsConfiguration } from '../lib/hotel/hotelbedsRules.ts';
import { HotelbedsEvaluationAdapter } from '../repositories/hotelbedsEvaluationAdapter.ts';

loadEnvironment({ path: '.env.local', quiet: true });
loadEnvironment({ quiet: true });

const configuration = readHotelbedsConfiguration(process.env);
if (!configuration) {
  throw new Error(
    'Hotelbeds verification is disabled. Configure server secrets and set HOTELBEDS_ENABLED=true.',
  );
}

const result = await new HotelbedsEvaluationAdapter(configuration).verifyStatus();
console.log(
  `Hotelbeds ${result.environment} credentials were accepted by the official status endpoint.`,
);
console.log(
  'No availability search, booking, cancellation, payment, or customer record was created.',
);
