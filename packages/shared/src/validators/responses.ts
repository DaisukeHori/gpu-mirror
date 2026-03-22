import { z } from 'zod';

export const sessionSchema = z.object({
  id: z.string().uuid(),
  staff_id: z.string().uuid(),
  customer_photo_path: z.string(),
  is_closed: z.boolean(),
  closed_at: z.string().nullable(),
  created_at: z.string(),
});

export const sessionGenerationSchema = z.object({
  id: z.string().uuid(),
  style_group: z.number().int(),
  angle: z.string(),
  status: z.string(),
  photo_url: z.string().nullable(),
  is_favorite: z.boolean(),
});

export const getSessionResponseSchema = z.object({
  session: sessionSchema.extend({
    session_generations: z.array(sessionGenerationSchema),
    customer_photo_url: z.string().nullable(),
  }),
});

export const listSessionsResponseSchema = z.object({
  sessions: z.array(
    sessionSchema.extend({
      generation_count: z.number().int(),
      first_front_photo: z.string().nullable(),
    }).passthrough(),
  ),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export const createSessionResponseSchema = z.object({
  session: sessionSchema.passthrough(),
});

export const uploadImageResponseSchema = z.object({
  storage_path: z.string(),
  url: z.string(),
});

export const colorsListResponseSchema = z.object({
  colors: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      hex_code: z.string(),
    }).passthrough(),
  ),
});

export const generationEventSchema = z.object({
  type: z.string(),
  generation_id: z.string().optional(),
  style_group: z.number().optional(),
  angle: z.string().optional(),
  photo_url: z.string().optional(),
  storage_path: z.string().optional(),
  ai_latency_ms: z.number().optional(),
  error: z.string().optional(),
});
