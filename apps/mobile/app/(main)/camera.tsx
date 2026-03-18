import { useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { CameraView as ExpoCameraView } from 'expo-camera';
import { useCamera } from '../../hooks/useCamera';
import { useSession } from '../../hooks/useSession';
import { uploadFile, apiPatch, type UploadableFile } from '../../lib/api';
import { ExitButton } from '../../components/common/ExitButton';
import { FaceGuide } from '../../components/camera/FaceGuide';
import { ShutterButton } from '../../components/camera/ShutterButton';
import { HapticButton } from '../../components/common/HapticButton';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../../lib/theme-provider';

export default function CameraScreen() {
  const [uploading, setUploading] = useState(false);
  const [cameraUnavailable, setCameraUnavailable] = useState(false);
  const theme = useAppTheme();
  const {
    cameraRef,
    permission,
    requestPermission,
    photo,
    facing,
    takePhoto,
    toggleFacing,
    retake,
  } = useCamera();
  const { createSession } = useSession();

  const buildUploadPayload = (input: {
    uri: string;
    fileName?: string | null;
    mimeType?: string | null;
    file?: Blob | null;
  }): UploadableFile => ({
    uri: input.uri,
    name: input.fileName ?? 'customer.jpg',
    type: input.mimeType ?? 'image/jpeg',
    file: input.file ?? undefined,
  });

  const navigateToExplore = async (sessionId: string, storagePath: string, signedUrl: string) => {
    await apiPatch(`/api/sessions/${sessionId}`, { customer_photo_path: storagePath });
    router.push({
      pathname: '/(main)/explore',
      params: { sessionId, customerPhotoPath: storagePath, customerPhotoUrl: signedUrl },
    });
  };

  const handleUsePhoto = async () => {
    if (!photo || uploading) return;
    setUploading(true);
    try {
      const session = await createSession('pending');
      const result = await uploadFile(
        '/api/upload',
        buildUploadPayload({
          uri: photo,
          fileName: 'customer.jpg',
          mimeType: 'image/jpeg',
        }),
        session.id,
        'customer-photos',
      );
      await navigateToExplore(session.id, result.storage_path, result.url);
    } catch {
      Alert.alert('エラー', '写真のアップロードに失敗しました。もう一度お試しください。');
    } finally {
      setUploading(false);
    }
  };

  const handlePickFromLibrary = async () => {
    if (uploading) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0] as (typeof result.assets)[number] & { file?: Blob | null };
      setUploading(true);
      try {
        const session = await createSession('pending');
        const uploaded = await uploadFile(
          '/api/upload',
          buildUploadPayload({
            uri: asset.uri,
            fileName: asset.fileName,
            mimeType: asset.mimeType,
            file: asset.file,
          }),
          session.id,
          'customer-photos',
        );
        await navigateToExplore(session.id, uploaded.storage_path, uploaded.url);
      } catch {
        Alert.alert('エラー', '写真のアップロードに失敗しました。もう一度お試しください。');
      } finally {
        setUploading(false);
      }
    }
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-8">
        <Text className="text-text-primary text-lg mb-2">カメラへのアクセス</Text>
        <Text className="text-text-muted text-sm mb-8 text-center">
          お客さまの撮影にカメラを使用します
        </Text>
        <HapticButton title="許可する" onPress={requestPermission} />
        <Pressable className="mt-5" onPress={handlePickFromLibrary}>
          <Text className="text-text-muted text-xs tracking-wide">ライブラリから続ける</Text>
        </Pressable>
      </View>
    );
  }

  if (cameraUnavailable && !photo) {
    return (
      <View className="flex-1 bg-bg px-8 pt-16">
        <View className="items-end mb-10">
          <ExitButton onConfirm={() => router.replace('/(main)')} />
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-text-primary text-xl font-semibold mb-3">撮影の準備ができませんでした</Text>
          <Text className="text-text-muted text-sm text-center leading-6 mb-10">
            {Platform.OS === 'web'
              ? 'ブラウザではカメラが利用できない場合があります。ライブラリから写真を選んで続行できます。'
              : 'カメラの初期化に失敗しました。ライブラリから写真を選んで続行できます。'}
          </Text>
          <HapticButton title="ライブラリから選ぶ" onPress={handlePickFromLibrary} />
        </View>
      </View>
    );
  }

  if (photo) {
    return (
      <View className="flex-1 bg-bg">
        <View className="absolute top-16 right-6 z-10">
          <ExitButton onConfirm={() => router.replace('/(main)')} />
        </View>
        <Image source={{ uri: photo }} className="flex-1" contentFit="contain" />
        <View className="flex-row justify-center gap-4 pb-12 pt-6 px-8 items-center">
          {uploading ? (
            <View className="flex-row items-center gap-3">
              <ActivityIndicator size="small" color={theme.colors.accent} />
              <Text className="text-text-secondary text-sm">アップロード中...</Text>
            </View>
          ) : (
            <>
              <HapticButton title="撮り直す" variant="secondary" size="md" onPress={retake} />
              <HapticButton title="この写真を使う" size="md" onPress={handleUsePhoto} />
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <View className="absolute top-16 right-6 z-10">
        <ExitButton onConfirm={() => router.replace('/(main)')} />
      </View>

      <ExpoCameraView
        onMountError={() => setCameraUnavailable(true)}
        ref={cameraRef}
        className="flex-1"
        facing={facing}
      >
        <FaceGuide />
      </ExpoCameraView>

      <View className="flex-row items-center justify-between px-10 pb-12 pt-6 bg-bg">
        <Pressable
          className="w-20 items-center py-2"
          onPress={handlePickFromLibrary}
        >
          <Text className="text-text-secondary text-xs tracking-wide">ライブラリ</Text>
        </Pressable>
        <ShutterButton onPress={takePhoto} />
        <Pressable
          className="w-20 items-center py-2"
          onPress={toggleFacing}
        >
          <Text className="text-text-secondary text-xs tracking-wide">切替</Text>
        </Pressable>
      </View>
    </View>
  );
}
