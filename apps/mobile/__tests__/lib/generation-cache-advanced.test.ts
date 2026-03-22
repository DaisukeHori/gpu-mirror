import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDownloadAsync } = vi.hoisted(() => ({
  mockDownloadAsync: vi.fn(),
}));

vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: mockDownloadAsync,
}));

import {
  getCachedGenerations,
  setCachedGeneration,
  updateCachedFavorite,
  downloadAndCache,
  clearSessionCache,
} from '../../lib/generation-cache';

describe('generation-cache advanced scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionCache('sess-adv');
  });

  const meta = { style_group: 1, angle: 'front' };

  it('concurrent downloads for the same genId are deduplicated', async () => {
    let resolveFirst: (v: { uri: string }) => void;
    const firstPromise = new Promise<{ uri: string }>((resolve) => {
      resolveFirst = resolve;
    });
    mockDownloadAsync.mockReturnValueOnce(firstPromise);

    const p1 = downloadAndCache('sess-adv', 'dup-id-12345678', 'https://remote/a.jpg', meta);
    const p2 = downloadAndCache('sess-adv', 'dup-id-12345678', 'https://remote/a.jpg', meta);

    resolveFirst!({ uri: 'file:///cache/gen_dup-id-1.jpg' });
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(mockDownloadAsync).toHaveBeenCalledOnce();
    expect(r2).toBe('https://remote/a.jpg');
  });

  it('stores metadata alongside the cached generation', async () => {
    mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/gen_meta1234.jpg' });

    await downloadAndCache('sess-adv', 'meta1234-5678', 'https://remote/b.jpg', {
      style_group: 2,
      angle: 'side',
      style_label: 'ボブカット',
      reference_type: 'pinterest',
      simulation_mode: 'style',
    });

    const cached = getCachedGenerations('sess-adv');
    expect(cached).toHaveLength(1);
    expect(cached[0].style_label).toBe('ボブカット');
    expect(cached[0].reference_type).toBe('pinterest');
    expect(cached[0].simulation_mode).toBe('style');
    expect(cached[0].angle).toBe('side');
    expect(cached[0].style_group).toBe(2);
  });

  it('sets is_favorite to false by default on cache', async () => {
    mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/gen_fav_test.jpg' });

    await downloadAndCache('sess-adv', 'fav_test-5678', 'https://remote/c.jpg', meta);

    const cached = getCachedGenerations('sess-adv');
    expect(cached[0].is_favorite).toBe(false);
  });

  it('preserves is_favorite from meta when provided', async () => {
    mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/gen_fav_true.jpg' });

    await downloadAndCache('sess-adv', 'favtrue0-5678', 'https://remote/d.jpg', {
      ...meta,
      is_favorite: true,
    });

    const cached = getCachedGenerations('sess-adv');
    expect(cached[0].is_favorite).toBe(true);
  });

  it('preserves cached generations across multiple downloads', async () => {
    mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/gen_first.jpg' });
    await downloadAndCache('sess-adv', 'first000-1234', 'https://remote/1.jpg', { style_group: 1, angle: 'front' });

    mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/gen_second.jpg' });
    await downloadAndCache('sess-adv', 'second00-5678', 'https://remote/2.jpg', { style_group: 1, angle: 'side' });

    const cached = getCachedGenerations('sess-adv');
    expect(cached).toHaveLength(2);
    expect(cached[0].angle).toBe('front');
    expect(cached[1].angle).toBe('side');
  });

  it('updateCachedFavorite does not affect other generations', () => {
    setCachedGeneration('sess-adv', {
      id: 'g1', style_group: 1, angle: 'front',
      localUri: 'f1', status: 'completed', is_favorite: false, remoteUrl: 'r1',
    });
    setCachedGeneration('sess-adv', {
      id: 'g2', style_group: 1, angle: 'side',
      localUri: 'f2', status: 'completed', is_favorite: false, remoteUrl: 'r2',
    });

    updateCachedFavorite('sess-adv', 'g1', true);

    const cached = getCachedGenerations('sess-adv');
    expect(cached.find((g) => g.id === 'g1')!.is_favorite).toBe(true);
    expect(cached.find((g) => g.id === 'g2')!.is_favorite).toBe(false);
  });

  it('download failure does not leave stale entries in the cache', async () => {
    mockDownloadAsync.mockRejectedValue(new Error('network error'));

    await downloadAndCache('sess-adv', 'fail1234-5678', 'https://remote/fail.jpg', meta);

    const cached = getCachedGenerations('sess-adv');
    expect(cached).toHaveLength(0);
  });

  it('clearSessionCache allows re-download of previously cached items', async () => {
    mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/gen_clear.jpg' });
    await downloadAndCache('sess-adv', 'clear000-1234', 'https://remote/x.jpg', meta);
    expect(getCachedGenerations('sess-adv')).toHaveLength(1);

    clearSessionCache('sess-adv');
    expect(getCachedGenerations('sess-adv')).toHaveLength(0);

    mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/gen_clear2.jpg' });
    await downloadAndCache('sess-adv', 'clear000-1234', 'https://remote/x.jpg', meta);
    expect(getCachedGenerations('sess-adv')).toHaveLength(1);
  });
});
