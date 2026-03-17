import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from './supabase-admin';

export interface AuthContext {
  userId: string;
  staffId: string;
  role: string;
  storeCode: string | null;
}

export async function authenticate(request: NextRequest): Promise<AuthContext | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Missing token' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized', message: 'Invalid token' }, { status: 401 });
  }

  const { data: staff } = await supabaseAdmin
    .from('staffs')
    .select('id, role, store_code')
    .eq('auth_user_id', user.id)
    .eq('is_active', true)
    .single();

  if (!staff) {
    return NextResponse.json({ error: 'Forbidden', message: 'Staff not found' }, { status: 403 });
  }

  return {
    userId: user.id,
    staffId: staff.id,
    role: staff.role,
    storeCode: staff.store_code,
  };
}

export function requireAdmin(auth: AuthContext): NextResponse | null {
  if (!['admin', 'manager'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden', message: 'Admin access required' }, { status: 403 });
  }
  return null;
}
