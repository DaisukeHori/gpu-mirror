import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const PINTEREST_DOWNLOAD_HEADERS = {
  Accept: 'image/*,*/*;q=0.8',
  Referer: 'https://www.pinterest.com/',
  'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
};

function buildCacheFileName(prefix: string) {
  const nonce = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${nonce}.jpg`;
}

export async function cacheRemoteImage(
  url: string | undefined,
  prefix: string = 'thumb',
): Promise<string | undefined> {
  if (!url) {
    return undefined;
  }

  try {
    return await downloadRemoteImageToCache(url, prefix);
  } catch {
    return undefined;
  }
}

export async function downloadRemoteImageToCache(
  url: string,
  prefix: string = 'thumb',
): Promise<string> {
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) {
    throw new Error('端末キャッシュにアクセスできません。');
  }

  const targetFileUri = `${cacheDirectory}${buildCacheFileName(prefix)}`;

  try {
    const result = await FileSystem.downloadAsync(url, targetFileUri, {
      headers: PINTEREST_DOWNLOAD_HEADERS,
    });
    return result.uri;
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : 'Pinterest画像のダウンロードに失敗しました。';
    throw new Error(message);
  }
}

export async function normalizeImageToJpeg(
  uri: string,
  prefix: string = 'normalized',
): Promise<string> {
  try {
    const result = await manipulateAsync(
      uri,
      [],
      {
        compress: 0.9,
        format: SaveFormat.JPEG,
      },
    );
    return result.uri;
  } catch (error) {
    const message =
      error instanceof Error && error.message
        ? error.message
        : '画像のJPEG変換に失敗しました。';
    throw new Error(message);
  }
}
