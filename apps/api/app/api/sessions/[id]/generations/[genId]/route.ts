import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../lib/supabase-admin';
import { authenticate } from '../../../../../../lib/auth';
import { updateGenerationSchema } from '@revol-mirror/shared';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; genId: string }> },
) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { id, genId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad Request', message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateGenerationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad Request', message: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 400 },
    );
  }

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('staff_id')
    .eq('id', id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Not Found', message: 'Session not found' }, { status: 404 });
  }
  if (session.staff_id !== auth.staffId && !['admin', 'manager'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden', message: 'Access denied' }, { status: 403 });
  }

  const update = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Bad Request', message: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('session_generations')
    .update(update)
    .eq('id', genId)
    .eq('session_id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ generation: data });
}
