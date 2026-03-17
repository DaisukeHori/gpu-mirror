import { View, Text, Pressable, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import type { SelectedStyle } from '../../lib/types';
import { HapticButton } from '../common/HapticButton';

interface StyleTrayProps {
  styles: SelectedStyle[];
  onRemove: (id: string) => void;
  onConfirm: () => void;
}

export function StyleTray({ styles, onRemove, onConfirm }: StyleTrayProps) {
  if (styles.length === 0) return null;

  const buttonText =
    styles.length === 1
      ? '1つのスタイルで生成'
      : `${styles.length}つのスタイルで一括生成`;

  return (
    <View className="bg-bg-surface border-t border-border px-5 pt-4 pb-8">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <View className="flex-row gap-3">
          {styles.map((style) => (
            <View key={style.id} className="relative">
              {style.referenceType === 'color_only' ? (
                <View className="w-16 h-16 rounded-img items-center justify-center bg-bg-elevated border border-border">
                  <View
                    className="w-8 h-8 rounded-full"
                    style={{ backgroundColor: style.colorId ? '#C8956C' : '#8A8580' }}
                  />
                </View>
              ) : (
                <Image
                  source={{ uri: style.thumbnailUrl }}
                  className="w-16 h-16 rounded-img"
                  contentFit="cover"
                />
              )}
              <Pressable
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg-elevated border border-border items-center justify-center"
                onPress={() => onRemove(style.id)}
              >
                <Text className="text-text-muted text-[9px] font-medium">×</Text>
              </Pressable>
              <Text
                className="text-text-muted text-[9px] mt-1 max-w-16 text-center tracking-wide"
                numberOfLines={1}
              >
                {style.label}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <HapticButton title={buttonText} onPress={onConfirm} />
    </View>
  );
}
