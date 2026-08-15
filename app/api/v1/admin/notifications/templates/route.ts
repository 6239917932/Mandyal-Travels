import { getPlatformAdmin } from '@/lib/adminAuth';
import { readJsonObject } from '@/lib/api/request';
import { prisma } from '@/lib/prisma';
export async function POST(request: Request): Promise<Response> {
  if (!(await getPlatformAdmin()))
    return Response.json(
      { error: { code: 'ADMIN_UNAUTHORIZED', message: 'Administrator access is required.' } },
      { status: 401 },
    );
  const body = await readJsonObject(request);
  const templateKey =
    typeof body?.templateKey === 'string' ? body.templateKey.trim().toUpperCase() : '';
  const channel = typeof body?.channel === 'string' ? body.channel.trim().toUpperCase() : '';
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const templateBody = typeof body?.body === 'string' ? body.body.trim() : '';
  if (
    !/^[A-Z][A-Z0-9_]{2,79}$/.test(templateKey) ||
    !['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'].includes(channel) ||
    templateBody.length < 5 ||
    templateBody.length > 5000 ||
    subject.length > 200
  )
    return Response.json(
      {
        error: {
          code: 'INVALID_TEMPLATE',
          message: 'Enter a valid key, channel, subject, and bounded body.',
        },
      },
      { status: 400 },
    );
  const template = await prisma.notificationTemplate.upsert({
    create: { body: templateBody, channel, status: 'ACTIVE', subject, templateKey },
    update: { body: templateBody, channel, status: 'ACTIVE', subject, version: { increment: 1 } },
    where: { templateKey },
  });
  return Response.json({ data: template }, { status: 201 });
}
