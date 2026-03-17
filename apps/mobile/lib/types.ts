export interface SelectedStyle {
  id: string;
  thumbnailUrl: string;
  storagePath: string;
  label: string;
  referenceType: 'catalog' | 'upload' | 'pinterest' | 'color_only';
  catalogItemId?: string;
  colorId?: string;
  colorName?: string;
  sourceUrl?: string;
}

export interface Generation {
  id: string;
  style_group: number;
  angle: string;
  generated_photo_path: string | null;
  photo_url: string | null;
  status: string;
  style_label: string | null;
  is_favorite: boolean;
  simulation_mode?: string;
  is_selected?: boolean;
}
