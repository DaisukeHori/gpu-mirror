import { View, Text, Pressable, FlatList } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useCatalog } from '../../hooks/useCatalog';
import type { SelectedStyle } from '../../lib/types';

interface CatalogItem {
  id: string;
  title: string;
  image_path: string;
  thumbnail_path: string | null;
  image_url?: string;
  thumbnail_url?: string;
}

interface CatalogGridProps {
  onSelectItem: (style: SelectedStyle) => void;
}

export function CatalogGrid({ onSelectItem }: CatalogGridProps) {
  const { items, loading, sortBy, setSortBy } = useCatalog();

  const handleSelect = (item: CatalogItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectItem({
      id: `catalog-${item.id}`,
      thumbnailUrl: item.thumbnail_url ?? item.image_url ?? '',
      storagePath: item.image_path,
      label: item.title,
      referenceType: 'catalog',
      catalogItemId: item.id,
    });
  };

  return (
    <View className="flex-1 px-4">
      <View className="flex-row gap-2 mb-4">
        <Pressable
          className={`px-4 py-2 rounded-pill ${sortBy === 'popularity' ? 'bg-accent' : 'bg-bg-surface border border-border'}`}
          onPress={() => setSortBy('popularity')}
        >
          <Text
            className={`text-xs tracking-wide ${sortBy === 'popularity' ? 'text-bg font-semibold' : 'text-text-muted'}`}
          >
            人気順
          </Text>
        </Pressable>
        <Pressable
          className={`px-4 py-2 rounded-pill ${sortBy === 'created_at' ? 'bg-accent' : 'bg-bg-surface border border-border'}`}
          onPress={() => setSortBy('created_at')}
        >
          <Text
            className={`text-xs tracking-wide ${sortBy === 'created_at' ? 'text-bg font-semibold' : 'text-text-muted'}`}
          >
            新着順
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        numColumns={3}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <Pressable className="flex-1" onPress={() => handleSelect(item)}>
            <Image
              source={{ uri: item.thumbnail_url ?? item.image_url ?? '' }}
              className="aspect-[3/4] rounded-img"
              contentFit="cover"
            />
            <Text
              className="text-text-muted text-[11px] mt-1.5 tracking-wide"
              numberOfLines={1}
            >
              {item.title}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <View className="items-center pt-20">
            <Text className="text-text-muted text-sm tracking-wide">
              {loading ? '読み込み中...' : 'カタログが空です'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
