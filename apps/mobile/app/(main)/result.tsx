import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiGet, apiPatch, apiPost } from '../../lib/api';
import { useCloseSession } from '../../hooks/useCloseSession';
import type { Generation } from '../../lib/types';
import { ANGLES, ANGLE_LABELS } from '../../lib/constants';
import { ExitButton } from '../../components/common/ExitButton';
import { CompareGrid } from '../../components/result/CompareGrid';
import { DetailView } from '../../components/result/DetailView';
import { FullscreenViewer } from '../../components/result/FullscreenViewer';
import { ShareSheet } from '../../components/result/ShareSheet';
import { impactLight } from '../../lib/haptics';

type ViewMode = 'compare' | 'detail';

export default function ResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('compare');
  const [selectedAngle, setSelectedAngle] = useState('front');
  const [selectedStyleGroup, setSelectedStyleGroup] = useState(1);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState<string | null>(null);
  const [customerPhotoPath, setCustomerPhotoPath] = useState<string | null>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const closeSession = useCloseSession(sessionId);

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await apiGet<{
        session: {
          customer_photo_path: string;
          customer_photo_url: string | null;
          session_generations: Generation[];
        };
      }>(`/api/sessions/${sessionId}`);
      setCustomerPhotoUrl(res.session.customer_photo_url ?? null);
      setCustomerPhotoPath(res.session.customer_photo_path ?? null);
      const gens = res.session.session_generations ?? [];
      console.log('[Result] fetched generations', gens.length, gens.map(g => ({
        id: g.id?.slice(0, 8),
        status: g.status,
        angle: g.angle,
        style_group: g.style_group,
        has_photo_url: !!g.photo_url,
        photo_url_prefix: g.photo_url?.slice(0, 50),
      })));
      setGenerations(gens);
    } catch (err) {
      console.error('Failed to fetch session:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const completedGenerations = generations.filter((g) => g.status === 'completed');
  const failedGenerations = generations.filter((g) => g.status === 'failed');
  const styleGroups = [...new Set(completedGenerations.map((g) => g.style_group))].sort();
  const angles = [...ANGLES] as string[];
  const angleLabels = ANGLE_LABELS as Record<string, string>;

  const toggleFavorite = async (genId: string, current: boolean) => {
    impactLight();
    const newValue = !current;
    setGenerations((prev) =>
      prev.map((g) => (g.id === genId ? { ...g, is_favorite: newValue } : g)),
    );
    try {
      await apiPatch(`/api/sessions/${sessionId}/generations/${genId}`, {
        is_favorite: newValue,
      });
    } catch {
      setGenerations((prev) =>
        prev.map((g) => (g.id === genId ? { ...g, is_favorite: current } : g)),
      );
    }
  };

  const handleRetryGeneration = async (genId: string) => {
    if (!sessionId) return;
    setRetryingIds((prev) => new Set(prev).add(genId));
    setGenerations((prev) =>
      prev.map((g) => (g.id === genId ? { ...g, status: 'generating' } : g)),
    );

    try {
      const data = await apiPost<{
        generation_id: string;
        status: 'completed';
        photo_url?: string;
        ai_latency_ms?: number;
      }>(`/api/sessions/${sessionId}/generations/${genId}/retry`);

      setGenerations((prev) =>
        prev.map((g) =>
          g.id === genId
            ? { ...g, status: data.status, photo_url: data.photo_url ?? null }
            : g,
        ),
      );
    } catch {
      setGenerations((prev) =>
        prev.map((g) => (g.id === genId ? { ...g, status: 'failed' } : g)),
      );
      Alert.alert('リトライに失敗しました', 'もう一度お試しください。');
    } finally {
      setRetryingIds((prev) => {
        const next = new Set(prev);
        next.delete(genId);
        return next;
      });
    }
  };

  const handleExit = closeSession;

  const handleAddStyles = () => {
    if (!sessionId) return;
    router.push({
      pathname: '/(main)/explore',
      params: {
        sessionId,
        customerPhotoPath: customerPhotoPath ?? 'existing',
        customerPhotoUrl: customerPhotoUrl ?? '',
      },
    });
  };

  const handleRetake = () => {
    router.push('/(main)/camera');
  };



  if (loading) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <Text className="text-text-muted text-sm tracking-wide">読み込み中...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      {/* Header with segment control */}
      <View className="flex-row items-center justify-between px-5 pt-16 pb-3">
        <Pressable className="py-2 pr-4" onPress={() => router.replace('/(main)')}>
          <Text className="text-text-muted text-sm tracking-wide">ホーム</Text>
        </Pressable>
        <View className="flex-row bg-bg-surface rounded-pill p-1 border border-border">
          {(['compare', 'detail'] as const).map((mode) => (
            <Pressable
              key={mode}
              className={`px-5 py-2 rounded-pill ${viewMode === mode ? 'bg-accent' : ''}`}
              onPress={() => setViewMode(mode)}
            >
              <Text
                className={`text-xs tracking-wide ${viewMode === mode ? 'text-text-on-accent font-semibold' : 'text-text-muted'}`}
              >
                {mode === 'compare' ? '比較' : '個別'}
              </Text>
            </Pressable>
          ))}
        </View>
        <ExitButton onConfirm={handleExit} />
      </View>

      {/* Failed generations banner */}
      {failedGenerations.length > 0 && (
        <View className="mx-5 mb-3 bg-bg-surface rounded-card p-4 border border-border">
          <Text className="text-destructive text-xs font-medium mb-2 tracking-wide">
            {failedGenerations.length}件の生成に失敗しました
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {failedGenerations.map((g) => (
              <Pressable
                key={g.id}
                className="px-3 py-1.5 rounded-pill bg-bg-elevated border border-border"
                onPress={() => handleRetryGeneration(g.id)}
                disabled={retryingIds.has(g.id)}
              >
                <Text className="text-text-muted text-[11px] tracking-wide">
                  {retryingIds.has(g.id)
                    ? `${g.style_label ?? `S${g.style_group}`} ${angleLabels[g.angle]} ...`
                    : `${g.style_label ?? `S${g.style_group}`} ${angleLabels[g.angle]} リトライ`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* View content */}
      {viewMode === 'compare' ? (
        <CompareGrid
          generations={completedGenerations}
          styleGroups={styleGroups}
          selectedAngle={selectedAngle}
          onSelectAngle={setSelectedAngle}
          angles={angles}
          angleLabels={angleLabels}
          onImagePress={setFullscreenImage}
          onToggleFavorite={toggleFavorite}
        />
      ) : (
        <DetailView
          generations={completedGenerations}
          styleGroups={styleGroups}
          selectedStyleGroup={selectedStyleGroup}
          onSelectStyleGroup={setSelectedStyleGroup}
          angles={angles}
          angleLabels={angleLabels}
          onImagePress={setFullscreenImage}
          onToggleFavorite={toggleFavorite}
          onShare={() => setShareVisible(true)}
        />
      )}

      {/* Bottom actions */}
      <View className="border-t border-border px-5 pb-8 pt-4 bg-bg">
        <View className="flex-row items-center gap-3">
          <Pressable
            className="px-5 py-3 rounded-pill bg-bg-surface border border-border"
            onPress={handleAddStyles}
          >
            <Text className="text-text-secondary text-xs tracking-wide">スタイル追加</Text>
          </Pressable>
          <Pressable
            className="px-5 py-3 rounded-pill bg-bg-surface border border-border"
            onPress={handleRetake}
          >
            <Text className="text-text-secondary text-xs tracking-wide">撮り直し</Text>
          </Pressable>
          <Pressable
            className="px-5 py-3 rounded-pill bg-bg-surface border border-border"
            onPress={() => setShareVisible(true)}
          >
            <Text className="text-text-secondary text-xs tracking-wide">共有</Text>
          </Pressable>

        </View>
      </View>

      {/* Fullscreen viewer */}
      {fullscreenImage && (
        <FullscreenViewer
          imageUrl={fullscreenImage}
          beforeImageUrl={customerPhotoUrl}
          onClose={() => setFullscreenImage(null)}
        />
      )}

      {/* Share sheet */}
      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        generations={completedGenerations}
      />
    </View>
  );
}
