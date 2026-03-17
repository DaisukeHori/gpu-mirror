import { Modal, View, Text, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

interface ExitDialogProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExitDialog({ visible, onCancel, onConfirm }: ExitDialogProps) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/60">
        <View className="bg-bg-elevated rounded-card w-80 p-7 border border-border">
          <Text className="text-text-primary text-base font-semibold mb-2 tracking-wide">
            セッションを終了しますか？
          </Text>
          <Text className="text-text-muted text-sm mb-8 leading-5">
            画像は履歴からいつでも確認できます。
          </Text>
          <View className="flex-row justify-end gap-3">
            <Pressable className="px-5 py-2.5 rounded-pill" onPress={onCancel}>
              <Text className="text-text-muted text-sm tracking-wide">キャンセル</Text>
            </Pressable>
            <Pressable
              className="px-5 py-2.5 rounded-pill bg-destructive"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onConfirm();
              }}
            >
              <Text className="text-white text-sm font-semibold tracking-wide">終了する</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
