import { useState, useCallback } from 'react';
import { uploadFile } from '../lib/api';
import { downloadRemoteImageToCache } from '../lib/image-cache';

export interface PinterestImage {
  url: string;
  storagePath: string;
  signedUrl: string;
  localFileUri: string;
}

export async function importPinterestImage(
  imageUrl: string,
  sessionId: string,
): Promise<PinterestImage> {
  console.log('[Pinterest] importPinterestImage start', { imageUrl, sessionId });

  let localFileUri: string;
  try {
    localFileUri = await downloadRemoteImageToCache(imageUrl, 'pinterest');
    console.log('[Pinterest] download OK', localFileUri);
  } catch (e) {
    console.error('[Pinterest] download FAILED', e);
    throw new Error('Pinterest画像のダウンロードに失敗しました。別の画像をお試しください。');
  }

  let uploaded: { storage_path: string; url: string };
  try {
    uploaded = await uploadFile(
      '/api/upload',
      {
        uri: localFileUri,
        name: `pinterest_${Date.now()}.jpg`,
        type: 'image/jpeg',
      },
      sessionId,
      'reference-photos',
    );
    console.log('[Pinterest] upload OK', uploaded);
  } catch (e) {
    console.error('[Pinterest] upload FAILED', e);
    throw new Error('画像のアップロードに失敗しました。もう一度お試しください。');
  }

  return {
    url: imageUrl,
    storagePath: uploaded.storage_path,
    signedUrl: uploaded.url,
    localFileUri,
  };
}

export function usePinterest(sessionId: string | null) {
  const [loading, setLoading] = useState(false);

  const importImage = useCallback(
    async (imageUrl: string): Promise<PinterestImage> => {
      if (!sessionId) {
        throw new Error('セッション情報が見つかりません。最初からやり直してください。');
      }
      setLoading(true);
      try {
        return await importPinterestImage(imageUrl, sessionId);
      } finally {
        setLoading(false);
      }
    },
    [sessionId],
  );

  return { loading, importImage };
}
