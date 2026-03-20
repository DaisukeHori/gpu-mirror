import { z } from 'zod';

const simulationModeSchema = z.enum(['style', 'color', 'style_and_color']);
const referenceTypeSchema = z.enum(['catalog', 'upload', 'pinterest', 'color_only']);
const angleSchema = z.enum(['front', 'three_quarter', 'side', 'back', 'glamour']);

export const styleInputSchema = z
  .object({
    simulation_mode: simulationModeSchema,
    reference_type: referenceTypeSchema,
    reference_photo_path: z.string().optional(),
    reference_source_url: z.string().url().optional(),
    catalog_item_id: z.string().uuid().optional(),
    hair_color_id: z.string().uuid().optional(),
    hair_color_custom: z.string().optional(),
    style_label: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.reference_type === 'color_only') return true;
      return !!data.reference_photo_path || !!data.catalog_item_id;
    },
    { message: 'reference_photo_path or catalog_item_id is required for non-color-only styles' },
  );

export const generateRequestSchema = z.object({
  session_id: z.string().uuid(),
  styles: z.array(styleInputSchema).min(1).max(10),
  custom_instruction: z.string().max(500).optional(),
  previous_style_group: z.number().int().positive().optional(),
  angles: z.array(angleSchema).min(1).default(['front', 'three_quarter', 'side', 'back', 'glamour']),
});

export const proxyImageSchema = z.object({
  url: z.string().url(),
  session_id: z.string().uuid(),
});

export const updateGenerationSchema = z.object({
  is_favorite: z.boolean().optional(),
  is_selected: z.boolean().optional(),
});
