import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { authenticate } from '../../../lib/auth';
import { resizeImage, validateImageSize } from '../../../lib/image-utils';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad Request', message: 'Invalid JSON' }, { status: 400 });
  }
  const { url, session_id } = body as { url?: string; session_id?: string };

  if (!url || !session_id) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'url and session_id are required' },
      { status: 400 },
    );
  }

  try {
    const parsed = new URL(url);
    const allowedHosts = ['i.pinimg.com', 'pinimg.com', 'pinterest.com', 'www.pinterest.com'];
    const isAllowed = allowedHosts.some((h) => parsed.hostname === h || parsed.hostname.endsWith(`.${h}`));
    if (!isAllowed || !['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'URL not allowed' },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json(
      { error: 'Bad Request', message: 'Invalid URL' },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
        Accept: 'image/*',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Bad Gateway', message: `Failed to fetch image: ${response.status}` },
        { status: 502 },
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateImageSize(buffer.length)) {
      return NextResponse.json(
        { error: 'Payload Too Large', message: 'Image exceeds size limit' },
        { status: 413 },
      );
    }

    const resized = await resizeImage(buffer);
    const fileName = `${session_id}/${randomUUID()}.jpg`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('reference-photos')
      .upload(fileName, resized, { contentType: 'image/jpeg' });

    if (uploadError) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: uploadError.message },
        { status: 500 },
      );
    }

    const { data: urlData } = await supabaseAdmin.storage
      .from('reference-photos')
      .createSignedUrl(fileName, 3600);

    return NextResponse.json({
      storage_path: fileName,
      url: urlData?.signedUrl ?? '',
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
