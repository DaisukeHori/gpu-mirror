import { useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { CameraView as ExpoCameraView } from 'expo-camera';
import { useCamera } from '../../hooks/useCamera';
import { useSession } from '../../hooks/useSession';
import { uploadFile, apiPatch } from '../../lib/api';
import { ExitButton } from '../../components/common/ExitButton';
import { FaceGuide } from '../../components/camera/FaceGuide';
import { ShutterButton } from '../../components/camera/ShutterButton';
import { HapticButton } from '../../components/common/HapticButton';
import * as ImagePicker from 'expo-image-picker';

export default function CameraScreen() {
  const [uploading, setUploading] = useState(false);
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

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-8">
        <Text className="text-text-primary text-lg mb-2">カメラへのアクセス</Text>
        <Text className="text-text-muted text-sm mb-8 text-center">
          お客さまの撮影にカメラを使用します
        </Text>
        <HapticButton title="許可する" onPress={requestPermission} />
      </View>
    );
  }

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
      const result = await uploadFile('/api/upload', {
        uri: photo,
        name: 'customer.jpg',
        type: 'image/jpeg',
      }, session.id, 'customer-photos');
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
      setUploading(true);
      try {
        const session = await createSession('pending');
        const uploaded = await uploadFile('/api/upload', {
          uri: result.assets[0].uri,
          name: 'customer.jpg',
          type: 'image/jpeg',
        }, session.id, 'customer-photos');
        await navigateToExplore(session.id, uploaded.storage_path, uploaded.url);
      } catch {
        Alert.alert('エラー', '写真のアップロードに失敗しました。もう一度お試しください。');
      } finally {
        setUploading(false);
      }
    }
  };

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
              <ActivityIndicator size="small" color="#C8956C" />
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

      <ExpoCameraView ref={cameraRef} className="flex-1" facing={facing}>
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
