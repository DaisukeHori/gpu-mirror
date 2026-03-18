import { Pressable, PressableProps, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { impactLight } from '../../lib/haptics';

interface HapticButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  primary: 'bg-accent',
  secondary: 'bg-bg-surface border border-border',
  destructive: 'bg-destructive',
  ghost: '',
};

const disabledVariantStyles = {
  primary: 'bg-accent/40',
  secondary: 'bg-bg-surface/50 border border-border/50',
  destructive: 'bg-destructive/40',
  ghost: '',
};

const textVariantStyles = {
  primary: 'text-text-on-accent font-semibold',
  secondary: 'text-text-primary',
  destructive: 'text-white font-semibold',
  ghost: 'text-text-secondary',
};

const sizeStyles = {
  sm: 'px-5 py-2.5',
  md: 'px-7 py-3.5',
  lg: 'px-10 py-4',
};

const textSizeStyles = {
  sm: 'text-xs tracking-wide',
  md: 'text-sm tracking-wide',
  lg: 'text-base tracking-wide',
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HapticButton({
  title,
  variant = 'primary',
  size = 'md',
  disabled,
  onPress,
  ...props
}: HapticButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const timing = { duration: 150, easing: Easing.out(Easing.quad) };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    if (disabled) return;
    scale.value = withTiming(0.965, timing);
    opacity.value = withTiming(0.85, timing);
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
  };

  const handlePress = (e: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
    if (disabled) return;
    impactLight();
    onPress?.(e);
  };

  const bgStyle = disabled ? disabledVariantStyles[variant] : variantStyles[variant];

  return (
    <AnimatedPressable
      className={`rounded-pill items-center justify-center ${bgStyle} ${sizeStyles[size]}`}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      style={animatedStyle}
      {...props}
    >
      <Text
        className={`${textVariantStyles[variant]} ${textSizeStyles[size]} ${disabled ? 'opacity-50' : ''}`}
      >
        {title}
      </Text>
    </AnimatedPressable>
  );
}
