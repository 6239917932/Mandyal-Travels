export const HOTEL_OPERATIONAL_DOCUMENT_TEMPLATES = ['CLASSIC', 'COMPACT'] as const;
export const HOTEL_OPERATIONAL_DOCUMENT_THEMES = ['OCEAN', 'EMERALD', 'SUNSET', 'PLUM'] as const;

export type HotelOperationalDocumentTemplate =
  (typeof HOTEL_OPERATIONAL_DOCUMENT_TEMPLATES)[number];
export type HotelOperationalDocumentTheme = (typeof HOTEL_OPERATIONAL_DOCUMENT_THEMES)[number];

export type HotelOperationalDocumentProfile = Readonly<{
  footerText: string;
  headerText: string;
  showPropertyContact: boolean;
  template: HotelOperationalDocumentTemplate;
  theme: HotelOperationalDocumentTheme;
  version: number;
}>;

export class HotelOperationalDocumentRuleError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function boundedText(value: unknown, maximum: number): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maximum);
}

function closedValue<T extends readonly string[]>(
  value: unknown,
  catalogue: T,
  code: string,
  message: string,
): T[number] {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();
  if (!catalogue.includes(normalized as T[number])) {
    throw new HotelOperationalDocumentRuleError(code, message);
  }
  return normalized as T[number];
}

export function normalizeHotelOperationalDocumentProfile(
  input: Record<string, unknown>,
): Omit<HotelOperationalDocumentProfile, 'version'> {
  const headerText = boundedText(input.headerText, 120);
  const footerText = boundedText(input.footerText, 300);
  if (headerText.length > 0 && headerText.length < 3) {
    throw new HotelOperationalDocumentRuleError(
      'INVALID_DOCUMENT_HEADER',
      'The optional document heading must contain at least 3 characters.',
    );
  }
  if (footerText.length > 0 && footerText.length < 8) {
    throw new HotelOperationalDocumentRuleError(
      'INVALID_DOCUMENT_FOOTER',
      'The optional document footer must contain at least 8 characters.',
    );
  }
  return {
    footerText,
    headerText,
    showPropertyContact: input.showPropertyContact === true,
    template: closedValue(
      input.template,
      HOTEL_OPERATIONAL_DOCUMENT_TEMPLATES,
      'INVALID_DOCUMENT_TEMPLATE',
      'Choose a supported operational document layout.',
    ),
    theme: closedValue(
      input.theme,
      HOTEL_OPERATIONAL_DOCUMENT_THEMES,
      'INVALID_DOCUMENT_THEME',
      'Choose a supported operational document colour theme.',
    ),
  };
}

export function normalizeHotelOperationalDocumentVersion(value: unknown): number {
  const version = Number(value);
  if (!Number.isInteger(version) || version < 0) {
    throw new HotelOperationalDocumentRuleError(
      'INVALID_DOCUMENT_VERSION',
      'Refresh this document profile before saving it again.',
    );
  }
  return version;
}

export function defaultHotelOperationalDocumentProfile(): HotelOperationalDocumentProfile {
  return {
    footerText: '',
    headerText: '',
    showPropertyContact: true,
    template: 'CLASSIC',
    theme: 'OCEAN',
    version: 0,
  };
}
