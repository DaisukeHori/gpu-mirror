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

type AutoFields = 'id' | 'created_at' | 'updated_at';

type InsertRow<T, OptionalKeys extends keyof T = never> = Omit<T, AutoFields | OptionalKeys> & Partial<Pick<T, OptionalKeys | Extract<AutoFields, keyof T>>>;

export interface Database {
  public: {
    Tables: {
      staffs: {
        Row: Staff;
        Insert: InsertRow<Staff, 'auth_user_id' | 'entra_id_oid' | 'store_code' | 'hubspot_owner_id' | 'is_active'>;
        Update: Partial<Staff>;
        Relationships: [];
      };
      catalog_categories: {
        Row: CatalogCategory;
        Insert: InsertRow<CatalogCategory, 'icon_name' | 'is_active' | 'sort_order'>;
        Update: Partial<CatalogCategory>;
        Relationships: [];
      };
      catalog_items: {
        Row: CatalogItem;
        Insert: InsertRow<CatalogItem, 'category_id' | 'description' | 'thumbnail_path' | 'tags' | 'gender' | 'popularity' | 'is_active' | 'created_by' | 'category'>;
        Update: Partial<CatalogItem>;
        Relationships: [];
      };
      hair_colors: {
        Row: HairColor;
        Insert: InsertRow<HairColor, 'name_en' | 'level' | 'is_active' | 'sort_order'>;
        Update: Partial<HairColor>;
        Relationships: [];
      };
      sessions: {
        Row: Session;
        Insert: InsertRow<Session, 'store_code' | 'ai_model' | 'is_closed' | 'closed_at' | 'hubspot_contact_id' | 'hubspot_deal_id' | 'generations'>;
        Update: Partial<Session>;
        Relationships: [];
      };
      session_generations: {
        Row: SessionGeneration;
        Insert: InsertRow<SessionGeneration, 'reference_photo_path' | 'reference_source_url' | 'catalog_item_id' | 'hair_color_id' | 'hair_color_custom' | 'style_label' | 'generated_photo_path' | 'ai_prompt' | 'ai_latency_ms' | 'ai_cost_usd' | 'is_favorite' | 'is_selected'>;
        Update: Partial<SessionGeneration>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      staff_role: StaffRole;
      gender: Gender;
      simulation_mode: SimulationMode;
      reference_type: ReferenceType;
      angle: Angle;
      generation_status: GenerationStatus;
      color_family: ColorFamily;
    };
    CompositeTypes: Record<string, never>;
  };
}
