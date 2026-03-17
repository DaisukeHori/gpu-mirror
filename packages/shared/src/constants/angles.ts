import type { Angle } from '../types/database';

export const ANGLES: Angle[] = ['front', 'three_quarter', 'side', 'back', 'glamour'];

export const ANGLE_LABELS: Record<Angle, string> = {
  front: '正面',
  three_quarter: '斜め',
  side: '横',
  back: '後ろ',
  glamour: '📸映え',
};

export const ANGLE_INSTRUCTIONS: Record<Angle, string> = {
  front: 'Show the person from the front, looking directly at the camera.',
  three_quarter:
    'Show the person from a three-quarter angle, face slightly turned to the side.',
  side: 'Show the person in a side profile view.',
  back: 'Show the person from behind, displaying the full back view of the hairstyle.',
  glamour:
    'Create a professional beauty editorial portrait with soft bokeh background, beautiful studio lighting, and a magazine-quality aesthetic.',
};
