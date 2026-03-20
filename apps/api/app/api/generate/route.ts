import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { authenticate } from '../../../lib/auth';
import { getAIProvider } from '../../../lib/ai-gateway';
import { resizeImage } from '../../../lib/image-utils';
import { createConcurrencyLimiter, withTimeout, GENERATION_TIMEOUT_MS } from '../../../lib/concurrency';
import { ANGLES, ANGLE_LABELS, buildPrompt, buildRefineStep1Prompt, buildRefineStep2Prompt, generateRequestSchema } from '@revol-mirror/shared';
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Bad Request', message: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = generateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Bad Request', message: parsed.error.issues[0]?.message ?? 'Validation failed' },
      { status: 400 },
    );
  }
  const { session_id, styles, angles: requestedAngles, custom_instruction, previous_style_group } = parsed.data;

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

  const { data: existingCompleted } = await supabaseAdmin
    .from('session_generations')
    .select('reference_photo_path, angle, status')
    .eq('session_id', session_id)
    .eq('status', 'completed')
    .not('reference_photo_path', 'is', null);

  const completedSet = new Set(
    (existingCompleted ?? []).map((g) => `${g.reference_photo_path}::${g.angle}`),
  );

  const tasks: GenerationTask[] = [];

  for (let i = 0; i < styles.length; i++) {
    const style = styles[i];
    const styleGroup = nextStyleGroup + i;

    for (const angle of angles) {
      const dedupKey = `${style.reference_photo_path ?? ''}::${angle}`;
      if (!custom_instruction && style.reference_photo_path && completedSet.has(dedupKey)) {
        continue;
      }

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

      // --- Refine 2-step flow: download previous generation images ---
      let prevGenImages: Map<string, Buffer> | undefined;
      let step1FrontImage: Buffer | undefined;

      if (custom_instruction && previous_style_group) {
        const { data: prevGens } = await supabaseAdmin
          .from('session_generations')
          .select('angle, generated_photo_path')
          .eq('session_id', session_id)
          .eq('style_group', previous_style_group)
          .eq('status', 'completed');

        if (prevGens && prevGens.length > 0) {
          prevGenImages = new Map<string, Buffer>();
          await Promise.all(
            prevGens.map(async (g) => {
              if (!g.generated_photo_path) return;
              const { data } = await supabaseAdmin.storage
                .from('generated-photos')
                .download(g.generated_photo_path);
              if (data) {
                prevGenImages!.set(g.angle, await resizeImage(Buffer.from(await data.arrayBuffer())));
              }
            }),
          );

          // Step 1: Generate front image first
          const frontTask = tasks.find((t) => t.angle === 'front');
          if (frontTask) {
            try {
              await supabaseAdmin
                .from('session_generations')
                .update({ status: 'generating' })
                .eq('id', frontTask.generationId);

              const orderedAngles = ['front', 'three_quarter', 'side', 'back', 'glamour'];
              const angleLabelsArr = orderedAngles.map((a) => ANGLE_LABELS[a as keyof typeof ANGLE_LABELS] ?? a);
              const additionalImgs: Buffer[] = [];
              for (const a of orderedAngles) {
                const buf = prevGenImages.get(a);
                if (buf) additionalImgs.push(buf);
              }

              const step1Prompt = buildRefineStep1Prompt({
                customInstruction: custom_instruction,
                angleLabels: angleLabelsArr,
              });

              const step1Result = await withTimeout(
                provider.generateSingle({
                  customerPhoto: customerPhotoBuffer,
                  additionalImages: additionalImgs,
                  prompt: step1Prompt,
                }),
                GENERATION_TIMEOUT_MS,
                'AI refine step1 (front)',
              );

              step1FrontImage = step1Result.image;

              const storagePath = session_id + '/' + frontTask.generationId + '.jpg';
              await supabaseAdmin.storage.from('generated-photos').upload(storagePath, step1Result.image, { contentType: 'image/jpeg' });
              await supabaseAdmin.from('session_generations').update({
                status: 'completed',
                generated_photo_path: storagePath,
                ai_prompt: step1Prompt,
                ai_latency_ms: step1Result.latencyMs,
                ai_cost_usd: step1Result.estimatedCostUsd,
              }).eq('id', frontTask.generationId);

              const { data: urlData } = await supabaseAdmin.storage.from('generated-photos').createSignedUrl(storagePath, 3600);
              sendEvent({
                type: 'generation_completed',
                generation_id: frontTask.generationId,
                style_group: frontTask.styleGroup,
                angle: 'front',
                photo_url: urlData?.signedUrl,
                storage_path: storagePath,
                ai_latency_ms: step1Result.latencyMs,
                style_label: frontTask.style.style_label,
              });
            } catch (err) {
              try { await supabaseAdmin.from('session_generations').update({ status: 'failed' }).eq('id', frontTask.generationId); } catch {}
              sendEvent({ type: 'generation_failed', generation_id: frontTask.generationId, style_group: frontTask.styleGroup, angle: 'front', error: err instanceof Error ? err.message : 'Unknown error' });
            }
          }
        }
      }

      // Filter out front task if already handled by refine step 1
      const remainingTasks = (prevGenImages && step1FrontImage)
        ? tasks.filter((t) => t.angle !== 'front')
        : tasks;

      const promises = remainingTasks.map((task) =>
        runWithLimit(async () => {
          try {
            await supabaseAdmin
              .from('session_generations')
              .update({ status: 'generating' })
              .eq('id', task.generationId);

            let prompt: string;
            let additionalImages: Buffer[] | undefined;

            if (prevGenImages && step1FrontImage && custom_instruction) {
              // Step 2: Use confirmed front + prev gen images
              const orderedAngles = ['front', 'three_quarter', 'side', 'back', 'glamour'];
              const prevAngleLabels = orderedAngles.map((a) => ANGLE_LABELS[a as keyof typeof ANGLE_LABELS] ?? a);
              const prevImgs: Buffer[] = [];
              for (const a of orderedAngles) {
                const buf = prevGenImages.get(a);
                if (buf) prevImgs.push(buf);
              }

              const angleInst = (() => {
                switch (task.angle) {
                  case 'three_quarter': return 'photo from a three-quarter angle, face slightly turned to the side.';
                  case 'side': return 'side profile view.';
                  case 'back': return 'photo from behind, displaying the full back view of the hairstyle.';
                  case 'glamour': return 'professional beauty editorial portrait with soft bokeh background and magazine-quality aesthetic.';
                  default: return 'photo from the front.';
                }
              })();

              prompt = buildRefineStep2Prompt({
                customInstruction: custom_instruction,
                angle: task.angle,
                angleInstruction: angleInst,
                prevAngleLabels,
              });

              additionalImages = [step1FrontImage, ...prevImgs];
            } else {
              const cached = styleDataCache.get(task.styleIndex)!;
              prompt = buildPrompt({
                mode: ((task.style.simulation_mode as string) ?? 'style') as SimulationMode,
                angle: task.angle,
                colorName: cached.colorName,
                colorHex: cached.colorHex,
                customInstruction: custom_instruction,
              });
            }

            const cached = styleDataCache.get(task.styleIndex)!;
            const result = await withTimeout(
              provider.generateSingle({
                customerPhoto: customerPhotoBuffer,
                referencePhoto: (prevGenImages && step1FrontImage) ? undefined : cached.referencePhotoBuffer,
                additionalImages,
                prompt,
              }),
              GENERATION_TIMEOUT_MS,
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
              style_label: task.style.style_label,
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
              style_label: task.style.style_label,
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
