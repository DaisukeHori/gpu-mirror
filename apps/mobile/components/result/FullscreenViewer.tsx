import { useState } from 'react';
import { View, Pressable, Text, Image as RNImage, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { impactLight } from '../../lib/haptics';

interface FullscreenViewerProps {
  imageUrl: string;
  beforeImageUrl?: string | null;
  onClose: () => void;
}

const timing = { duration: 200, easing: Easing.out(Easing.quad) };

export function FullscreenViewer({ imageUrl, beforeImageUrl, onClose }: FullscreenViewerProps) {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [showBefore, setShowBefore] = useState(false);
  const [loading, setLoading] = useState(true);
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
        impactLight();
        setShowBefore(true);
      }
    })
    .onFinalize(() => {
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
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#000', zIndex: 50 }}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[{ flex: 1 }, animatedStyle]}>
            <RNImage
              source={{ uri: displayUrl, cache: 'force-cache' }}
              style={{ width: screenWidth, height: screenHeight }}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
            {loading && (
              <View style={{ ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#B8956A" />
              </View>
            )}
          </Animated.View>
        </GestureDetector>

        <View style={{ position: 'absolute', top: insets.top + 12, left: 24, flexDirection: 'row', gap: 12 }}>
          {beforeImageUrl && (
            <Pressable
              style={{ backgroundColor: 'rgba(30,28,26,0.8)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 }}
              onPress={() => setShowBefore((prev) => !prev)}
            >
              <Text style={{ color: '#E8E0D8', fontSize: 13 }}>
                {showBefore ? 'After' : 'Before'}
              </Text>
            </Pressable>
          )}
        </View>

        <Pressable
          style={{ position: 'absolute', top: insets.top + 12, right: 24, backgroundColor: 'rgba(30,28,26,0.8)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 999 }}
          onPress={onClose}
        >
          <Text style={{ color: '#E8E0D8', fontSize: 13 }}>閉じる</Text>
        </Pressable>
      </View>
    </View>
  );
}
