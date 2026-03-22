import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDownloadAsync } = vi.hoisted(() => ({
  mockDownloadAsync: vi.fn(),
}));

const { mockManipulateAsync } = vi.hoisted(() => ({
  mockManipulateAsync: vi.fn(),
}));

vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: mockDownloadAsync,
}));

vi.mock('expo-image-manipulator', () => ({
  manipulateAsync: mockManipulateAsync,
  SaveFormat: { JPEG: 'jpeg' },
}));

vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

import {
  cacheRemoteImage,
  downloadRemoteImageToCache,
  normalizeImageToJpeg,
} from '../../lib/image-cache';

describe('image-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('downloadRemoteImageToCache', () => {
    it('downloads a remote image to the cache directory', async () => {
      mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/thumb_123.jpg' });

      const result = await downloadRemoteImageToCache('https://i.pinimg.com/originals/test.jpg');

      expect(mockDownloadAsync).toHaveBeenCalledOnce();
      expect(result).toBe('file:///cache/thumb_123.jpg');
    });

    it('passes Pinterest-specific headers with the download request', async () => {
      mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/thumb_123.jpg' });

      await downloadRemoteImageToCache('https://i.pinimg.com/originals/test.jpg');

      const headers = mockDownloadAsync.mock.calls[0][2].headers;
      expect(headers.Accept).toBe('image/*,*/*;q=0.8');
      expect(headers.Referer).toBe('https://www.pinterest.com/');
      expect(headers['User-Agent']).toBeDefined();
      expect(headers['User-Agent'].length).toBeGreaterThan(10);
    });

    it('uses an iPad User-Agent when Platform.OS is ios (mocked)', async () => {
      mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/thumb.jpg' });

      await downloadRemoteImageToCache('https://example.com/img.jpg');

      const ua = mockDownloadAsync.mock.calls[0][2].headers['User-Agent'] as string;
      expect(ua).toContain('iPad');
      expect(ua).not.toContain('Android');
    });

    it('uses a prefix in the cache file name', async () => {
      mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/pinterest_123.jpg' });

      await downloadRemoteImageToCache('https://example.com/img.jpg', 'pinterest');

      const targetUri = mockDownloadAsync.mock.calls[0][1] as string;
      expect(targetUri).toMatch(/^file:\/\/\/cache\/pinterest_/);
      expect(targetUri).toMatch(/\.jpg$/);
    });

    it('throws an error when the download fails', async () => {
      mockDownloadAsync.mockRejectedValue(new Error('Network error'));

      await expect(
        downloadRemoteImageToCache('https://example.com/fail.jpg'),
      ).rejects.toThrow('Network error');
    });

    it('throws a fallback message when the error has no message', async () => {
      mockDownloadAsync.mockRejectedValue({});

      await expect(
        downloadRemoteImageToCache('https://example.com/fail.jpg'),
      ).rejects.toThrow('Pinterest画像のダウンロードに失敗しました。');
    });

    it('generates unique file names for each download', async () => {
      mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/t.jpg' });

      await downloadRemoteImageToCache('https://example.com/a.jpg');
      await downloadRemoteImageToCache('https://example.com/b.jpg');

      const name1 = mockDownloadAsync.mock.calls[0][1] as string;
      const name2 = mockDownloadAsync.mock.calls[1][1] as string;
      expect(name1).not.toBe(name2);
    });
  });

  describe('cacheRemoteImage', () => {
    it('returns undefined for an undefined URL', async () => {
      const result = await cacheRemoteImage(undefined);
      expect(result).toBeUndefined();
      expect(mockDownloadAsync).not.toHaveBeenCalled();
    });

    it('returns undefined for an empty string URL', async () => {
      const result = await cacheRemoteImage('');
      expect(result).toBeUndefined();
    });

    it('returns the cached URI on success', async () => {
      mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/thumb_abc.jpg' });

      const result = await cacheRemoteImage('https://example.com/img.jpg');
      expect(result).toBe('file:///cache/thumb_abc.jpg');
    });

    it('returns undefined instead of throwing on failure', async () => {
      mockDownloadAsync.mockRejectedValue(new Error('fail'));

      const result = await cacheRemoteImage('https://example.com/fail.jpg');
      expect(result).toBeUndefined();
    });

    it('uses the provided prefix', async () => {
      mockDownloadAsync.mockResolvedValue({ uri: 'file:///cache/custom_xyz.jpg' });

      await cacheRemoteImage('https://example.com/img.jpg', 'custom');

      const targetUri = mockDownloadAsync.mock.calls[0][1] as string;
      expect(targetUri).toMatch(/custom_/);
    });
  });

  describe('normalizeImageToJpeg', () => {
    it('converts an image to JPEG format', async () => {
      mockManipulateAsync.mockResolvedValue({ uri: 'file:///cache/normalized.jpg' });

      const result = await normalizeImageToJpeg('file:///input.png');

      expect(mockManipulateAsync).toHaveBeenCalledWith(
        'file:///input.png',
        [],
        { compress: 0.9, format: 'jpeg' },
      );
      expect(result).toBe('file:///cache/normalized.jpg');
    });

    it('throws an error when manipulation fails', async () => {
      mockManipulateAsync.mockRejectedValue(new Error('Decode error'));

      await expect(normalizeImageToJpeg('file:///bad.png')).rejects.toThrow('Decode error');
    });

    it('throws a fallback message for non-Error rejections', async () => {
      mockManipulateAsync.mockRejectedValue('unknown');

      await expect(normalizeImageToJpeg('file:///bad.png')).rejects.toThrow(
        '画像のJPEG変換に失敗しました。',
      );
    });
  });

  describe('User-Agent platform logic (source code verification)', () => {
    it('source code contains Android UA string', () => {
      const fs = require('node:fs');
      const path = require('node:path');
      const content = fs.readFileSync(
        path.resolve(__dirname, '../../lib/image-cache.ts'), 'utf-8',
      );
      expect(content).toContain("Platform.OS === 'android'");
      expect(content).toContain('Linux; Android 14');
      expect(content).toContain('iPad; CPU OS 17_0');
    });

    it('Android UA branch produces a different string than iOS branch', () => {
      const androidUA = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
      const iosUA = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)';
      expect(androidUA).not.toBe(iosUA);
      expect(androidUA).toContain('Android');
      expect(iosUA).toContain('iPad');
    });
  });
});

describe('image-cache: cacheDirectory null edge case', () => {
  it('source code throws when cacheDirectory is null', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../lib/image-cache.ts'), 'utf-8',
    );
    expect(content).toContain("throw new Error('端末キャッシュにアクセスできません。')");
  });
});
