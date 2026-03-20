import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { authenticate } from '../../../lib/auth';
import { resizeImage, createThumbnail, validateImageSize } from '../../../lib/image-utils';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('session_id') as string | null;
    const bucket = (formData.get('bucket') as string) ?? 'customer-photos';

    if (!file || !sessionId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'file and session_id are required' },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateImageSize(buffer.length)) {
      return NextResponse.json(
        { error: 'Payload Too Large', message: 'Image exceeds size limit' },
        { status: 413 },
      );
    }

    const resized = await resizeImage(buffer);
    const fileName = `${sessionId}/${randomUUID()}.jpg`;

    const validBuckets = ['customer-photos', 'reference-photos'];
    const targetBucket = validBuckets.includes(bucket) ? bucket : 'customer-photos';

    const { error: uploadError } = await supabaseAdmin.storage
      .from(targetBucket)
      .upload(fileName, resized, { contentType: 'image/jpeg' });

    if (uploadError) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: uploadError.message },
        { status: 500 },
      );
    }

    if (targetBucket === 'customer-photos') {
      const thumbnail = await createThumbnail(buffer);
      await supabaseAdmin.storage
        .from(targetBucket)
        .upload(`${sessionId}/thumb_${randomUUID()}.jpg`, thumbnail, { contentType: 'image/jpeg' });
    }

    const { data: urlData } = await supabaseAdmin.storage
      .from(targetBucket)
      .createSignedUrl(fileName, 3600);

    return NextResponse.json({
      storage_path: fileName,
      url: urlData?.signedUrl ?? '',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 },
    );
  }
}
