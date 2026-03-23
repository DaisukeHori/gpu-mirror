import { useEffect } from 'react';
import { View, Text, Pressable, Image as RNImage } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { StyleGroupProgress } from '../../hooks/useGenerate';
import { ANGLES, ANGLE_LABELS } from '../../lib/constants';

interface ProgressBoardProps {
  progress: Map<number, StyleGroupProgress>;
  styleLabels: string[];
  styleThumbnails?: string[];
  labelMap?: Map<number, { label: string; thumbnail: string }>;
  onViewCompleted: (styleGroup: number) => void;
}

function AnimatedBar({ percent }: { percent: number }) {
  const widthPct = useSharedValue(0);

  useEffect(() => {
    widthPct.value = withTiming(percent, {
      duration: 400,
      easing: Easing.out(Easing.quad),
    });
  }, [percent, widthPct]);

  const style = useAnimatedStyle(() => ({
    width: `${widthPct.value}%`,
  }));

  return (
    <View style={{ height: 3, backgroundColor: 'rgba(151,145,137,0.1)', borderRadius: 2, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: 2, backgroundColor: '#B8956A' }, style]} />
    </View>
  );
}

export function ProgressBoard({ progress, styleLabels, styleThumbnails, labelMap, onViewCompleted }: ProgressBoardProps) {
  return (
    <View style={{ width: '100%', maxWidth: 520, gap: 12 }}>
      {Array.from(progress.entries()).map(([groupNum, group]) => {
        const completed = group.completed.length;
        const failed = group.failed.length;
        const pct = Math.round(((completed + failed) / group.total) * 100);
        const allDone = completed + failed >= group.total;
        const mapped = labelMap?.get(groupNum);
        const label = mapped?.label ?? `Style ${groupNum}`;
        const thumbUrl = mapped?.thumbnail ?? undefined;

        return (
          <Pressable
            key={groupNum}
            style={{
              backgroundColor: 'rgba(151,145,137,0.06)',
              borderRadius: 12,
              borderWidth: 0.5,
              borderColor: 'rgba(151,145,137,0.12)',
              overflow: 'hidden',
            }}
            onPress={() => allDone && onViewCompleted(groupNum)}
            disabled={!allDone}
          >
            <View style={{ flexDirection: 'row' }}>
              {thumbUrl ? (
                <RNImage
                  source={{ uri: thumbUrl }}
                  style={{ width: 80, height: 100, borderTopLeftRadius: 12, borderBottomLeftRadius: allDone ? 0 : 12 }}
                  resizeMode="cover"
                />
              ) : null}

              <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ color: '#E8E0D8', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 }}>
                    {label}
                  </Text>
                  <Text style={{ color: 'rgba(151,145,137,0.72)', fontSize: 13 }}>{pct}%</Text>
                </View>

                <AnimatedBar percent={pct} />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  {ANGLES.map((angle) => {
                    const isDone = group.completed.includes(angle);
                    const isFailed = group.failed.includes(angle);
                    return (
                      <Text
                        key={angle}
                        style={{
                          fontSize: 12,
                          letterSpacing: 0.3,
                          color: isDone ? '#4CAF50' : isFailed ? '#EF5350' : 'rgba(151,145,137,0.48)',
                        }}
                      >
                        {ANGLE_LABELS[angle]}
                        {isDone ? ' \u2713' : isFailed ? ' (再試行)' : ''}
                      </Text>
                    );
                  })}
                </View>
              </View>
            </View>

            {allDone && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 }}>
                <Text style={{ color: '#B8956A', fontSize: 13, letterSpacing: 0.3 }}>
                  タップして結果を見る
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
