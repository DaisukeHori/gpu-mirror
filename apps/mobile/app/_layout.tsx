import '../global.css';
import { useEffect, useState } from 'react';
import { LogBox } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { AppThemeProvider, useAppTheme } from '../lib/theme-provider';

LogBox.ignoreLogs([
  'Barcode scanning has been disabled',
  'Error opening URL:  [Error: Unable to open URL: about:srcdoc.',
]);

function RootLayoutInner() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = useAppTheme();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => setSession(s))
      .catch(() => {})
      .finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      router.replace('/');
      return;
    }

    if (!session && !inAuthGroup) {
      router.replace('/login');
    }
  }, [loading, router, segments, session]);

  if (loading) return null;

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={[{ flex: 1 }, theme.variables]}>
        <StatusBar style={theme.isDark ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(main)" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="settings" />
        </Stack>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutInner />
    </AppThemeProvider>
  );
}
