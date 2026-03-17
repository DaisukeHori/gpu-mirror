import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { authenticate, requireAdmin } from '../../../../lib/auth';
import { updateCatalogItemSchema } from '@revol-mirror/shared';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad Request', message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateCatalogItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad Request', message: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 400 },
    );
  }

  const update = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Bad Request', message: 'No valid fields to update' }, { status: 400 });
  }

  const { data: item, error } = await supabaseAdmin
    .from('catalog_items')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from('catalog_items')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
