import { z } from 'zod';

export const createSessionSchema = z.object({
  store_code: z.string().optional(),
  customer_photo_path: z.string().min(1),
});

export const updateSessionSchema = z.object({
  is_closed: z.boolean().optional(),
  customer_photo_path: z.string().min(1).optional(),
});

export const listSessionsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
