export const EDITABLE_TRIP_PLAN_TITLE_MAX_LENGTH = 80;
export const EDITABLE_TRIP_PLAN_GUIDANCE_MAX_LENGTH = 280;

export function boundEditableTripPlanText(value: string, maximum: number): string {
  return value.slice(0, maximum);
}

export function finalizeEditableTripPlanText(
  value: string,
  suggestion: string,
  maximum: number,
): string {
  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, maximum);
  return normalized || suggestion.slice(0, maximum);
}
