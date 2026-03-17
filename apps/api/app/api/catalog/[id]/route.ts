import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { authenticate, requireAdmin } from '../../../../lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad Request', message: 'Invalid JSON' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.title !== undefined) update.title = body.title;
  if (body.description !== undefined) update.description = body.description;
  if (body.image_path !== undefined) update.image_path = body.image_path;
  if (body.thumbnail_path !== undefined) update.thumbnail_path = body.thumbnail_path;
  if (body.category_id !== undefined) update.category_id = body.category_id;
  if (body.tags !== undefined) update.tags = body.tags;
  if (body.gender !== undefined) update.gender = body.gender;

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
