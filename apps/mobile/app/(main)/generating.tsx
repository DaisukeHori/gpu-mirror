import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { apiPatch } from '../../lib/api';
import { useGenerate } from '../../hooks/useGenerate';
import { ExitButton } from '../../components/common/ExitButton';
import { ProgressBoard } from '../../components/generating/ProgressBoard';

export default function GeneratingScreen() {
  const params = useLocalSearchParams<{
    sessionId: string;
    customerPhotoUrl: string;
    styles: string;
    styleLabels: string;
  }>();

  let styles: { simulation_mode: string; reference_type: string; [key: string]: unknown }[] = [];
  let styleLabels: string[] = [];
  try { styles = JSON.parse(params.styles ?? '[]'); } catch { /* noop */ }
  try { styleLabels = JSON.parse(params.styleLabels ?? '[]'); } catch { /* noop */ }
  const { results, progress, isGenerating, isComplete, startGeneration, reset } = useGenerate();

  const pulseOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const doneOpacity = useSharedValue(0);

  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    contentOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  useEffect(() => {
    if (params.sessionId && styles.length > 0) {
      startGeneration(params.sessionId, styles);
    }
    return () => { reset(); };
  }, []);

  useEffect(() => {
    if (isComplete) {
      doneOpacity.value = withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) });
      const timer = setTimeout(() => {
        router.replace({
          pathname: '/(main)/result',
          params: { sessionId: params.sessionId! },
        });
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isComplete, params.sessionId]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const doneStyle = useAnimatedStyle(() => ({
    opacity: doneOpacity.value,
  }));

  const handleViewCompleted = (styleGroup: number) => {
    const groupResults = results.filter(
      (r) => r.style_group === styleGroup && r.status === 'completed',
    );
    if (groupResults.length > 0) {
      router.replace({
        pathname: '/(main)/result',
        params: { sessionId: params.sessionId! },
      });
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center justify-end px-5 pt-16 pb-3">
        <ExitButton onConfirm={async () => {
          if (params.sessionId) await apiPatch(`/api/sessions/${params.sessionId}`, { is_closed: true }).catch(() => {});
          router.replace('/(main)');
        }} />
      </View>

      <Animated.View style={contentStyle} className="flex-1 items-center justify-center px-8">
        {/* Pulse dot */}
        <View className="mb-10 items-center">
          <Animated.View
            style={pulseStyle}
            className="w-2 h-2 rounded-full bg-accent mb-6"
          />
          <Text className="text-text-primary text-xl font-semibold tracking-wide">
            スタイリング中
          </Text>
          <Text className="text-text-muted text-xs mt-2 tracking-wide">
            完了したものから順次表示されます
          </Text>
        </View>

        <ProgressBoard
          progress={progress}
          styleLabels={styleLabels}
          onViewCompleted={handleViewCompleted}
        />

        {isComplete && (
          <Animated.View style={doneStyle} className="mt-10">
            <Text className="text-success text-sm font-medium tracking-wide">
              すべて完了しました
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}
