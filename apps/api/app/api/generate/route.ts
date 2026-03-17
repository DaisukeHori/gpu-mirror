import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { authenticate } from '../../../lib/auth';
import { getAIProvider } from '../../../lib/ai-gateway';
import { resizeImage } from '../../../lib/image-utils';
import { createConcurrencyLimiter, withTimeout } from '../../../lib/concurrency';
import { ANGLES, buildPrompt } from '@revol-mirror/shared';
import type { SimulationMode } from '@revol-mirror/shared';

interface GenerationTask {
  styleIndex: number;
  styleGroup: number;
  angle: string;
  generationId: string;
  style: Record<string, unknown>;
}

interface PreparedStyle {
  referencePhotoBuffer?: Buffer;
  colorName?: string;
  colorHex?: string;
}

async function prepareStyleData(
  style: Record<string, unknown>,
): Promise<PreparedStyle> {
  let referencePhotoBuffer: Buffer | undefined;
  if (style.reference_photo_path) {
    const bucket = style.reference_type === 'catalog' ? 'catalog-photos' : 'reference-photos';
    const { data: refData } = await supabaseAdmin.storage
      .from(bucket)
      .download(style.reference_photo_path as string);
    if (refData) {
      referencePhotoBuffer = await resizeImage(Buffer.from(await refData.arrayBuffer()));
    }
  }

  let colorName: string | undefined;
  let colorHex: string | undefined;

  if (style.hair_color_id) {
    const { data: color } = await supabaseAdmin
      .from('hair_colors')
      .select('name, hex_code')
      .eq('id', style.hair_color_id)
      .single();
    if (color) {
      colorName = color.name;
      colorHex = color.hex_code;
    }
  } else if (style.hair_color_custom) {
    colorName = style.hair_color_custom as string;
    colorHex = style.hair_color_custom as string;
  }

  return { referencePhotoBuffer, colorName, colorHex };
}

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof NextResponse) return auth;

  let body: { session_id?: string; styles?: Record<string, unknown>[]; angles?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad Request', message: 'Invalid JSON' }, { status: 400 });
  }
  const { session_id, styles, angles: requestedAngles } = body;

  if (!session_id || !Array.isArray(styles) || styles.length === 0) {
    return NextResponse.json(
      { error: 'Bad Request', message: 'session_id and styles required' },
      { status: 400 },
    );
  }

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('customer_photo_path, staff_id')
    .eq('id', session_id)
    .single();

  if (!session) {
    return NextResponse.json({ error: 'Not Found', message: 'Session not found' }, { status: 404 });
  }

  if (session.staff_id !== auth.staffId && !['admin', 'manager'].includes(auth.role)) {
    return NextResponse.json({ error: 'Forbidden', message: 'Access denied' }, { status: 403 });
  }

  const angles = requestedAngles?.length ? requestedAngles : [...ANGLES] as string[];
  const provider = getAIProvider();

  const { data: customerPhotoData } = await supabaseAdmin.storage
    .from('customer-photos')
    .download(session.customer_photo_path);

  if (!customerPhotoData) {
    return NextResponse.json({ error: 'Not Found', message: 'Customer photo not found' }, { status: 404 });
  }

  const customerPhotoBuffer = await resizeImage(Buffer.from(await customerPhotoData.arrayBuffer()));

  // Pre-fetch reference photos and color data once per style (not per angle), in parallel
  const styleDataCache = new Map<number, PreparedStyle>();
  const prepared = await Promise.all(
    styles.map(async (style, i) => {
      try {
        return { index: i, data: await prepareStyleData(style) };
      } catch {
        return { index: i, data: {} as PreparedStyle };
      }
    }),
  );
  for (const { index, data } of prepared) {
    styleDataCache.set(index, data);
  }

  const { data: existingGens } = await supabaseAdmin
    .from('session_generations')
    .select('style_group')
    .eq('session_id', session_id)
    .order('style_group', { ascending: false })
    .limit(1);

  const nextStyleGroup = ((existingGens?.[0]?.style_group as number) ?? 0) + 1;

  const tasks: GenerationTask[] = [];

  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    const styleGroup = nextStyleGroup + i;

    for (const angle of angles) {
      const { data: gen } = await supabaseAdmin
        .from('session_generations')
        .insert({
          session_id,
          style_group: styleGroup,
          angle,
          simulation_mode: style.simulation_mode ?? 'style',
          reference_type: style.reference_type,
          reference_photo_path: style.reference_photo_path,
          reference_source_url: style.reference_source_url,
          catalog_item_id: style.catalog_item_id,
          hair_color_id: style.hair_color_id,
          hair_color_custom: style.hair_color_custom,
          style_label: style.style_label,
          status: 'pending',
        })
        .select('id')
        .single();

      if (gen) {
        tasks.push({ styleIndex: i, styleGroup, angle, generationId: gen.id, style });
      }
    }
  }

  const runWithLimit = createConcurrencyLimiter();
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let streamClosed = false;

      function sendEvent(data: Record<string, unknown>) {
        if (streamClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          streamClosed = true;
        }
      }

      // Keep-alive: send a comment every 15s to prevent proxy/LB from closing the connection
      const heartbeat = setInterval(() => {
        if (streamClosed) { clearInterval(heartbeat); return; }
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          streamClosed = true;
          clearInterval(heartbeat);
        }
      }, 15_000);

      const promises = tasks.map((task) =>
        runWithLimit(async () => {
          try {
            await supabaseAdmin
              .from('session_generations')
              .update({ status: 'generating' })
              .eq('id', task.generationId);

            const cached = styleDataCache.get(task.styleIndex)!;
            const prompt = buildPrompt({
              mode: ((task.style.simulation_mode as string) ?? 'style') as SimulationMode,
              angle: task.angle,
              colorName: cached.colorName,
              colorHex: cached.colorHex,
            });

            const result = await withTimeout(
              provider.generateSingle({
                customerPhoto: customerPhotoBuffer,
                referencePhoto: cached.referencePhotoBuffer,
                prompt,
              }),
              60_000,
              `AI generation (${task.angle})`,
            );

            const storagePath = `${session_id}/${task.generationId}.jpg`;
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
              .eq('id', task.generationId);

            const { data: urlData } = await supabaseAdmin.storage
              .from('generated-photos')
              .createSignedUrl(storagePath, 3600);

            sendEvent({
              type: 'generation_completed',
              generation_id: task.generationId,
              style_group: task.styleGroup,
              angle: task.angle,
              photo_url: urlData?.signedUrl,
              storage_path: storagePath,
              ai_latency_ms: result.latencyMs,
            });
          } catch (err) {
            try {
              await supabaseAdmin
                .from('session_generations')
                .update({ status: 'failed' })
                .eq('id', task.generationId);
            } catch {
              // best-effort status update
            }

            sendEvent({
              type: 'generation_failed',
              generation_id: task.generationId,
              style_group: task.styleGroup,
              angle: task.angle,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
          }
        }),
      );

      await Promise.allSettled(promises);
      clearInterval(heartbeat);
      sendEvent({ type: 'all_completed' });
      try { controller.close(); } catch { /* already closed */ }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
