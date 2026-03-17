import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { authenticate, requireAdmin } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get('category_id');
  const gender = searchParams.get('gender');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') ?? 'popularity';
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = parseInt(searchParams.get('limit') ?? '30', 10);
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad Request', message: 'Invalid JSON' }, { status: 400 });
  }

  const { data: item, error } = await supabaseAdmin
    .from('catalog_items')
    .insert({
      title: body.title,
      description: body.description,
      image_path: body.image_path,
      thumbnail_path: body.thumbnail_path,
      category_id: body.category_id,
      tags: body.tags,
      gender: body.gender,
      created_by: auth.staffId,
    })
    .select('*, category:catalog_categories(*)')
    .single();

  if (error) {
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ item }, { status: 201 });
}
