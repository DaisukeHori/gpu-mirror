import '../global.css';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';
import { AppThemeProvider, useAppTheme } from '../lib/theme-provider';

function RootLayoutInner() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const theme = useAppTheme();

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

  if (loading) return null;

  return (
    <GestureHandlerRootView style={[{ flex: 1 }, theme.variables]}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: 'fade',
        }}
      >
        {session ? (
          <>
            <Stack.Screen name="(main)" />
            <Stack.Screen name="settings" />
          </>
        ) : (
          <Stack.Screen name="(auth)/login" />
        )}
      </Stack>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <RootLayoutInner />
    </AppThemeProvider>
  );
}
