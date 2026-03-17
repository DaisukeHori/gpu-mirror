import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { authenticate } from '../../../lib/auth';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { data: colors, error } = await supabaseAdmin
    .from('hair_colors')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
  }

  return NextResponse.json({ colors: colors ?? [] });
}
