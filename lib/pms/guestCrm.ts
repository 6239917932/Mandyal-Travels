import { isValidEmail, normalizeEmail } from '../auth/validation.ts';
import { isIsoCalendarDate } from './operationalDate.ts';

export const GUEST_CRM_MAX_PROPERTIES = 100;
export const GUEST_CRM_MAX_BOOKINGS = 500;
export const GUEST_CRM_MAX_PROFILES = 200;
export const GUEST_CRM_MAX_STAYS_PER_PROFILE = 20;

export type GuestRecognition = 'FIRST_STAY' | 'FREQUENT_GUEST' | 'RETURNING_GUEST';

export function normalizeGuestCrmEmail(value: string): string | null {
  const email = normalizeEmail(value);
  return isValidEmail(email) ? email : null;
}

export function guestCrmText(value: string, fallback: string, maximumLength: number): string {
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (normalized || fallback).slice(0, maximumLength);
}

export function maskGuestCrmEmail(value: string): string {
  const email = normalizeGuestCrmEmail(value);
  if (!email) return 'Email unavailable';
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}

export function maskGuestCrmPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : 'Phone unavailable';
}

export function guestCrmDate(value: string): string {
  return isIsoCalendarDate(value) ? value : 'Date unavailable';
}

export function guestRecognition(stayCount: number): GuestRecognition {
  if (!Number.isSafeInteger(stayCount) || stayCount <= 1) return 'FIRST_STAY';
  return stayCount >= 5 ? 'FREQUENT_GUEST' : 'RETURNING_GUEST';
}

export function guestRecognitionLabel(value: GuestRecognition): string {
  if (value === 'FREQUENT_GUEST') return 'Frequent guest';
  if (value === 'RETURNING_GUEST') return 'Returning guest';
  return 'First recorded stay';
}
