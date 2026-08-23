type FlightConnectionAccess = {
  memberRole?: string;
  partnerId?: string;
  partnerType?: string;
};

export function canManageFlightConnections(
  access: FlightConnectionAccess | null,
): access is FlightConnectionAccess & {
  memberRole: 'ADMIN';
  partnerId: string;
  partnerType: 'FLIGHT';
} {
  return Boolean(
    access?.partnerId && access.partnerType === 'FLIGHT' && access.memberRole === 'ADMIN',
  );
}
