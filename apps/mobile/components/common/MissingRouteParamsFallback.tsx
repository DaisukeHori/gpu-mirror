import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../lib/theme-provider';

type Props = {
  message: string;
};

export function MissingRouteParamsFallback({ message }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        paddingTop: insets.top + 24,
        paddingHorizontal: 24,
        paddingBottom: insets.bottom + 24,
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: theme.colors.primary, fontSize: 17, fontWeight: '600', marginBottom: 10 }}>
        表示できません
      </Text>
      <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 22, marginBottom: 28 }}>
        {message}
      </Text>
      <Pressable
        onPress={() => router.replace('/(main)')}
        style={{
          alignSelf: 'flex-start',
          paddingVertical: 12,
          paddingHorizontal: 22,
          borderRadius: 999,
          backgroundColor: theme.colors.accent,
        }}
      >
        <Text style={{ color: theme.colors.onAccent, fontSize: 14, fontWeight: '600' }}>ホームへ戻る</Text>
      </Pressable>
    </View>
  );
}
