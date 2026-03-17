export const ANGLES = ['front', 'three_quarter', 'side', 'back', 'glamour'] as const;

export type Angle = (typeof ANGLES)[number];

export const ANGLE_LABELS: Record<Angle, string> = {
  front: '正面',
  three_quarter: '斜め',
  side: '横',
  back: '後ろ',
  glamour: '映え',
};
