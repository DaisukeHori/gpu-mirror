import { useState } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../lib/supabase';
import { HapticButton } from '../../components/common/HapticButton';

WebBrowser.maybeCompleteAuthSession();

const redirectUri = makeRedirectUri({ scheme: 'revol-mirror' });

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: redirectUri,
          scopes: 'openid profile email',
        },
      });

      if (error) {
        Alert.alert('ログインエラー', error.message);
        return;
      }

      if (data?.url) {
        await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
      }
    } catch (err) {
      Alert.alert('ログインエラー', err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-bg items-center justify-center px-8">
      <Text className="text-text-primary text-4xl font-semibold tracking-[0.25em] mb-1">
        REVOL
      </Text>
      <Text className="text-text-secondary text-xl tracking-[0.4em] mb-20">
        Mirror
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#C8956C" />
      ) : (
        <HapticButton title="Azure AD でログイン" size="lg" onPress={handleLogin} />
      )}

      <Text className="text-text-muted text-xs mt-10 tracking-wide">
        社内アカウントでサインインしてください
      </Text>
    </View>
  );
}
