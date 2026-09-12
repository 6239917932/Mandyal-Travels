import type { PartnerHotelCalendarRecord } from '@/types/commerce';

export type ManualSalesChannel = {
  accountReference: string;
  name: string;
  properties: string[];
};

function csvCell(value: string | number | boolean | undefined): string {
  let text = value === undefined ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildManualDistributionCsv(
  calendar: PartnerHotelCalendarRecord[],
  channels: ManualSalesChannel[],
): string {
  const header = [
    'Date',
    'Property',
    'Room type',
    'Rate plan',
    'PMS rate (INR)',
    'Sellable rooms',
    'Stop sell',
    'Closed to arrival',
    'Closed to departure',
    'Minimum stay',
    'Maximum stay',
    'Sales channels requiring manual update',
    'Manual update status',
  ];
  const rows = calendar.map((day) => {
    const applicable = channels
      .filter(
        (channel) => channel.properties.length === 0 || channel.properties.includes(day.hotelName),
      )
      .map((channel) => `${channel.name} (${channel.accountReference})`)
      .join('; ');
    return [
      day.stayDate,
      day.hotelName,
      day.roomName,
      day.ratePlanName,
      day.nightlyRate,
      day.availableRooms,
      day.stopSell ? 'Yes' : 'No',
      day.closedToArrival ? 'Yes' : 'No',
      day.closedToDeparture ? 'Yes' : 'No',
      day.minimumStayNights,
      day.maximumStayNights,
      applicable || 'No channel account recorded',
      applicable ? 'Manual update required' : 'Not applicable',
    ];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
