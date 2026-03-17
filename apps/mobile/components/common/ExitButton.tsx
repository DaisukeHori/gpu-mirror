import { Pressable, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ExitDialog } from './ExitDialog';

interface ExitButtonProps {
  onConfirm: () => void | Promise<void>;
}

export function ExitButton({ onConfirm }: ExitButtonProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  const handleConfirm = async () => {
    setClosing(true);
    setVisible(false);
    try {
      await onConfirm();
    } finally {
      setClosing(false);
    }
  };

  return (
    <>
      <Pressable
        className="px-4 py-2 rounded-pill bg-bg-elevated border border-border"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setVisible(true);
        }}
        disabled={closing}
      >
        <Text className="text-text-muted text-xs tracking-wide">
          {closing ? '...' : '終了'}
        </Text>
      </Pressable>
      <ExitDialog
        visible={visible}
        onCancel={() => setVisible(false)}
        onConfirm={handleConfirm}
      />
    </>
  );
}
