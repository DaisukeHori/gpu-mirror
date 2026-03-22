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

describe('generation-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionCache('sess-1');
    clearSessionCache('sess-2');
  });

  describe('getCachedGenerations', () => {
    it('returns an empty array for an unknown session', () => {
      expect(getCachedGenerations('unknown')).toEqual([]);
    });

    it('returns cached generations for a known session', () => {
      setCachedGeneration('sess-1', {
        id: 'g1',
        style_group: 1,
        angle: 'front',
        localUri: 'file:///cache/g1.jpg',
        status: 'completed',
        is_favorite: false,
        remoteUrl: 'https://remote/g1.jpg',
      });

      const result = getCachedGenerations('sess-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('g1');
    });
  });

  describe('setCachedGeneration', () => {
    it('adds a new generation to the cache', () => {
      setCachedGeneration('sess-1', {
        id: 'g1',
        style_group: 1,
        angle: 'front',
        localUri: 'file:///cache/g1.jpg',
        status: 'completed',
        is_favorite: false,
        remoteUrl: 'https://remote/g1.jpg',
      });

      expect(getCachedGenerations('sess-1')).toHaveLength(1);
    });

    it('updates an existing generation in place', () => {
      setCachedGeneration('sess-1', {
        id: 'g1',
        style_group: 1,
        angle: 'front',
        localUri: 'file:///cache/g1_old.jpg',
        status: 'completed',
        is_favorite: false,
        remoteUrl: 'https://remote/g1.jpg',
      });

      setCachedGeneration('sess-1', {
        id: 'g1',
        style_group: 1,
        angle: 'front',
        localUri: 'file:///cache/g1_new.jpg',
        status: 'completed',
        is_favorite: true,
        remoteUrl: 'https://remote/g1.jpg',
      });

      const gens = getCachedGenerations('sess-1');
      expect(gens).toHaveLength(1);
      expect(gens[0].localUri).toBe('file:///cache/g1_new.jpg');
      expect(gens[0].is_favorite).toBe(true);
    });

    it('keeps separate caches per session', () => {
      setCachedGeneration('sess-1', {
        id: 'g1', style_group: 1, angle: 'front',
        localUri: 'f', status: 'completed', is_favorite: false, remoteUrl: 'r',
      });
      setCachedGeneration('sess-2', {
        id: 'g2', style_group: 1, angle: 'side',
        localUri: 'f2', status: 'completed', is_favorite: false, remoteUrl: 'r2',
      });

      expect(getCachedGenerations('sess-1')).toHaveLength(1);
      expect(getCachedGenerations('sess-2')).toHaveLength(1);
      expect(getCachedGenerations('sess-1')[0].id).toBe('g1');
      expect(getCachedGenerations('sess-2')[0].id).toBe('g2');
    });
  });

  describe('updateCachedFavorite', () => {
    it('updates the is_favorite flag of a cached generation', () => {
      setCachedGeneration('sess-1', {
        id: 'g1', style_group: 1, angle: 'front',
        localUri: 'f', status: 'completed', is_favorite: false, remoteUrl: 'r',
      });

      updateCachedFavorite('sess-1', 'g1', true);
      expect(getCachedGenerations('sess-1')[0].is_favorite).toBe(true);
    });

    it('does nothing for a non-existent generation', () => {
      updateCachedFavorite('sess-1', 'nonexistent', true);
      expect(getCachedGenerations('sess-1')).toHaveLength(0);
    });

    it('toggles favorite back and forth', () => {
      setCachedGeneration('sess-1', {
        id: 'g1', style_group: 1, angle: 'front',
        localUri: 'f', status: 'completed', is_favorite: false, remoteUrl: 'r',
      });

      updateCachedFavorite('sess-1', 'g1', true);
      expect(getCachedGenerations('sess-1')[0].is_favorite).toBe(true);

      updateCachedFavorite('sess-1', 'g1', false);
      expect(getCachedGenerations('sess-1')[0].is_favorite).toBe(false);
    });
  });

  describe('downloadAndCache', () => {
    const meta = { style_group: 1, angle: 'front' };

    it('downloads and caches a remote image', async () => {
      mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/gen_abcdefgh.jpg' });

      const result = await downloadAndCache('sess-1', 'abcdefgh-1234', 'https://remote/g.jpg', meta);

      expect(mockDownloadAsync).toHaveBeenCalledOnce();
      expect(result).toBe('file:///cache/gen_abcdefgh.jpg');
      expect(getCachedGenerations('sess-1')).toHaveLength(1);
    });

    it('returns the cached localUri if already downloaded', async () => {
      mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/gen_abcdefgh.jpg' });
      await downloadAndCache('sess-1', 'abcdefgh-1234', 'https://remote/g.jpg', meta);

      const result = await downloadAndCache('sess-1', 'abcdefgh-1234', 'https://remote/g.jpg', meta);
      expect(result).toBe('file:///cache/gen_abcdefgh.jpg');
      expect(mockDownloadAsync).toHaveBeenCalledOnce();
    });

    it('returns the remote URL on download failure', async () => {
      mockDownloadAsync.mockRejectedValue(new Error('download failed'));

      const result = await downloadAndCache('sess-1', 'fail-id-1234', 'https://remote/fail.jpg', meta);
      expect(result).toBe('https://remote/fail.jpg');
    });

    it('uses the first 8 chars of genId in the filename', async () => {
      mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/gen_12345678.jpg' });

      await downloadAndCache('sess-1', '12345678-abcd-efgh', 'https://remote/g.jpg', meta);

      const targetUri = mockDownloadAsync.mock.calls[0][1] as string;
      expect(targetUri).toContain('gen_12345678');
    });
  });

  describe('clearSessionCache', () => {
    it('removes all cached generations for a session', () => {
      setCachedGeneration('sess-1', {
        id: 'g1', style_group: 1, angle: 'front',
        localUri: 'f', status: 'completed', is_favorite: false, remoteUrl: 'r',
      });

      clearSessionCache('sess-1');
      expect(getCachedGenerations('sess-1')).toEqual([]);
    });

    it('does not affect other sessions', () => {
      setCachedGeneration('sess-1', {
        id: 'g1', style_group: 1, angle: 'front',
        localUri: 'f', status: 'completed', is_favorite: false, remoteUrl: 'r',
      });
      setCachedGeneration('sess-2', {
        id: 'g2', style_group: 1, angle: 'side',
        localUri: 'f2', status: 'completed', is_favorite: false, remoteUrl: 'r2',
      });

      clearSessionCache('sess-1');
      expect(getCachedGenerations('sess-1')).toEqual([]);
      expect(getCachedGenerations('sess-2')).toHaveLength(1);
    });
  });
});
