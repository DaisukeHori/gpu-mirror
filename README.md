# REVOL Mirror

美容室カウンセリング向け AI ヘアスタイルシミュレーションアプリ。お客さまの顔写真に Pinterest / カタログ / アップロード画像のヘアスタイルを合成し、5アングル（正面・斜め・横・後ろ・映え）の比較画像を生成する iOS / Android アプリ。

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
│   ├── mobile/          # iOS / Android アプリ (Expo + React Native)
│   │   ├── app/         # Expo Router ページ
│   │   │   ├── (auth)/  # ログイン画面
│   │   │   ├── (main)/  # メイン画面群 + (admin)/ 管理画面
│   │   │   └── settings.tsx  # テーマ・管理者メニュー
│   │   ├── components/  # UI コンポーネント
│   │   ├── hooks/       # カスタムフック
│   │   ├── lib/         # ユーティリティ
│   │   └── assets/      # アイコン・画像
│   └── api/             # BFF API (Next.js)
│       ├── app/api/     # API ルート
│       │   ├── generate/    # AI 生成 (SSE)
│       │   ├── sessions/    # セッション CRUD + 生成リトライ
│       │   ├── upload/      # 画像アップロード
│       │   ├── proxy-image/ # Pinterest 画像プロキシ
│       │   ├── catalog/     # カタログ CRUD
│       │   ├── colors/      # カラーマスター
│       │   └── health/      # ヘルスチェック
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

メインのカウンセリング動線に加え、ホームから設定・履歴、特権ユーザー向けの管理画面へ分岐します。**Web** は別リポジトリの `apps/web` ではなく、同一 Expo アプリを `expo start --web` / EAS で動かしたものです（管理 UI もこのアプリ内の画面）。

```
ログイン (Azure AD SAML SSO)
  ↓
ホーム画面
  ├→ 設定（テーマ・ログアウト・管理者は「施術ログ」）
  └→ 履歴パネル → 過去セッションの結果画面へ

ホーム「はじめる」
  ↓
（未同意の場合のみ）利用規約・プライバシーポリシー（最後までスクロール + 同意）
  ↓
写真の準備（撮影ガイド表示）
  ↓
カメラ撮影 / ライブラリ選択
  ↓
スタイル選択（Pinterest / カタログ / アップロード /カラー）
  ↓
確認画面（2列カードグリッド + カラー割当）
  ↓
生成中（SSE + ポーリングで進捗表示）
  ↓
結果画面（映えタイル → タップで横スワイプビューア）
  ├→ スタイル追加 → スタイル選択へ（お客さま写真は API から再取得）
  └→ フリーワード再生成（2段階 Refine）→ 生成中 → 結果（繰り返し可）

設定（admin / manager）→ 施術ログ（セッション一覧・CSV）
```

**規約同意の保存:** 端末に同意済みフラグを保存します。規約本文を重要変更したときは [`apps/mobile/lib/terms-consent.ts`](apps/mobile/lib/terms-consent.ts) の `TERMS_CONSENT_VERSION` を上げると、次回から再度規約画面が表示されます。

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

# Android エミュレーターで実行
npx expo run:android

# Android 実機で実行（ローカル API に接続する場合）
adb reverse tcp:3000 tcp:3000
npx expo run:android
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
| GET | `/api/health` | ヘルスチェック | 不要 |
| POST | `/api/sessions` | セッション作成 | 必須 |
| GET | `/api/sessions` | セッション一覧 (ページネーション) | 必須 |
| GET | `/api/sessions/:id` | セッション詳細 + 生成画像 | 必須 |
| PATCH | `/api/sessions/:id` | セッション更新 (クローズ等) | 必須 |
| POST | `/api/upload` | 画像アップロード | 必須 |
| POST | `/api/proxy-image` | Pinterest 画像プロキシ | 必須 |
| POST | `/api/generate` | AI 生成開始 (SSE) | 必須 |
| GET | `/api/colors` | カラーマスター | 必須 |
| GET | `/api/catalog` | カタログ一覧 | 必須 |
| POST | `/api/catalog` | カタログ追加 | 管理者 |
| GET | `/api/catalog/:id` | カタログ詳細 | 必須 |
| PATCH | `/api/catalog/:id` | カタログ更新 | 管理者 |
| DELETE | `/api/catalog/:id` | カタログ論理削除 | 管理者 |
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

### Release ビルド（JS をアプリに同梱・Metro 不要）

**Debug**（既定の `expo run:ios`）は開発時用で、起動時に Metro から JS を読み込みます。**Release** では Xcode ビルド中に `main.jsbundle` が生成され **アプリバンドルに埋め込まれる**ため、インストール後は **Mac を起動していなくてよい**です。`EXPO_PUBLIC_*` は **ビルド実行時**に `apps/mobile/.env`（またはシェルの環境変数）から埋め込まれます。

```bash
cd apps/mobile
export LANG=en_US.UTF-8   # CocoaPods 用（未設定だと pod が失敗することがある）
# ios/ がまだ無い場合: npx expo prebuild --platform ios
npm run ios:release:device   # 接続した実機へ Release インストール
# シミュレータのみ: npm run ios:release
```

実機を複数台つないでいる場合は `--device <名前またはUDID>` を付けます。

Android も同様に **`npm run android:release`** でリリース APK（バンドル同梱）をビルドできます。

**EAS Build** の `internal` / `production` プロファイルも **Release 相当**で、クラウド上で同じく JS が同梱されます（下記）。

### Mac なしで実機だけ使う（本番バックエンド・Metro 不要）

`npx expo run:ios`（Debug）や **development** プロファイルの EAS ビルドは **開発用**で、起動時に Mac 上の Metro（パッケージャ）へ接続します。**上記の Release / EAS `internal`・`production`** を使うと、iPad 単体で起動し、API はビルド時に埋め込んだ `EXPO_PUBLIC_*` から本番（Vercel 等）へ向きます。

1. **EAS にログイン**（初回のみ）

   ```bash
   npm install -g eas-cli
   eas login
   cd apps/mobile
   eas init
   ```

   `eas init` で `app.json` に `extra.eas.projectId` が付与されます。

2. **ビルド時に必要な秘密情報**（Supabase など）はリポジトリに書かず、**EAS の環境変数**に登録します（[Expo の Environment variables](https://docs.expo.dev/eas/environment-variables/) または CLI）。

   最低限:

   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - （使う場合）`EXPO_PUBLIC_SSO_PROVIDER_ID`

   `EXPO_PUBLIC_API_BASE_URL` と `EXPO_PUBLIC_SSO_DOMAIN` は **`eas.json` の `internal` / `production` プロファイル**に既定で入れています。上書きしたい場合は EAS 側の変数で差し替え可能です。

3. **実機向けスタンドアロン IPA（内部配布）**

   ```bash
   cd apps/mobile
   eas build --platform ios --profile internal
   ```

   完了後、EAS のダウンロードリンクから iPad にインストール（登録済みデバイスが必要）。**Mac を起動したままにする必要はありません。**

4. **App Store / TestFlight（本番配布）**

   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

### シミュレーター用（開発・Mac 必須）

```bash
cd apps/mobile
npx expo start --dev-client --clear
# 別ターミナル
npx expo run:ios --device "iPad Pro 11-inch (M4)"
```

### 実機 USB 開発（Metro あり・Mac 必須）

```bash
cd apps/mobile
npx expo start --dev-client --clear
npx expo run:ios --device
```

---

## Android ビルド

### エミュレーター / 実機（ローカル）

```bash
cd apps/mobile
npx expo run:android
```

Android 実機でローカル API に接続する場合は、事前に `adb reverse tcp:3000 tcp:3000` を実行してください。

### EAS Build（内部テスト配布）

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

`preview` プロファイルは APK を生成します。チームメンバーへの直接配布に適しています。

### EAS Build（本番 / Play Store 配布）

```bash
eas build --platform android --profile production
eas submit --platform android
```

初回の Google Play 提出前に以下が必要です:

1. Google Play Console でアプリを作成
2. サービスアカウント JSON を取得し `apps/mobile/google-play-service-account.json` に配置
3. `eas init` で EAS プロジェクトを紐付け（`extra.eas.projectId` が `app.json` に追加される）

環境変数（`EXPO_PUBLIC_*`）は iOS と共通です。

---

## ライセンス

Private - REVOL Inc.
