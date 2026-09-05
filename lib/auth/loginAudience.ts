export const LOGIN_AUDIENCES = ['customer', 'partner', 'corporate', 'admin'] as const;

export type LoginAudience = (typeof LOGIN_AUDIENCES)[number];

type LoginAudienceContext = {
  hasPartnerApplication: boolean;
  hasPartnerMembership: boolean;
  organizationType: string | null;
  role: string;
};

const LOGIN_AUDIENCE_SET = new Set<string>(LOGIN_AUDIENCES);

export function normalizeLoginAudience(value: unknown): LoginAudience | null {
  return typeof value === 'string' && LOGIN_AUDIENCE_SET.has(value)
    ? (value as LoginAudience)
    : null;
}

export function inferLoginAudience(returnTo: string | null): LoginAudience | null {
  if (!returnTo) return null;
  if (returnTo === '/admin' || returnTo.startsWith('/admin/')) return 'admin';
  if (
    returnTo === '/partner' ||
    returnTo.startsWith('/partner/') ||
    returnTo === '/partners/apply' ||
    returnTo.startsWith('/partners/apply?')
  ) {
    return 'partner';
  }
  if (
    returnTo === '/business' ||
    returnTo.startsWith('/business/') ||
    returnTo === '/agent' ||
    returnTo.startsWith('/agent/') ||
    returnTo === '/account/company-requests' ||
    returnTo.startsWith('/account/company-requests/')
  ) {
    return 'corporate';
  }
  if (returnTo === '/account' || returnTo.startsWith('/account/')) return 'customer';
  return null;
}

export function canUseLoginAudience(
  audience: LoginAudience,
  context: LoginAudienceContext,
): boolean {
  if (audience === 'admin') return context.role === 'PLATFORM_ADMIN';
  if (audience === 'corporate') return context.organizationType === 'CORPORATE';
  if (audience === 'partner') {
    return (
      ['PARTNER_ADMIN', 'PARTNER_OPERATOR'].includes(context.role) ||
      context.hasPartnerMembership ||
      context.hasPartnerApplication ||
      context.organizationType === 'TRAVEL_AGENCY' ||
      (context.role === 'CUSTOMER' && !context.organizationType)
    );
  }
  return (
    context.role === 'CUSTOMER' &&
    !context.organizationType &&
    !context.hasPartnerMembership &&
    !context.hasPartnerApplication
  );
}

export function getLoginAudienceDestination(
  audience: LoginAudience,
  context: LoginAudienceContext,
): string {
  if (audience === 'admin') return '/admin';
  if (audience === 'corporate') {
    return context.role === 'BUSINESS_ADMIN' ? '/business/dashboard' : '/account/company-requests';
  }
  if (audience === 'partner') {
    if (context.organizationType === 'TRAVEL_AGENCY') return '/agent';
    if (
      context.hasPartnerMembership ||
      ['PARTNER_ADMIN', 'PARTNER_OPERATOR'].includes(context.role)
    ) {
      return '/partner';
    }
    return '/partners/apply';
  }
  return '/account';
}

export function isReturnToAllowedForAudience(
  audience: LoginAudience,
  returnTo: string | null,
): boolean {
  if (!returnTo) return false;
  return inferLoginAudience(returnTo) === audience;
}
