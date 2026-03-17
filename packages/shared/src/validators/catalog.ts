import { z } from 'zod';

export const createCatalogItemSchema = z.object({
  category_id: z.string().uuid().optional(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  image_path: z.string().min(1),
  thumbnail_path: z.string().optional(),
  tags: z.array(z.string()).default([]),
  gender: z.enum(['female', 'male', 'unisex']).default('unisex'),
});

export const updateCatalogItemSchema = createCatalogItemSchema.partial();

export const catalogQuerySchema = z.object({
  category_id: z.string().uuid().optional(),
  gender: z.enum(['female', 'male', 'unisex']).optional(),
  search: z.string().optional(),
  sort: z.enum(['popularity', 'created_at']).default('popularity'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
