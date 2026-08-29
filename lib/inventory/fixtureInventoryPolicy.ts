export type FixtureInventoryEnvironment = Readonly<Record<string, string | undefined>>;

export function isFixtureInventoryEnabled(
  environment: FixtureInventoryEnvironment = process.env,
): boolean {
  if (environment.NODE_ENV === 'production') return false;
  return environment.FIXTURE_INVENTORY_ENABLED !== 'false';
}
