import { useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { useGenerate } from '../../hooks/useGenerate';
import { ExitButton } from '../../components/common/ExitButton';
import { useCloseSession } from '../../hooks/useCloseSession';
import { ProgressBoard } from '../../components/generating/ProgressBoard';
import { getStoredSelectedStyles } from '../../lib/style-selection-store';

function OrbDot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-14, { duration: 500, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.4, { duration: 500, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 500, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
          withTiming(0.3, { duration: 500, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, translateY, scale, opacity]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#B8956A',
        },
        style,
      ]}
    />
  );
}

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
  const styleThumbnails = useMemo(() => {
    const stored = getStoredSelectedStyles(params.sessionId);
    return stored.map((s) => s.thumbnailUrl || s.localThumbnailUri || s.sourceUrl || '');
  }, [params.sessionId]);
  const closeSession = useCloseSession(params.sessionId);
  const { results, progress, isGenerating, isComplete, startGeneration, reset } = useGenerate();


  const contentOpacity = useSharedValue(0);
  const doneOpacity = useSharedValue(0);

  useEffect(() => {
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
        <ExitButton onConfirm={closeSession} />
      </View>

      <Animated.View style={contentStyle} className="flex-1 items-center justify-center px-8">
        <View className="mb-10 items-center">
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 24 }}>
            <OrbDot delay={0} />
            <OrbDot delay={150} />
            <OrbDot delay={300} />
          </View>
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
            styleThumbnails={styleThumbnails}
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
