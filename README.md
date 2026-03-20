# REVOL Mirror

美容室カウンセリング向け AI ヘアスタイルシミュレーションアプリ。お客さまの顔写真に Pinterest / カタログ / アップロード画像のヘアスタイルを合成し、5アングル（正面・斜め・横・後ろ・映え）の比較画像を生成する iPad ネイティブアプリ。

---

## 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|-----------|
| モバイルアプリ | Expo SDK + React Native | 55 / 0.83 |
| ルーティング | Expo Router | v6 |
| スタイリング | NativeWind (Tailwind CSS for RN) | 4.2 |
| アニメーション | React Native Reanimated | 4.2 |
| WebView | react-native-webview (Pinterest) | 13.16 |
| BFF API | Next.js API Routes | 16.1 |
| データベース | Supabase (PostgreSQL) | - |
| ストレージ | Supabase Storage | - |
| 認証 | Supabase Auth + Azure AD SAML SSO | - |
| AI 画像生成 | Google Gemini API | gemini-3.1-flash-image-preview |
| 画像処理 | sharp (サーバー側) | 0.34 |
| バリデーション | Zod | 4.3 |
| モノレポ | Turborepo | 2.4 |
| ホスティング | Vercel (API + 管理Web) | - |
| パッケージ管理 | npm workspaces | 10.8 |

---

## プロジェクト構造

```
revol-mirror/
├── apps/
│   ├── mobile/          # iPad アプリ (Expo + React Native)
│   │   ├── app/         # Expo Router ページ
│   │   │   ├── (auth)/  # ログイン画面
│   │   │   └── (main)/  # メイン画面群
│   │   ├── components/  # UI コンポーネント
│   │   ├── hooks/       # カスタムフック
│   │   ├── lib/         # ユーティリティ
│   │   └── assets/      # アイコン・画像
│   └── api/             # BFF API (Next.js)
│       ├── app/api/     # API ルート
│       │   ├── generate/    # AI 生成 (SSE)
│       │   ├── sessions/    # セッション CRUD
│       │   ├── upload/      # 画像アップロード
│       │   └── colors/      # カラーマスター
│       └── lib/         # サーバーユーティリティ
│           ├── ai-providers/  # Gemini プロバイダー
│           └── auth.ts        # JWT 認証
├── packages/
│   └── shared/          # 共有型・定数・バリデーション
└── supabase/
    ├── config.toml      # Supabase ローカル設定
    └── migrations/      # DB マイグレーション
```

---

## 画面フロー

```
ログイン (Azure AD SAML)
  ↓
ホーム画面
  ↓
写真の準備 (撮影ガイド表示)
  ↓
カメラ撮影 / ライブラリ選択
  ↓
スタイル選択 (Pinterest / カタログ / アップロード / カラー)
  ↓
確認画面 (2列カードグリッド + カラー割当)
  ↓
生成中 (SSE + ポーリングで進捗表示)
  ↓
結果画面 (映えタイル → タップで横スワイプビューア)
  ↓
フリーワード再生成 (2段階 Refine: 正面確定 → 各アングル生成)
  ↓ (繰り返し可能)
```

---

## AI 生成フロー

### 初回生成

1. お客さま写真 + 参照画像（Pinterest等）を Gemini に送信
2. 5アングル × N スタイルを最大10並列で生成
3. 生成画像は Supabase Storage に保存
4. SSE でリアルタイム進捗をクライアントに通知

### Refine（フリーワード再生成）

2段階生成で各アングルの整合性を保証:

1. **Step 1:** お客さま写真 + 前世代の正面・映え画像 + ユーザー指示 → **正面画像を確定**
2. **Step 2:** 確定した正面画像 + ユーザー指示 → **残り4アングルを並列生成**（正面と辻褄が合うように）

---

## セットアップ手順

### 1. リポジトリクローン

```bash
git clone https://github.com/DaisukeHori/revol-mirror.git
cd revol-mirror
npm install
```

### 2. 環境変数の設定

#### API (`apps/api/.env.local`)

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-3.1-flash-image-preview
AI_CONCURRENCY=10
GENERATION_TIMEOUT_MS=60000
IMAGE_MAX_SIZE_MB=10
```

#### モバイル (`apps/mobile/.env`)

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
EXPO_PUBLIC_API_BASE_URL=https://revol-mirror-api.vercel.app
EXPO_PUBLIC_SSO_DOMAIN=revol.co.jp
EXPO_PUBLIC_SSO_PROVIDER_ID=00000000-0000-0000-0000-000000000000
```

### 3. Supabase セットアップ

```bash
# Supabase CLI インストール
npm install -g supabase

# プロジェクトにリンク
supabase link --project-ref <PROJECT_REF>

# マイグレーション実行
supabase db push

# ストレージバケット作成（Supabase ダッシュボードで）
# - customer-photos (private)
# - reference-photos (private)
# - generated-photos (private)
# - catalog-photos (public)
```

### 4. ローカル開発

```bash
# API サーバー起動
cd apps/api
npm run dev

# モバイルアプリ起動
cd apps/mobile
npx expo start --dev-client --clear

# iPad シミュレーターで実行
npx expo run:ios --device "iPad Pro 11-inch (M4)"
```

### 5. Vercel デプロイ

```bash
# API デプロイ（GitHub 連携で自動デプロイ推奨）
# Vercel ダッシュボードで:
# - Root Directory: apps/api
# - Framework: Next.js
# - Region: hnd1 (東京)
# - 環境変数を設定
```

---

## Azure AD (Entra ID) SAML SSO 設定

### ステップ 1: Supabase で SSO プロバイダーを追加

```bash
supabase sso add \
  --type saml \
  --metadata-url "https://login.microsoftonline.com/<TENANT_ID>/federationmetadata/2007-06/federationmetadata.xml?appid=<APP_ID>" \
  --domains "revol.co.jp" \
  --project-ref <SUPABASE_PROJECT_REF>
```

レスポンスの `id` が SSO Provider ID になります。これを `EXPO_PUBLIC_SSO_PROVIDER_ID` に設定。

### ステップ 2: Azure Entra ID でエンタープライズアプリ設定

1. **Azure Portal** → **Entra ID** → **エンタープライズ アプリケーション** → **新しいアプリケーション** → **独自のアプリケーションの作成**
2. アプリ名: `REVOL Mirror`
3. **シングル サインオン** → **SAML**

### ステップ 3: SAML 構成

| 設定項目 | 値 |
|----------|-----|
| 識別子 (Entity ID) | `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/sso/saml/metadata` |
| 応答 URL (ACS URL) | `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/sso/saml/acs` |
| サインオン URL | `https://revol-mirror-admin.vercel.app/login` |
| 名前 ID 形式 | `emailAddress` |

### ステップ 4: 属性とクレーム

| クレーム名 | ソース属性 |
|-----------|-----------|
| `emailaddress` | `user.mail` |
| `name` | `user.displayname` |

### ステップ 5: ユーザー割り当て

**Entra ID** → **エンタープライズ アプリケーション** → **REVOL Mirror** → **ユーザーとグループ** → 対象ユーザーまたはグループを追加

### ステップ 6: Supabase SSO 設定確認

```bash
supabase sso list --project-ref <SUPABASE_PROJECT_REF>
supabase sso info <PROVIDER_ID> --project-ref <SUPABASE_PROJECT_REF>
```

### ステップ 7: アプリ側の認証フロー

アプリは `supabase.auth.signInWithSSO({ domain: 'revol.co.jp' })` でログインを開始します。Azure AD にリダイレクトされ、認証後にアプリに戻ります。

---

## デザインシステム

### カラーパレット (Dark Theme)

| トークン | 値 | 用途 |
|----------|-----|------|
| background | `#0F0E0C` | 画面背景 |
| surface | `#1A1916` | カード背景 |
| elevated | `#252320` | 浮き上がり要素 |
| border | `#33302C` | 境界線 |
| accent | `#C8956C` | ブロンズ（ブランドカラー） |
| primary | `#F5F2EC` | 本文テキスト |
| secondary | `#C5BFB6` | 補助テキスト |
| muted | `#8A8580` | 控えめテキスト |

### デザイン原則

- モノトーン + ブロンズアクセント
- グラデーション不使用
- ボーダー幅 0.5px
- 角丸: card=12px, pill=99px, img=8px
- アニメーション: 250ms ease-out

---

## API エンドポイント一覧

| メソッド | パス | 説明 | 認証 |
|----------|------|------|------|
| POST | `/api/sessions` | セッション作成 | 必須 |
| GET | `/api/sessions/:id` | セッション詳細 + 生成画像 | 必須 |
| PATCH | `/api/sessions/:id` | セッション更新 | 必須 |
| DELETE | `/api/sessions/:id` | セッション削除 | 管理者 |
| POST | `/api/upload` | 画像アップロード | 必須 |
| POST | `/api/generate` | AI 生成開始 (SSE) | 必須 |
| GET | `/api/colors` | カラーマスター | 必須 |
| GET | `/api/user` | ログインユーザー情報 | 必須 |
| GET | `/api/staffs` | スタッフ一覧 | 管理者 |
| PATCH | `/api/sessions/:id/generations/:genId` | お気に入り更新 | 必須 |
| POST | `/api/sessions/:id/generations/:genId/retry` | 生成リトライ | 必須 |

---

## テスト

```bash
# API テスト
cd apps/api && npm test

# モバイルテスト
cd apps/mobile && npm test

# 型チェック
cd apps/api && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit
```

---

## iOS ビルド

### シミュレーター用

```bash
cd apps/mobile
npx expo run:ios --device "iPad Pro 11-inch (M4)"
```

### 実機配布 (EAS Build)

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile production
eas submit --platform ios
```

---

## ライセンス

Private - REVOL Inc.
