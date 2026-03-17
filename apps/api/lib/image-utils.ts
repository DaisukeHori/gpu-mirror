import sharp from 'sharp';

const MAX_DIMENSION = 1536;
const JPEG_QUALITY = 85;
const THUMBNAIL_SIZE = 300;

export async function resizeImage(buffer: Buffer, maxDimension = MAX_DIMENSION): Promise<Buffer> {
  return sharp(buffer)
    .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}

export async function createThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: 'cover' })
    .jpeg({ quality: 75 })
    .toBuffer();
}

export function validateImageSize(sizeBytes: number): boolean {
  const maxSizeMb = parseInt(process.env.IMAGE_MAX_SIZE_MB ?? '10', 10);
  return sizeBytes <= maxSizeMb * 1024 * 1024;
}
