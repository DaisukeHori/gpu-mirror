import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import type { Generation } from '../../lib/types';

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
  const filtered = generations.filter((g) => g.angle === selectedAngle);

  return (
    <View className="flex-1">
      {/* Angle tabs */}
      <View className="px-5 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {angles.map((angle) => (
              <Pressable
                key={angle}
                className={`px-4 py-2 rounded-pill ${selectedAngle === angle ? 'bg-accent' : 'bg-bg-surface border border-border'}`}
                onPress={() => onSelectAngle(angle)}
              >
                <Text
                  className={`text-xs tracking-wide ${selectedAngle === angle ? 'text-bg font-semibold' : 'text-text-muted'}`}
                >
                  {angleLabels[angle]}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Image grid */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}
        className="flex-1"
      >
        {styleGroups.map((group) => {
          const gen = filtered.find((g) => g.style_group === group);
          if (!gen?.photo_url) return null;

          return (
            <Pressable
              key={group}
              className="w-72"
              onPress={() => onImagePress(gen.photo_url!)}
            >
              <Image
                source={{ uri: gen.photo_url }}
                className="w-72 h-96 rounded-img"
                contentFit="cover"
              />
              <View className="flex-row items-center justify-between mt-3 px-1">
                <Text className="text-text-secondary text-xs tracking-wide" numberOfLines={1}>
                  {gen.style_label ?? `Style ${group}`}
                </Text>
                <Pressable
                  className="p-1"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onToggleFavorite(gen.id, gen.is_favorite);
                  }}
                >
                  <Text className={`text-sm ${gen.is_favorite ? 'text-destructive' : 'text-text-muted'}`}>
                    {gen.is_favorite ? '♥' : '♡'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text className="text-text-muted text-[11px] text-center py-3 tracking-wide">
        タップで全画面表示  ·  長押しでBefore/After
      </Text>
    </View>
  );
}
