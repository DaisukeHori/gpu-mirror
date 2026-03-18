import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ExitButton } from '../../components/common/ExitButton';
import { HapticButton } from '../../components/common/HapticButton';
import { apiGet } from '../../lib/api';
import { useCloseSession } from '../../hooks/useCloseSession';
import type { SelectedStyle } from '../../lib/types';
import { useAppTheme } from '../../lib/theme-provider';

interface HairColor {
  id: string;
  name: string;
  hex_code: string;
}

interface StyleWithColor extends SelectedStyle {
  assignedColor?: { id: string; name: string; hex: string };
}

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{
    sessionId: string;
    customerPhotoPath: string;
    customerPhotoUrl: string;
    styles: string;
    selectedColorId: string;
    selectedColorName: string;
  }>();

  const closeSession = useCloseSession(params.sessionId);
  const theme = useAppTheme();

  let rawStyles: SelectedStyle[] = [];
  try { rawStyles = JSON.parse(params.styles ?? '[]'); } catch { /* noop */ }
  const [stylesWithColor, setStylesWithColor] = useState<StyleWithColor[]>(
    rawStyles.map((s) => ({ ...s })),
  );
  const [colors, setColors] = useState<HairColor[]>([]);
  const [colorPickerFor, setColorPickerFor] = useState<number | null>(null);

  useEffect(() => {
    apiGet<{ colors: HairColor[] }>('/api/colors')
      .then((res) => setColors(res.colors))
      .catch(() => {});
  }, []);

  const angleCount = 5;
  const totalImages = stylesWithColor.length * angleCount;
  const estimatedCost = (totalImages * 0.039).toFixed(2);

  const removeStyle = (idx: number) => {
    setStylesWithColor((prev) => prev.filter((_, i) => i !== idx));
  };

  const assignColor = (styleIdx: number, color: HairColor) => {
    setStylesWithColor((prev) =>
      prev.map((s, i) =>
        i === styleIdx ? { ...s, assignedColor: { id: color.id, name: color.name, hex: color.hex_code } } : s,
      ),
    );
    setColorPickerFor(null);
  };

  const removeColor = (styleIdx: number) => {
    setStylesWithColor((prev) =>
      prev.map((s, i) => (i === styleIdx ? { ...s, assignedColor: undefined } : s)),
    );
  };

  const handleGenerate = () => {
    const apiStyles = stylesWithColor.map((s) => {
      const hasColor = !!(s.assignedColor || s.colorId);
      let simulationMode: string;
      if (s.referenceType === 'color_only') {
        simulationMode = 'color';
      } else if (hasColor) {
        simulationMode = 'style_and_color';
      } else {
        simulationMode = 'style';
      }
      return {
        simulation_mode: simulationMode,
        reference_type: s.referenceType,
        reference_photo_path: s.referenceType === 'color_only' ? undefined : s.storagePath,
        reference_source_url: s.sourceUrl,
        catalog_item_id: s.catalogItemId,
        hair_color_id: s.assignedColor?.id ?? s.colorId,
        style_label: s.label,
      };
    });

    router.push({
      pathname: '/(main)/generating',
      params: {
        sessionId: params.sessionId!,
        customerPhotoUrl: params.customerPhotoUrl!,
        styles: JSON.stringify(apiStyles),
        styleLabels: JSON.stringify(stylesWithColor.map((s) => s.label)),
      },
    });
  };

  return (
    <View className="flex-1 bg-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-16 pb-4">
        <Pressable className="py-2 pr-4" onPress={() => router.back()}>
          <Text className="text-text-muted text-sm tracking-wide">戻る</Text>
        </Pressable>
        <Text className="text-text-primary text-base font-medium tracking-wide">確認</Text>
        <ExitButton onConfirm={closeSession} />
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Customer photo */}
        <View className="flex-row items-center mb-8 mt-2">
          <View className="bg-bg-surface rounded-card p-2">
            <Image
              source={{ uri: params.customerPhotoUrl }}
              className="w-14 h-14 rounded-img"
              contentFit="cover"
            />
          </View>
          <View className="ml-4">
            <Text className="text-text-muted text-xs tracking-wide">お客さまの写真</Text>
            <Text className="text-text-secondary text-sm mt-0.5">
              {stylesWithColor.length}つのスタイルを適用
            </Text>
          </View>
        </View>

        {/* Style list */}
        {stylesWithColor.map((style, idx) => (
          <View
            key={style.id}
            className="bg-bg-surface rounded-card p-5 mb-3 border border-border"
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-row items-center flex-1">
                {style.referenceType !== 'color_only' && style.thumbnailUrl ? (
                  <Image
                    source={{ uri: style.thumbnailUrl }}
                    className="w-14 h-14 rounded-img mr-4"
                    contentFit="cover"
                  />
                ) : (
                  <View className="w-14 h-14 rounded-img mr-4 bg-bg-elevated items-center justify-center border border-border">
                    <View
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: style.assignedColor?.hex ?? style.colorHex ?? theme.colors.muted }}
                    />
                  </View>
                )}
                <View className="flex-1">
                  <Text className="text-text-primary text-sm font-medium">
                    {style.label}
                  </Text>
                  <Text className="text-text-muted text-xs mt-0.5 capitalize">
                    {style.referenceType === 'color_only' ? 'カラーのみ' : style.referenceType}
                  </Text>
                </View>
              </View>
              <Pressable className="p-2 -mr-2 -mt-1" onPress={() => removeStyle(idx)}>
                <Text className="text-text-muted text-xs">削除</Text>
              </Pressable>
            </View>

            {/* Color assignment */}
            <View className="flex-row items-center mt-4 pt-3 border-t border-border">
              <Text className="text-text-muted text-xs mr-3">カラー</Text>
              {style.assignedColor ? (
                <View className="flex-row items-center gap-2 flex-1">
                  <View
                    className="w-5 h-5 rounded-full border border-border"
                    style={{ backgroundColor: style.assignedColor.hex }}
                  />
                  <Text className="text-text-secondary text-xs flex-1">
                    {style.assignedColor.name}
                  </Text>
                  <Pressable className="px-2 py-1" onPress={() => setColorPickerFor(idx)}>
                    <Text className="text-accent text-xs">変更</Text>
                  </Pressable>
                  <Pressable className="px-2 py-1" onPress={() => removeColor(idx)}>
                    <Text className="text-text-muted text-xs">解除</Text>
                  </Pressable>
                </View>
              ) : (
                <View className="flex-row items-center gap-2 flex-1">
                  <Text className="text-text-muted text-xs flex-1">なし（参照画像のまま）</Text>
                  <Pressable className="px-2 py-1" onPress={() => setColorPickerFor(idx)}>
                    <Text className="text-accent text-xs">追加</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        ))}

        {/* Info */}
        <View className="mt-6 mb-6 px-2">
          <Text className="text-text-muted text-xs text-center leading-5">
            各スタイル × 5アングル（正面・斜め・横・後ろ・映え）{'\n'}
            合計 {totalImages}枚  ·  推定 ${estimatedCost}  ·  約15–30秒
          </Text>
        </View>

        {/* Color picker inline */}
        {colorPickerFor !== null && (
          <View className="bg-bg-elevated rounded-card p-5 mb-4 border border-border">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-text-secondary text-sm font-medium">カラーを選択</Text>
              <Pressable className="p-2 -mr-2" onPress={() => setColorPickerFor(null)}>
                <Text className="text-text-muted text-xs">閉じる</Text>
              </Pressable>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {colors.map((c) => (
                <Pressable key={c.id} onPress={() => assignColor(colorPickerFor, c)}>
                  <View
                    className="w-10 h-10 rounded-full border-thin border-border"
                    style={{ backgroundColor: c.hex_code }}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View className="h-28" />
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-5 pb-8 pt-4 bg-bg border-t border-border">
        <HapticButton
          title={`一括生成する — ${totalImages}枚`}
          onPress={handleGenerate}
          disabled={stylesWithColor.length === 0}
        />
      </View>
    </View>
  );
}
