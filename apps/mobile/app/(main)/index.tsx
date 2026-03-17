import { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { HapticButton } from '../../components/common/HapticButton';
import { HistoryPanel } from '../../components/history/HistoryPanel';

const ease = { duration: 600, easing: Easing.out(Easing.quad) };

export default function WelcomeScreen() {
  const [staffName, setStaffName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [historyVisible, setHistoryVisible] = useState(false);

  const logoOpacity = useSharedValue(0);
  const logoTranslateY = useSharedValue(12);
  const buttonOpacity = useSharedValue(0);
  const staffOpacity = useSharedValue(0);

  useEffect(() => {
    logoOpacity.value = withDelay(100, withTiming(1, ease));
    logoTranslateY.value = withDelay(100, withTiming(0, ease));
    buttonOpacity.value = withDelay(500, withTiming(1, ease));
    staffOpacity.value = withDelay(800, withTiming(1, ease));
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: staff } = await supabase
            .from('staffs')
            .select('display_name, store_code')
            .eq('auth_user_id', user.id)
            .single();
          if (staff) {
            setStaffName(staff.display_name);
            setStoreName(staff.store_code ?? '');
          }
        }
      } catch {
        // staff info is non-critical
      }
    })();
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoTranslateY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const staffStyle = useAnimatedStyle(() => ({
    opacity: staffOpacity.value,
  }));

  const handleStart = () => {
    router.push('/(main)/camera');
  };

  const handleSelectSession = (sessionId: string) => {
    setHistoryVisible(false);
    router.push({ pathname: '/(main)/result', params: { sessionId } });
  };

  return (
    <View className="flex-1 bg-bg items-center justify-center">
      {/* Top buttons — settings left, history right */}
      <View className="absolute top-16 left-6 right-6 flex-row justify-between">
        <Pressable
          className="px-4 py-2 rounded-pill bg-bg-surface border border-border"
          onPress={() => router.push('/settings')}
        >
          <Text className="text-text-muted text-xs tracking-wide">設定</Text>
        </Pressable>
        <Pressable
          className="px-4 py-2 rounded-pill bg-bg-surface border border-border"
          onPress={() => setHistoryVisible(true)}
        >
          <Text className="text-text-muted text-xs tracking-wide">履歴</Text>
        </Pressable>
      </View>

      {/* Logo */}
      <Animated.View style={logoStyle} className="items-center">
        <Text className="text-text-primary text-5xl font-semibold tracking-[0.25em]">
          REVOL
        </Text>
        <Text className="text-text-secondary text-2xl tracking-[0.4em] mt-1">
          Mirror
        </Text>
      </Animated.View>

      {/* Start button */}
      <Animated.View style={buttonStyle} className="mt-20">
        <HapticButton title="はじめる" size="lg" onPress={handleStart} />
      </Animated.View>

      {/* Staff info */}
      <Animated.View style={staffStyle}>
        {(staffName || storeName) && (
          <Text className="text-text-muted text-xs mt-14 tracking-wide">
            {staffName}{storeName ? `  —  ${storeName}` : ''}
          </Text>
        )}
      </Animated.View>

      <HistoryPanel
        visible={historyVisible}
        onClose={() => setHistoryVisible(false)}
        onSelectSession={handleSelectSession}
      />
    </View>
  );
}
