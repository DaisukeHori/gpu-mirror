import { View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { HapticButton } from '../components/common/HapticButton';

export default function SettingsScreen() {
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } catch {
      Alert.alert('エラー', 'ログアウトに失敗しました');
    }
  };

  return (
    <View className="flex-1 bg-bg px-6 pt-20">
      <Pressable onPress={() => router.back()} className="mb-8 py-2">
        <Text className="text-text-muted text-sm tracking-wide">戻る</Text>
      </Pressable>

      <Text className="text-text-primary text-2xl font-semibold mb-8">設定</Text>

      <View className="gap-4">
        <View className="bg-bg-surface rounded-card p-4 border border-border">
          <Text className="text-text-primary text-sm font-medium mb-1">アプリバージョン</Text>
          <Text className="text-text-muted text-xs">1.0.0</Text>
        </View>

        <HapticButton title="ログアウト" variant="destructive" onPress={handleLogout} />
      </View>
    </View>
  );
}
