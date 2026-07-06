# 背景透過ツール（個人専用・完全ブラウザ内AI処理）

画像をアップロードすると、AIが自動で背景を透過してPNGとして保存できる
**自分専用のWebツール**です。

## 特徴

- 画像は **一切外部に送信されません**。すべての処理はブラウザの中（あなたのスマホ・PC）で完結します。
- remove.bg のような外部APIは使用していません。
- 使用モデル: **briaai/RMBG-1.4**（軽量・高精度なオープンソースの背景除去モデル）
- 実行エンジン: **@huggingface/transformers**（Transformers.js） + **ONNX Runtime Web**
- 完全無料。サーバー費用・API利用料は一切発生しません。
- スマホ・PC両対応、レスポンシブデザイン、日本語UI。
- PWA対応（ホーム画面に追加してアプリのように使えます）。
- モデルを一度読み込めば、以降は **オフラインでも動作** します。

---

## 1. フォルダ構成

```
bg-remove-app/
├── package.json              依存パッケージ定義
├── next.config.mjs           Next.js設定（WASM/クロスオリジン設定など）
├── tailwind.config.ts         Tailwind CSS設定（チェッカーボード柄など）
├── postcss.config.mjs
├── tsconfig.json
├── public/
│   ├── manifest.json          PWAマニフェスト
│   ├── sw.js                  Service Worker（オフラインキャッシュ）
│   └── icons/                 PWAアイコン（192/512/maskable）
└── src/
    ├── app/
    │   ├── layout.tsx          共通レイアウト・PWAメタ情報
    │   ├── page.tsx            メイン画面
    │   ├── sw-register.tsx     Service Worker登録
    │   └── globals.css         全体スタイル
    ├── components/
    │   ├── ImageUploader.tsx   アップロード（選択/カメラ/D&D）
    │   ├── JobCard.tsx         1件分の処理結果カード
    │   ├── ImageComparison.tsx 前後比較スライダー（チェッカーボード表示）
    │   ├── CropModal.tsx       トリミング機能
    │   ├── ProcessingProgress.tsx  進捗バー表示
    │   ├── HistoryPanel.tsx    処理履歴（IndexedDB）
    │   └── ThemeToggle.tsx     ダークモード切り替え
    ├── hooks/
    │   └── useBackgroundRemoval.ts  処理状態管理フック
    ├── lib/
    │   ├── model.ts            AIモデルのロード・推論ロジック（本体）
    │   └── history.ts           IndexedDBによる履歴保存
    └── types/
        └── index.ts             共通の型定義
```

---

## 2. インストール方法

Node.js（18以上推奨）がインストールされたPCで、プロジェクトフォルダに移動して
以下を実行します。

```bash
cd bg-remove-app
npm install
```

> 依存パッケージはすべて無料のオープンソースパッケージのみです
> （`@huggingface/transformers` / `next` / `react` / `tailwindcss` など）。

---

## 3. 実行方法（開発モード）

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開くと使用できます。

スマホから同じWi-Fi内で試したい場合は、PCのIPアドレスを使って
`http://<PCのIPアドレス>:3000` にアクセスしてください
（例: `http://192.168.1.10:3000`）。

> 初回アクセス時、AIモデル（数十MB）がHugging Faceのサーバーから
> ダウンロードされ、ブラウザにキャッシュされます。これは「画像の送信」ではなく
> 「モデルのダウンロード」のみで、以後アップロードする画像は一切外部に送信されません。

---

## 4. ビルド方法（本番用）

```bash
npm run build
npm run start
```

`npm run start` で本番モードのサーバーが起動します（デフォルトで `http://localhost:3000`）。

### 常時起動しておきたい場合

自宅サーバーやRaspberry Piなどで常時稼働させたい場合は、
[pm2](https://pm2.keymetrics.io/)（無料）などのプロセス管理ツールと組み合わせると便利です。

```bash
npm install -g pm2
pm2 start npm --name "bg-remove-app" -- start
```

### 静的ホスティングについて

このアプリはNext.jsのサーバー機能（画像最適化やAPI Route）を使っていないため、
`next.config.mjs` に `output: "export"` を追加すれば静的HTMLとして出力し、
Cloudflare PagesやGitHub Pagesなど無料の静的ホスティングにもデプロイできます。

---

## 5. スマホのホーム画面に追加する方法（PWA）

ホーム画面に追加すると、アイコンをタップするだけで
アプリのようにフルスクリーンで起動できます。

### Androidの場合（Chrome）

1. スマホのChromeでこのツールのURLを開く
2. 右上の「⋮」（メニュー）をタップ
3. 「ホーム画面に追加」または「アプリをインストール」をタップ
4. 表示された名前を確認して「追加」をタップ
5. ホーム画面にアイコンが追加されます

### iPhoneの場合（Safari）

1. iPhoneのSafariでこのツールのURLを開く
   （※ Chromeなど他のブラウザではホーム画面追加が動作しないため、必ずSafariを使用してください）
2. 画面下部の「共有」ボタン（□に↑のアイコン）をタップ
3. メニューを下にスクロールし「ホーム画面に追加」をタップ
4. 名前を確認して右上の「追加」をタップ
5. ホーム画面にアイコンが追加されます

追加後は、機内モードでもモデル読み込み後であれば背景透過処理が可能です
（初回のモデルダウンロード時のみインターネット接続が必要です）。

---

## 6. 使い方

1. 「写真を選択」「カメラで撮影」、またはPCでは画像をドラッグ＆ドロップ
2. 自動でAIモデルが読み込まれ（初回のみ）、背景透過処理が始まります
3. 処理が終わると、元画像と透過後画像をスライダーで比較できます
4. 「PNGを保存」で透過PNGを端末に保存
5. 必要に応じて「トリミング」で不要な余白をカット
6. 複数枚まとめてアップロードすると自動で順番に一括処理されます
7. 「処理履歴」から過去に処理した画像を再ダウンロードできます

---

## 7. 技術構成

| 項目 | 内容 |
|---|---|
| フレームワーク | Next.js 14 (App Router) / React 18 / TypeScript |
| スタイリング | Tailwind CSS |
| AI推論 | @huggingface/transformers (Transformers.js) + ONNX Runtime Web |
| モデル | briaai/RMBG-1.4（背景除去専用の軽量オープンソースモデル） |
| 実行デバイス | WebGPU対応ブラウザは自動でWebGPU、非対応はWASMにフォールバック |
| データ保存 | IndexedDB（処理履歴）／すべて端末内保存 |
| オフライン対応 | Service Worker（アプリ本体）＋ Cache Storage（AIモデル） |
| 費用 | 完全無料（サーバー費・API利用料なし） |

---

## 8. なぜ briaai/RMBG-1.4 を採用したか

- **精度**: 人物・物撮り・製品画像など幅広い被写体で高精度な背景分離が可能
- **速度**: 比較的軽量なモデルサイズで、WebGPU環境ではスマホでも数秒で処理可能
- **導入のしやすさ**: `@huggingface/transformers` の `background-removal` パイプラインから
  1行で呼び出せ、ONNX形式の重みが公式に配布されているためブラウザ実行と相性が良い
- IS-NetやRMBG-2.0系と比較しても、Transformers.js経由でのブラウザ実行実績が豊富で
  安定して動作します

---

## 9. 注意事項

- このツールは個人利用専用です。第三者への公開・商用配布は想定していません。
- モデルのライセンスは briaai/RMBG-1.4 の利用規約に従います
  （非商用利用ライセンスのため、個人利用の範囲でご使用ください）。
- 大きすぎる画像（4000px超など）は端末の性能によって処理に時間がかかる場合があります。
