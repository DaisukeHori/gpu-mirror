import type { Angle, SimulationMode, ReferenceType, Session, SessionGeneration } from './database';

export interface CreateSessionRequest {
  store_code?: string;
  customer_photo_path: string;
}

export interface CreateSessionResponse {
  session: Session;
}

export interface ListSessionsRequest {
  page?: number;
  limit?: number;
}

export interface ListSessionsResponse {
  sessions: (Session & {
    generation_count: number;
    first_front_photo?: string;
  })[];
  total: number;
  page: number;
  limit: number;
}

export interface GetSessionResponse {
  session: Session & {
    generations: SessionGeneration[];
  };
}

export interface UpdateSessionRequest {
  is_closed?: boolean;
  customer_photo_path?: string;
}

export interface StyleInput {
  simulation_mode: SimulationMode;
  reference_type: ReferenceType;
  reference_photo_path?: string;
  reference_source_url?: string;
  catalog_item_id?: string;
  hair_color_id?: string;
  hair_color_custom?: string;
  style_label?: string;
}

export interface GenerateRequest {
  session_id: string;
  styles: StyleInput[];
  angles?: Angle[];
}

export type GenerationEventType = 'generation_completed' | 'generation_failed' | 'all_completed';

export interface GenerationEvent {
  type: GenerationEventType;
  generation_id?: string;
  style_group?: number;
  angle?: string;
  photo_url?: string;
  storage_path?: string;
  ai_latency_ms?: number;
  error?: string;
}

export interface ProxyImageRequest {
  url: string;
  session_id: string;
}

export interface ProxyImageResponse {
  storage_path: string;
  url: string;
}

export interface UploadImageRequest {
  session_id: string;
  bucket: 'customer-photos' | 'reference-photos';
}

export interface UploadImageResponse {
  storage_path: string;
  url: string;
}

export interface CatalogListResponse {
  items: (import('./database').CatalogItem & {
    category?: import('./database').CatalogCategory;
  })[];
  total: number;
}

export interface ColorsListResponse {
  colors: import('./database').HairColor[];
}

export interface ApiError {
  error: string;
  message: string;
  status: number;
}
