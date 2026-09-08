import { access } from 'node:fs/promises';
import process from 'node:process';

import {
  assessLaunchReadiness,
  LAUNCH_READINESS_GATE_COUNT,
} from '../lib/operations/launchReadiness.ts';

const gates = assessLaunchReadiness({
  administratorMfa: false,
  completedAutomationJobs: new Set(),
  configuredEnvironmentKeys: new Set(),
  verifiedSupplierCount: 0,
});

const failures = [];
if (LAUNCH_READINESS_GATE_COUNT !== 20 || gates.length !== 20) {
  failures.push('The launch readiness register must contain exactly 20 controlled gates.');
}
if (new Set(gates.map((gate) => gate.id)).size !== gates.length) {
  failures.push('Every launch readiness gate must have a unique identifier.');
}
for (const gate of gates) {
  try {
    await access(gate.runbook);
  } catch {
    failures.push(`${gate.id} references a missing runbook: ${gate.runbook}`);
  }
}

if (failures.length) {
  console.error('Launch readiness register verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log('Launch readiness register verified: 20 unique gates with committed runbooks.');
}
