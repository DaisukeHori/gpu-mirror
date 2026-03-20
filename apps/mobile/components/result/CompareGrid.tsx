import { useEffect, useMemo, useState, memo } from 'react';
import { View, Text, Pressable, ScrollView, Image as RNImage, useWindowDimensions, ActivityIndicator } from 'react-native';
import type { Generation } from '../../lib/types';
import { impactLight } from '../../lib/haptics';
import { useAppTheme } from '../../lib/theme-provider';

interface CompareGridProps {
  generations: Generation[];
  styleGroups: number[];
  selectedAngle: string;
  onSelectAngle: (angle: string) => void;
  angles: string[];
  angleLabels: Record<string, string>;
  onImagePress: (url: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
}

const GRID_PAD = 16;
const GRID_GAP = 8;

const GenCard = memo(function GenCard({
  gen,
  cardWidth,
  cardHeight,
  onImagePress,
  onToggleFavorite,
}: {
  gen: Generation;
  cardWidth: number;
  cardHeight: number;
  onImagePress: (url: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
}) {
  const theme = useAppTheme();
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <Pressable
      style={{ width: cardWidth }}
      onPress={() => gen.photo_url && onImagePress(gen.photo_url)}
    >
      {gen.photo_url ? (
        <View style={{ width: cardWidth, height: cardHeight, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(151,145,137,0.06)' }}>
          <RNImage
            source={{ uri: gen.photo_url, cache: 'force-cache' }}
            style={{ width: cardWidth, height: cardHeight }}
            resizeMode="cover"
            onLoad={() => setImgLoaded(true)}
          />
          {!imgLoaded && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="small" color="#B8956A" />
            </View>
          )}
        </View>
      ) : (
        <View
          style={{
            width: cardWidth,
            height: cardHeight,
            borderRadius: 10,
            backgroundColor: 'rgba(151,145,137,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: theme.colors.muted, fontSize: 13 }}>...</Text>
        </View>
      )}
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
});

export function CompareGrid({
  generations,
  styleGroups,
  selectedAngle,
  onSelectAngle,
  angles,
  angleLabels,
  onImagePress,
  onToggleFavorite,
}: CompareGridProps) {
  const theme = useAppTheme();
  const { width } = useWindowDimensions();
  const columns = styleGroups.length <= 4 ? 2 : 3;
  const cardWidth = (width - GRID_PAD * 2 - GRID_GAP * (columns - 1)) / columns;
  const cardHeight = cardWidth * 1.3;
  const filtered = useMemo(
    () => generations.filter((g) => g.angle === selectedAngle),
    [generations, selectedAngle],
  );

  useEffect(() => {
    const urls = generations
      .filter((g) => g.photo_url && g.angle !== selectedAngle)
      .map((g) => g.photo_url!);
    urls.forEach((url) => RNImage.prefetch(url));
  }, [generations, selectedAngle]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: GRID_PAD, marginBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {angles.map((angle) => (
              <Pressable
                key={angle}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: selectedAngle === angle ? theme.colors.accent : 'rgba(151,145,137,0.06)',
                  borderWidth: selectedAngle === angle ? 0 : 0.5,
                  borderColor: 'rgba(151,145,137,0.12)',
                }}
                onPress={() => onSelectAngle(angle)}
              >
                <Text
                  style={{
                    fontSize: 13,
                    letterSpacing: 0.3,
                    color: selectedAngle === angle ? '#fff' : theme.colors.muted,
                    fontWeight: selectedAngle === angle ? '600' : '400',
                  }}
                >
                  {angleLabels[angle]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: GRID_PAD, paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
          {styleGroups.map((group) => {
            const gen = filtered.find((g) => g.style_group === group);
            if (!gen) return null;
            return (
              <GenCard
                key={`${gen.id}-${selectedAngle}`}
                gen={gen}
                cardWidth={cardWidth}
                cardHeight={cardHeight}
                onImagePress={onImagePress}
                onToggleFavorite={onToggleFavorite}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
