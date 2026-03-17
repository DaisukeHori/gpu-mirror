import { Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ExitDialog } from './ExitDialog';

interface ExitButtonProps {
  onConfirm: () => void;
}

export function ExitButton({ onConfirm }: ExitButtonProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Pressable
        className="px-4 py-2 rounded-pill bg-bg-elevated border border-border"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setVisible(true);
        }}
      >
        <Text className="text-text-muted text-xs tracking-wide">終了</Text>
      </Pressable>
      <ExitDialog
        visible={visible}
        onCancel={() => setVisible(false)}
        onConfirm={() => {
          setVisible(false);
          onConfirm();
        }}
      />
    </>
  );
}
