import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import type { Generation } from '../../lib/types';
import { impactLight } from '../../lib/haptics';

interface DetailViewProps {
  generations: Generation[];
  styleGroups: number[];
  selectedStyleGroup: number;
  onSelectStyleGroup: (group: number) => void;
  angles: string[];
  angleLabels: Record<string, string>;
  onImagePress: (url: string) => void;
  onToggleFavorite: (id: string, current: boolean) => void;
  onShare: () => void;
}

export function DetailView({
  generations,
  styleGroups,
  selectedStyleGroup,
  onSelectStyleGroup,
  angles,
  angleLabels,
  onImagePress,
  onToggleFavorite,
  onShare,
}: DetailViewProps) {
  const filtered = generations.filter((g) => g.style_group === selectedStyleGroup);
  const glamour = filtered.find((g) => g.angle === 'glamour');
  const others = filtered.filter((g) => g.angle !== 'glamour');

  return (
    <View className="flex-1">
      {/* Style tabs */}
      <View className="px-5 mb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {styleGroups.map((group) => {
              const gen = generations.find((g) => g.style_group === group);
              return (
                <Pressable
                  key={group}
                  className={`px-4 py-2 rounded-pill ${selectedStyleGroup === group ? 'bg-accent' : 'bg-bg-surface border border-border'}`}
                  onPress={() => onSelectStyleGroup(group)}
                >
                  <Text
                    className={`text-xs tracking-wide ${selectedStyleGroup === group ? 'text-text-on-accent font-semibold' : 'text-text-muted'}`}
                  >
                    {gen?.style_label ?? `Style ${group}`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Angle images 2×2 */}
        <View className="flex-row flex-wrap gap-3 mb-5">
          {others.map((gen) => {
            if (!gen.photo_url) return null;
            return (
              <Pressable
                key={gen.id}
                className="w-[48%]"
                onPress={() => onImagePress(gen.photo_url!)}
              >
                <Image
                  source={{ uri: gen.photo_url }}
                  className="aspect-[3/4] rounded-img"
                  contentFit="cover"
                />
                <Text className="text-text-muted text-[11px] mt-1.5 tracking-wide">
                  {angleLabels[gen.angle]}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Glamour — hero image */}
        {glamour?.photo_url && (
          <View className="mb-5">
            <Pressable onPress={() => onImagePress(glamour.photo_url!)}>
              <Image
                source={{ uri: glamour.photo_url }}
                className="w-full aspect-[4/5] rounded-img"
                contentFit="cover"
              />
            </Pressable>
            <Text className="text-text-muted text-[11px] mt-1.5 tracking-wide">
              映え写真
            </Text>
          </View>
        )}

        {/* Actions */}
        <View className="flex-row gap-3 mb-10">
          <Pressable
            className="px-5 py-3 rounded-pill bg-bg-surface border border-border"
            onPress={() => {
              const gen = filtered[0];
              if (gen) {
                impactLight();
                onToggleFavorite(gen.id, gen.is_favorite);
              }
            }}
          >
            <Text className="text-text-secondary text-xs tracking-wide">お気に入り</Text>
          </Pressable>
          <Pressable
            className="px-5 py-3 rounded-pill bg-bg-surface border border-border"
            onPress={onShare}
          >
            <Text className="text-text-secondary text-xs tracking-wide">共有</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
