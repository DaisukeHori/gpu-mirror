# REVOL Mirror 設計書 v1.4

> **変更履歴**
> - v1.0 (2026-03-17): 初版 (Next.js PWA)
> - v1.1 (2026-03-17): Expo ネイティブアプリ化、ヘアカラー追加、HubSpot伏線
> - v1.2 (2026-03-18): 画面フロー確定、Pinterest内蔵ブラウザ (B+Cハイブリッド)、セッション分離
> - v1.3 (2026-03-18): 複数スタイル一括生成、5アングル+映え写真、比較ギャラリー、途中終了、履歴パネル復帰、デザインシステム (ウォームダーク)、DB再設計 (session_generations)
> - v1.4 (2026-03-18): 実装完了後の現物合わせ。API CRUD網羅 (generation更新・リトライ追加)、非同期処理アーキテクチャ、テストインフラ (vitest 75テスト)、画面遷移アニメーション、UI仕上げ (絵文字排除・Reanimated)、リポジトリ構成を実ファイルに同期

---

## 1. プロジェクト概要

### 1.1 プロダクト名
**REVOL Mirror**

### 1.2 目的
美容室のカウンセリング時に、お客さんの顔写真にPinterest等から選んだ複数の髪型・髪色を適用し、各スタイルを正面・斜め・横・後ろ・映え写真の5アングルで生成、比較ギャラリーで一覧比較できるiPadネイティブアプリ。

### 1.3 核心フロー
```
はじめる → 撮影 → スタイルを複数選ぶ → 確認 → 一括生成 → 比較ギャラリー → 次のお客さまへ
```

### 1.4 ターゲット環境
- **Primary**: iPadOS ネイティブアプリ (App Store) — 全120ステーション
- **Secondary**: Webブラウザ (Expo Web) — 管理者用
- **将来**: iPhone / Android — お客さん向け

---

## 2. 技術スタック

| レイヤー | 技術 | 備考 |
|---------|------|------|
| モバイルアプリ | Expo SDK 55 + Expo Router v6 + TypeScript | iPadOS SplitView対応 |
| UI | NativeWind (Tailwind for RN) + Reanimated 3 | ジェスチャー・アニメーション |
| カメラ | expo-camera | ネイティブカメラ直接アクセス |
| 画像表示 | expo-image | 高パフォーマンス画像キャッシュ |
| WebView | react-native-webview | Pinterest内蔵ブラウザ |
| BFF (API) | Next.js 16 API Routes | Vercel有料アカウント |
| DB / Storage | Supabase (PostgreSQL + Storage) | 有料アカウント |
| 認証 | Supabase Auth + Azure AD (Entra ID) SAML | 既存SSO連携 |
| AI エンジン | Google Gemini API (`gemini-3.1-flash-image-preview`) | AI Gatewayで抽象化 |
| 画像処理 | sharp (サーバーサイドリサイズ) | BFF内 |
| テスト | vitest v4 | globals, node環境 |
| バリデーション | zod | リクエスト/レスポンス検証 |
| 並行制御 | 自前 ConcurrencyLimiter | Gemini APIレート保護 |
| ビルド・配信 | EAS Build → TestFlight → App Store | CI/CD |
| モノレポ | Turborepo | apps/ + packages/ |

---

## 3. デザインシステム

### 3.1 Design Philosophy
Aesopのミニマルな温かさ × Appleのシステマティックな美しさ × サロンの空気感。
写真が絶対的な主役。UIは黒子。色は添えるだけ。

### 3.2 カラーパレット

#### Dark Mode (デフォルト — スタジオ使用時)

| Token | Hex | 用途 |
|-------|-----|------|
| `background` | `#0F0E0C` | アプリ背景 |
| `surface` | `#1A1916` | カード、パネル |
| `elevated` | `#252320` | モーダル、オーバーレイ |
| `border` | `#33302C` | ボーダー (0.5px) |
| `muted` | `#8A8580` | プレースホルダー、非活性テキスト |
| `secondary` | `#C5BFB6` | サブテキスト |
| `primary` | `#F5F2EC` | 見出し、本文テキスト (オフホワイト) |
| `accent` | `#C8956C` | ボタン、選択状態、進捗バー (ブロンズ) |
| `accent-dark` | `#A87750` | アクセント暗色 |
| `accent-light` | `#E8C4A0` | アクセント明色 |
| `success` | `#7BAE7F` | 完了状態 |
| `destructive` | `#D4836D` | 削除、終了 |
| `warning` | `#C8B06C` | 注意 |

#### Light Mode (管理画面・設定)

| Token | Hex | 用途 |
|-------|-----|------|
| `background` | `#FAF8F5` | 背景 (クリーム系) |
| `surface` | `#F0EDE7` | カード |
| `primary` | `#1A1916` | テキスト |
| `secondary` | `#6B6560` | サブテキスト |
| `accent` | `#C8956C` | アクセント (共通) |

### 3.3 Typography

| 用途 | iOS | Web | Size | Weight |
|------|-----|-----|------|--------|
| 大見出し | SF Pro Display | Inter | 28px | Semibold (600) |
| 見出し | SF Pro Display | Inter | 20px | Medium (500) |
| 本文 | SF Pro Text | Inter | 15px | Regular (400) |
| キャプション | SF Pro Text | Inter | 12px | Regular (400) |
| ラベル | SF Pro Text | Inter | 11px | Medium (500) |
| 日本語 | Hiragino Sans | Noto Sans JP | — | 上記に準ずる |

ウェイトは **Regular (400), Medium (500), Semibold (600)** の3つだけ。

### 3.4 Design Rules

1. **グラデーション禁止。** 背景、ボタン、どこにも使わない。フラットカラーのみ。
2. **写真以外に彩度の高い色を使わない。** UIはモノトーン + アクセント1色 (ブロンズ)。
3. **角丸**: カード `12px`、ボタン `99px` (pill)、画像 `8px`。
4. **余白は過剰なくらい取る。** 要素間の最小マージン `16px`。
5. **アニメーションは短く上品。** `200-300ms`, `ease-out`。バウンスやスプリングは使わない。
6. **ハプティクスは必ず付ける。** 選択・切替・長押し検知に light impact。
7. **ボーダーは `0.5px`。** 太いボーダーは一切使わない。
8. **アイコン**: SF Symbols (iOS) / Lucide (Web)。線幅統一、塗りなし。

### 3.5 NativeWind テーマ定義

```typescript
// apps/mobile/tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: '#0F0E0C', surface: '#1A1916', elevated: '#252320' },
        border: { DEFAULT: '#33302C' },
        text: {
          primary: '#F5F2EC',
          secondary: '#C5BFB6',
          muted: '#8A8580',
        },
        accent: { DEFAULT: '#C8956C', dark: '#A87750', light: '#E8C4A0' },
        success: '#7BAE7F',
        destructive: '#D4836D',
        warning: '#C8B06C',
        // Light mode
        'bg-light': { DEFAULT: '#FAF8F5', surface: '#F0EDE7' },
        'text-light': { primary: '#1A1916', secondary: '#6B6560' },
      },
      borderRadius: { card: '12px', pill: '99px', img: '8px' },
      borderWidth: { thin: '0.5px' },
    },
  },
};
```

---

## 4. 画面設計 (確定版 — 7画面 + 履歴パネル)

### 4.1 画面遷移概要

```
① ウェルカム
├── [はじめる] → 新セッション → ②へ (fade遷移)
├── [履歴] → 履歴パネル (右スライドイン, Animated.View)
│
│ === セッション中 (全画面右上に [終了] 常設) ===
│
├── ② 撮影 (全画面カメラ) ← fade遷移
├── ③ スタイルを探す (複数選択, Pinterest B+C, カタログ, アップロード, カラー) ← slide_from_right
├── ④ 確認 (選択スタイル一覧 + 各スタイルへのカラー指定) ← slide_from_right
├── ⑤ 生成中 (並列SSE生成, スタイル×5アングル, 完了順表示) ← fade遷移
└── ⑥ 結果 (比較ギャラリー + リトライUI) ← fade遷移
    ├── [+ スタイル追加] → ③へ
    ├── [撮り直し] → ②へ
    ├── [まとめて共有] / [お気に入り] / [リトライ]
    └── [次のお客さまへ] → 確認ダイアログ → ①へ
```

### 4.1.1 画面遷移アニメーション定義

```typescript
// apps/mobile/app/(main)/_layout.tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="index" options={{ animation: 'fade' }} />
  <Stack.Screen name="camera" options={{ animation: 'fade' }} />
  <Stack.Screen name="explore" options={{ animation: 'slide_from_right' }} />
  <Stack.Screen name="confirm" options={{ animation: 'slide_from_right' }} />
  <Stack.Screen name="generating" options={{ animation: 'fade' }} />
  <Stack.Screen name="result" options={{ animation: 'fade' }} />
</Stack>
```

- **fade**: 状態変化を伴う画面 (新しい文脈への移行)
- **slide_from_right**: フロー内の進行方向を示す画面

### 4.2 途中終了 — 全画面に [終了] 常設 (ExitButton.tsx)

②〜⑥のすべての画面の右上に `[終了]` ボタンを常設表示。

- タップ → 確認ダイアログ
  - 「セッションを終了しますか？ 生成済みの画像は履歴から確認できます。」
  - [キャンセル] [終了する]
- [終了する] → `PATCH /api/sessions/{id} { is_closed: true }` → ①ウェルカムへ
- 生成中⑤で押した場合: API呼び出しはバックグラウンドで完走、結果はDBに保存される (捨てない)

### 4.3 ① ウェルカム画面

```
┌────────────────────────────────────────────────────────────┐
│                                                [履歴]      │
│                                                            │
│                                                            │
│                          REVOL                             │
│                         Mirror                             │
│                                                            │
│                                                            │
│                    ┌──────────────┐                        │
│                    │  はじめる      │  ← accent (#C8956C)   │
│                    └──────────────┘  Reanimated scale       │
│                                     animation (押下時0.95)  │
│                                                            │
│                   山田太郎 — 川口店                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
背景: #0F0E0C  テキスト: #F5F2EC  スタッフ名: #8A8580
```

- 過去のデータは一切表示しない
- [はじめる] → `POST /api/sessions` → 新セッションID発行 → ②へ (fade遷移)
- 右上 [履歴] → 履歴パネルがスライドイン (Animated.View + translateX)
- ボタンは全て HapticButton (Reanimated scale 0.95, 200ms ease-out)

#### 4.3.1 履歴パネル

右からスライドインするハーフシートパネル。

```
┌─────────────────────────────────────┐
│ 履歴                        [× 閉じる] │
├─────────────────────────────────────┤
│                                     │
│ 今日                                 │
│ ┌─────────────────────────────────┐ │
│ │ 14:32  3スタイル生成済            │ │
│ │ [S1サムネ] [S2サムネ] [S3サムネ]   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 11:15  2スタイル生成済            │ │
│ │ [S1サムネ] [S2サムネ]             │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 9:40  途中終了 (撮影のみ)         │ │
│ │ [顔写真サムネ]                    │ │
│ └─────────────────────────────────┘ │
│                                     │
│ 昨日                                 │
│ ┌─────────────────────────────────┐ │
│ │ 16:20  4スタイル生成済            │ │
│ │ [S1] [S2] [S3] [S4]             │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ↓ スクロールで過去に遡る              │
│                                     │
└─────────────────────────────────────┘
```

- セッション単位でカード表示 (時刻 + 生成数 + 正面サムネイル)
- お客さん名は表示しない (時刻とサムネだけ)
- タップ → そのセッションに入って⑥結果画面へ (追加生成・共有等が可能)
- 途中終了のセッションは最後にいた画面に復帰
- 縦スクロールで過去に遡る (ページネーション)
- 90日で自動削除されたものは表示されない

### 4.4 ② 撮影画面

```
┌────────────────────────────────────────────────────────────┐
│                                                  [終了]     │
│                                                            │
│                 全画面カメラプレビュー                        │
│                                                            │
│                 ┌──────────────────┐                       │
│                 │                  │                       │
│                 │   顔フレーム       │  ← FaceGuide.tsx     │
│                 │   ガイド (楕円)    │  opacity: 0.3        │
│                 │                  │                       │
│                 └──────────────────┘                       │
│                                                            │
│                                                            │
│    [ライブラリ]        [シャッター]         [切替]           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

- expo-camera でネイティブカメラ (app/(main)/camera.tsx に直接実装)
- シャッター後 → 確認プレビュー → [この写真を使う] or [撮り直す]
- expo-image-picker からのライブラリ選択対応
- カメラ前後切替 (`CameraType.front` / `CameraType.back`)
- 撮影後: `POST /api/upload` → customer-photos バケットに保存
- 余計なUIなし (絵文字不使用)

### 4.5 ③ スタイルを探す画面 (複数選択対応)

```
┌────────────────────────────────────────────────────────────┐
│ ← 戻る      スタイルを探す                        [終了]    │
├────────────────────────────────────────────────────────────┤
│ ┌──────────┐┌──────────┐┌───────────┐┌─────────┐         │
│ │Pinterest  ││カタログ   ││アップロード ││ カラー   │         │
│ └──────────┘└──────────┘└───────────┘└─────────┘         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  (選択中タブの内容が全画面で表示)                              │
│                                                            │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ 選択トレイ: (StyleTray.tsx, 下部固定)                        │
│ [S1サムネ ×] [S2サムネ ×] [S3サムネ ×]  ← 横スクロール       │
│                                                            │
│        [3つのスタイルで一括生成]  ← 選択数で動的変更          │
└────────────────────────────────────────────────────────────┘
```

- 画像選択するたびに下部トレイに追加 (チェックマーク + ハプティック)
- タブをまたいで選択OK (Pinterest2つ + カタログ1つ 等)
- 各サムネの [×] で個別削除
- カラータブはスタイルとの併用可能 (④確認画面で各スタイルに個別カラー指定)
- ボタンテキストは選択数で動的変更: 「1つのスタイルで生成」「3つのスタイルで一括生成」等

#### 4.5.1 Pinterestタブ (B+Cハイブリッド)

`react-native-webview` で pinterest.com を表示。

| 状態 | 操作 | 結果 |
|------|------|------|
| 一覧画面 | タップ | Pinterest通常操作 (ピン拡大) |
| 一覧画面 | 長押し (0.5秒) | ハプティック振動 → ハーフモーダル (画像プレビュー + [✨ 選択]) |
| ピン詳細画面 | 自動 (URL `/pin/` 検知) | 下からスライドアップ (プレビュー + [✨ 選択] + [× 閉じる]) |
| 初回のみ | — | ツールチップ「長押しで画像を直接選択できます」 |

上部アプリバー: 撮影済み写真ミニサムネ + 選択数バッジ。

画像取得フロー:
```
WebView → JS注入で画像URL抽出 → postMessage()
→ RN → BFF /api/proxy-image → サーバーサイドダウンロード
→ sharp リサイズ → Supabase Storage → storage_path返却
→ 選択トレイに追加
```

#### 4.5.2 カタログタブ
- カテゴリ別マソンリーグリッド
- タップ → 選択トレイに追加
- 長押し → 拡大プレビュー
- 人気順🔥 / 新着順切替

#### 4.5.3 アップロードタブ
- expo-image-picker でフォトライブラリから選択
- AirDropで受け取った画像を選ぶ用途

#### 4.5.4 カラータブ
- カラーファミリー別サークルパレット
- タップ → カラー選択状態に (④確認画面で各スタイルにアサイン)
- スタイルとの併用: スタイル + カラー = style_and_color モード

### 4.6 ④ 確認画面

```
┌────────────────────────────────────────────────────────────┐
│ ← 戻る           確認                            [終了]    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌─────┐                                                   │
│ │顔写真│  →  生成内容:                                      │
│ └─────┘                                                   │
│                                                            │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Style 1: レイヤーボブ (Pinterest)                        │ │
│ │ カラー: なし (参照画像のまま)              [追加] [× 削除] │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Style 2: ショートマッシュ (カタログ)                      │ │
│ │ カラー: アッシュベージュ                   [変更] [× 削除] │ │
│ └────────────────────────────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Style 3: (アップロード画像)                              │ │
│ │ カラー: なし                              [追加] [× 削除] │ │
│ └────────────────────────────────────────────────────────┘ │
│                                                            │
│ 各スタイル × 5アングル (正面/斜め/横/後ろ/映え) = 15枚生成    │
│                                                            │
│              [一括生成する (15枚)]                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

- 各スタイルに個別でカラーをアサイン/変更/削除できる
- スタイルの [× 削除] で個別に外せる
- 生成枚数 = スタイル数 × 5アングル (表示して透明性を出す)
- [一括生成する (N枚)] → ⑤へ (fade遷移)

### 4.7 ⑤ 生成中画面

```
┌────────────────────────────────────────────────────────────┐
│                                                   [終了]   │
│                                                            │
│                     スタイリング中...                        │
│                                                            │
│    ┌────────────────────────────────────────────────────┐  │
│    │ Style 1: レイヤーボブ                                │  │
│    │ ████████████████░░░░░░  正面✓ 斜め✓ 横... 80%       │  │
│    │                         ← ProgressBoard.tsx         │  │
│    └────────────────────────────────────────────────────┘  │
│    ┌────────────────────────────────────────────────────┐  │
│    │ Style 2: ショートマッシュ                             │  │
│    │ █████████░░░░░░░░░░░░  正面✓ 斜め... 45%            │  │
│    └────────────────────────────────────────────────────┘  │
│    ┌────────────────────────────────────────────────────┐  │
│    │ Style 3: (アップロード)                               │  │
│    │ ███░░░░░░░░░░░░░░░░░  正面... 15%                   │  │
│    └────────────────────────────────────────────────────┘  │
│                                                            │
│                  完了したものから順次表示                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

- SSEストリームで完了イベントを受信 (useGenerate フック)
- 並行制限 (3件同時) で Gemini API に投げる
- SSEハートビート (15秒) でコネクション維持
- SSE切断時: 自動ポーリングフォールバック (3秒間隔でDB状態チェック)
- 個別プログレス表示 (各アングルの完了をチェックマークで)
- 完了したスタイルから順にタップで⑥プレビューに飛べる
- 全完了で自動的に⑥へ遷移 (fade)

### 4.8 ⑥ 結果画面 (比較ギャラリー)

2つのビューモードをセグメントコントロールで切替。

失敗した生成がある場合はバナーUIを表示 (リトライ対応)。

#### リトライUI (失敗生成バナー)

```
┌────────────────────────────────────────────────────────────┐
│ ← 戻る           結果                            [終了]    │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ N件の生成に失敗しました               ← destructive色   │ │
│ │ [S1 正面 リトライ] [S2 斜め リトライ]  ← 個別リトライ    │ │
│ │ (リトライ中: "S1 正面 ..." ローディング表示)              │ │
│ └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│ ... (以下、比較ビュー or 個別ビュー)                         │
```

- バナーは `failedGenerations.length > 0` 時のみ表示
- 各リトライボタン → `POST /api/sessions/:id/generations/:genId/retry`
- 楽観的UI更新: 即座に `status: 'generating'` → API結果で `completed` or `failed`
- `retryingIds` (Set) で並行リトライの重複防止

#### ビュー1: 比較ビュー (デフォルト)

```
┌────────────────────────────────────────────────────────────┐
│ [比較ビュー | 個別ビュー]                          [終了]   │
├────────────────────────────────────────────────────────────┤
│ [正面]  [斜め]  [横]  [後ろ]  [映え]  ← アングル切替       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│ │            │  │            │  │            │            │
│ │  生成結果   │  │  生成結果   │  │  生成結果   │            │
│ │  Style 1   │  │  Style 2   │  │  Style 3   │            │
│ │            │  │            │  │            │            │
│ │            │  │            │  │            │            │
│ │ レイヤーボブ │  │ ショートマッシュ│  │ ボブ+アッシュ │            │
│ │    ♡       │  │    ♡       │  │    ♡       │            │
│ └────────────┘  └────────────┘  └────────────┘            │
│                                                            │
│  タップ → 全画面拡大 (長押しBefore, ピンチズーム)              │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ [+ スタイル追加]  [撮り直し]  [まとめて共有]  [次のお客さまへ]│
└────────────────────────────────────────────────────────────┘
```

- アングルタブで切替 → 同一アングルで全スタイル横並び
- 「正面で見比べてどっちが似合う？」のような使い方

#### ビュー2: 個別ビュー

```
┌────────────────────────────────────────────────────────────┐
│ [比較ビュー | 個別ビュー]                          [終了]   │
├────────────────────────────────────────────────────────────┤
│ [Style 1]  [Style 2]  [Style 3]  ← スタイル切替            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│ │  正面     │  │  斜め     │  │  横      │  │  後ろ     │   │
│ │          │  │          │  │          │  │          │   │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐   │
│ │            映え写真 (大きく表示)                        │   │
│ │                                                      │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                            │
│ [お気に入り ♡]  [この画像を共有]                             │
├────────────────────────────────────────────────────────────┤
│ [+ スタイル追加]  [撮り直し]  [まとめて共有]  [次のお客さまへ]│
└────────────────────────────────────────────────────────────┘
```

- 1スタイルの全アングルを一覧 + 映え写真を大きく表示
- タップで全画面拡大 (長押しBefore, ピンチズーム)

#### ジェスチャー操作 (全画面拡大時)

| 操作 | アクション | フィードバック |
|------|----------|------------|
| 長押し | Before (お客さんの元写真) に切替 | ハプティック (軽) |
| 長押し解除 | After (生成結果) に戻る | — |
| ピンチ | ズームイン/アウト | — |
| ダブルタップ | ズームイン (2x) | — |
| スワイプ右 | 前の画像へ | — |
| スワイプ左 | 次の画像へ | — |

#### アクションボタン

| ボタン | 動作 | API |
|--------|------|-----|
| + スタイル追加 | ③スタイルを探す画面 (撮影写真は保持) | — (画面遷移のみ) |
| まとめて共有 | ShareSheet表示 (AirDrop/LINE/写真保存) | — (ローカル処理) |
| この画像を共有 | 個別画像をShareSheet表示 | — (ローカル処理) |
| お気に入り ♡ | 個別generation の `is_favorite` トグル | `PATCH /api/sessions/[id]/generations/[genId]` |
| 撮り直し | ②撮影画面 (セッション保持、カメラに戻る) | — (画面遷移のみ) |
| リトライ | 失敗した生成を再実行 (バナー内個別ボタン) | `POST /api/sessions/[id]/generations/[genId]/retry` |
| 次のお客さまへ | 確認ダイアログ → セッション閉鎖 → ①ウェルカムへ | `PATCH /api/sessions/[id]` `{ is_closed: true }` |

### 4.9 「次のお客さまへ」確認ダイアログ

```
セッションを終了しますか？
画像は履歴からいつでも確認できます。

[キャンセル]  [終了する]
```

- [終了する] → `PATCH /api/sessions/{id} { is_closed: true }` → ①へ
- アプリのメモリ上のセッションデータもクリア

---

## 5. 生成マトリクス

### 5.1 1スタイルあたり5アングル生成

| angle | プロンプト追加指示 | 用途 |
|-------|-------------------|------|
| `front` | front view, looking directly at camera | Before/After基本比較 |
| `three_quarter` | three-quarter view, face slightly turned | 立体感の確認 |
| `side` | side profile view | シルエット確認 |
| `back` | back view, showing the full hairstyle from behind | レイヤー・後ろ姿 |
| `glamour` | professional beauty editorial portrait, soft bokeh background, studio lighting | SNS投稿・サロン実績用 |

### 5.2 コスト計算

| スタイル数 | 枚数/人 | コスト/人 |
|----------|--------|----------|
| 1 | 5枚 | $0.20 |
| 2 | 10枚 | $0.39 |
| 3 | 15枚 | $0.59 |
| 4 | 20枚 | $0.78 |

月間見積もり:

| お客さん数/月 | 平均スタイル数 | 月額Gemini費 |
|-------------|-------------|-------------|
| 100人 | 2 | $39 |
| 500人 | 3 | $292 |
| 1000人 | 3 | $585 |

### 5.3 プロンプトテンプレート

```typescript
// packages/shared/src/constants/prompts.ts

const ANGLE_INSTRUCTIONS: Record<string, string> = {
  front: 'Show the person from the front, looking directly at the camera.',
  three_quarter: 'Show the person from a three-quarter angle, face slightly turned to the side.',
  side: 'Show the person in a side profile view.',
  back: 'Show the person from behind, displaying the full back view of the hairstyle.',
  glamour: 'Create a professional beauty editorial portrait with soft bokeh background, beautiful studio lighting, and a magazine-quality aesthetic.',
};

export const buildPrompt = (params: {
  mode: 'style' | 'color' | 'style_and_color';
  angle: string;
  colorName?: string;
  colorHex?: string;
  colorDescription?: string;
}): string => {
  const angleInst = ANGLE_INSTRUCTIONS[params.angle];
  const base = params.mode === 'style'
    ? `Apply the exact hairstyle from the second image to the person in the first image.`
    : params.mode === 'color'
    ? `Change ONLY the hair color of the person to ${params.colorName} (${params.colorHex}).`
    : `Apply the hairstyle from the second image AND change the hair color to ${params.colorName} (${params.colorHex}).`;

  return `${base}

${angleInst}

Rules:
- Keep the person's face, identity, skin tone, and facial expression EXACTLY the same.
- The result must look like a natural photograph taken in a beauty salon.
- The hair should look freshly styled, with natural shine and movement.
- Preserve realistic lighting consistent with the angle.`;
};
```

---

## 6. Supabase テーブル設計

### 6.1 DDL

```sql
-- ============================================================
-- extensions
-- ============================================================
create extension if not exists "uuid-ossp";

-- ============================================================
-- staffs: スタッフマスタ
-- ============================================================
create table public.staffs (
  id              uuid primary key default uuid_generate_v4(),
  auth_user_id    uuid unique references auth.users(id) on delete cascade,
  entra_id_oid    text unique,
  display_name    text not null,
  email           text not null,
  store_code      text,
  role            text not null default 'stylist'
                  check (role in ('admin', 'manager', 'stylist')),
  is_active       boolean not null default true,
  hubspot_owner_id text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_staffs_store on public.staffs(store_code);
create index idx_staffs_entra on public.staffs(entra_id_oid);

-- ============================================================
-- catalog_categories
-- ============================================================
create table public.catalog_categories (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  display_name    text not null,
  icon_name       text,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- catalog_items: 髪型カタログ
-- ============================================================
create table public.catalog_items (
  id              uuid primary key default uuid_generate_v4(),
  category_id     uuid references public.catalog_categories(id) on delete set null,
  title           text not null,
  description     text,
  image_path      text not null,
  thumbnail_path  text,
  tags            text[] default '{}',
  gender          text not null default 'unisex'
                  check (gender in ('female', 'male', 'unisex')),
  popularity      integer not null default 0,
  is_active       boolean not null default true,
  created_by      uuid references public.staffs(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_catalog_category on public.catalog_items(category_id);
create index idx_catalog_tags on public.catalog_items using gin(tags);
create index idx_catalog_active on public.catalog_items(is_active) where is_active = true;
create index idx_catalog_popularity on public.catalog_items(popularity desc);

-- ============================================================
-- hair_colors: ヘアカラーマスタ
-- ============================================================
create table public.hair_colors (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  name_en         text,
  hex_code        text not null,
  color_family    text not null
                  check (color_family in (
                    'ブラック系', 'ブラウン系', 'ベージュ系', 'アッシュ系',
                    'グレー系', 'レッド系', 'ピンク系', 'オレンジ系',
                    'イエロー系', 'グリーン系', 'ブルー系', 'パープル系',
                    'ハイトーン系'
                  )),
  level           integer,
  sort_order      integer not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_hair_colors_family on public.hair_colors(color_family);

-- ============================================================
-- sessions: 施術セッション (1お客さん = 1session)
-- ============================================================
create table public.sessions (
  id                    uuid primary key default uuid_generate_v4(),
  staff_id              uuid not null references public.staffs(id),
  store_code            text,
  customer_photo_path   text not null,
  ai_model              text not null default 'gemini-3.1-flash-image-preview',
  is_closed             boolean not null default false,
  closed_at             timestamptz,
  hubspot_contact_id    text,
  hubspot_deal_id       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_sessions_staff on public.sessions(staff_id);
create index idx_sessions_store on public.sessions(store_code);
create index idx_sessions_created on public.sessions(created_at desc);
create index idx_sessions_closed on public.sessions(is_closed);
create index idx_sessions_hubspot on public.sessions(hubspot_contact_id)
  where hubspot_contact_id is not null;

-- ============================================================
-- session_generations: スタイル × アングル (1枚 = 1行)
-- ============================================================
create table public.session_generations (
  id                    uuid primary key default uuid_generate_v4(),
  session_id            uuid not null references public.sessions(id) on delete cascade,

  -- スタイルグルーピング
  style_group           integer not null,       -- 同じスタイルの連番 (1,2,3...)
  angle                 text not null
                        check (angle in ('front', 'three_quarter', 'side', 'back', 'glamour')),

  -- スタイル参照 (style_group内で共通)
  simulation_mode       text not null default 'style'
                        check (simulation_mode in ('style', 'color', 'style_and_color')),
  reference_type        text not null
                        check (reference_type in ('catalog', 'upload', 'pinterest', 'color_only')),
  reference_photo_path  text,
  reference_source_url  text,                   -- Pinterest等の元URL
  catalog_item_id       uuid references public.catalog_items(id),
  hair_color_id         uuid references public.hair_colors(id),
  hair_color_custom     text,
  style_label           text,                   -- 表示用ラベル

  -- AI生成結果
  generated_photo_path  text,
  ai_prompt             text,
  ai_latency_ms         integer,
  ai_cost_usd           numeric(8,4),
  status                text not null default 'pending'
                        check (status in ('pending', 'generating', 'completed', 'failed')),

  -- 選択
  is_favorite           boolean not null default false,
  is_selected           boolean not null default false,

  created_at            timestamptz not null default now()
);

create index idx_generations_session on public.session_generations(session_id);
create index idx_generations_style on public.session_generations(session_id, style_group);
create index idx_generations_status on public.session_generations(status);
create index idx_generations_favorite on public.session_generations(is_favorite)
  where is_favorite = true;

-- ============================================================
-- RLS
-- ============================================================
alter table public.staffs enable row level security;
alter table public.catalog_categories enable row level security;
alter table public.catalog_items enable row level security;
alter table public.hair_colors enable row level security;
alter table public.sessions enable row level security;
alter table public.session_generations enable row level security;

create policy "staffs_select_own" on public.staffs
  for select using (auth_user_id = auth.uid());
create policy "staffs_select_admin" on public.staffs
  for select using (
    exists (select 1 from public.staffs s
            where s.auth_user_id = auth.uid() and s.role in ('admin', 'manager'))
  );

create policy "catalog_select_all" on public.catalog_items for select using (true);
create policy "catalog_insert_admin" on public.catalog_items for insert with check (
  exists (select 1 from public.staffs s
          where s.auth_user_id = auth.uid() and s.role in ('admin', 'manager'))
);
create policy "catalog_update_admin" on public.catalog_items for update using (
  exists (select 1 from public.staffs s
          where s.auth_user_id = auth.uid() and s.role in ('admin', 'manager'))
);
create policy "catalog_categories_select_all" on public.catalog_categories
  for select using (true);
create policy "hair_colors_select_all" on public.hair_colors for select using (true);

create policy "sessions_select_own" on public.sessions for select using (
  staff_id in (select id from public.staffs where auth_user_id = auth.uid())
);
create policy "sessions_select_admin" on public.sessions for select using (
  exists (select 1 from public.staffs s
          where s.auth_user_id = auth.uid() and s.role in ('admin', 'manager'))
);
create policy "sessions_insert_own" on public.sessions for insert with check (
  staff_id in (select id from public.staffs where auth_user_id = auth.uid())
);
create policy "sessions_update_own" on public.sessions for update using (
  staff_id in (select id from public.staffs where auth_user_id = auth.uid())
);

create policy "generations_select" on public.session_generations
  for select using (session_id in (select id from public.sessions));
create policy "generations_insert" on public.session_generations
  for insert with check (session_id in (select id from public.sessions));
create policy "generations_update" on public.session_generations
  for update using (session_id in (select id from public.sessions));

-- ============================================================
-- トリガー
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;

create trigger trg_staffs_updated before update on public.staffs
  for each row execute function public.update_updated_at();
create trigger trg_catalog_items_updated before update on public.catalog_items
  for each row execute function public.update_updated_at();
create trigger trg_sessions_updated before update on public.sessions
  for each row execute function public.update_updated_at();

-- カタログ使用回数カウント
create or replace function public.increment_catalog_popularity()
returns trigger as $$
begin
  if new.catalog_item_id is not null and new.status = 'completed' then
    update public.catalog_items set popularity = popularity + 1
    where id = new.catalog_item_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_generations_popularity
  after update of status on public.session_generations
  for each row
  when (new.status = 'completed' and new.catalog_item_id is not null
        and new.angle = 'front')
  execute function public.increment_catalog_popularity();
```

### 6.2 Supabase Storage バケット

| バケット名 | 用途 | アクセス | 保持 |
|-----------|------|---------|------|
| `customer-photos` | お客さんの顔写真 | private | 90日 |
| `reference-photos` | 参照髪型画像 | private | 90日 |
| `generated-photos` | AI生成結果画像 | private | 90日 |
| `catalog-photos` | カタログ用髪型画像 | public (読取) | 永続 |

---

## 7. API 設計

### 7.1 エンドポイント一覧

| Method | Path | 説明 | 認証 |
|--------|------|------|------|
| **セッション** | | | |
| POST | `/api/sessions` | 新セッション作成 | required |
| GET | `/api/sessions` | セッション一覧 (履歴パネル用, ページネーション対応) | required |
| GET | `/api/sessions/[id]` | セッション詳細 + generations (signed URL付き) | required |
| PATCH | `/api/sessions/[id]` | セッション更新 (`is_closed`, `customer_photo_path`) | required |
| **生成 (Generation)** | | | |
| POST | `/api/generate` | 一括シミュレーション生成 (SSE) | required |
| PATCH | `/api/sessions/[id]/generations/[genId]` | 生成結果更新 (`is_favorite`, `is_selected`) | required |
| POST | `/api/sessions/[id]/generations/[genId]/retry` | 失敗した生成のリトライ (AI再実行) | required |
| **画像** | | | |
| POST | `/api/upload` | 画像アップロード (customer-photos / reference-photos) | required |
| POST | `/api/proxy-image` | 外部画像プロキシ取得 (Pinterest画像) | required |
| **カタログ** | | | |
| GET | `/api/catalog` | カタログ一覧 (ソート・カテゴリ・検索・ページネーション) | required |
| POST | `/api/catalog` | カタログ登録 | admin/manager |
| PATCH | `/api/catalog/[id]` | カタログ更新 | admin/manager |
| DELETE | `/api/catalog/[id]` | カタログ論理削除 (`is_active = false`) | admin/manager |
| **マスタ** | | | |
| GET | `/api/colors` | ヘアカラー一覧 (`sort_order`順) | required |
| **その他** | | | |
| GET | `/api/health` | ヘルスチェック | public |

### 7.2 Sessions CRUD 詳細

#### POST /api/sessions — 新セッション作成

**リクエスト:**
```typescript
{ customer_photo_path: string; store_code?: string }
```

**レスポンス (201):**
```typescript
{ session: Session }
```

#### GET /api/sessions — セッション一覧 (履歴パネル)

**クエリパラメータ:** `page` (default: 1), `limit` (default: 20)

**レスポンス:**
```typescript
{
  sessions: Array<Session & {
    generation_count: number;
    first_front_photo: string | null;  // signed URL (正面サムネイル)
  }>;
  total: number;
  page: number;
  limit: number;
}
```

- stylist: 自分のセッションのみ
- admin/manager: 全セッション
- 正面アングルの完了済み生成画像1枚を signed URL で返却 (サムネイル用)

#### GET /api/sessions/[id] — セッション詳細

**レスポンス:**
```typescript
{
  session: Session & {
    session_generations: Array<Generation & { photo_url: string | null }>;
    customer_photo_url: string | null;  // signed URL
  }
}
```

- 全 generation の `generated_photo_path` を signed URL に変換
- `customer_photo_path` も signed URL に変換
- 所有者 or admin/manager のみアクセス可能 (それ以外: 403)

#### PATCH /api/sessions/[id] — セッション更新

**リクエスト (部分更新):**
```typescript
{
  is_closed?: boolean;           // true → closed_at も自動設定
  customer_photo_path?: string;  // 撮り直し時
}
```

**レスポンス:** `{ session: Session }`

### 7.3 POST /api/generate — 一括生成

**リクエスト:**
```typescript
interface GenerateRequest {
  session_id: string;
  styles: {
    simulation_mode: 'style' | 'color' | 'style_and_color';
    reference_type: 'catalog' | 'upload' | 'pinterest' | 'color_only';
    reference_photo_path?: string;
    reference_source_url?: string;
    catalog_item_id?: string;
    hair_color_id?: string;
    hair_color_custom?: string;
    style_label?: string;
  }[];
  angles?: ('front' | 'three_quarter' | 'side' | 'back' | 'glamour')[];
    // default: ['front', 'three_quarter', 'side', 'back', 'glamour']
}
```

**レスポンス (ストリーミング — SSE):**
```typescript
// Server-Sent Events で完了した画像を順次送信
interface GenerationEvent {
  type: 'generation_completed' | 'generation_failed' | 'all_completed';
  generation_id?: string;
  style_group?: number;
  angle?: string;
  photo_url?: string;
  storage_path?: string;
  ai_latency_ms?: number;
  error?: string;
}
```

SSEにすることで、15枚を全部待たずに完了順にUIに表示できる。

### 7.4 PATCH /api/sessions/[id]/generations/[genId] — 生成結果更新

結果画面でのお気に入りトグル・選択状態管理に使用。

**リクエスト:**
```typescript
interface UpdateGenerationRequest {
  is_favorite?: boolean;  // お気に入りトグル
  is_selected?: boolean;  // 選択状態トグル
}
```

**レスポンス:**
```typescript
{ generation: SessionGeneration }
```

- 権限チェック: セッション所有者 or admin/manager のみ更新可能
- 不正フィールドは無視 (`is_favorite`, `is_selected` 以外は400)

### 7.5 POST /api/sessions/[id]/generations/[genId]/retry — リトライ

失敗した生成を再実行。Result画面のリトライUIから呼び出される。

**フロー:**
```
status が 'failed' の generation のみ受付 (それ以外は 409 Conflict)
→ status を 'generating' にアトミック更新
→ 元のスタイル情報 (simulation_mode, reference, color) を使ってAI再実行
→ 成功: status='completed', photo_url返却
→ 失敗: status='failed' に戻す, 502返却
```

**レスポンス (成功):**
```typescript
{
  generation_id: string;
  status: 'completed';
  photo_url: string;
  ai_latency_ms: number;
}
```

### 7.6 POST /api/upload — 画像アップロード

**リクエスト:** `multipart/form-data`
```
file: Blob          // 画像ファイル
session_id: string  // セッションID
bucket: string      // 'customer-photos' | 'reference-photos' (デフォルト: customer-photos)
```

**処理:**
- `sharp` で1536px以下にリサイズ (JPEG品質85%)
- サイズバリデーション (上限チェック)
- `customer-photos` の場合はサムネイルも生成
- Signed URL を返却

**レスポンス:**
```typescript
{ storage_path: string; url: string }
```

### 7.7 POST /api/proxy-image — Pinterest画像プロキシ

**リクエスト:**
```typescript
{ url: string; session_id: string }
```

**セキュリティ:**
- ホワイトリスト: `i.pinimg.com`, `pinimg.com`, `pinterest.com` のみ許可
- プロトコル: `http:`, `https:` のみ
- サイズ上限チェック

**処理:** サーバーサイドで画像取得 → `sharp` リサイズ → `reference-photos` バケットに保存

**レスポンス:**
```typescript
{ storage_path: string; url: string }
```

### 7.8 Catalog CRUD 詳細

#### GET /api/catalog — カタログ一覧

**クエリパラメータ:**
| パラメータ | デフォルト | 説明 |
|-----------|-----------|------|
| `category_id` | — | カテゴリフィルタ (UUID) |
| `gender` | — | `'female'` / `'male'` / `'unisex'` |
| `search` | — | タイトルの部分一致検索 (ilike) |
| `sort` | `'popularity'` | `'popularity'` or `'created_at'` |
| `page` | `1` | ページ番号 |
| `limit` | `30` | 1ページあたり件数 |

**レスポンス:**
```typescript
{
  items: Array<CatalogItem & {
    category: CatalogCategory | null;
    image_url: string | null;      // signed URL
    thumbnail_url: string | null;  // signed URL
  }>;
  total: number;
}
```

- `is_active = true` のみ返却
- `catalog-photos` バケットの signed URL を付与

#### POST /api/catalog — カタログ登録 (admin/manager)

**リクエスト:**
```typescript
{
  title: string;
  description?: string;
  image_path: string;
  thumbnail_path?: string;
  category_id?: string;
  tags?: string[];
  gender?: 'female' | 'male' | 'unisex';
}
```

**レスポンス (201):** `{ item: CatalogItem & { category } }`

#### PATCH /api/catalog/[id] — カタログ更新 (admin/manager)

**リクエスト (部分更新):**
```typescript
{
  title?: string;
  description?: string;
  image_path?: string;
  thumbnail_path?: string;
  category_id?: string;
  tags?: string[];
  gender?: string;
}
```

**レスポンス:** `{ item: CatalogItem }`

#### DELETE /api/catalog/[id] — カタログ論理削除 (admin/manager)

論理削除 (`is_active = false`)。物理削除は行わない。

**レスポンス:** `{ success: true }`

### 7.9 GET /api/colors — ヘアカラー一覧

**レスポンス:**
```typescript
{
  colors: HairColor[]  // sort_order 昇順, is_active = true のみ
}
```

### 7.10 AI Gateway

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

BFF側で styles × angles のマトリクスを展開し、`Promise.allSettled` で並列実行。各完了時にSSEで送信。

---

## 8. リポジトリ構成

```
revol-mirror/
├── apps/
│   ├── mobile/                              # Expo アプリ
│   │   ├── app/
│   │   │   ├── _layout.tsx                  # Root layout (AuthProvider)
│   │   │   ├── (auth)/login.tsx             # SSO ログイン
│   │   │   ├── (main)/
│   │   │   │   ├── _layout.tsx              # Stack (画面遷移アニメーション定義)
│   │   │   │   ├── index.tsx                # ① ウェルカム
│   │   │   │   ├── camera.tsx               # ② 撮影 (expo-camera直接)
│   │   │   │   ├── explore.tsx              # ③ スタイルを探す
│   │   │   │   ├── confirm.tsx              # ④ 確認
│   │   │   │   ├── generating.tsx           # ⑤ 生成中
│   │   │   │   ├── result.tsx               # ⑥ 結果 (リトライUI含む)
│   │   │   │   └── (admin)/
│   │   │   │       └── sessions.tsx         # 管理者: 施術ログ
│   │   │   └── settings.tsx                 # 設定・ログアウト
│   │   ├── components/
│   │   │   ├── camera/
│   │   │   │   ├── FaceGuide.tsx            # 楕円ガイド
│   │   │   │   └── ShutterButton.tsx        # シャッターボタン
│   │   │   ├── explore/
│   │   │   │   ├── PinterestBrowser.tsx     # Pinterest WebView + 画像選択モーダル
│   │   │   │   ├── CatalogGrid.tsx          # カタログ一覧 (ソート切替)
│   │   │   │   ├── ImageUploader.tsx        # 画像アップロード
│   │   │   │   ├── ColorPalette.tsx         # カラーパレット
│   │   │   │   └── StyleTray.tsx            # 選択トレイ (下部固定)
│   │   │   ├── result/
│   │   │   │   ├── CompareGrid.tsx          # 比較ビュー (アングル別)
│   │   │   │   ├── DetailView.tsx           # 個別ビュー (スタイル別)
│   │   │   │   ├── FullscreenViewer.tsx     # 全画面拡大 (Before/After内蔵)
│   │   │   │   └── ShareSheet.tsx           # 共有シート
│   │   │   ├── generating/
│   │   │   │   └── ProgressBoard.tsx        # スタイル別プログレス (アニメーション付き)
│   │   │   ├── history/
│   │   │   │   └── HistoryPanel.tsx         # 履歴パネル (ハーフシート)
│   │   │   └── common/
│   │   │       ├── ExitButton.tsx           # [終了] 常設ボタン
│   │   │       ├── ExitDialog.tsx           # 終了確認ダイアログ
│   │   │       └── HapticButton.tsx         # Reanimated press animation付きボタン
│   │   ├── hooks/
│   │   │   ├── useSession.ts                # create / load / close
│   │   │   ├── useGenerate.ts               # SSE受信 + ポーリングフォールバック + リトライ
│   │   │   ├── useCatalog.ts                # カタログ取得 (ソート・カテゴリ)
│   │   │   ├── useCamera.ts                 # カメラ制御 (撮影・切替・retake)
│   │   │   ├── usePinterest.ts              # Pinterest画像プロキシ
│   │   │   └── useHistory.ts                # 履歴パネル (ページネーション)
│   │   ├── lib/
│   │   │   ├── supabase.ts                  # Supabase クライアント (SecureStore)
│   │   │   ├── api.ts                       # apiGet/Post/Patch/Delete/SSE/uploadFile
│   │   │   ├── types.ts                     # SelectedStyle, Generation 型定義
│   │   │   ├── constants.ts                 # ANGLES, ANGLE_LABELS
│   │   │   ├── pinterest-inject.ts          # WebView JS注入
│   │   │   └── theme.ts                     # デザインシステム定数
│   │   ├── __tests__/                       # vitest テスト
│   │   │   ├── lib/api.test.ts
│   │   │   ├── hooks/*.test.ts              # 5ファイル
│   │   │   └── integration/full-user-flow.test.ts
│   │   ├── app.json
│   │   ├── eas.json
│   │   ├── tailwind.config.ts
│   │   ├── vitest.config.ts
│   │   ├── nativewind-env.d.ts
│   │   └── package.json
│   │
│   └── api/                                 # Next.js 16 BFF
│       ├── app/api/
│       │   ├── sessions/
│       │   │   ├── route.ts                 # POST (作成) / GET (一覧)
│       │   │   └── [id]/
│       │   │       ├── route.ts             # GET (詳細) / PATCH (更新)
│       │   │       └── generations/
│       │   │           └── [genId]/
│       │   │               ├── route.ts     # PATCH (お気に入り/選択)
│       │   │               └── retry/
│       │   │                   └── route.ts # POST (リトライ)
│       │   ├── generate/route.ts            # POST (SSE一括生成)
│       │   ├── proxy-image/route.ts         # POST (Pinterest画像プロキシ)
│       │   ├── catalog/
│       │   │   ├── route.ts                 # GET (一覧) / POST (登録)
│       │   │   └── [id]/route.ts            # PATCH (更新) / DELETE (論理削除)
│       │   ├── colors/route.ts              # GET (カラー一覧)
│       │   ├── upload/route.ts              # POST (画像アップロード)
│       │   └── health/route.ts              # GET (ヘルスチェック)
│       ├── lib/
│       │   ├── auth.ts                      # JWT検証 + staffs照合 + 権限チェック
│       │   ├── ai-gateway.ts                # AIProvider インターフェース
│       │   ├── ai-providers/
│       │   │   ├── gemini.ts                # Gemini API実装
│       │   │   └── hairfast.ts              # HairFastGAN (Phase 2用)
│       │   ├── supabase-admin.ts            # Service Role Keyクライアント (Proxy)
│       │   ├── image-utils.ts               # sharp リサイズ / サムネイル / バリデーション
│       │   └── concurrency.ts               # 並行制限 / タイムアウトユーティリティ
│       ├── middleware.ts                     # CORS等
│       ├── vercel.json                      # デプロイ設定
│       ├── __tests__/                       # vitest テスト
│       │   ├── helpers/
│       │   │   ├── setup.ts                 # 環境変数設定
│       │   │   └── request.ts               # NextRequest ヘルパー
│       │   ├── unit/*.test.ts               # 8ファイル (全APIルート)
│       │   └── integration/full-flow.test.ts
│       ├── vitest.config.ts
│       └── package.json
│
├── packages/
│   └── shared/                              # @revol-mirror/shared
│       └── src/
│           ├── types/
│           │   ├── database.ts              # DB型定義 (Staff, Session, Generation等)
│           │   ├── api.ts                   # API リクエスト/レスポンス型
│           │   └── hubspot.ts               # HubSpot型 (将来用)
│           ├── validators/
│           │   ├── generate.ts              # zod: GenerateRequest
│           │   ├── session.ts               # zod: CreateSession, UpdateSession
│           │   └── catalog.ts               # zod: CatalogItem CRUD
│           ├── constants/
│           │   ├── hair-colors.ts           # COLOR_FAMILIES, HAIR_COLOR_SEEDS
│           │   ├── prompts.ts               # buildPrompt(), COST_PER_IMAGE_USD
│           │   ├── angles.ts                # ANGLES, ANGLE_LABELS, ANGLE_INSTRUCTIONS
│           │   └── design-tokens.ts         # DARK_THEME, LIGHT_THEME, RADIUS等
│           ├── index.ts                     # 全エクスポート
│           ├── tsconfig.json
│           └── package.json
│
├── turbo.json
└── package.json
```

---

## 9. 非同期処理アーキテクチャ

### 9.1 生成パイプライン

```
Client (SSE)                  Server (BFF)
─────────────                 ─────────────
apiSSE POST /api/generate ──→ 認証 + セッション確認
                              ↓
                              スタイルデータ事前取得 (並列, style毎1回)
                              ↓
                              session_generations に pending レコード一括INSERT
                              ↓
                              ReadableStream 開始 (SSE)
                              ├── Heartbeat (15秒間隔, `: heartbeat\n\n`)
                              ├── ConcurrencyLimiter (並行3件制限)
                              │   ├── Task 1: style1/front
                              │   │   ├── status → 'generating'
                              │   │   ├── AI呼び出し (60秒タイムアウト)
                              │   │   ├── Storage upload
                              │   │   ├── status → 'completed'
                              │   │   └── SSE: generation_completed
                              │   ├── Task 2: style1/three_quarter
                              │   │   └── (同上)
                              │   └── ... (全タスク)
                              ├── 全完了: SSE all_completed
                              └── Stream close
                              
SSE受信 ←──────────────────── data: {"type":"generation_completed",...}
(onEvent)                     data: {"type":"all_completed"}
                              
SSE切断時 ←─── フォールバック: ポーリング (3秒間隔, GET /api/sessions/:id)
```

### 9.2 並行制御

| パラメータ | 値 | 目的 |
|-----------|-----|------|
| 最大並行数 | 3 | Gemini APIレート制限保護 |
| AI呼び出しタイムアウト | 60秒 | ハング防止 |
| SSEハートビート間隔 | 15秒 | プロキシ/LBのコネクション維持 |
| ポーリング間隔 | 3秒 | SSE切断時のフォールバック |
| ポーリング最大試行 | 60回 (3分) | 永久ポーリング防止 |

### 9.3 リトライ機構

- Result画面に失敗生成のバナーUI表示
- 個別リトライボタン → `POST /retry` → アトミック状態遷移 (`failed` → `generating`)
- 楽観的UI更新 (即座にローディング表示、失敗時は元に戻す)
- 同じ generation を並行リトライしないようアトミック WHERE 条件 (`status = 'failed'`)

### 9.4 データベース状態管理

```
pending → generating → completed
                     → failed → (retry) → generating → completed / failed
```

- `pending`: INSERT直後
- `generating`: AI呼び出し開始時にアトミック更新
- `completed`: AI成功 + Storage upload完了
- `failed`: AIエラー or タイムアウト (best-effortで更新)

---

## 10. テストインフラ

### 10.1 フレームワーク

| 項目 | 値 |
|------|-----|
| テストランナー | vitest v4 |
| テスト合計 | 75テスト (API: 47, Mobile: 28) |
| 実行時間 | API: ~260ms, Mobile: ~200ms |

### 10.2 API テスト (apps/api/__tests__)

| ファイル | テスト数 | カバレッジ |
|---------|---------|----------|
| `unit/health.test.ts` | 1 | GET /api/health |
| `unit/sessions.test.ts` | 5 | POST /api/sessions (400/201/401/500), GET /api/sessions |
| `unit/session-detail.test.ts` | 7 | GET/PATCH /api/sessions/[id] (signed URL, 404, 403, close, update) |
| `unit/generations.test.ts` | 6 | PATCH generations (is_favorite, is_selected, 400, 401, 404, 403) |
| `unit/colors.test.ts` | 4 | GET /api/colors (success, 401, 500, empty) |
| `unit/upload.test.ts` | 6 | POST /api/upload (success, file欠落, session_id欠落, 401, 413, 500) |
| `unit/proxy-image.test.ts` | 7 | POST /api/proxy-image (success, params, URL制限, FTP拒否, 401, 502, 413) |
| `unit/catalog.test.ts` | 6 | GET/POST /api/catalog (signed URL, 401, 500, empty, insert, error) |
| `integration/full-flow.test.ts` | 5 | create→update→close, favorite toggle, pagination |

### 10.3 Mobile テスト (apps/mobile/__tests__)

| ファイル | テスト数 | カバレッジ |
|---------|---------|----------|
| `lib/api.test.ts` | 9 | apiGet/Post/Patch/Delete, uploadFile, apiSSE (イベント解析, エラー, ハートビート) |
| `hooks/useSession.test.ts` | 3 | create / load / close の API呼び出し検証 |
| `hooks/useHistory.test.ts` | 2 | ページネーション, loadMore |
| `hooks/useCatalog.test.ts` | 3 | ソート, カテゴリフィルタ, 新着順 |
| `hooks/useGenerate.test.ts` | 5 | SSE生成, リトライ成功/失敗/409, ポーリングフォールバック |
| `hooks/usePinterest.test.ts` | 2 | Pinterest画像プロキシ, URL拒否 |
| `integration/full-user-flow.test.ts` | 2 | Camera→Upload→Explore→Generate→Result→Retry→Close 全フロー + 履歴 |

### 10.4 モック戦略

- **API側**: `vi.hoisted()` + `vi.mock()` で Supabase / Auth をモック。各ルートハンドラを直接import して `NextRequest` を渡す
- **Mobile側**: `global.fetch` をモックして API レイヤー (`lib/api.ts`) を通じたリクエスト/レスポンスを検証
- **結合テスト**: インメモリDB (Map) で CRUD をシミュレート (API側)、URL パターンマッチのモックルーター (Mobile側)

---

## 11. 認証設計

Supabase Auth SAML SSO → Azure AD (Entra ID)。
Expoアプリ: `expo-auth-session` + `expo-web-browser` でSAMLフロー実行。
トークン: `expo-secure-store` にJWT保存。

### 11.1 認証フロー (BFF側)

```typescript
// apps/api/lib/auth.ts
export async function authenticate(req: NextRequest): Promise<{
  staffId: string;
  role: 'admin' | 'manager' | 'stylist';
  storeCode?: string;
}>
```

1. `Authorization: Bearer <jwt>` ヘッダーからJWT取得
2. `supabaseAdmin.auth.getUser(jwt)` でトークン検証
3. `staffs` テーブルから `auth_user_id` で照合 → `staffId`, `role`, `storeCode` 返却
4. 未認証/無効トークン → 401
5. `staffs` に該当なし → 403

### 11.2 権限マトリクス

| エンドポイント | stylist | manager | admin |
|-------------|---------|---------|-------|
| セッション CRUD | 自分のみ | 全店舗 | 全店舗 |
| 生成・リトライ | 自分のセッション | 全 | 全 |
| カタログ閲覧 | OK | OK | OK |
| カタログ登録/更新/削除 | NG (403) | OK | OK |
| カラー閲覧 | OK | OK | OK |

---

## 12. 環境変数

### apps/api (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-3.1-flash-image-preview
API_BASE_URL=https://revol-mirror-api.vercel.app
IMAGE_MAX_SIZE_MB=10
SESSION_RETENTION_DAYS=90
AI_CONCURRENCY=3                    # AI生成の最大並行数
GENERATION_TIMEOUT_MS=60000         # AI生成のタイムアウト (60秒)
```

### apps/mobile
```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
EXPO_PUBLIC_API_BASE_URL=https://revol-mirror-api.vercel.app
EXPO_PUBLIC_SSO_DOMAIN=company.com
# Optional: fixed SAML provider UUID
# EXPO_PUBLIC_SSO_PROVIDER_ID=00000000-0000-0000-0000-000000000000
```

---

## 13. 非機能要件

### 13.1 パフォーマンス
- AI画像生成 (1枚): 3-10秒
- 一括生成 (15枚並列): 15-30秒 (完了順にSSEで送信)
- アプリ起動: 2秒以内
- カタログ表示: 0.5秒以内
- Pinterest画像プロキシ: 3秒以内

### 13.2 プライバシー
- 「はじめる」で新セッション、「次のお客さまへ」で閉鎖
- 通常操作で前のお客さんの写真が見えない設計
- 履歴パネルは時刻+小サムネのみ (お客さん名なし)
- 管理者エリア (エクスポート等) はPIN/Face ID必須
- お客さん写真は90日で自動削除
- Pinterest参照画像は一時保存のみ (90日削除)

### 13.3 コスト見積もり (月次)
| 項目 | 500人/月 | 1000人/月 |
|------|---------|----------|
| Gemini API (平均3スタイル×5アングル) | $292 | $585 |
| Vercel Pro | 含む | 含む |
| Supabase Pro | 含む | 含む |
| Apple Developer | $99/年 | $99/年 |
| **合計** | **~$300/月** | **~$593/月** |

---

## 14. HubSpot連携 (将来用)

### 14.1 設計に埋め込み済みのフィールド
- `sessions.hubspot_contact_id`, `sessions.hubspot_deal_id`
- `staffs.hubspot_owner_id`
- `packages/shared/src/types/hubspot.ts`

### 14.2 将来実装時のフロー
```
Session閉鎖 → Supabase Edge Function → HubSpot Contact作成/更新
  - カスタムプロパティ: session_count, last_style, last_color, last_session_date
  - Timeline Event: "ヘアスタイルシミュレーション実施" (映え写真添付)
```

---

## 15. Phase 2 拡張計画

| 優先度 | 項目 |
|--------|------|
| ★★★ | HubSpot連携 |
| ★★★ | HairFastGAN (セルフホストAI) |
| ★★☆ | iPhone版 (お客さん向け, LINE連携) |
| ★★☆ | 履歴分析ダッシュボード |
| ★☆☆ | ARリアルタイム試着 |
| ★☆☆ | AI顔型分析→スタイル推薦 |

---

*Document Version: 1.4*
*Created: 2026-03-18*
*Last Updated: 2026-03-18*
*Author: Revol Corporation / DX推進*
