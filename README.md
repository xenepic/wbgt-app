# wbgt-app

現在地の暑さ指数（WBGT）と詳細な気象情報を表示する Expo (React Native) アプリ。

- WBGT画面: 現在地の最新WBGT値・5段階の危険度・発表時刻を表示
- Weather画面: 48時間分の時間別気温・降水・天気グラフと、週間予報を表示

詳しい仕様・アーキテクチャ・既知の課題は [CLAUDE.md](./CLAUDE.md) を参照してください。

## 構成

- リポジトリルート: フロントエンド（Expo / React Native / Expo Router）
- `backend/`: WBGTデータ取得・配信用のバックエンド（AWS CDK + Lambda + S3 + API Gateway）。フロントとは独立した`package.json`を持つ別プロジェクト

## セットアップ（フロントエンド）

```bash
npm install
npx expo start
```

起動後、表示されるQRコードを [Expo Go](https://expo.dev/go) で読み込むか、Android/iOSシミュレータで開いてください。

### テスト・型チェック

```bash
npm test                                  # jest-expo によるユニットテスト
node node_modules/typescript/bin/tsc --noEmit  # 型チェック
npm run lint                              # ESLint
```

## バックエンド（`backend/`）

```bash
cd backend
npm install
npx cdk synth   # CloudFormationテンプレートの生成確認
npx cdk diff    # 現在デプロイ済みの内容との差分確認
npx cdk deploy  # デプロイ（AWS認証情報が必要、事前にdiffを必ず確認する）
npx jest        # ユニットテスト
```

## ビルド・配布（EAS）

```bash
eas build -p android --profile preview     # 動作確認用APK（Play Storeを介さず直接インストール可能）
eas build -p android --profile production  # Play Store提出用 app-bundle (.aab)
```

## 主要技術スタック

- Expo SDK 53 / React Native / React 19、Expo Router（file-based routing）
- TanStack Query（データ取得・キャッシュ。AsyncStorageへの永続化込み）
- react-native-gifted-charts（気温グラフ）
- AWS CDK / Lambda / S3 / API Gateway（自前WBGT API）
- Open-Meteo API（気象詳細データ）
