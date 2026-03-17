import { View, Text } from 'react-native';

export default function AdminSessionsScreen() {
  return (
    <View className="flex-1 bg-bg items-center justify-center px-8">
      <Text className="text-text-primary text-lg font-semibold mb-2">管理者エリア</Text>
      <Text className="text-text-muted text-sm text-center">
        施術ログの閲覧・エクスポート機能は今後実装予定です
      </Text>
    </View>
  );
}
