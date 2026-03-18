import { useState } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '../../lib/api';
import { HapticButton } from '../common/HapticButton';
import type { SelectedStyle } from '../../lib/types';
import { useAppTheme } from '../../lib/theme-provider';

interface ImageUploaderProps {
  sessionId: string;
  onUpload: (style: SelectedStyle) => void;
}

export function ImageUploader({ sessionId, onUpload }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const theme = useAppTheme();

  const handlePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0] as (typeof result.assets)[number] & { file?: Blob | null };

    setUploading(true);
    try {
      const uploaded = await uploadFile(
        '/api/upload',
        {
          uri: asset.uri,
          name: asset.fileName ?? 'reference.jpg',
          type: asset.mimeType ?? 'image/jpeg',
          file: asset.file ?? undefined,
        },
        sessionId,
        'reference-photos',
      );

      onUpload({
        id: uploaded.storage_path,
        thumbnailUrl: uploaded.url,
        storagePath: uploaded.storage_path,
        label: 'アップロード',
        referenceType: 'upload',
      });
    } catch {
      Alert.alert('エラー', '画像のアップロードに失敗しました。もう一度お試しください。');
    } finally {
      setUploading(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center px-8">
      {uploading ? (
        <View className="items-center">
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text className="text-text-secondary text-sm mt-4 tracking-wide">
            アップロード中...
          </Text>
        </View>
      ) : (
        <View className="items-center">
          <Text className="text-text-secondary text-base mb-2">
            フォトライブラリから選択
          </Text>
          <Text className="text-text-muted text-xs mb-10 text-center leading-5">
            AirDropで受け取った画像や{'\n'}保存した画像を使えます
          </Text>
          <HapticButton title="画像を選ぶ" onPress={handlePick} />
        </View>
      )}
    </View>
  );
}
