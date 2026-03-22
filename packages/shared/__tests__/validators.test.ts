import { describe, it, expect } from 'vitest';
import {
  generateRequestSchema,
  styleInputSchema,
  proxyImageSchema,
  updateGenerationSchema,
  createSessionSchema,
  updateSessionSchema,
  listSessionsSchema,
} from '../src/validators/generate';
import {
  createSessionSchema as sessCreate,
  updateSessionSchema as sessUpdate,
  listSessionsSchema as sessList,
} from '../src/validators/session';
import {
  getSessionResponseSchema,
  listSessionsResponseSchema,
  createSessionResponseSchema,
  uploadImageResponseSchema,
  colorsListResponseSchema,
  generationEventSchema,
} from '../src/validators/responses';

describe('generateRequestSchema', () => {
  it('accepts a valid request', () => {
    const result = generateRequestSchema.safeParse({
      session_id: '550e8400-e29b-41d4-a716-446655440000',
      styles: [{ simulation_mode: 'style', reference_type: 'upload', reference_photo_path: 'path/img.jpg' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing session_id', () => {
    const result = generateRequestSchema.safeParse({
      styles: [{ simulation_mode: 'style', reference_type: 'upload', reference_photo_path: 'x' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty styles', () => {
    const result = generateRequestSchema.safeParse({
      session_id: '550e8400-e29b-41d4-a716-446655440000',
      styles: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts color_only without reference_photo_path', () => {
    const result = generateRequestSchema.safeParse({
      session_id: '550e8400-e29b-41d4-a716-446655440000',
      styles: [{ simulation_mode: 'color', reference_type: 'color_only', hair_color_custom: 'red' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-color_only without reference_photo_path or catalog_item_id', () => {
    const result = styleInputSchema.safeParse({
      simulation_mode: 'style',
      reference_type: 'upload',
    });
    expect(result.success).toBe(false);
  });
});

describe('proxyImageSchema', () => {
  it('accepts a valid request', () => {
    const result = proxyImageSchema.safeParse({
      url: 'https://i.pinimg.com/originals/abc.jpg',
      session_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid URL', () => {
    const result = proxyImageSchema.safeParse({
      url: 'not-a-url',
      session_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing session_id', () => {
    const result = proxyImageSchema.safeParse({
      url: 'https://example.com/img.jpg',
    });
    expect(result.success).toBe(false);
  });
});

describe('session schemas', () => {
  it('createSessionSchema accepts valid input', () => {
    const result = sessCreate.safeParse({ customer_photo_path: 'pending' });
    expect(result.success).toBe(true);
  });

  it('updateSessionSchema accepts is_closed', () => {
    const result = sessUpdate.safeParse({ is_closed: true });
    expect(result.success).toBe(true);
  });

  it('listSessionsSchema defaults page and limit', () => {
    const result = sessList.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBeDefined();
      expect(result.data.limit).toBeDefined();
    }
  });
});

describe('response schemas', () => {
  it('getSessionResponseSchema validates a well-formed response', () => {
    const result = getSessionResponseSchema.safeParse({
      session: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        staff_id: '550e8400-e29b-41d4-a716-446655440001',
        customer_photo_path: 'path/photo.jpg',
        is_closed: false,
        closed_at: null,
        created_at: '2026-03-20T00:00:00Z',
        session_generations: [
          {
            id: '550e8400-e29b-41d4-a716-446655440002',
            style_group: 1,
            angle: 'front',
            status: 'completed',
            photo_url: 'https://signed/url',
            is_favorite: false,
          },
        ],
        customer_photo_url: 'https://signed/customer',
      },
    });
    expect(result.success).toBe(true);
  });

  it('getSessionResponseSchema rejects missing session_generations', () => {
    const result = getSessionResponseSchema.safeParse({
      session: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        staff_id: '550e8400-e29b-41d4-a716-446655440001',
        customer_photo_path: 'path/photo.jpg',
        is_closed: false,
        closed_at: null,
        created_at: '2026-03-20T00:00:00Z',
        customer_photo_url: null,
      },
    });
    expect(result.success).toBe(false);
  });

  it('uploadImageResponseSchema validates', () => {
    const result = uploadImageResponseSchema.safeParse({
      storage_path: 'sess-1/photo.jpg',
      url: 'https://signed/url',
    });
    expect(result.success).toBe(true);
  });

  it('uploadImageResponseSchema rejects empty url', () => {
    const result = uploadImageResponseSchema.safeParse({
      storage_path: 'sess-1/photo.jpg',
    });
    expect(result.success).toBe(false);
  });

  it('colorsListResponseSchema validates', () => {
    const result = colorsListResponseSchema.safeParse({
      colors: [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Brown', hex_code: '#8B4513' }],
    });
    expect(result.success).toBe(true);
  });

  it('generationEventSchema validates completion event', () => {
    const result = generationEventSchema.safeParse({
      type: 'generation_completed',
      generation_id: 'gen-1',
      style_group: 1,
      angle: 'front',
      photo_url: 'https://gen/url',
    });
    expect(result.success).toBe(true);
  });

  it('generationEventSchema validates failure event', () => {
    const result = generationEventSchema.safeParse({
      type: 'generation_failed',
      generation_id: 'gen-2',
      error: 'Timeout',
    });
    expect(result.success).toBe(true);
  });
});
