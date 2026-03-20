import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ExitButton } from '../../components/common/ExitButton';
import { HapticButton } from '../../components/common/HapticButton';
import { StyleThumbnail } from '../../components/explore/StyleThumbnail';
import { apiGet } from '../../lib/api';
import { useCloseSession } from '../../hooks/useCloseSession';
import {
  getStoredSelectedStyles,
  setStoredSelectedStyles,
  type StoredSelectedStyle,
} from '../../lib/style-selection-store';
import { cacheRemoteImage } from '../../lib/image-cache';
import { useAppTheme } from '../../lib/theme-provider';

interface HairColor {
  id: string;
  name: string;
  hex_code: string;
}

type StyleWithColor = StoredSelectedStyle;

const GRID_GAP = 12;
const GRID_PAD = 20;

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{
    sessionId: string;
    customerPhotoPath: string;
    customerPhotoUrl: string;
    styles?: string;
    selectedColorId: string;
    selectedColorName: string;
  }>();

  const closeSession = useCloseSession(params.sessionId);
  const theme = useAppTheme();
  const { width: screenWidth } = useWindowDimensions();
  const cardWidth = (screenWidth - GRID_PAD * 2 - GRID_GAP) / 2;
  const imageHeight = cardWidth * 1.25;

  const [stylesWithColor, setStylesWithColor] = useState<StyleWithColor[]>([]);
  const [hasHydratedStyles, setHasHydratedStyles] = useState(false);
  const [hasPreparedLocalThumbnails, setHasPreparedLocalThumbnails] = useState(false);
  const [colors, setColors] = useState<HairColor[]>([]);
  const [colorPickerFor, setColorPickerFor] = useState<number | null>(null);

  useEffect(() => {
    apiGet<{ colors: HairColor[] }>('/api/colors')
      .then((res) => setColors(res.colors))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let nextStyles = getStoredSelectedStyles(params.sessionId);
    if (nextStyles.length === 0 && params.styles) {
      try {
        nextStyles = JSON.parse(params.styles) as StyleWithColor[];
      } catch {
        nextStyles = [];
      }
    }
    setStylesWithColor(nextStyles.map((style) => ({ ...style })));
    setHasHydratedStyles(true);
    setHasPreparedLocalThumbnails(false);
  }, [params.sessionId, params.styles]);

  useEffect(() => {
    if (!hasHydratedStyles) return;
    setStoredSelectedStyles(params.sessionId, stylesWithColor);
  }, [hasHydratedStyles, params.sessionId, stylesWithColor]);

  useEffect(() => {
    if (!hasHydratedStyles || hasPreparedLocalThumbnails) return;

    const targets = stylesWithColor.filter(
      (style) =>
        style.referenceType !== 'color_only' &&
        !style.localThumbnailUri &&
        (style.thumbnailUrl || style.sourceUrl),
    );

    if (targets.length === 0) {
      setHasPreparedLocalThumbnails(true);
      return;
    }

    let isCancelled = false;

    void (async () => {
      const localById = new Map<string, string>();
      await Promise.all(
        targets.map(async (style) => {
          const localUri = await cacheRemoteImage(
            style.thumbnailUrl || style.sourceUrl,
            'confirm_thumb',
          );
          if (localUri) localById.set(style.id, localUri);
        }),
      );
      if (isCancelled) return;
      if (localById.size > 0) {
        setStylesWithColor((prev) =>
          prev.map((style) =>
            localById.has(style.id)
              ? { ...style, localThumbnailUri: localById.get(style.id) }
              : style,
          ),
        );
      }
      setHasPreparedLocalThumbnails(true);
    })();

    return () => { isCancelled = true; };
  }, [hasHydratedStyles, hasPreparedLocalThumbnails, stylesWithColor]);

  const angleCount = 5;
  const totalImages = stylesWithColor.length * angleCount;
  const estimatedCost = (totalImages * 0.039).toFixed(2);

  const removeStyle = (idx: number) => {
    setStylesWithColor((prev) => prev.filter((_, i) => i !== idx));
  };

  const assignColor = (styleIdx: number, color: HairColor) => {
    setStylesWithColor((prev) =>
      prev.map((s, i) =>
        i === styleIdx
          ? { ...s, assignedColor: { id: color.id, name: color.name, hex: color.hex_code } }
          : s,
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

    router.replace({
      pathname: '/(main)/generating',
      params: {
        sessionId: params.sessionId!,
        customerPhotoUrl: params.customerPhotoUrl!,
        styles: JSON.stringify(apiStyles),
        styleLabels: JSON.stringify(stylesWithColor.map((s) => s.label)),
      },
    });
  };

  const renderCard = (style: StyleWithColor, idx: number) => {
    const hasImage =
      style.referenceType !== 'color_only' &&
      (style.thumbnailUrl || style.sourceUrl || style.localThumbnailUri);

    return (
      <View
        key={style.id}
        style={{
          width: cardWidth,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: 'rgba(151,145,137,0.06)',
          borderWidth: 0.5,
          borderColor: 'rgba(151,145,137,0.12)',
        }}
      >
        {hasImage ? (
          <StyleThumbnail
            localThumbnailUri={style.localThumbnailUri}
            thumbnailUrl={style.thumbnailUrl}
            sourceUrl={style.sourceUrl}
            label={style.label}
            size={cardWidth}
            style={{ height: imageHeight, borderRadius: 0 }}
          />
        ) : (
          <View
            style={{
              width: cardWidth,
              height: imageHeight,
              backgroundColor: 'rgba(151,145,137,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: style.assignedColor?.hex ?? style.colorHex ?? theme.colors.muted,
              }}
            />
          </View>
        )}

        <View style={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text
              style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '600', flex: 1 }}
              numberOfLines={1}
            >
              {style.label}
            </Text>
            <Pressable hitSlop={8} onPress={() => removeStyle(idx)}>
              <Text style={{ color: theme.colors.muted, fontSize: 11 }}>削除</Text>
            </Pressable>
          </View>

          <Text style={{ color: theme.colors.muted, fontSize: 11, marginTop: 2, textTransform: 'capitalize' }}>
            {style.referenceType === 'color_only' ? 'カラーのみ' : style.referenceType}
          </Text>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
              paddingTop: 8,
              borderTopWidth: 0.5,
              borderTopColor: 'rgba(151,145,137,0.12)',
            }}
          >
            {style.assignedColor ? (
              <>
                <View
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: style.assignedColor.hex,
                    borderWidth: 0.5,
                    borderColor: 'rgba(151,145,137,0.12)',
                    marginRight: 6,
                  }}
                />
                <Text style={{ color: theme.colors.secondary, fontSize: 11, flex: 1 }} numberOfLines={1}>
                  {style.assignedColor.name}
                </Text>
                <Pressable hitSlop={6} onPress={() => setColorPickerFor(idx)}>
                  <Text style={{ color: theme.colors.accent, fontSize: 11 }}>変更</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={{ color: theme.colors.muted, fontSize: 11, flex: 1 }}>カラーなし</Text>
                <Pressable hitSlop={6} onPress={() => setColorPickerFor(idx)}>
                  <Text style={{ color: theme.colors.accent, fontSize: 11 }}>追加</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: GRID_PAD,
          paddingTop: 60,
          paddingBottom: 16,
        }}
      >
        <Pressable style={{ paddingVertical: 8, paddingRight: 16 }} onPress={() => router.back()}>
          <Text style={{ color: theme.colors.muted, fontSize: 14 }}>戻る</Text>
        </Pressable>
        <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '500' }}>確認</Text>
        <ExitButton onConfirm={closeSession} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: GRID_PAD, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 }}>
          <View style={{ backgroundColor: 'rgba(151,145,137,0.06)', borderRadius: 12, padding: 8 }}>
            <Image
              source={{ uri: params.customerPhotoUrl }}
              style={{ width: 48, height: 48, borderRadius: 8 }}
              contentFit="cover"
            />
          </View>
          <View style={{ marginLeft: 14 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 11 }}>お客さまの写真</Text>
            <Text style={{ color: theme.colors.secondary, fontSize: 13, marginTop: 2 }}>
              {stylesWithColor.length}つのスタイルを適用
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GRID_GAP }}>
          {stylesWithColor.map((style, idx) => renderCard(style, idx))}
        </View>

        <View style={{ marginTop: 24, marginBottom: 12, paddingHorizontal: 8 }}>
          <Text style={{ color: theme.colors.muted, fontSize: 11, textAlign: 'center', lineHeight: 18 }}>
            {'各スタイル × 5アングル（正面・斜め・横・後ろ・映え）\n'}
            合計 {totalImages}枚  ·  推定 ${estimatedCost}  ·  約15–30秒
          </Text>
        </View>

        {colorPickerFor !== null && (
          <View
            style={{
              backgroundColor: 'rgba(151,145,137,0.08)',
              borderRadius: 12,
              padding: 20,
              marginBottom: 16,
              borderWidth: 0.5,
              borderColor: 'rgba(151,145,137,0.12)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ color: theme.colors.secondary, fontSize: 14, fontWeight: '500' }}>カラーを選択</Text>
              <Pressable style={{ padding: 8 }} onPress={() => setColorPickerFor(null)}>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>閉じる</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {colors.map((c) => (
                <Pressable key={c.id} onPress={() => assignColor(colorPickerFor, c)}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: c.hex_code,
                      borderWidth: 0.5,
                      borderColor: 'rgba(151,145,137,0.12)',
                    }}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: GRID_PAD,
          paddingBottom: 32,
          paddingTop: 16,
          backgroundColor: theme.colors.bg,
          borderTopWidth: 0.5,
          borderTopColor: 'rgba(151,145,137,0.12)',
        }}
      >
        <HapticButton
          title={`一括生成する — ${totalImages}枚`}
          onPress={handleGenerate}
          disabled={stylesWithColor.length === 0}
        />
      </View>
    </View>
  );
}
