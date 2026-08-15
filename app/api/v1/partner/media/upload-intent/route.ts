import { NextResponse } from 'next/server';

import { readJsonObject } from '@/lib/api/request';
import { getPartnerAccess, recordPartnerAudit } from '@/lib/partnerAuth';
import { createMediaUploadIntent } from '@/services/mediaStorageService';

export async function POST(request: Request) {
  const access = await getPartnerAccess(request);
  if (!access?.partnerId)
    return NextResponse.json({ error: 'Partner access required.' }, { status: 401 });
  const body = await readJsonObject(request);
  const fileName = typeof body?.fileName === 'string' ? body.fileName.trim().slice(0, 180) : '';
  const contentType = typeof body?.contentType === 'string' ? body.contentType : '';
  const byteLength = typeof body?.byteLength === 'number' ? body.byteLength : 0;
  try {
    const intent = await createMediaUploadIntent({
      partnerId: access.partnerId,
      fileName,
      contentType,
      byteLength,
    });
    await recordPartnerAudit(access, {
      action: 'MEDIA_UPLOAD_INTENT_CREATED',
      entityType: 'MEDIA',
      summary: 'A governed property media upload intent was created.',
      metadata: { contentType, byteLength },
    });
    return NextResponse.json({ data: intent }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'MEDIA_PROVIDER_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Production media storage is not configured.' },
        { status: 503 },
      );
    }
    if (message.startsWith('MEDIA_PROVIDER_')) {
      return NextResponse.json(
        { error: 'Media storage is temporarily unavailable.' },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: message || 'Invalid media upload request.' },
      { status: 400 },
    );
  }
}
