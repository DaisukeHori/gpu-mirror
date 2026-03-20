import * as FileSystem from 'expo-file-system/legacy';

export interface CachedGeneration {
  id: string;
  style_group: number;
  angle: string;
  localUri: string;
  status: 'completed' | 'failed';
  style_label?: string;
  is_favorite: boolean;
  remoteUrl: string;
  reference_photo_path?: string;
  reference_type?: string;
  reference_source_url?: string;
  simulation_mode?: string;
  generated_photo_path?: string;
}

const cache = new Map<string, CachedGeneration[]>();
const downloadingUrls = new Set<string>();

export function getCachedGenerations(sessionId: string): CachedGeneration[] {
  return cache.get(sessionId) ?? [];
}

export function setCachedGeneration(sessionId: string, gen: CachedGeneration): void {
  const existing = cache.get(sessionId) ?? [];
  const idx = existing.findIndex((g) => g.id === gen.id);
  if (idx >= 0) {
    existing[idx] = gen;
  } else {
    existing.push(gen);
  }
  cache.set(sessionId, existing);
}

export function updateCachedFavorite(sessionId: string, genId: string, isFavorite: boolean): void {
  const existing = cache.get(sessionId) ?? [];
  const gen = existing.find((g) => g.id === genId);
  if (gen) gen.is_favorite = isFavorite;
}

export async function downloadAndCache(
  sessionId: string,
  genId: string,
  remoteUrl: string,
  meta: { style_group: number; angle: string; style_label?: string; reference_photo_path?: string; reference_type?: string; reference_source_url?: string; simulation_mode?: string; generated_photo_path?: string },
): Promise<string> {
  if (downloadingUrls.has(genId)) return remoteUrl;

  const existing = (cache.get(sessionId) ?? []).find((g) => g.id === genId);
  if (existing?.localUri.startsWith('file://')) return existing.localUri;

  downloadingUrls.add(genId);
  const dir = FileSystem.cacheDirectory;
  if (!dir) {
    downloadingUrls.delete(genId);
    return remoteUrl;
  }

  const fileName = `gen_${genId.slice(0, 8)}.jpg`;
  try {
    const result = await FileSystem.downloadAsync(remoteUrl, dir + fileName);
    const localUri = result.uri;

    setCachedGeneration(sessionId, {
      id: genId,
      style_group: meta.style_group,
      angle: meta.angle,
      localUri,
      status: 'completed',
      style_label: meta.style_label,
      is_favorite: false,
      remoteUrl,
      reference_photo_path: meta.reference_photo_path,
      reference_type: meta.reference_type,
      reference_source_url: meta.reference_source_url,
      simulation_mode: meta.simulation_mode,
      generated_photo_path: meta.generated_photo_path,
    });

    downloadingUrls.delete(genId);
    return localUri;
  } catch {
    downloadingUrls.delete(genId);
    return remoteUrl;
  }
}

export function clearSessionCache(sessionId: string): void {
  cache.delete(sessionId);
}
