import { View, Text, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import type { StyleGroupProgress } from '../../hooks/useGenerate';
import { ANGLES, ANGLE_LABELS } from '../../lib/constants';

interface ProgressBoardProps {
  progress: Map<number, StyleGroupProgress>;
  styleLabels: string[];
  onViewCompleted: (styleGroup: number) => void;
}

function AnimatedBar({ percent }: { percent: number }) {
  const style = useAnimatedStyle(() => ({
    width: withTiming(`${percent}%` as unknown as number, {
      duration: 400,
      easing: Easing.out(Easing.quad),
    }),
  }));

  return (
    <View className="h-1 bg-bg-elevated rounded-full overflow-hidden">
      <Animated.View className="h-full bg-accent rounded-full" style={style} />
    </View>
  );
}

export function ProgressBoard({ progress, styleLabels, onViewCompleted }: ProgressBoardProps) {
  return (
    <View className="w-full max-w-lg gap-4">
      {Array.from(progress.entries()).map(([groupNum, group]) => {
        const completed = group.completed.length;
        const failed = group.failed.length;
        const pct = Math.round(((completed + failed) / group.total) * 100);
        const allDone = completed + failed >= group.total;
        const label = styleLabels[groupNum - 1] ?? `Style ${groupNum}`;

        return (
          <Pressable
            key={groupNum}
            className="bg-bg-surface rounded-card p-5 border border-border"
            onPress={() => allDone && onViewCompleted(groupNum)}
            disabled={!allDone}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-text-primary text-sm font-medium tracking-wide">
                {label}
              </Text>
              <Text className="text-text-muted text-xs">{pct}%</Text>
            </View>

            <AnimatedBar percent={pct} />

            <View className="flex-row gap-3 mt-3">
              {ANGLES.map((angle) => {
                const isDone = group.completed.includes(angle);
                const isFailed = group.failed.includes(angle);
                return (
                  <Text
                    key={angle}
                    className={`text-[11px] tracking-wide ${isDone ? 'text-success' : isFailed ? 'text-destructive' : 'text-text-muted'}`}
                  >
                    {ANGLE_LABELS[angle]}
                    {isDone ? ' ✓' : isFailed ? ' ✗' : ''}
                  </Text>
                );
              })}
            </View>

            {allDone && (
              <Text className="text-accent text-xs mt-3 tracking-wide">
                タップして結果を見る
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
