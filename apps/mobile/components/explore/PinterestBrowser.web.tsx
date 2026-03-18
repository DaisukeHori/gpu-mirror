import { View, Text, Pressable, Linking } from 'react-native';
import type { SelectedStyle } from '../../lib/types';
import { HapticButton } from '../common/HapticButton';

interface PinterestBrowserProps {
  sessionId: string;
  onSelectImage: (style: SelectedStyle) => void;
}

export function PinterestBrowser(_: PinterestBrowserProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <View className="w-full max-w-xl bg-bg-surface rounded-card border border-border p-8">
        <Text className="text-text-primary text-xl font-semibold mb-3">Pinterest 連携</Text>
        <Text className="text-text-secondary text-sm leading-6 mb-4">
          Web版ではPinterestの内蔵ビューを使わず、新規タブで開く運用にしています。
        </Text>
        <Text className="text-text-muted text-sm leading-6 mb-8">
          Pinterestで画像を保存したあと、この画面の「アップロード」タブから取り込んでください。
          カタログやカラー選択はそのまま利用できます。
        </Text>
        <HapticButton
          title="Pinterest を開く"
          onPress={() => Linking.openURL('https://www.pinterest.com/search/pins/?q=hairstyle')}
        />
        <Pressable className="mt-4 py-2" onPress={() => Linking.openURL('https://www.pinterest.com')}>
          <Text className="text-text-muted text-xs tracking-wide text-center">
            ブラウザで直接開いて手元に保存してください
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
