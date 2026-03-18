import { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { PINTEREST_INJECT_SCRIPT } from '../../lib/pinterest-inject';
import { usePinterest } from '../../hooks/usePinterest';
import type { SelectedStyle } from '../../lib/types';
import { impactLight } from '../../lib/haptics';

interface PinterestBrowserProps {
  sessionId: string;
  onSelectImage: (style: SelectedStyle) => void;
}

export function PinterestBrowser({ sessionId, onSelectImage }: PinterestBrowserProps) {
  const webviewRef = useRef<WebView>(null);
  const { loading, proxyImage } = usePinterest(sessionId);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(true);

  const handleMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'long_press_image' || data.type === 'pin_detail') {
          impactLight();
          setPreviewUrl(data.url);
          setShowTooltip(false);
        }
      } catch {
        // ignore
      }
    },
    [],
  );

  const handleSelect = useCallback(async () => {
    if (!previewUrl) return;
    const result = await proxyImage(previewUrl);
    if (result?.storagePath) {
      onSelectImage({
        id: result.storagePath,
        thumbnailUrl: result.signedUrl ?? previewUrl,
        storagePath: result.storagePath,
        label: 'Pinterest',
        referenceType: 'pinterest',
        sourceUrl: previewUrl,
      });
    }
    setPreviewUrl(null);
  }, [previewUrl, proxyImage, onSelectImage]);

  return (
    <View className="flex-1">
      <WebView
        ref={webviewRef}
        source={{ uri: 'https://www.pinterest.com/search/pins/?q=hairstyle' }}
        injectedJavaScript={PINTEREST_INJECT_SCRIPT}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
      />

      {showTooltip && (
        <View className="absolute top-4 left-5 right-5 bg-bg-elevated/95 rounded-card px-4 py-3 border border-border">
          <Text className="text-text-secondary text-xs text-center tracking-wide">
            長押しで画像を直接選択できます
          </Text>
        </View>
      )}

      <Modal visible={!!previewUrl} transparent animationType="slide">
        <View className="flex-1 justify-end">
          <Pressable className="flex-1" onPress={() => setPreviewUrl(null)} />
          <View className="bg-bg-elevated rounded-t-3xl px-5 pt-5 pb-10 border-t border-border">
            {previewUrl && (
              <Image
                source={{ uri: previewUrl }}
                className="w-full h-72 rounded-img mb-5"
                contentFit="contain"
              />
            )}
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 py-3.5 rounded-pill bg-bg-surface border border-border items-center"
                onPress={() => setPreviewUrl(null)}
              >
                <Text className="text-text-secondary text-sm tracking-wide">閉じる</Text>
              </Pressable>
              <Pressable
                className="flex-1 py-3.5 rounded-pill bg-accent items-center"
                onPress={handleSelect}
                disabled={loading}
              >
                <Text className="text-text-on-accent text-sm font-semibold tracking-wide">
                  {loading ? '保存中...' : '選択'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
