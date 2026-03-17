import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0F0E0C' },
        animation: 'fade',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="camera" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="explore" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="confirm" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="generating" options={{ animation: 'fade' }} />
      <Stack.Screen name="result" options={{ animation: 'fade' }} />
    </Stack>
  );
}
