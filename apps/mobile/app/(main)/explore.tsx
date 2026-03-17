import { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiPatch } from '../../lib/api';
import type { SelectedStyle } from '../../lib/types';
import { ExitButton } from '../../components/common/ExitButton';
import { PinterestBrowser } from '../../components/explore/PinterestBrowser';
import { CatalogGrid } from '../../components/explore/CatalogGrid';
import { ImageUploader } from '../../components/explore/ImageUploader';
import { ColorPalette } from '../../components/explore/ColorPalette';
import { StyleTray } from '../../components/explore/StyleTray';

export type { SelectedStyle } from '../../lib/types';

const TABS = [
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'catalog', label: 'カタログ' },
  { key: 'upload', label: 'アップロード' },
  { key: 'color', label: 'カラー' },
] as const;

type TabKey = typeof TABS[number]['key'];

export default function ExploreScreen() {
  const { sessionId, customerPhotoPath, customerPhotoUrl } = useLocalSearchParams<{
    sessionId: string;
    customerPhotoPath: string;
    customerPhotoUrl: string;
  }>();
  const [activeTab, setActiveTab] = useState<TabKey>('pinterest');
  const [selectedStyles, setSelectedStyles] = useState<SelectedStyle[]>([]);
  const [selectedColor, setSelectedColor] = useState<{ id: string; name: string; hex: string } | null>(null);

  const addStyle = (style: SelectedStyle) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStyles((prev) => {
      if (prev.find((s) => s.id === style.id)) return prev;
      return [...prev, style];
    });
  };

  const removeStyle = (id: string) => {
    setSelectedStyles((prev) => prev.filter((s) => s.id !== id));
  };

  const handleConfirm = () => {
    if (selectedStyles.length === 0) return;
    router.push({
      pathname: '/(main)/confirm',
      params: {
        sessionId: sessionId!,
        customerPhotoPath: customerPhotoPath!,
        customerPhotoUrl: customerPhotoUrl!,
        styles: JSON.stringify(selectedStyles),
        selectedColorId: selectedColor?.id ?? '',
        selectedColorName: selectedColor?.name ?? '',
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
        <Text className="text-text-primary text-base font-medium tracking-wide">
          スタイルを探す
        </Text>
        <ExitButton onConfirm={async () => {
          if (sessionId) await apiPatch(`/api/sessions/${sessionId}`, { is_closed: true }).catch(() => {});
          router.replace('/(main)');
        }} />
      </View>

      {/* Tabs — underline style for premium feel */}
      <View className="px-5 mb-3">
        <View className="flex-row border-b border-border">
          {TABS.map((tab) => (
            <Pressable
              key={tab.key}
              className={`flex-1 items-center pb-3 ${activeTab === tab.key ? 'border-b-2 border-accent' : ''}`}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                className={`text-sm ${activeTab === tab.key ? 'text-text-primary font-medium' : 'text-text-muted'}`}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Tab content */}
      <View className="flex-1">
        {activeTab === 'pinterest' && (
          <PinterestBrowser sessionId={sessionId!} onSelectImage={addStyle} />
        )}
        {activeTab === 'catalog' && (
          <CatalogGrid onSelectItem={addStyle} />
        )}
        {activeTab === 'upload' && (
          <ImageUploader sessionId={sessionId!} onUpload={addStyle} />
        )}
        {activeTab === 'color' && (
          <ColorPalette
            selectedColorId={selectedColor?.id}
            onSelectColor={(id, name, hex) => {
              setSelectedColor({ id, name, hex });
              addStyle({
                id: `color-${id}`,
                thumbnailUrl: '',
                storagePath: '',
                label: name,
                referenceType: 'color_only',
                colorId: id,
                colorName: name,
              });
            }}
          />
        )}
      </View>

      {/* Selection Tray */}
      <StyleTray
        styles={selectedStyles}
        onRemove={removeStyle}
        onConfirm={handleConfirm}
      />
    </View>
  );
}
