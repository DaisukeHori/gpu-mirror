import sharp from 'sharp';

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 85;
const THUMBNAIL_SIZE = 300;

export async function resizeImage(buffer: Buffer, maxDimension = MAX_DIMENSION): Promise<Buffer> {
  try {
    return await sharp(buffer, { failOn: 'none' })
      .rotate()
      .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    throw new Error(`画像の処理に失敗しました (${msg})`);
  }
}

export async function createThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer, { failOn: 'none' })
    .rotate()
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
    .jpeg({ quality: 75 })
    .toBuffer();
}

export function validateImageSize(sizeBytes: number): boolean {
  const maxSizeMb = parseInt(process.env.IMAGE_MAX_SIZE_MB ?? '10', 10);
  return sizeBytes <= maxSizeMb * 1024 * 1024;
}
