# NFC連携型DXプラットフォーム

建築業界向けのNFC連携型デジタルトランスフォーメーション（DX）プラットフォームです。NFCカードをタッチするだけで、建築プロジェクトの3Dモデル、PDF資料、NFTギフトにアクセスできます。

## 🚀 特徴

- **📱 NFC連携**: NFCカード/タグから瞬時にアクセス
- **🏗️ 3D BIMモデル**: インタラクティブな建築モデル表示
- **📄 PDF資料管理**: 企業資料、提案書、実績資料の閲覧
- **🎁 NFTギフト**: デジタル建築アセットの無料配布
- **⚡ 高性能**: Service Worker による高速読み込み
- **📱 レスポンシブ**: モバイルファースト設計

## 🛠️ 技術スタック

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **3Dモデル**: Google Model Viewer
- **PDF表示**: PDF.js
- **PWA**: Service Worker, キャッシュ戦略
- **スタイリング**: カスタムCSS, レスポンシブデザイン

## 📦 プロジェクト構成

```
nfc-dx-platform/
├── index.html              # メインHTML
├── css/
│   └── styles.css          # メインスタイルシート
├── js/
│   └── main.js            # メインJavaScript
├── pdfs/                  # PDF資料ディレクトリ
│   ├── 会社概要.pdf
│   ├── 環境認証.pdf
│   ├── 施工実績.pdf
│   └── 提案書.pdf
├── building-model.glb     # 3Dモデルファイル
├── service-worker.js      # Service Worker
├── package.json          # プロジェクト設定
└── README.md             # このファイル
```

## 🚀 セットアップ & 起動

### 1. 依存関係のインストール（オプション）

```bash
npm install
```

### 2. 開発サーバー起動

```bash
# npm scripts使用
npm start
# または
npm run dev

# または直接HTTPサーバー起動
npx http-server . -p 8080 -c-1
```

### 3. ブラウザでアクセス

```
http://localhost:8080
```

## 📱 使用方法

### 基本操作
1. **資料閲覧**: 「資料を見る」から各種PDF資料にアクセス
2. **3Dモデル**: 「3Dモデルを見る」から建築モデルを体験
3. **NFTギフト**: 3Dモデル画面からNFTを無料受け取り

### PDF操作
- **ズーム**: +/- ボタンでズームイン/アウト
- **回転**: ⟲ ボタンで90度回転
- **フィット**: ⛶ ボタンでフィットモード切替
- **ナビゲーション**: ←→ でページ移動
- **パン**: マウス/タッチでドラッグ移動

### 3Dモデル操作
- **回転**: ドラッグで自由回転
- **ズーム**: ピンチ/スクロールでズーム
- **AR表示**: ARボタンでAR表示（対応デバイスのみ）

## ⚡ 性能最適化

### 実装済み最適化
- ✅ **Service Worker**: リソースキャッシュとオフライン対応
- ✅ **リソース preload**: 重要なCSS/JS/3Dモデルの先読み
- ✅ **DNS prefetch**: 外部CDNの事前DNS解決
- ✅ **遅延読み込み**: 3Dモデルの lazy loading
- ✅ **エラーハンドリング**: 包括的なエラー処理とユーザーフィードバック
- ✅ **モバイル最適化**: タッチ操作、レスポンシブデザイン

### 性能メトリクス
- **First Contentful Paint**: < 2秒
- **Largest Contentful Paint**: < 4秒
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 5秒

## 🔧 開発・ビルド

### コード品質チェック
```bash
# HTML検証
npm run validate

# Lighthouse性能監査
npm run lighthouse
```

### ビルド・最適化
```bash
# CSS/JS圧縮
npm run build

# 最適化実行
npm run optimize
```

## 📂 資料管理

### PDFファイル追加
1. `pdfs/` フォルダに新しいPDFを配置
2. `index.html` の document-grid に新しいアイテムを追加
3. Service Worker の LARGE_RESOURCES 配列を更新（必要に応じて）

### 3Dモデル更新
1. 新しい `.glb` ファイルを配置
2. `index.html` の model-viewer src 属性を更新
3. Service Worker キャッシュを更新

## 🎯 NFT機能

### 現在の実装
- モック機能（アラート表示）
- Web3ウォレット検出
- ユーザーフレンドリーなエラーメッセージ

### 本格実装時の拡張ポイント
- Web3.js/Ethers.js 統合
- スマートコントラクト連携
- ウォレット接続UI
- トランザクション処理

## 📱 PWA対応

### Service Worker機能
- **キャッシュ戦略**: Cache First (静的リソース), Network First (大きなファイル)
- **オフライン対応**: 基本機能のオフライン利用
- **自動更新**: 新しいバージョンの自動検出と更新

### インストール対応（将来の拡張）
- Web App Manifest
- ホーム画面追加
- スプラッシュスクリーン
- プッシュ通知

## 🔒 セキュリティ

### 実装済みセキュリティ対策
- **CSP**: Content Security Policy設定推奨
- **HTTPS**: 本番環境でのHTTPS必須
- **SRI**: Subresource Integrity（外部CDN）
- **CORS**: 適切なCORS設定

## 🌍 ブラウザ対応

### 対応ブラウザ
- ✅ Chrome 80+
- ✅ Safari 13+
- ✅ Firefox 75+
- ✅ Edge 80+
- ✅ モバイルブラウザ

### 必要な機能
- ES6+ サポート
- Service Worker
- Canvas API
- WebGL（3Dモデル用）

## 🤝 開発貢献

### 開発手順
1. このリポジトリをフォーク
2. フィーチャーブランチ作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. Pull Request を作成

### コーディング規約
- ES6+ モダンJavaScript使用
- セミコロン必須
- インデント: 4スペース
- コメント: 日本語OK

## 📄 ライセンス

MIT License - 詳細は `LICENSE` ファイルを参照

## 📧 サポート・お問い合わせ

- **開発者**: 戸田建設株式会社
- **Issues**: GitHub Issues
- **Email**: [contact@example.com](mailto:contact@example.com)

---

**🏗️ 戸田建設株式会社 DX推進プロジェクト**