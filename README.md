# REVOL Mirror

美容室カウンセリング向け AI ヘアスタイルシミュレーションアプリ。お客さんの顔写真に Pinterest / カタログ / アップロード画像の髪型を合成し、5アングル×複数スタイルの比較ギャラリーを生成する iPad ネイティブアプリ。

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  iPad App (Expo + React Native)                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐  │
│  │Welcome │→│Camera  │→│Explore │→│Confirm │→│Generate│→│Result  │→│Welcome │  │
│  │        │ │        │ │Pinterest│ │        │ │  (SSE) │ │Gallery │ │        │  │
│  └────────┘ └────────┘ │Catalog │ └────────┘ └───┬────┘ └───┬────┘ └────────┘  │
│                         │Upload  │                │          │                   │
│                         │Color   │                │          │ Retry / Favorite  │
│                         └────────┘                │          │ Share / Retake    │
├───────────────────────────────── lib/api.ts ──────┼──────────┼──────────────────┤
│  apiGet / apiPost / apiPatch / apiDelete          │          │                   │
│  apiSSE (Server-Sent Events)                      │          │                   │
│  uploadFile (multipart/form-data)                 │          │                   │
└───────────────────────────────────────────────────┼──────────┼──────────────────┘
                           HTTPS                     │          │
┌───────────────────────────────────────────────────┼──────────┼──────────────────┐
│  BFF — Next.js 16 API Routes (Vercel)             │          │                   │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐         │          │                   │
│  │  Auth     │ │  Sessions │ │ Catalog  │         │          │                   │
│  │  (JWT)    │ │  CRUD     │ │ CRUD     │         │          │                   │
│  └──────────┘ └───────────┘ └──────────┘         │          │                   │
│  ┌──────────────────────────┐  ┌──────────────┐   │          │                   │
│  │  /api/generate (SSE)     │←─┤ Concurrency  │   │          │                   │
│  │  ReadableStream          │  │ Limiter (3)  │   │          │                   │
│  │  + Heartbeat (15s)       │  └──────────────┘   │          │                   │
│  └──────────┬───────────────┘                     │          │                   │
│             │                                     │          │                   │
│  ┌──────────▼───────────────┐  ┌──────────────┐   │          │                   │
│  │  AI Gateway              │  │  sharp        │   │          │                   │
│  │  └─ GeminiProvider       │  │  (resize)     │   │          │                   │
│  └──────────┬───────────────┘  └──────────────┘   │          │                   │
│             │                                     │          │                   │
└─────────────┼─────────────────────────────────────┼──────────┼──────────────────┘
              │                                     │          │
    ┌─────────▼─────────┐               ┌──────────▼──────────▼──────────┐
    │  Google Gemini API │               │  Supabase                      │
    │  (Image Gen)       │               │  ├── PostgreSQL (6 tables)     │
    └───────────────────┘               │  ├── Storage (4 buckets)       │
                                        │  └── Auth (SAML SSO via Azure) │
                                        └────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Mobile App | Expo SDK 55 + Expo Router v6 | `expo@55.0.7` |
| UI Framework | NativeWind (Tailwind for RN) | `nativewind@4.2.3` |
| Animations | React Native Reanimated 3 | `4.2.1` |
| Camera | expo-camera | `55.0.10` |
| Image Display | expo-image | `55.0.6` |
| WebView | react-native-webview | `13.16.0` |
| BFF (API) | Next.js API Routes | `next@16.1.7` |
| Database | Supabase (PostgreSQL) | `supabase-js@2.99.2` |
| Storage | Supabase Storage | 4 buckets |
| Auth | Supabase Auth + Azure AD SAML | — |
| AI Engine | Google Gemini API | `@google/genai@1.45.0` |
| Image Processing | sharp | `0.34.5` |
| Validation | zod | `4.3.6` |
| Testing | vitest | `4.1.0` |
| Monorepo | Turborepo | `2.4.0` |

## Repository Structure

```
revol-mirror/
├── apps/
│   ├── mobile/                          # Expo iPad app
│   │   ├── app/                         # File-based routing (Expo Router)
│   │   │   ├── _layout.tsx              # Root layout + AuthProvider
│   │   │   ├── (auth)/login.tsx         # Azure AD SAML login
│   │   │   └── (main)/
│   │   │       ├── _layout.tsx          # Stack navigator (animation config)
│   │   │       ├── index.tsx            # Welcome screen
│   │   │       ├── camera.tsx           # Camera capture
│   │   │       ├── explore.tsx          # Style picker (4 tabs)
│   │   │       ├── confirm.tsx          # Pre-generation review
│   │   │       ├── generating.tsx       # SSE progress tracking
│   │   │       ├── result.tsx           # Comparison gallery + retry UI
│   │   │       └── (admin)/sessions.tsx # Admin session log
│   │   ├── components/                  # Reusable UI components
│   │   ├── hooks/                       # Custom hooks (6 files)
│   │   ├── lib/                         # API client, Supabase, types
│   │   └── __tests__/                   # vitest (28 tests)
│   │
│   └── api/                             # Next.js 16 BFF
│       ├── app/api/                     # API route handlers
│       │   ├── sessions/                # Session CRUD
│       │   │   ├── route.ts             # POST + GET (list)
│       │   │   └── [id]/
│       │   │       ├── route.ts         # GET (detail) + PATCH
│       │   │       └── generations/[genId]/
│       │   │           ├── route.ts     # PATCH (favorite/select)
│       │   │           └── retry/route.ts # POST (retry failed)
│       │   ├── generate/route.ts        # SSE batch generation
│       │   ├── catalog/                 # Catalog CRUD
│       │   ├── colors/route.ts          # Hair color list
│       │   ├── upload/route.ts          # Image upload
│       │   ├── proxy-image/route.ts     # Pinterest image proxy
│       │   └── health/route.ts          # Health check
│       ├── lib/                         # Auth, AI, image utils, concurrency
│       └── __tests__/                   # vitest (47 tests)
│
├── packages/
│   └── shared/                          # @revol-mirror/shared
│       └── src/
│           ├── types/                   # TypeScript types (database, API)
│           ├── validators/              # zod schemas
│           └── constants/               # Prompts, angles, colors, design tokens
│
├── turbo.json
└── package.json
```

## Core Features

### 1. Camera Capture

顔写真をネイティブカメラで撮影し、Supabase Storage にアップロード。

```typescript
// apps/mobile/hooks/useCamera.ts — 撮影 → アップロードフロー
const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
const result = await uploadFile('/api/upload', {
  uri: photo.uri,
  name: 'customer.jpg',
  type: 'image/jpeg',
}, sessionId, 'customer-photos');
```

サーバー側で `sharp` によるリサイズ (最大1536px, JPEG品質85%) + サムネイル生成 (300px):

```typescript
// apps/api/lib/image-utils.ts
export async function resizeImage(buffer: Buffer, maxDimension = 1536): Promise<Buffer> {
  return sharp(buffer)
    .resize(maxDimension, maxDimension, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
}
```

### 2. Style Selection (4 Sources)

| Tab | Source | Implementation |
|-----|--------|---------------|
| Pinterest | `react-native-webview` + JS injection | `PinterestBrowser.tsx` — `postMessage()` で画像URL抽出、`/api/proxy-image` でサーバーサイドダウンロード |
| Catalog | Supabase DB + signed URLs | `CatalogGrid.tsx` — ソート (人気/新着)、カテゴリフィルタ、ページネーション |
| Upload | `expo-image-picker` | `ImageUploader.tsx` → `/api/upload` (reference-photos バケット) |
| Color | `hair_colors` テーブル | `ColorPalette.tsx` — color_family 別グリッド表示 |

選択した複数スタイルは下部トレイ (`StyleTray.tsx`) に横スクロールで表示。タブをまたいだ複数選択可能。

### 3. AI Batch Generation (SSE Streaming)

1スタイルにつき5アングル (正面/斜め/横/後ろ/映え) を並列生成。SSE (Server-Sent Events) で完了順にリアルタイム配信。

```
Client                         Server
──────                         ──────
POST /api/generate ──────────→ Validate + Auth
                               Insert N pending records
                               ←──────────── SSE stream start
                               
                               ConcurrencyLimiter (max 3 parallel)
                               ├── Task: style1/front
                               │   └── Gemini API → Storage → DB update
          generation_completed ←── SSE event
                               ├── Task: style1/three_quarter
          generation_completed ←── SSE event
                               ...
              all_completed    ←── SSE final event
                               ←──────────── stream close
                               
SSE disconnected? ───────────→ Polling fallback (3s interval)
                               GET /api/sessions/:id → check generation statuses
```

**AI Gateway — Provider Pattern:**

```typescript
// apps/api/lib/ai-gateway.ts
export interface AIProvider {
  generateSingle(input: {
    customerPhoto: Buffer;
    referencePhoto?: Buffer;
    prompt: string;
  }): Promise<{
    image: Buffer;
    latencyMs: number;
    estimatedCostUsd: number;
    model: string;
  }>;
}
```

現在は Gemini Provider を実装。HairFastGAN (セルフホスト) への切替が Provider 追加のみで可能。

**Prompt Engineering:**

```typescript
// packages/shared/src/constants/prompts.ts
export const buildPrompt = (params: {
  mode: 'style' | 'color' | 'style_and_color';
  angle: string;
  colorName?: string;
  colorHex?: string;
}): string => {
  // mode に応じた base instruction
  // + angle-specific camera direction
  // + identity preservation rules
};
```

5アングルのプロンプト:

| Angle | Instruction |
|-------|------------|
| `front` | front view, looking directly at camera |
| `three_quarter` | three-quarter angle, face slightly turned |
| `side` | side profile view |
| `back` | back view, full hairstyle from behind |
| `glamour` | professional beauty editorial portrait, soft bokeh, studio lighting |

**Concurrency Control:**

```typescript
// apps/api/lib/concurrency.ts
export function createConcurrencyLimiter(limit: number = 3) {
  // Queue-based semaphore — Gemini API rate limit protection
}

export function withTimeout<T>(promise: Promise<T>, ms: number = 60000): Promise<T> {
  // Promise race with timeout — prevents hung AI calls
}
```

### 4. Result Gallery

2つのビューモード:

- **Compare View**: 同一アングルで全スタイル横並び比較
- **Detail View**: 1スタイルの全5アングルを一覧

| Feature | Implementation |
|---------|---------------|
| Full-screen viewer | `FullscreenViewer.tsx` — pinch zoom, double-tap 2x zoom |
| Before/After | Long-press to show original customer photo |
| Favorite toggle | `PATCH /api/sessions/:id/generations/:genId` → `is_favorite` |
| Failed generation retry | Banner UI + `POST /api/.../retry` (atomic `failed` → `generating`) |
| Share | `ShareSheet.tsx` — AirDrop / LINE / Photos |
| Retake | Navigate back to camera (session preserved) |

### 5. Session Lifecycle

```
                     POST /api/sessions
  ┌──────────┐       (customer_photo_path)      ┌──────────┐
  │ Welcome  │──────────────────────────────────→│  Camera  │
  └──────────┘                                   └────┬─────┘
       ↑                                              │
       │ PATCH /api/sessions/:id                      │ POST /api/upload
       │ { is_closed: true }                          ↓
       │                                         ┌──────────┐
  ┌────┴─────┐      POST /api/generate           │ Explore  │
  │  Result  │←──────────(SSE)───────────────────│ Confirm  │
  │  Gallery │                                   │ Generate │
  └──────────┘                                   └──────────┘
```

### 6. History Panel

右からスライドインするハーフシートパネル。セッション一覧 (時刻 + 正面サムネイル + 生成数) をページネーションで表示。

```typescript
// apps/mobile/hooks/useHistory.ts
const { sessions, loadMore, hasMore } = useHistory();
// GET /api/sessions?page=1&limit=20 → signed URL thumbnail
```

## API Reference

### Authentication

全 API (health 除く) は JWT Bearer Token 必須。

```
Authorization: Bearer <supabase-jwt>
```

```typescript
// apps/api/lib/auth.ts
export async function authenticate(req): Promise<AuthContext | NextResponse> {
  // 1. Bearer token extraction
  // 2. supabaseAdmin.auth.getUser(token) — JWT verification
  // 3. staffs table lookup — role + store_code resolution
  // 4. Returns { userId, staffId, role, storeCode }
}

export function requireAdmin(auth): NextResponse | null {
  // Checks role in ['admin', 'manager'], returns 403 if not
}
```

### Endpoints

#### Sessions

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/sessions` | Create session | required |
| `GET` | `/api/sessions` | List sessions (paginated) | required |
| `GET` | `/api/sessions/[id]` | Session detail + generations | required |
| `PATCH` | `/api/sessions/[id]` | Update session (close, retake) | required |

```typescript
// POST /api/sessions — Create
// Request:  { customer_photo_path: string, store_code?: string }
// Response: { session: Session } (201)

// GET /api/sessions — List (history panel)
// Query: ?page=1&limit=20
// Response: { sessions: [...], total: number, page, limit }
//   Each session includes: generation_count, first_front_photo (signed URL)

// GET /api/sessions/[id] — Detail
// Response: { session: { ...Session, session_generations: [...], customer_photo_url } }
//   All photo paths resolved to signed URLs (1hr expiry)

// PATCH /api/sessions/[id] — Update
// Request:  { is_closed?: boolean, customer_photo_path?: string }
// Response: { session: Session }
```

#### Generations

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/generate` | Batch AI generation (SSE) | required |
| `PATCH` | `/api/sessions/[id]/generations/[genId]` | Toggle favorite/select | required |
| `POST` | `/api/sessions/[id]/generations/[genId]/retry` | Retry failed generation | required |

```typescript
// POST /api/generate — SSE Batch Generation
// Request:
{
  session_id: string;
  styles: Array<{
    simulation_mode: 'style' | 'color' | 'style_and_color';
    reference_type: 'catalog' | 'upload' | 'pinterest' | 'color_only';
    reference_photo_path?: string;
    reference_source_url?: string;
    catalog_item_id?: string;
    hair_color_id?: string;
    hair_color_custom?: string;
    style_label?: string;
  }>;
  angles?: Array<'front' | 'three_quarter' | 'side' | 'back' | 'glamour'>;
}
// Response: text/event-stream
// Events: generation_completed | generation_failed | all_completed

// PATCH generations — Toggle
// Request:  { is_favorite?: boolean, is_selected?: boolean }
// Response: { generation: SessionGeneration }

// POST retry — Retry failed
// Precondition: generation.status === 'failed' (else 409)
// Response: { generation_id, status: 'completed', photo_url, ai_latency_ms }
```

#### Images

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/api/upload` | Upload image (multipart) | required |
| `POST` | `/api/proxy-image` | Pinterest image proxy | required |

```typescript
// POST /api/upload — multipart/form-data
// Fields: file (Blob), session_id (string), bucket ('customer-photos' | 'reference-photos')
// Processing: sharp resize → Supabase Storage upload
// Response: { storage_path, url (signed) }

// POST /api/proxy-image — Pinterest proxy
// Request: { url: string, session_id: string }
// Whitelist: i.pinimg.com, pinimg.com, pinterest.com only
// Response: { storage_path, url (signed) }
```

#### Catalog

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/catalog` | List catalog items | required |
| `POST` | `/api/catalog` | Create catalog item | admin/manager |
| `PATCH` | `/api/catalog/[id]` | Update catalog item | admin/manager |
| `DELETE` | `/api/catalog/[id]` | Soft-delete catalog item | admin/manager |

```typescript
// GET /api/catalog
// Query: ?category_id=&gender=&search=&sort=popularity|created_at&page=1&limit=30
// Response: { items: Array<CatalogItem & { image_url, thumbnail_url }>, total }

// POST /api/catalog
// Request: { title, image_path, description?, category_id?, tags?, gender? }
// Response: { item } (201)

// PATCH /api/catalog/[id]
// Request: { title?, description?, image_path?, tags?, gender?, ... }
// Response: { item }

// DELETE /api/catalog/[id] — Soft delete (is_active = false)
// Response: { success: true }
```

#### Master Data

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/colors` | Hair color list | required |
| `GET` | `/api/health` | Health check | public |

## Database Schema

6 tables in Supabase PostgreSQL with Row-Level Security.

```
┌──────────────┐     ┌───────────────────┐     ┌───────────────────────┐
│   staffs     │     │    sessions        │     │ session_generations   │
├──────────────┤     ├───────────────────┤     ├───────────────────────┤
│ id (PK)      │←────│ staff_id (FK)     │     │ id (PK)               │
│ auth_user_id │     │ id (PK)           │←────│ session_id (FK)       │
│ display_name │     │ customer_photo_   │     │ style_group           │
│ email        │     │   path            │     │ angle                 │
│ store_code   │     │ is_closed         │     │ simulation_mode       │
│ role         │     │ store_code        │     │ reference_type        │
│ is_active    │     │ created_at        │     │ reference_photo_path  │
└──────────────┘     └───────────────────┘     │ catalog_item_id (FK) ─┼──→ catalog_items
                                                │ hair_color_id (FK)   ─┼──→ hair_colors
                                                │ generated_photo_path  │
                                                │ style_label            │
                                                │ status (pending/      │
                                                │   generating/         │
                                                │   completed/failed)   │
                                                │ is_favorite           │
                                                │ is_selected           │
                                                │ ai_latency_ms         │
                                                │ ai_cost_usd           │
                                                └───────────────────────┘

┌───────────────────┐     ┌───────────────┐     ┌──────────────┐
│ catalog_categories│     │ catalog_items  │     │ hair_colors  │
├───────────────────┤     ├───────────────┤     ├──────────────┤
│ id (PK)           │←────│ category_id   │     │ id (PK)      │
│ name              │     │ id (PK)       │     │ name         │
│ display_name      │     │ title         │     │ hex_code     │
│ sort_order        │     │ image_path    │     │ color_family │
└───────────────────┘     │ popularity    │     │ sort_order   │
                          │ gender        │     └──────────────┘
                          │ is_active     │
                          │ created_by(FK)│──→ staffs
                          └───────────────┘
```

### Storage Buckets

| Bucket | Purpose | Access | Retention |
|--------|---------|--------|-----------|
| `customer-photos` | Customer face photos | private | 90 days |
| `reference-photos` | Reference hairstyle images | private | 90 days |
| `generated-photos` | AI-generated results | private | 90 days |
| `catalog-photos` | Catalog hairstyle images | public (read) | permanent |

## Generation State Machine

```
                    INSERT
  ┌─────────┐   (batch create)   ┌────────────┐
  │         │──────────────────→ │  pending   │
  │ (start) │                    └─────┬──────┘
  └─────────┘                          │
                                       │ AI call start
                                       ▼
                                ┌────────────┐
                                │ generating │
                                └──┬──────┬──┘
                       success │  │      │ │ error/timeout
                               ▼  │      │ ▼
                        ┌──────────┤      ├──────────┐
                        │completed │      │  failed  │
                        └──────────┘      └────┬─────┘
                                               │
                                               │ POST /retry
                                               │ (atomic WHERE status='failed')
                                               ▼
                                        ┌────────────┐
                                        │ generating │ → completed / failed
                                        └────────────┘
```

## Design System

Warm dark theme. Photo-first. UI as black box.

| Token | Color | Usage |
|-------|-------|-------|
| `background` | `#0F0E0C` | App background |
| `surface` | `#1A1916` | Cards, panels |
| `accent` | `#C8956C` | Buttons, selection (bronze) |
| `primary` | `#F5F2EC` | Headings, body text (off-white) |
| `muted` | `#8A8580` | Placeholder, inactive |
| `destructive` | `#D4836D` | Delete, errors |
| `success` | `#7BAE7F` | Completed state |

Rules: No gradients. No emoji in UI. Monotone + 1 accent color. Borders 0.5px. Animation 200-300ms ease-out. Haptic on every interaction.

## Setup

### Prerequisites

- Node.js >= 20
- npm >= 10
- Expo CLI (`npx expo`)
- Supabase project (with tables created via DDL)
- Google Gemini API key
- Azure AD tenant (for SAML SSO)

### Installation

```bash
git clone git@github.com:horidaisuke/revol-mirror.git
cd revol-mirror
npm install
```

### Environment Variables

**`apps/api/.env.local`**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-3.1-flash-image-preview
API_BASE_URL=https://revol-mirror-api.vercel.app
IMAGE_MAX_SIZE_MB=10
SESSION_RETENTION_DAYS=90
AI_CONCURRENCY=3
GENERATION_TIMEOUT_MS=60000
```

**`apps/mobile/.env`**

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
EXPO_PUBLIC_API_BASE_URL=https://revol-mirror-api.vercel.app
EXPO_PUBLIC_AZURE_AD_TENANT_ID=xxxxx
EXPO_PUBLIC_AZURE_AD_CLIENT_ID=xxxxx
```

### Development

```bash
# Start all (API + Mobile)
npm run dev

# API only
cd apps/api && npm run dev

# Mobile only
cd apps/mobile && npx expo start
```

### Build

```bash
# API (Next.js)
cd apps/api && npm run build

# Mobile (EAS Build)
cd apps/mobile && eas build --platform ios
```

## Testing

75 tests total (API: 47, Mobile: 28). Framework: vitest v4.

```bash
# Run all tests
cd apps/api && npm test      # 47 tests, ~260ms
cd apps/mobile && npm test   # 28 tests, ~200ms

# Watch mode
npm run test:watch
```

### Test Coverage

**API Tests (`apps/api/__tests__/`)**

| File | Tests | Coverage |
|------|-------|---------|
| `unit/health.test.ts` | 1 | `GET /api/health` |
| `unit/sessions.test.ts` | 5 | Create (400/201/401/500), List |
| `unit/session-detail.test.ts` | 7 | Get/Patch (signed URL, 404, 403, close) |
| `unit/generations.test.ts` | 6 | Favorite, select, 400/401/404/403 |
| `unit/colors.test.ts` | 4 | Success, 401, 500, empty |
| `unit/upload.test.ts` | 6 | Success, missing file/session, 401/413/500 |
| `unit/proxy-image.test.ts` | 7 | Success, URL whitelist, FTP reject, 401/502/413 |
| `unit/catalog.test.ts` | 6 | GET/POST, signed URL, 401/500/empty |
| `integration/full-flow.test.ts` | 5 | Create→Update→Close, favorite, pagination |

**Mobile Tests (`apps/mobile/__tests__/`)**

| File | Tests | Coverage |
|------|-------|---------|
| `lib/api.test.ts` | 9 | GET/POST/PATCH/DELETE, upload, SSE |
| `hooks/useSession.test.ts` | 3 | Create, load, close |
| `hooks/useHistory.test.ts` | 2 | Pagination, loadMore |
| `hooks/useCatalog.test.ts` | 3 | Sort, category, newest |
| `hooks/useGenerate.test.ts` | 5 | SSE, retry (success/fail/409), polling |
| `hooks/usePinterest.test.ts` | 2 | Proxy, URL rejection |
| `integration/full-user-flow.test.ts` | 2 | Full E2E flow + history |

### Mock Strategy

- **API**: `vi.hoisted()` + `vi.mock()` for Supabase/Auth. Direct route handler import with `NextRequest`.
- **Mobile**: `global.fetch` mock for API layer (`lib/api.ts`) verification.
- **Integration**: In-memory Map for CRUD simulation (API), URL pattern matcher (Mobile).

## Deployment

### API (Vercel)

```bash
cd apps/api
vercel --prod
```

Configured via `vercel.json`. Environment variables set in Vercel dashboard.

### Mobile (EAS)

```bash
cd apps/mobile
eas build --platform ios --profile production
eas submit --platform ios
```

Distribution: EAS Build → TestFlight → App Store (120 stations).

## Cost Estimation

| Styles/Customer | Images | Cost/Customer |
|----------------|--------|--------------|
| 1 | 5 | $0.20 |
| 2 | 10 | $0.39 |
| 3 | 15 | $0.59 |
| 4 | 20 | $0.78 |

| Monthly Volume | Avg Styles | Monthly Gemini Cost |
|---------------|-----------|-------------------|
| 100 customers | 2 | ~$39 |
| 500 customers | 3 | ~$292 |
| 1000 customers | 3 | ~$585 |

## Security

- **Authentication**: Supabase Auth SAML SSO → Azure AD (Entra ID)
- **Token storage**: `expo-secure-store` (encrypted keychain)
- **API authorization**: JWT verification + `staffs` table role check on every request
- **Role-based access**: stylist (own data), manager/admin (all data), catalog write (admin/manager only)
- **Image proxy whitelist**: `i.pinimg.com`, `pinimg.com`, `pinterest.com` only
- **Row-Level Security**: Enabled on all 6 tables
- **Photo retention**: Customer/reference/generated photos auto-deleted after 90 days
- **Privacy**: No customer names stored. History shows time + thumbnail only.

## License

Proprietary. (c) Revol Corporation.
