import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockUploadFile,
  mockDownloadRemoteImageToCache,
} = vi.hoisted(() => ({
  mockUploadFile: vi.fn(),
  mockDownloadRemoteImageToCache: vi.fn(),
}));

vi.mock('../../lib/api', () => ({
  uploadFile: mockUploadFile,
}));

vi.mock('../../lib/image-cache', () => ({
  downloadRemoteImageToCache: mockDownloadRemoteImageToCache,
}));

import { importPinterestImage } from '../../hooks/usePinterest';

describe('importPinterestImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('downloads locally before uploading to reference storage', async () => {
    mockDownloadRemoteImageToCache.mockResolvedValue('file://cache/pinterest.jpg');
    mockUploadFile.mockResolvedValue({
      storage_path: 'sess-1/ref.jpg',
      url: 'https://signed/ref-url',
    });

    const result = await importPinterestImage(
      'https://i.pinimg.com/originals/ab/cd/example.jpg',
      'sess-1',
    );

    expect(mockDownloadRemoteImageToCache).toHaveBeenCalledWith(
      'https://i.pinimg.com/originals/ab/cd/example.jpg',
      'pinterest',
    );
    expect(mockUploadFile).toHaveBeenCalledWith(
      '/api/upload',
      {
        uri: 'file://cache/pinterest.jpg',
        name: expect.stringMatching(/^pinterest_\d+\.jpg$/),
        type: 'image/jpeg',
      },
      'sess-1',
      'reference-photos',
    );
    expect(result).toEqual({
      url: 'https://i.pinimg.com/originals/ab/cd/example.jpg',
      storagePath: 'sess-1/ref.jpg',
      signedUrl: 'https://signed/ref-url',
      localFileUri: 'file://cache/pinterest.jpg',
    });
  });

  it('throws when local download fails', async () => {
    mockDownloadRemoteImageToCache.mockRejectedValue(
      new Error('Pinterest画像のダウンロードに失敗しました。'),
    );

    await expect(
      importPinterestImage('https://i.pinimg.com/originals/ab/cd/example.jpg', 'sess-1'),
    ).rejects.toThrow('Pinterest画像のダウンロードに失敗しました');

    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('throws when upload fails', async () => {
    mockDownloadRemoteImageToCache.mockResolvedValue('file://cache/pinterest.jpg');
    mockUploadFile.mockRejectedValue(new Error('Upload error: 500'));

    await expect(
      importPinterestImage('https://i.pinimg.com/originals/ab/cd/example.jpg', 'sess-1'),
    ).rejects.toThrow('画像のアップロードに失敗しました');
  });
});
