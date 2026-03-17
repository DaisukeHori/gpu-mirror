import { useState } from 'react';
import { View, Pressable, Text, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface FullscreenViewerProps {
  imageUrl: string;
  beforeImageUrl?: string | null;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const timing = { duration: 200, easing: Easing.out(Easing.quad) };

export function FullscreenViewer({ imageUrl, beforeImageUrl, onClose }: FullscreenViewerProps) {
  const [showBefore, setShowBefore] = useState(false);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(4, e.scale));
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1, timing);
      }
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      }
    })
    .onEnd(() => {
      translateX.value = withTiming(0, timing);
      translateY.value = withTiming(0, timing);
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      if (scale.value > 1) {
        scale.value = withTiming(1, timing);
      } else {
        scale.value = withTiming(2, timing);
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(200)
    .onStart(() => {
      if (beforeImageUrl) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowBefore(true);
      }
    })
    .onEnd(() => {
      setShowBefore(false);
    });

  const composed = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    Gesture.Exclusive(longPressGesture, doubleTapGesture),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const displayUrl = showBefore && beforeImageUrl ? beforeImageUrl : imageUrl;

  return (
    <View className="absolute inset-0 bg-black z-50">
      <GestureDetector gesture={composed}>
        <Animated.View style={[{ flex: 1 }, animatedStyle]}>
          <Image
            source={{ uri: displayUrl }}
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
            contentFit="contain"
          />
        </Animated.View>
      </GestureDetector>

      {/* Before indicator */}
      {showBefore && (
        <View className="absolute top-20 left-0 right-0 items-center">
          <View className="bg-bg-elevated/80 px-5 py-2 rounded-pill">
            <Text className="text-text-primary text-xs tracking-widest font-medium">
              BEFORE
            </Text>
          </View>
        </View>
      )}

      {/* Close button */}
      <Pressable
        className="absolute top-16 right-6 bg-bg-elevated/80 rounded-pill px-5 py-2.5"
        onPress={onClose}
      >
        <Text className="text-text-primary text-xs tracking-wide">閉じる</Text>
      </Pressable>
    </View>
  );
}
