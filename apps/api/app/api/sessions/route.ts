import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { authenticate } from '../../../lib/auth';

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad Request', message: 'Invalid JSON' }, { status: 400 });
  }
  const { customer_photo_path, store_code } = body;

  if (!customer_photo_path) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'customer_photo_path is required' },
      { status: 400 },
    );
  }

  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .insert({
      staff_id: auth.staffId,
      store_code: store_code ?? auth.storeCode,
      customer_photo_path,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ session }, { status: 201 });
}

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('sessions')
    .select('*, session_generations(id, style_group, angle, generated_photo_path, status)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (!['admin', 'manager'].includes(auth.role)) {
    query = query.eq('staff_id', auth.staffId);
  }

  const { data: sessions, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 },
    );
  }

  const mapped = await Promise.all(
    (sessions ?? []).map(async (s: Record<string, unknown>) => {
      const gens = (s.session_generations ?? []) as Record<string, unknown>[];
      const completedGens = gens.filter((g) => g.status === 'completed');
      const frontPhoto = completedGens.find((g) => g.angle === 'front');

      let first_front_photo: string | null = null;
      if (frontPhoto?.generated_photo_path) {
        const { data } = await supabaseAdmin.storage
          .from('generated-photos')
          .createSignedUrl(frontPhoto.generated_photo_path as string, 3600);
        first_front_photo = data?.signedUrl ?? null;
      }

      return {
        ...s,
        session_generations: undefined,
        generation_count: completedGens.length,
        first_front_photo,
      };
    }),
  );

  return NextResponse.json({
    sessions: mapped,
    total: count ?? 0,
    page,
    limit,
  });
}
