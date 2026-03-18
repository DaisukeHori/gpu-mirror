import { Redirect, Stack } from 'expo-router';
import { View, Text } from 'react-native';
import { useCurrentStaff } from '../../../hooks/useCurrentStaff';
import { useAppTheme } from '../../../lib/theme-provider';

export default function AdminLayout() {
  const { staff, loading } = useCurrentStaff();
  const theme = useAppTheme();

  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.colors.background }}
      >
        <Text className="text-text-muted text-sm tracking-wide">管理画面を準備中...</Text>
      </View>
    );
  }

  if (!staff || !['admin', 'manager'].includes(staff.role)) {
    return <Redirect href="/(main)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    />
  );
}
