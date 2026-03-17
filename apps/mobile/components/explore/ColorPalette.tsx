import { View, Text, Pressable, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { apiGet } from '../../lib/api';

interface HairColor {
  id: string;
  name: string;
  hex_code: string;
  color_family: string;
}

interface ColorPaletteProps {
  selectedColorId?: string;
  onSelectColor: (id: string, name: string, hexCode: string) => void;
}

export function ColorPalette({ selectedColorId, onSelectColor }: ColorPaletteProps) {
  const [colors, setColors] = useState<HairColor[]>([]);

  useEffect(() => {
    apiGet<{ colors: HairColor[] }>('/api/colors')
      .then((res) => setColors(res.colors))
      .catch(() => {});
  }, []);

  const grouped = colors.reduce<Record<string, HairColor[]>>((acc, c) => {
    if (!acc[c.color_family]) acc[c.color_family] = [];
    acc[c.color_family].push(c);
    return acc;
  }, {});

  return (
    <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
      <Text className="text-text-muted text-xs mb-6 tracking-wide">
        カラーを選択してスタイルに適用できます
      </Text>
      {Object.entries(grouped).map(([family, familyColors]) => (
        <View key={family} className="mb-8">
          <Text className="text-text-secondary text-xs font-medium mb-3 tracking-wide">
            {family}
          </Text>
          <View className="flex-row flex-wrap gap-4">
            {familyColors.map((color) => (
              <Pressable
                key={color.id}
                className="items-center"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectColor(color.id, color.name, color.hex_code);
                }}
              >
                <View
                  className={`w-12 h-12 rounded-full ${selectedColorId === color.id ? 'border-2 border-accent' : 'border-thin border-border'}`}
                  style={{ backgroundColor: color.hex_code }}
                />
                <Text
                  className="text-text-muted text-[10px] mt-1.5 max-w-14 text-center"
                  numberOfLines={1}
                >
                  {color.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <View className="h-24" />
    </ScrollView>
  );
}
