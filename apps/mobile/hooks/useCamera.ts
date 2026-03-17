import { useState, useRef, useCallback } from 'react';
import { CameraView, useCameraPermissions } from 'expo-camera';

export function useCamera() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const cameraRef = useRef<CameraView>(null);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current) return null;
    const result = await cameraRef.current.takePictureAsync({
      quality: 0.9,
      base64: false,
    });
    if (result?.uri) {
      setPhoto(result.uri);
    }
    return result;
  }, []);

  const toggleFacing = useCallback(() => {
    setFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  }, []);

  const retake = useCallback(() => {
    setPhoto(null);
  }, []);

  return {
    cameraRef,
    permission,
    requestPermission,
    photo,
    facing,
    takePhoto,
    toggleFacing,
    retake,
    setPhoto,
  };
}
