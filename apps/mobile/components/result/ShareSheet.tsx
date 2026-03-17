import { View, Text, Pressable, Modal, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import type { Generation } from '../../lib/types';

interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  generations: Generation[];
}

export function ShareSheet({ visible, onClose, generations }: ShareSheetProps) {
  const [sharing, setSharing] = useState(false);

  const handleShareAll = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSharing(true);
    try {
      const frontGens = generations.filter((g) => g.angle === 'glamour' || g.angle === 'front');
      const target = frontGens[0] ?? generations[0];
      if (!target?.photo_url) {
        Alert.alert('共有できる画像がありません');
        return;
      }

      const localUri = `${FileSystem.cacheDirectory}share_${target.id}.jpg`;
      await FileSystem.downloadAsync(target.photo_url, localUri);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(localUri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'REVOL Mirror — スタイルシミュレーション',
        });
      } else {
        Alert.alert('この端末では共有機能を利用できません');
      }
    } catch {
      Alert.alert('共有に失敗しました');
    } finally {
      setSharing(false);
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-bg-elevated rounded-t-3xl px-5 pt-6 pb-10 border-t border-border">
          <Text className="text-text-primary text-lg font-semibold tracking-wide mb-2">
            共有
          </Text>
          <Text className="text-text-muted text-sm mb-8">
            {generations.length}枚の画像から代表画像を共有します
          </Text>

          <View className="gap-3">
            <Pressable
              className="bg-accent rounded-pill py-3.5 items-center"
              onPress={handleShareAll}
              disabled={sharing}
            >
              <Text className="text-bg text-sm font-semibold tracking-wide">
                {sharing ? '準備中...' : '共有シートを開く'}
              </Text>
            </Pressable>
            <Pressable
              className="bg-bg-surface rounded-pill py-3.5 items-center border border-border"
              onPress={onClose}
            >
              <Text className="text-text-secondary text-sm tracking-wide">キャンセル</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
