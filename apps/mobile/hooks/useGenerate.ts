import { useState, useCallback, useRef } from 'react';
import { apiSSE, apiGet, apiPost } from '../lib/api';

export interface GenerationResult {
  generation_id: string;
  style_group: number;
  angle: string;
  photo_url?: string;
  storage_path?: string;
  ai_latency_ms?: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  error?: string;
  style_label?: string;
}

export interface StyleGroupProgress {
  style_group: number;
  completed: string[];
  failed: string[];
  total: number;
}

interface StyleInput {
  simulation_mode: string;
  reference_type: string;
  reference_photo_path?: string;
  reference_source_url?: string;
  catalog_item_id?: string;
  hair_color_id?: string;
  hair_color_custom?: string;
  style_label?: string;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60;

export function useGenerate() {
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [progress, setProgress] = useState<Map<number, StyleGroupProgress>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const syncFromDB = useCallback(async (sessionId: string): Promise<boolean> => {
    try {
      const data = await apiGet<{ session: { session_generations: GenerationRecord[] } }>(
        `/api/sessions/${sessionId}`,
      );
      const gens = data.session.session_generations ?? [];
      const newResults: GenerationResult[] = gens.map((g) => ({
        generation_id: g.id,
        style_group: g.style_group,
        angle: g.angle,
        photo_url: g.photo_url ?? undefined,
        storage_path: g.generated_photo_path ?? undefined,
        status: g.status as GenerationResult['status'],
        style_label: g.style_label ?? undefined,
      }));

      setResults(newResults);

      const groupMap = new Map<number, StyleGroupProgress>();
      for (const r of newResults) {
        if (!groupMap.has(r.style_group)) {
          const total = gens.filter((g) => g.style_group === r.style_group).length;
          groupMap.set(r.style_group, {
            style_group: r.style_group,
            completed: [],
            failed: [],
            total,
          });
        }
        const group = groupMap.get(r.style_group)!;
        if (r.status === 'completed') group.completed.push(r.angle);
        else if (r.status === 'failed') group.failed.push(r.angle);
      }
      setProgress(groupMap);

      const allDone = gens.every((g) => g.status === 'completed' || g.status === 'failed');
      return allDone;
    } catch {
      return false;
    }
  }, []);

  const pollUntilDone = useCallback(async (sessionId: string, signal: AbortSignal) => {
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      if (signal.aborted) return;
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      if (signal.aborted) return;
      const done = await syncFromDB(sessionId);
      if (done) {
        setIsComplete(true);
        setIsGenerating(false);
        return;
      }
    }
    // Max attempts reached — sync one last time and mark as complete regardless
    await syncFromDB(sessionId);
    setIsComplete(true);
    setIsGenerating(false);
  }, [syncFromDB]);

  const startGeneration = useCallback(
    async (sessionId: string, styles: StyleInput[], angles?: string[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      sessionIdRef.current = sessionId;

      setIsGenerating(true);
      setIsComplete(false);
      setResults([]);
      setProgress(new Map());

      const angleCount = angles?.length ?? 5;
      let sseReceivedAllCompleted = false;

      function ensureGroup(prev: Map<number, StyleGroupProgress>, groupNum: number) {
        const next = new Map(prev);
        if (!next.has(groupNum)) {
          next.set(groupNum, {
            style_group: groupNum,
            completed: [],
            failed: [],
            total: angleCount,
          });
        }
        return next;
      }

      await apiSSE(
        '/api/generate',
        { session_id: sessionId, styles, angles },
        {
          onEvent: (event) => {
            if (controller.signal.aborted) return;

            if (event.type === 'generation_completed') {
              const result: GenerationResult = {
                generation_id: event.generation_id as string,
                style_group: event.style_group as number,
                angle: event.angle as string,
                photo_url: event.photo_url as string | undefined,
                storage_path: event.storage_path as string | undefined,
                ai_latency_ms: event.ai_latency_ms as number | undefined,
                status: 'completed',
              };
              setResults((prev) => [...prev, result]);
              setProgress((prev) => {
                const next = ensureGroup(prev, result.style_group);
                const group = next.get(result.style_group)!;
                group.completed.push(result.angle);
                return next;
              });
            } else if (event.type === 'generation_failed') {
              const result: GenerationResult = {
                generation_id: event.generation_id as string,
                style_group: event.style_group as number,
                angle: event.angle as string,
                status: 'failed',
                error: event.error as string,
              };
              setResults((prev) => [...prev, result]);
              setProgress((prev) => {
                const next = ensureGroup(prev, result.style_group);
                const group = next.get(result.style_group)!;
                group.failed.push(result.angle);
                return next;
              });
            } else if (event.type === 'all_completed') {
              sseReceivedAllCompleted = true;
              // actual state update happens in onComplete to avoid double-set
            }
          },
          onError: () => {
            if (controller.signal.aborted || sseReceivedAllCompleted) return;
            pollUntilDone(sessionId, controller.signal);
          },
          onComplete: () => {
            if (controller.signal.aborted) return;
            if (sseReceivedAllCompleted) {
              setIsComplete(true);
              setIsGenerating(false);
              return;
            }
            // Stream closed without all_completed — fall back to polling
            pollUntilDone(sessionId, controller.signal);
          },
        },
        controller.signal,
      );
    },
    [pollUntilDone],
  );

  const retryGeneration = useCallback(
    async (sessionId: string, generationId: string): Promise<GenerationResult | null> => {
      // Optimistic update: mark as generating immediately
      setResults((prev) =>
        prev.map((r) =>
          r.generation_id === generationId
            ? { ...r, status: 'generating' as const, error: undefined }
            : r,
        ),
      );

      try {
        const data = await apiPost<{
          generation_id: string;
          status: string;
          photo_url?: string;
          ai_latency_ms?: number;
        }>(`/api/sessions/${sessionId}/generations/${generationId}/retry`);

        setResults((prev) =>
          prev.map((r) =>
            r.generation_id === generationId
              ? {
                  ...r,
                  photo_url: data.photo_url,
                  status: data.status as GenerationResult['status'],
                  ai_latency_ms: data.ai_latency_ms,
                  error: undefined,
                }
              : r,
          ),
        );

        return {
          generation_id: data.generation_id,
          style_group: 0,
          angle: '',
          photo_url: data.photo_url,
          status: data.status as GenerationResult['status'],
          ai_latency_ms: data.ai_latency_ms,
        };
      } catch {
        // Revert to failed on error
        setResults((prev) =>
          prev.map((r) =>
            r.generation_id === generationId
              ? { ...r, status: 'failed' as const, error: 'Retry failed' }
              : r,
          ),
        );
        return null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    sessionIdRef.current = null;
    setResults([]);
    setProgress(new Map());
    setIsGenerating(false);
    setIsComplete(false);
  }, []);

  return {
    results,
    progress,
    isGenerating,
    isComplete,
    startGeneration,
    retryGeneration,
    syncFromDB,
    reset,
  };
}

interface GenerationRecord {
  id: string;
  style_group: number;
  angle: string;
  status: string;
  generated_photo_path: string | null;
  photo_url: string | null;
  style_label: string | null;
}
