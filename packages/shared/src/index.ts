export type {
  Staff,
  CatalogCategory,
  CatalogItem,
  HairColor,
  Session,
  SessionGeneration,
  Database,
  StaffRole,
  Gender,
  SimulationMode,
  ReferenceType,
  Angle,
  GenerationStatus,
  ColorFamily,
} from './types/database';

export type {
  CreateSessionRequest,
  CreateSessionResponse,
  ListSessionsRequest,
  ListSessionsResponse,
  GetSessionResponse,
  UpdateSessionRequest,
  StyleInput,
  GenerateRequest,
  GenerationEvent,
  GenerationEventType,
  ProxyImageRequest,
  ProxyImageResponse,
  UploadImageRequest,
  UploadImageResponse,
  CatalogListResponse,
  ColorsListResponse,
  ApiError,
} from './types/api';

export type { HubSpotContactProperties, HubSpotTimelineEvent } from './types/hubspot';

export { ANGLES, ANGLE_LABELS, ANGLE_INSTRUCTIONS } from './constants/angles';
export { buildPrompt, COST_PER_IMAGE_USD } from './constants/prompts';
export type { PromptParams } from './constants/prompts';
export { COLOR_FAMILIES, HAIR_COLOR_SEEDS } from './constants/hair-colors';
export { DARK_THEME, LIGHT_THEME, RADIUS, ANIMATION, BORDER_WIDTH } from './constants/design-tokens';
export type { DesignTheme } from './constants/design-tokens';

export { createSessionSchema, updateSessionSchema, listSessionsSchema } from './validators/session';
export { generateRequestSchema, styleInputSchema, proxyImageSchema, updateGenerationSchema } from './validators/generate';
export {
  createCatalogItemSchema,
  updateCatalogItemSchema,
  catalogQuerySchema,
} from './validators/catalog';
