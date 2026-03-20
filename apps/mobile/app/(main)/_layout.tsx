import { Stack } from 'expo-router';
import { useAppTheme } from '../../lib/theme-provider';

export default function MainLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
        animation: 'fade',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="photo-prep" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="camera" options={{ animation: 'fade' }} />
      <Stack.Screen name="explore" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="confirm" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="generating" options={{ animation: 'fade' }} />
      <Stack.Screen name="result" options={{ animation: 'fade' }} />
      <Stack.Screen name="(admin)" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
