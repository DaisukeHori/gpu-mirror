import { Pressable, Text } from 'react-native';
import { impactMedium } from '../../lib/haptics';

interface ShutterButtonProps {
  onPress: () => void;
}

export function ShutterButton({ onPress }: ShutterButtonProps) {
  const handlePress = () => {
    impactMedium();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-1 items-center justify-center bg-white rounded-pill py-4"
    >
      <Text className="text-black text-base font-semibold tracking-wide">撮影する</Text>
    </Pressable>
  );
}
