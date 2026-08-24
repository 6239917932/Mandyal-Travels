import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  boundEditableTripPlanText,
  EDITABLE_TRIP_PLAN_GUIDANCE_MAX_LENGTH,
  EDITABLE_TRIP_PLAN_TITLE_MAX_LENGTH,
  finalizeEditableTripPlanText,
} from '../services/editableTripPlanRules.ts';

test('editable trip plan text is hard bounded and empty edits restore the suggestion', () => {
  assert.equal(
    boundEditableTripPlanText('x'.repeat(100), EDITABLE_TRIP_PLAN_TITLE_MAX_LENGTH).length,
    80,
  );
  assert.equal(
    boundEditableTripPlanText('x'.repeat(400), EDITABLE_TRIP_PLAN_GUIDANCE_MAX_LENGTH).length,
    280,
  );
  assert.equal(finalizeEditableTripPlanText('   ', 'Original title', 80), 'Original title');
  assert.equal(
    finalizeEditableTripPlanText('  Keep   the afternoon flexible.  ', 'Original', 280),
    'Keep the afternoon flexible.',
  );
});

test('editable plan remains view-only and retains server-generated inventory links', async () => {
  const [editable, planner] = await Promise.all([
    readFile(new URL('../components/ai/EditableTripPlan.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/ai/TripPlanner.tsx', import.meta.url), 'utf8'),
  ]);

  assert.match(editable, /Edits stay only in this browser view/);
  assert.match(editable, /does not save a trip, reserve inventory, or create\s+a\s+booking/);
  assert.match(editable, /Reset to suggestion/);
  assert.match(editable, /result\.links\.map/);
  assert.match(planner, /<EditableTripPlan result=\{result\}/);
  assert.doesNotMatch(
    editable,
    /fetch\(|localStorage|sessionStorage|method=["']POST|method=["']PUT/,
  );
});

test('editable fields expose labels, descriptions, and character bounds', async () => {
  const editable = await readFile(
    new URL('../components/ai/EditableTripPlan.tsx', import.meta.url),
    'utf8',
  );

  assert.match(editable, /<label htmlFor=\{titleId\}>/);
  assert.match(editable, /<label htmlFor=\{guidanceId\}>/);
  assert.match(editable, /maxLength=\{EDITABLE_TRIP_PLAN_TITLE_MAX_LENGTH\}/);
  assert.match(editable, /maxLength=\{EDITABLE_TRIP_PLAN_GUIDANCE_MAX_LENGTH\}/);
  assert.match(editable, /aria-describedby=/);
});
