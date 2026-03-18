import type {
  SessionGeneration,
  ReferenceType,
} from '@revol-mirror/shared';

export interface SelectedStyle {
  id: string;
  thumbnailUrl: string;
  storagePath: string;
  label: string;
  referenceType: ReferenceType;
  catalogItemId?: string;
  colorId?: string;
  colorName?: string;
  colorHex?: string;
  sourceUrl?: string;
}

export type Generation = Pick<
  SessionGeneration,
  | 'id'
  | 'style_group'
  | 'angle'
  | 'generated_photo_path'
  | 'status'
  | 'style_label'
  | 'is_favorite'
  | 'simulation_mode'
  | 'is_selected'
> & {
  photo_url: string | null;
};
