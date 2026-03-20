import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Pressable, Alert, Image as RNImage, useWindowDimensions, ScrollView, ActivityIndicator, FlatList, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiGet, apiPatch, apiPost, apiSSE } from '../../lib/api';
import { useCloseSession } from '../../hooks/useCloseSession';
import type { Generation } from '../../lib/types';
import { ANGLES, ANGLE_LABELS } from '../../lib/constants';
import { ExitButton } from '../../components/common/ExitButton';
import { ShareSheet } from '../../components/result/ShareSheet';
import { impactLight } from '../../lib/haptics';
import { getCachedGenerations, updateCachedFavorite, downloadAndCache } from '../../lib/generation-cache';
import { useAppTheme } from '../../lib/theme-provider';

export default function ResultScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const theme = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState<string | null>(null);
  const [customerPhotoPath, setCustomerPhotoPath] = useState<string | null>(null);
  const [shareVisible, setShareVisible] = useState(false);
  const [viewerGen, setViewerGen] = useState<Generation | null>(null);
  const [refineText, setRefineText] = useState('');
  const [refining, setRefining] = useState(false);
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
      setGenerations(gens);
      gens.forEach((g) => {
        if (g.photo_url && g.status === 'completed') {
          downloadAndCache(sessionId, g.id, g.photo_url, {
            style_group: g.style_group,
            angle: g.angle,
            style_label: g.style_label ?? undefined,
            reference_photo_path: (g as any).reference_photo_path,
            reference_type: (g as any).reference_type,
            reference_source_url: (g as any).reference_source_url,
            simulation_mode: (g as any).simulation_mode,
            generated_photo_path: (g as any).generated_photo_path,
          }).then((localUri) => {
            if (localUri !== g.photo_url) {
              setGenerations((prev) =>
                prev.map((p) => p.id === g.id ? { ...p, photo_url: localUri } : p),
              );
            }
          });
        }
      });
    } catch (err) {
      console.error('Failed to fetch session:', err);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  const completedGenerations = generations.filter((g) => g.status === 'completed' && g.photo_url);
  const glamourGens = completedGenerations.filter((g) => g.angle === 'glamour');
  const styleGroups = [...new Set(completedGenerations.map((g) => g.style_group))].sort();

  const toggleFavorite = async (genId: string, current: boolean) => {
    impactLight();
    const newValue = !current;
    setGenerations((prev) => prev.map((g) => (g.id === genId ? { ...g, is_favorite: newValue } : g)));
    if (sessionId) updateCachedFavorite(sessionId, genId, newValue);
    try {
      await apiPatch(`/api/sessions/${sessionId}/generations/${genId}`, { is_favorite: newValue });
    } catch {
      setGenerations((prev) => prev.map((g) => (g.id === genId ? { ...g, is_favorite: current } : g)));
    }
  };

  const handleRefine = async () => {
    if (!viewerGen || !refineText.trim() || !sessionId || refining) return;
    setRefining(true);
    const instruction = refineText.trim();
    setRefineText('');
    try {
      const freshData = await apiGet<{
        session: { session_generations: Array<{ id: string; style_group: number; reference_photo_path?: string; reference_type?: string; reference_source_url?: string; simulation_mode?: string; generated_photo_path?: string; style_label?: string }> };
      }>(`/api/sessions/${sessionId}`);
      const freshGens = freshData.session.session_generations ?? [];
      const match = freshGens.find((g) => g.style_group === viewerGen.style_group);
      if (!match) { setRefining(false); return; }
      const refPath = match.reference_photo_path || match.generated_photo_path;
      if (!refPath) {
        Alert.alert('再生成できません', '参照画像が見つかりません。');
        setRefining(false);
        return;
      }
      const style = {
        simulation_mode: match.simulation_mode ?? 'style',
        reference_type: match.reference_type ?? 'upload',
        reference_photo_path: refPath,
        reference_source_url: match.reference_source_url,
        style_label: (match.style_label ?? 'Pinterest') + ' (refined)',
      };
      router.replace({
        pathname: '/(main)/generating',
        params: {
          sessionId: sessionId,
          customerPhotoUrl: customerPhotoUrl ?? '',
          styles: JSON.stringify([style]),
          styleLabels: JSON.stringify([style.style_label]),
          customInstruction: instruction,
        },
      });
    } catch (err) {
      Alert.alert('再生成に失敗しました', err instanceof Error ? err.message : 'もう一度お試しください。');
    } finally {
      setRefining(false);
    }
  };

    const handleAddStyles = () => {
    if (!sessionId) return;
    router.push({
      pathname: '/(main)/explore',
      params: { sessionId, customerPhotoPath: customerPhotoPath ?? 'existing', customerPhotoUrl: customerPhotoUrl ?? '' },
    });
  };

  const TILE_GAP = 8;
  const TILE_PAD = 16;
  const cols = glamourGens.length <= 2 ? 2 : glamourGens.length <= 4 ? 2 : 3;
  const tileWidth = (screenWidth - TILE_PAD * 2 - TILE_GAP * (cols - 1)) / cols;
  const tileHeight = tileWidth * 1.3;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#B8956A" />
      </View>
    );
  }

  if (viewerGen) {
    const sameStyle = completedGenerations
      .filter((g) => g.style_group === viewerGen.style_group)
      .sort((a, b) => ANGLES.indexOf(a.angle as any) - ANGLES.indexOf(b.angle as any));

    const initialIndex = sameStyle.findIndex((g) => g.id === viewerGen.id);

    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 }}>
          <Pressable style={{ paddingVertical: 8, paddingRight: 16 }} onPress={() => setViewerGen(null)}>
            <Text style={{ color: '#E8E0D8', fontSize: 14 }}>戻る</Text>
          </Pressable>
          <Text style={{ color: 'rgba(151,145,137,0.72)', fontSize: 13 }}>
            {viewerGen.style_label ?? `Style ${viewerGen.style_group}`}
          </Text>
          <Pressable
            hitSlop={8}
            onPress={() => toggleFavorite(viewerGen.id, viewerGen.is_favorite)}
          >
            <Text style={{ fontSize: 20, color: viewerGen.is_favorite ? '#EF5350' : 'rgba(151,145,137,0.48)' }}>
              {viewerGen.is_favorite ? '\u2665' : '\u2661'}
            </Text>
          </Pressable>
        </View>

        <InfiniteSwiper
          items={sameStyle}
          initialIndex={initialIndex >= 0 ? initialIndex : 0}
          screenWidth={screenWidth}
          onIndexChange={(idx) => setViewerGen(sameStyle[idx])}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 }}
        >
          <Text style={{ color: 'rgba(151,145,137,0.48)', fontSize: 12, marginBottom: 8, textAlign: 'center' }}>
            フリーワードでスタイルを調整
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TextInput
              value={refineText}
              onChangeText={setRefineText}
              placeholder="例: もう少し明るめに、前髪を軽く..."
              placeholderTextColor="rgba(151,145,137,0.4)"
              style={{
                flex: 1,
                backgroundColor: 'rgba(151,145,137,0.1)',
                borderRadius: 999,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: '#E8E0D8',
                fontSize: 14,
              }}
              returnKeyType="send"
              onSubmitEditing={handleRefine}
              editable={!refining}
            />
            <Pressable
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 999,
                backgroundColor: refineText.trim() && !refining ? '#B8956A' : 'rgba(151,145,137,0.15)',
              }}
              onPress={handleRefine}
              disabled={!refineText.trim() || refining}
            >
              <Text style={{ color: refineText.trim() && !refining ? '#0F0E0C' : 'rgba(151,145,137,0.4)', fontSize: 14, fontWeight: '600' }}>
                {refining ? '生成中...' : '再生成'}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 }}>
        <Pressable style={{ paddingVertical: 8, paddingRight: 16 }} onPress={() => router.replace('/(main)')}>
          <Text style={{ color: theme.colors.muted, fontSize: 14 }}>ホーム</Text>
        </Pressable>
        <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '500' }}>結果</Text>
        <ExitButton onConfirm={closeSession} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: TILE_PAD, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {glamourGens.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP }}>
            {glamourGens.map((gen) => (
              <GlamourTile
                key={gen.id}
                gen={gen}
                width={tileWidth}
                height={tileHeight}
                theme={theme}
                onPress={() => setViewerGen(gen)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: TILE_GAP }}>
            {styleGroups.map((group) => {
              const gen = completedGenerations.find((g) => g.style_group === group);
              if (!gen) return null;
              return (
                <GlamourTile
                  key={gen.id}
                  gen={gen}
                  width={tileWidth}
                  height={tileHeight}
                  theme={theme}
                  onPress={() => setViewerGen(gen)}
                  onToggleFavorite={toggleFavorite}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={{ borderTopWidth: 0.5, borderTopColor: 'rgba(151,145,137,0.12)', paddingHorizontal: 20, paddingBottom: 32, paddingTop: 14, backgroundColor: theme.colors.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable
            style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(151,145,137,0.06)', borderWidth: 0.5, borderColor: 'rgba(151,145,137,0.12)' }}
            onPress={handleAddStyles}
          >
            <Text style={{ color: theme.colors.secondary, fontSize: 13 }}>スタイル追加</Text>
          </Pressable>
          <Pressable
            style={{ paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(151,145,137,0.06)', borderWidth: 0.5, borderColor: 'rgba(151,145,137,0.12)' }}
            onPress={() => setShareVisible(true)}
          >
            <Text style={{ color: theme.colors.secondary, fontSize: 13 }}>共有</Text>
          </Pressable>
        </View>
      </View>

      <ShareSheet
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
        generations={completedGenerations}
      />
    </View>
  );
}

function InfiniteSwiper({
  items,
  initialIndex,
  screenWidth,
  onIndexChange,
}: {
  items: Generation[];
  initialIndex: number;
  screenWidth: number;
  onIndexChange: (index: number) => void;
}) {
  const COPIES = 100;
  const totalLen = items.length * COPIES;
  const midStart = Math.floor(COPIES / 2) * items.length + initialIndex;
  const flatListRef = useRef<FlatList>(null);
  const lastReportedIndex = useRef(initialIndex);

  const loopedData = useMemo(() => {
    const arr: (Generation & { _loopKey: string })[] = [];
    for (let c = 0; c < COPIES; c++) {
      for (let i = 0; i < items.length; i++) {
        arr.push({ ...items[i], _loopKey: `${c}_${i}` });
      }
    }
    return arr;
  }, [items]);

  const handleScrollEnd = useCallback((e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
    const realIdx = idx % items.length;
    if (realIdx !== lastReportedIndex.current) {
      lastReportedIndex.current = realIdx;
      onIndexChange(realIdx);
    }
  }, [screenWidth, items.length, onIndexChange]);

  return (
    <FlatList
      ref={flatListRef}
      data={loopedData}
      horizontal
      pagingEnabled
      initialScrollIndex={midStart}
      getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item._loopKey}
      onMomentumScrollEnd={handleScrollEnd}
      renderItem={({ item }) => <ViewerSlide item={item} screenWidth={screenWidth} />}
    />
  );
}

function ViewerSlide({ item, screenWidth }: { item: Generation; screenWidth: number }) {
  const [loaded, setLoaded] = useState(false);
  const imgHeight = screenWidth * 1.3;

  return (
    <View style={{ width: screenWidth, height: imgHeight + 40, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: screenWidth, height: imgHeight }}>
        <RNImage
          source={{ uri: item.photo_url! }}
          style={{ width: screenWidth, height: imgHeight }}
          resizeMode="contain"
          onLoad={() => setLoaded(true)}
        />
        {!loaded && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#B8956A" />
          </View>
        )}
      </View>
      <Text style={{ color: 'rgba(151,145,137,0.72)', fontSize: 14, marginTop: 12, letterSpacing: 0.3 }}>
        {ANGLE_LABELS[item.angle as keyof typeof ANGLE_LABELS] ?? item.angle}
      </Text>
    </View>
  );
}

function GlamourTile({
  gen,
  width,
  height,
  theme,
  onPress,
  onToggleFavorite,
}: {
  gen: Generation;
  width: number;
  height: number;
  theme: ReturnType<typeof useAppTheme>;
  onPress: () => void;
  onToggleFavorite: (id: string, current: boolean) => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Pressable style={{ width }} onPress={onPress}>
      <View style={{ width, height, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(151,145,137,0.06)' }}>
        <RNImage
          source={{ uri: gen.photo_url! }}
          style={{ width, height }}
          resizeMode="cover"
          onLoad={() => setLoaded(true)}
        />
        {!loaded && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="small" color="#B8956A" />
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, paddingHorizontal: 2 }}>
        <Text style={{ color: theme.colors.secondary, fontSize: 12, flex: 1 }} numberOfLines={1}>
          {gen.style_label ?? `Style ${gen.style_group}`}
        </Text>
        <Pressable
          hitSlop={8}
          onPress={() => {
            impactLight();
            onToggleFavorite(gen.id, gen.is_favorite);
          }}
        >
          <Text style={{ fontSize: 16, color: gen.is_favorite ? '#EF5350' : theme.colors.muted }}>
            {gen.is_favorite ? '\u2665' : '\u2661'}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
