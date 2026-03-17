export type StaffRole = 'admin' | 'manager' | 'stylist';
export type Gender = 'female' | 'male' | 'unisex';
export type SimulationMode = 'style' | 'color' | 'style_and_color';
export type ReferenceType = 'catalog' | 'upload' | 'pinterest' | 'color_only';
export type Angle = 'front' | 'three_quarter' | 'side' | 'back' | 'glamour';
export type GenerationStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type ColorFamily =
  | 'ブラック系'
  | 'ブラウン系'
  | 'ベージュ系'
  | 'アッシュ系'
  | 'グレー系'
  | 'レッド系'
  | 'ピンク系'
  | 'オレンジ系'
  | 'イエロー系'
  | 'グリーン系'
  | 'ブルー系'
  | 'パープル系'
  | 'ハイトーン系';

export interface Staff {
  id: string;
  auth_user_id: string | null;
  entra_id_oid: string | null;
  display_name: string;
  email: string;
  store_code: string | null;
  role: StaffRole;
  is_active: boolean;
  hubspot_owner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CatalogCategory {
  id: string;
  name: string;
  display_name: string;
  icon_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface CatalogItem {
  id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  image_path: string;
  thumbnail_path: string | null;
  tags: string[];
  gender: Gender;
  popularity: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: CatalogCategory;
}

export interface HairColor {
  id: string;
  name: string;
  name_en: string | null;
  hex_code: string;
  color_family: ColorFamily;
  level: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Session {
  id: string;
  staff_id: string;
  store_code: string | null;
  customer_photo_path: string;
  ai_model: string;
  is_closed: boolean;
  closed_at: string | null;
  hubspot_contact_id: string | null;
  hubspot_deal_id: string | null;
  created_at: string;
  updated_at: string;
  generations?: SessionGeneration[];
}

export interface SessionGeneration {
  id: string;
  session_id: string;
  style_group: number;
  angle: Angle;
  simulation_mode: SimulationMode;
  reference_type: ReferenceType;
  reference_photo_path: string | null;
  reference_source_url: string | null;
  catalog_item_id: string | null;
  hair_color_id: string | null;
  hair_color_custom: string | null;
  style_label: string | null;
  generated_photo_path: string | null;
  ai_prompt: string | null;
  ai_latency_ms: number | null;
  ai_cost_usd: number | null;
  status: GenerationStatus;
  is_favorite: boolean;
  is_selected: boolean;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      staffs: { Row: Staff; Insert: Omit<Staff, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Staff> };
      catalog_categories: { Row: CatalogCategory; Insert: Omit<CatalogCategory, 'id' | 'created_at'>; Update: Partial<CatalogCategory> };
      catalog_items: { Row: CatalogItem; Insert: Omit<CatalogItem, 'id' | 'created_at' | 'updated_at' | 'popularity'>; Update: Partial<CatalogItem> };
      hair_colors: { Row: HairColor; Insert: Omit<HairColor, 'id' | 'created_at'>; Update: Partial<HairColor> };
      sessions: { Row: Session; Insert: Omit<Session, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Session> };
      session_generations: { Row: SessionGeneration; Insert: Omit<SessionGeneration, 'id' | 'created_at'>; Update: Partial<SessionGeneration> };
    };
  };
}
