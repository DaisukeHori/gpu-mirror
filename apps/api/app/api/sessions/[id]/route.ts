import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { authenticate } from '../../../../lib/auth';
import { updateSessionSchema } from '@revol-mirror/shared';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .select('*, session_generations(*)')
    .eq('id', id)
    .single();

  if (error || !session) {
    return NextResponse.json(
      { error: 'Not Found', message: 'Session not found' },
      { status: 404 },
    );
  }

  if (session.staff_id !== auth.staffId && !['admin', 'manager'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden', message: 'Access denied' }, { status: 403 });
  }

  const gens = (session.session_generations ?? []) as Record<string, unknown>[];

  const photoPaths = gens
    .map((g) => g.generated_photo_path as string | null)
    .filter((p): p is string => !!p);

  const signedUrlMap = new Map<string, string>();

  if (photoPaths.length > 0) {
    const { data: signedUrls } = await supabaseAdmin.storage
      .from('generated-photos')
      .createSignedUrls(photoPaths, 3600);

    if (signedUrls) {
      for (const entry of signedUrls) {
        if (entry.signedUrl && entry.path) {
          signedUrlMap.set(entry.path, entry.signedUrl);
        }
      }
    }
  }

  const enriched = gens.map((g) => {
    const path = g.generated_photo_path as string | null;
    return { ...g, photo_url: path ? (signedUrlMap.get(path) ?? null) : null };
  });

  let customer_photo_url: string | null = null;
  if (session.customer_photo_path && session.customer_photo_path !== 'pending') {
    const { data } = await supabaseAdmin.storage
      .from('customer-photos')
      .createSignedUrl(session.customer_photo_path, 3600);
    customer_photo_url = data?.signedUrl ?? null;
  }

  return NextResponse.json({
    session: { ...session, session_generations: enriched, customer_photo_url },
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const { data: existing } = await supabaseAdmin
    .from('sessions')
    .select('staff_id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Not Found', message: 'Session not found' }, { status: 404 });
  }
  if (existing.staff_id !== auth.staffId && !['admin', 'manager'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden', message: 'Access denied' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad Request', message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSessionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad Request', message: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {};
  if (parsed.data.is_closed !== undefined) {
    update.is_closed = parsed.data.is_closed;
    if (parsed.data.is_closed) {
      update.closed_at = new Date().toISOString();
    }
  }
  if (parsed.data.customer_photo_path) {
    update.customer_photo_path = parsed.data.customer_photo_path;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Bad Request', message: 'No valid fields to update' }, { status: 400 });
  }

  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ session });
}
