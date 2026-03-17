import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { authenticate, requireAdmin } from '../../../lib/auth';
import { catalogQuerySchema, createCatalogItemSchema } from '@revol-mirror/shared';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const qParsed = catalogQuerySchema.safeParse({
    category_id: searchParams.get('category_id') ?? undefined,
    gender: searchParams.get('gender') ?? undefined,
    search: searchParams.get('search') ?? undefined,
    sort: searchParams.get('sort') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    limit: searchParams.get('limit') ?? undefined,
  });
  const q = qParsed.success ? qParsed.data : { page: 1, limit: 30, sort: 'popularity' as const };
  const categoryId = qParsed.success ? q.category_id : null;
  const gender = qParsed.success ? q.gender : null;
  const search = qParsed.success ? q.search : null;
  const sort = q.sort;
  const page = q.page;
  const limit = q.limit;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from('catalog_items')
    .select('*, category:catalog_categories(*)', { count: 'exact' })
    .eq('is_active', true);

  if (categoryId) query = query.eq('category_id', categoryId);
  if (gender) query = query.eq('gender', gender);
  if (search) query = query.ilike('title', `%${search}%`);

  if (sort === 'created_at') {
    query = query.order('created_at', { ascending: false });
  } else {
    query = query.order('popularity', { ascending: false });
  }

  const { data: items, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }

  const enriched = await Promise.all(
    (items ?? []).map(async (item: Record<string, unknown>) => {
      const imagePath = item.image_path as string;
      const thumbPath = (item.thumbnail_path as string | null) ?? imagePath;
      const [{ data: imgUrl }, { data: thumbUrl }] = await Promise.all([
        supabaseAdmin.storage.from('catalog-photos').createSignedUrl(imagePath, 3600),
        supabaseAdmin.storage.from('catalog-photos').createSignedUrl(thumbPath, 3600),
      ]);
      return {
        ...item,
        image_url: imgUrl?.signedUrl ?? null,
        thumbnail_url: thumbUrl?.signedUrl ?? null,
      };
    }),
  );

  return NextResponse.json({ items: enriched, total: count ?? 0 });
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad Request', message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createCatalogItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad Request', message: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 400 },
    );
  }

  const { data: item, error } = await supabaseAdmin
    .from('catalog_items')
    .insert({
      ...parsed.data,
      created_by: auth.staffId,
    })
    .select('*, category:catalog_categories(*)')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ item }, { status: 201 });
}
