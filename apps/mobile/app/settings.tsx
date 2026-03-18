import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';
import { HapticButton } from '../components/common/HapticButton';
import { useAppTheme } from '../lib/theme-provider';
import { useCurrentStaff } from '../hooks/useCurrentStaff';

export default function SettingsScreen() {
  const theme = useAppTheme();
  const { staff, loading } = useCurrentStaff();
  const isPrivileged = staff?.role === 'admin' || staff?.role === 'manager';

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } catch {
      Alert.alert('エラー', 'ログアウトに失敗しました');
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 80, paddingBottom: 40 }}>
      <Pressable onPress={() => router.back()} className="mb-8 py-2 self-start">
        <Text className="text-text-muted text-sm tracking-wide">戻る</Text>
      </Pressable>

      <Text className="text-text-primary text-2xl font-semibold mb-8">設定</Text>

      <View className="gap-4">
        <View className="bg-bg-surface rounded-card p-5 border border-border">
          <Text className="text-text-primary text-sm font-medium mb-1">スタッフ</Text>
          {loading ? (
            <Text className="text-text-muted text-xs">読み込み中...</Text>
          ) : (
            <>
              <Text className="text-text-secondary text-base mt-1">{staff?.display_name ?? '未設定'}</Text>
              <Text className="text-text-muted text-xs mt-2">{staff?.email ?? 'メールアドレス未取得'}</Text>
              <Text className="text-text-muted text-xs mt-1">
                {staff?.store_code ?? '店舗未設定'}  ·  {staff?.role ?? 'role 未取得'}
              </Text>
            </>
          )}
        </View>

        <View className="bg-bg-surface rounded-card p-5 border border-border">
          <Text className="text-text-primary text-sm font-medium mb-4">表示モード</Text>
          <View className="flex-row bg-bg-elevated rounded-pill p-1 border border-border">
            {(['dark', 'light'] as const).map((mode) => (
              <Pressable
                key={mode}
                className={`flex-1 items-center py-2.5 rounded-pill ${theme.mode === mode ? 'bg-accent' : ''}`}
                onPress={() => void theme.setMode(mode)}
              >
                <Text
                  className={`text-xs tracking-wide ${theme.mode === mode ? 'text-text-on-accent font-semibold' : 'text-text-muted'}`}
                >
                  {mode === 'dark' ? 'ダーク' : 'ライト'}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-text-muted text-xs mt-3 leading-5">
            iPad運用ではダーク、Web管理画面ではライトを基本にしています。
          </Text>
        </View>

        {isPrivileged && (
          <View className="bg-bg-surface rounded-card p-5 border border-border">
            <Text className="text-text-primary text-sm font-medium mb-2">管理者メニュー</Text>
            <Text className="text-text-muted text-xs mb-4 leading-5">
              施術ログの閲覧、詳細確認、CSVエクスポートを開きます。
            </Text>
            <HapticButton
              title="施術ログを開く"
              variant="secondary"
              onPress={() => router.push('/(main)/(admin)/sessions')}
            />
          </View>
        )}

        <View className="bg-bg-surface rounded-card p-5 border border-border">
          <Text className="text-text-primary text-sm font-medium mb-1">アプリ情報</Text>
          <Text className="text-text-secondary text-xs mt-2">Version 1.0.0</Text>
          <Text className="text-text-muted text-xs mt-1">
            Expo Web / iPad flow / Admin log viewer 対応
          </Text>
        </View>

        <HapticButton title="ログアウト" variant="destructive" onPress={handleLogout} />
      </View>
    </ScrollView>
  );
}
