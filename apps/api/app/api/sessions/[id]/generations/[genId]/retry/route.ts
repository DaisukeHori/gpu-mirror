import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../../../../lib/supabase-admin';
import { authenticate } from '../../../../../../../lib/auth';
import { getAIProvider } from '../../../../../../../lib/ai-gateway';
import { resizeImage } from '../../../../../../../lib/image-utils';
import { withTimeout } from '../../../../../../../lib/concurrency';
import { buildPrompt } from '@revol-mirror/shared';
import type { SimulationMode } from '@revol-mirror/shared';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; genId: string }> },
) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  const { id: sessionId, genId } = await params;

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('customer_photo_path, staff_id')
    .eq('id', sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Not Found', message: 'Session not found' }, { status: 404 });
  }
  if (session.staff_id !== auth.staffId && !['admin', 'manager'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Atomic check-and-update: only transitions from 'failed' to 'generating'
  const { data: gen, error: updateErr } = await supabaseAdmin
    .from('session_generations')
    .update({ status: 'generating' })
    .eq('id', genId)
    .eq('session_id', sessionId)
    .eq('status', 'failed')
    .select('*')
    .single();

  if (updateErr || !gen) {
    // Either not found, wrong session, or status wasn't 'failed' (already retrying / completed)
    const { data: existing } = await supabaseAdmin
      .from('session_generations')
      .select('status')
      .eq('id', genId)
      .eq('session_id', sessionId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Not Found', message: 'Generation not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Conflict', message: `Cannot retry: status is "${existing.status}", expected "failed"` },
      { status: 409 },
    );
  }

  try {
    const { data: customerBlob } = await supabaseAdmin.storage
      .from('customer-photos')
      .download(session.customer_photo_path);

    if (!customerBlob) {
      throw new Error('Customer photo not found in storage');
    }

    const customerPhotoBuffer = await resizeImage(Buffer.from(await customerBlob.arrayBuffer()));

    let referencePhotoBuffer: Buffer | undefined;
    if (gen.reference_photo_path) {
      const bucket = gen.reference_type === 'catalog' ? 'catalog-photos' : 'reference-photos';
      const { data: refBlob } = await supabaseAdmin.storage
        .from(bucket)
        .download(gen.reference_photo_path);
      if (refBlob) {
        referencePhotoBuffer = await resizeImage(Buffer.from(await refBlob.arrayBuffer()));
      }
    }

    let colorName: string | undefined;
    let colorHex: string | undefined;
    if (gen.hair_color_id) {
      const { data: color } = await supabaseAdmin
        .from('hair_colors')
        .select('name, hex_code')
        .eq('id', gen.hair_color_id)
        .single();
      if (color) {
        colorName = color.name;
        colorHex = color.hex_code;
      }
    } else if (gen.hair_color_custom) {
      colorName = gen.hair_color_custom;
      colorHex = gen.hair_color_custom;
    }

    const prompt = buildPrompt({
      mode: (gen.simulation_mode ?? 'style') as SimulationMode,
      angle: gen.angle,
      colorName,
      colorHex,
    });

    const provider = getAIProvider();
    const result = await withTimeout(
      provider.generateSingle({
        customerPhoto: customerPhotoBuffer,
        referencePhoto: referencePhotoBuffer,
        prompt,
      }),
      60_000,
      `AI retry (${gen.angle})`,
    );

    const storagePath = `${sessionId}/${genId}.jpg`;

    // Overwrite if exists
    await supabaseAdmin.storage.from('generated-photos').remove([storagePath]);
    await supabaseAdmin.storage
      .from('generated-photos')
      .upload(storagePath, result.image, { contentType: 'image/jpeg' });

    await supabaseAdmin
      .from('session_generations')
      .update({
        status: 'completed',
        generated_photo_path: storagePath,
        ai_prompt: prompt,
        ai_latency_ms: result.latencyMs,
        ai_cost_usd: result.estimatedCostUsd,
      })
      .eq('id', genId);

    const { data: urlData } = await supabaseAdmin.storage
      .from('generated-photos')
      .createSignedUrl(storagePath, 3600);

    return NextResponse.json({
      generation_id: genId,
      status: 'completed',
      photo_url: urlData?.signedUrl,
      ai_latency_ms: result.latencyMs,
    });
  } catch (err) {
    try {
      await supabaseAdmin
        .from('session_generations')
        .update({ status: 'failed' })
        .eq('id', genId);
    } catch {
      // best-effort status update
    }

    return NextResponse.json(
      {
        error: 'Generation Failed',
        message: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 502 },
    );
  }
}
