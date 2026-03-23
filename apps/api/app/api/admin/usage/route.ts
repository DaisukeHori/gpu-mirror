import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { authenticate, requireAdmin } from '../../../../lib/auth';

/**
 * GET /api/admin/usage
 *
 * Returns AI token/cost usage aggregated by staff member.
 * Query params:
 *   - from: ISO date string (default: 30 days ago)
 *   - to:   ISO date string (default: now)
 *   - store_code: optional filter
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const forbidden = requireAdmin(auth);
  if (forbidden) return forbidden;

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = searchParams.get('from') ?? thirtyDaysAgo.toISOString();
  const to = searchParams.get('to') ?? now.toISOString();
  const storeCode = searchParams.get('store_code');

  try {
    // Aggregate cost/count per staff
    let query = supabaseAdmin
      .from('session_generations')
      .select(`
        id,
        ai_cost_usd,
        ai_latency_ms,
        status,
        created_at,
        session:sessions!inner(
          id,
          staff_id,
          store_code,
          created_at,
          staff:staffs!inner(
            id,
            display_name,
            email,
            store_code,
            role
          )
        )
      `)
      .gte('created_at', from)
      .lte('created_at', to);

    if (storeCode) {
      query = query.eq('session.store_code', storeCode);
    }

    const { data: generations, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Internal Server Error', message: error.message },
        { status: 500 },
      );
    }

    // Aggregate by staff
    const staffMap = new Map<
      string,
      {
        staff_id: string;
        display_name: string;
        email: string;
        store_code: string | null;
        role: string;
        total_generations: number;
        completed_generations: number;
        failed_generations: number;
        total_cost_usd: number;
        avg_latency_ms: number;
        latency_sum: number;
        latency_count: number;
      }
    >();

    for (const gen of generations ?? []) {
      const session = gen.session as unknown as {
        id: string;
        staff_id: string;
        store_code: string | null;
        staff: {
          id: string;
          display_name: string;
          email: string;
          store_code: string | null;
          role: string;
        };
      };
      const staff = session.staff;
      const staffId = staff.id;

      let entry = staffMap.get(staffId);
      if (!entry) {
        entry = {
          staff_id: staffId,
          display_name: staff.display_name,
          email: staff.email,
          store_code: staff.store_code,
          role: staff.role,
          total_generations: 0,
          completed_generations: 0,
          failed_generations: 0,
          total_cost_usd: 0,
          avg_latency_ms: 0,
          latency_sum: 0,
          latency_count: 0,
        };
        staffMap.set(staffId, entry);
      }

      entry.total_generations += 1;
      if (gen.status === 'completed') entry.completed_generations += 1;
      if (gen.status === 'failed') entry.failed_generations += 1;
      entry.total_cost_usd += Number(gen.ai_cost_usd ?? 0);
      if (gen.ai_latency_ms) {
        entry.latency_sum += Number(gen.ai_latency_ms);
        entry.latency_count += 1;
      }
    }

    // Compute averages and build response
    const staffUsage = [...staffMap.values()]
      .map((entry) => ({
        staff_id: entry.staff_id,
        display_name: entry.display_name,
        email: entry.email,
        store_code: entry.store_code,
        role: entry.role,
        total_generations: entry.total_generations,
        completed_generations: entry.completed_generations,
        failed_generations: entry.failed_generations,
        total_cost_usd: Math.round(entry.total_cost_usd * 10000) / 10000,
        avg_latency_ms: entry.latency_count > 0
          ? Math.round(entry.latency_sum / entry.latency_count)
          : 0,
      }))
      .sort((a, b) => b.total_cost_usd - a.total_cost_usd);

    // Also aggregate by store
    const storeMap = new Map<
      string,
      { store_code: string; total_generations: number; total_cost_usd: number; staff_count: number }
    >();
    for (const s of staffUsage) {
      const code = s.store_code ?? '未設定';
      let store = storeMap.get(code);
      if (!store) {
        store = { store_code: code, total_generations: 0, total_cost_usd: 0, staff_count: 0 };
        storeMap.set(code, store);
      }
      store.total_generations += s.total_generations;
      store.total_cost_usd += s.total_cost_usd;
      store.staff_count += 1;
    }

    const totalCost = staffUsage.reduce((sum, s) => sum + s.total_cost_usd, 0);
    const totalGenerations = staffUsage.reduce((sum, s) => sum + s.total_generations, 0);

    return NextResponse.json({
      period: { from, to },
      summary: {
        total_cost_usd: Math.round(totalCost * 10000) / 10000,
        total_generations: totalGenerations,
        staff_count: staffUsage.length,
      },
      by_staff: staffUsage,
      by_store: [...storeMap.values()].sort((a, b) => b.total_cost_usd - a.total_cost_usd),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: err instanceof Error ? err.message : 'Unknown' },
      { status: 500 },
    );
  }
}
