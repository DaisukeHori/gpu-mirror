import { useState, useCallback, useRef, useEffect } from 'react';
import { downloadAndCache } from '../lib/generation-cache';
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

const POLL_INTERVAL_MS = 500;
const MAX_POLL_ATTEMPTS = 600;

export function useGenerate() {
  const [results, setResults] = useState<GenerationResult[]>([]);
  const [progress, setProgress] = useState<Map<number, StyleGroupProgress>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const prevMaxStyleGroupRef = useRef<number>(0);

  const upsertResult = useCallback((result: GenerationResult) => {
    setResults((prev) => {
      const existingIndex = prev.findIndex((item) => item.generation_id === result.generation_id);
      if (existingIndex === -1) {
        return [...prev, result];
      }

      const next = [...prev];
      next[existingIndex] = { ...next[existingIndex], ...result };
      return next;
    });
  }, []);

  const updateProgressStatus = useCallback(
    (
      styleGroup: number,
      angle: string,
      status: 'completed' | 'failed',
      defaultTotal: number,
    ) => {
      setProgress((prev) => {
        const next = new Map(prev);
        const existing = next.get(styleGroup) ?? {
          style_group: styleGroup,
          completed: [],
          failed: [],
          total: defaultTotal,
        };

        const completed = new Set(existing.completed);
        const failed = new Set(existing.failed);

        if (status === 'completed') {
          completed.add(angle);
          failed.delete(angle);
        } else {
          failed.add(angle);
          completed.delete(angle);
        }

        next.set(styleGroup, {
          style_group: styleGroup,
          completed: Array.from(completed),
          failed: Array.from(failed),
          total: existing.total,
        });

        return next;
      });
    },
    [],
  );

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

      for (const r of newResults) {
        if (r.photo_url && r.status === 'completed') {
          const rid = r.generation_id;
          const url = r.photo_url;
          downloadAndCache(sessionId, rid, url, {
            style_group: r.style_group,
            angle: r.angle,
            style_label: r.style_label,
          }).then((localUri) => {
            if (localUri !== url) {
              setResults((prev) =>
                prev.map((p) =>
                  p.generation_id === rid ? { ...p, photo_url: localUri } : p,
                ),
              );
            }
          });
        }
      }

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

      const allGensFinished = gens.length > 0 && gens.every((g) => g.status === 'completed' || g.status === 'failed');
      const newGens = gens.filter((g) => (g.style_group ?? 0) > prevMaxStyleGroupRef.current);
      const hasNewGens = newGens.length > 0;
      const newGensDone = hasNewGens && newGens.every((g) => g.status === 'completed' || g.status === 'failed');
      return newGensDone || (allGensFinished && gens.length > prevMaxStyleGroupRef.current * 5);
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
    async (sessionId: string, styles: StyleInput[], angles?: string[], customInstruction?: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      sessionIdRef.current = sessionId;

      setIsGenerating(true);
      setIsComplete(false);
      setResults([]);
      setProgress(new Map());

      try {
        const snap = await apiGet<{ session: { session_generations: { id: string }[] } }>(
          `/api/sessions/${sessionId}`
        );
        const prevGens = snap.session.session_generations ?? [];
        prevMaxStyleGroupRef.current = prevGens.reduce((max: number, g: any) => Math.max(max, g.style_group ?? 0), 0);
      } catch {
        prevMaxStyleGroupRef.current = 0;
      }

      const angleCount = angles?.length ?? 5;
      let sseReceivedAllCompleted = false;
      let hasStartedPolling = false;

      const ensurePolling = () => {
        if (hasStartedPolling) return;
        hasStartedPolling = true;
        void pollUntilDone(sessionId, controller.signal);
      };

      setTimeout(() => ensurePolling(), 5000);

      await apiSSE(
        '/api/generate',
        { session_id: sessionId, styles, angles, custom_instruction: customInstruction },
        {
          onEvent: (event) => {
            if (controller.signal.aborted) return;
            ensurePolling();

            if (event.type === 'generation_completed') {
              if (event.photo_url) {
                const url = event.photo_url as string;
                const eid = event.generation_id as string;
                downloadAndCache(sessionIdRef.current!, eid, url, {
                  style_group: event.style_group as number,
                  angle: event.angle as string,
                  style_label: event.style_label as string | undefined,
                }).then((localUri) => {
                  if (localUri !== url) {
                    setResults((prev) =>
                      prev.map((p) =>
                        p.generation_id === eid ? { ...p, photo_url: localUri } : p,
                      ),
                    );
                  }
                });
              }
              const result: GenerationResult = {
                generation_id: event.generation_id as string,
                style_group: event.style_group as number,
                angle: event.angle as string,
                photo_url: event.photo_url as string | undefined,
                storage_path: event.storage_path as string | undefined,
                ai_latency_ms: event.ai_latency_ms as number | undefined,
                status: 'completed',
              };
              upsertResult(result);
              updateProgressStatus(result.style_group, result.angle, 'completed', angleCount);
            } else if (event.type === 'generation_failed') {
              const result: GenerationResult = {
                generation_id: event.generation_id as string,
                style_group: event.style_group as number,
                angle: event.angle as string,
                status: 'failed',
                error: event.error as string,
              };
              upsertResult(result);
              updateProgressStatus(result.style_group, result.angle, 'failed', angleCount);
            } else if (event.type === 'all_completed') {
              sseReceivedAllCompleted = true;
              // actual state update happens in onComplete to avoid double-set
            }
          },
          onError: () => {
            if (controller.signal.aborted || sseReceivedAllCompleted) return;
            ensurePolling();
          },
          onComplete: () => {
            if (controller.signal.aborted) return;
            if (sseReceivedAllCompleted) {
              void syncFromDB(sessionId).finally(() => {
                if (controller.signal.aborted) return;
                setIsComplete(true);
                setIsGenerating(false);
              });
              return;
            }
            // Stream closed without all_completed — fall back to polling
            ensurePolling();
          },
        },
        controller.signal,
      );
    },
    [pollUntilDone, syncFromDB, updateProgressStatus, upsertResult],
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

        useEffect(() => {
    if (!isGenerating || isComplete || progress.size === 0) return;
    const allGroupsDone = Array.from(progress.values()).every(
      (g) => g.completed.length + g.failed.length >= g.total,
    );
    if (allGroupsDone) {
      setIsComplete(true);
      setIsGenerating(false);
    }
  }, [progress, isGenerating, isComplete]);

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

  useEffect(() => {
    if (!isGenerating || isComplete || progress.size === 0) return;
    const allGroupsDone = Array.from(progress.values()).every(
      (g) => g.completed.length + g.failed.length >= g.total,
    );
    if (allGroupsDone) {
      setIsComplete(true);
      setIsGenerating(false);
    }
  }, [progress, isGenerating, isComplete]);

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
