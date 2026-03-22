import { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { getBrowserLocation } from '../../lib/browser';
import { supabase } from '../../lib/supabase';
import { HapticButton } from '../../components/common/HapticButton';
import { useAppTheme } from '../../lib/theme-provider';
import {
  buildSsoSignInParams,
  clearBrowserAuthCallback,
  createSessionFromUrl,
  getAuthRedirectUri,
  hasAuthCallbackParams,
} from '../../lib/sso';

WebBrowser.maybeCompleteAuthSession();

function formatSsoLoginError(message: string): string {
  if (/SAML 2\.0 is disabled/i.test(message)) {
    return [
      message,
      '',
      '接続している Supabase プロジェクトで SAML / SSO がまだ有効になっていない可能性があります。',
      'ダッシュボード → Authentication → SSO / SAML で有効化し、Entra ID のメタデータを登録してください（README の Azure AD 手順）。',
      '別プロジェクトの URL・anon キーを .env に入れていないかも確認してください。',
    ].join('\n');
  }
  return message;
}

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const theme = useAppTheme();

  useEffect(() => {
    const browserLocation = getBrowserLocation();
    if (!browserLocation) {
      return;
    }

    const currentUrl = browserLocation.href;
    if (!hasAuthCallbackParams(currentUrl)) {
      return;
    }

    let active = true;
    setLoading(true);

    void createSessionFromUrl(currentUrl)
      .catch((err) => {
        if (active) {
          const msg = err instanceof Error ? err.message : 'サインインに失敗しました';
          Alert.alert('ログインエラー', formatSsoLoginError(msg));
        }
      })
      .finally(() => {
        clearBrowserAuthCallback(currentUrl);
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const redirectUri = getAuthRedirectUri();
      const { data, error } = await supabase.auth.signInWithSSO(buildSsoSignInParams(redirectUri));

      if (error) {
        Alert.alert('ログインエラー', formatSsoLoginError(error.message));
        return;
      }

      if (data?.url) {
        const browserLocation = getBrowserLocation();
        if (browserLocation) {
          browserLocation.assign(data.url);
          return;
        }

        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (result.type === 'success') {
          const session = await createSessionFromUrl(result.url);
          if (!session) {
            throw new Error('SSO コールバックからセッションを復元できませんでした');
          }
        }

        return;
      }

      Alert.alert('ログインエラー', 'SSO の遷移先 URL を取得できませんでした');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '不明なエラーが発生しました';
      Alert.alert('ログインエラー', formatSsoLoginError(msg));
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
        <ActivityIndicator size="large" color={theme.colors.accent} />
      ) : (
        <HapticButton title="Microsoft SSO でログイン" size="lg" onPress={handleLogin} />
      )}

      <Text className="text-text-muted text-xs mt-10 tracking-wide">
        社内アカウントでサインインしてください
      </Text>
    </View>
  );
}
