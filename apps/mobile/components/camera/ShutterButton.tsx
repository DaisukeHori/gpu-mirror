import { Pressable, View } from 'react-native';
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
    <Pressable onPress={handlePress} className="items-center justify-center">
      <View className="w-20 h-20 rounded-full border-4 border-white items-center justify-center">
        <View className="w-16 h-16 rounded-full bg-white" />
      </View>
    </Pressable>
  );
}
