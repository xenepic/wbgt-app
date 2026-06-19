# wbgt-app

現在地の暑さ指数（WBGT）と詳細な気象情報を表示する Expo (React Native) アプリ。

## 仕様（整理版）

### 機能要件

**WBGT画面（メイン）**
- 起動時に現在地（緯度経度→都道府県・市区町村）を取得し、位置情報の利用許可を求める。
- 現在時刻から直近の「発表区分」（5時/10時/17時のいずれか）を判定し、その区分に対応するWBGT予測値を取得・表示する。
  - 5:00〜9:59 → 当日5時発表分
  - 10:00〜16:59 → 当日10時発表分
  - 17:00〜翌4:59 → 当日（または前日）17時発表分。17時発表分は常に「明日」表記（17時の発表は翌日向けの予報という位置づけ）。
- WBGT値に応じて5段階の危険度と対応する背景色を表示する: 21未満=安全（緑） / 21〜24=注意（黄） / 25〜27=警戒（オレンジ） / 28〜30=厳重警戒（赤） / 31以上=危険（紫）。
- データの発表日時（JST）を画面下部に表示する。
- 通信失敗時は直前に取得できた値をローカルキャッシュ（端末内、TanStack Queryの永続化キャッシュ）から表示し、初回起動かつ通信失敗の場合のみエラーメッセージを表示する。再取得に失敗して前回値を表示している場合は、その旨を小さく表示する。
- 位置情報の利用が許可されない場合はエラーメッセージを表示する。

**Weather画面（気象詳細）**
- 同じ現在地に対して、48時間分の時間別気温・降水量・天気を横スクロールの折れ線グラフ＋アイコン帯で表示する。
- 週間（7日分）の最高/最低気温・天気アイコン・降水量を一覧表示する。
- 土曜/日曜の日付は色分け表示する。

**全体**
- 通信エラー・位置情報エラーなどはユーザーに分かる日本語メッセージで表示する（クラッシュさせない）。
- オフライン/API障害時でも、TanStack Queryの永続化キャッシュ（AsyncStorage）により両画面とも直前データで一定の体験を維持する（リファクタ前はWBGT画面のみ独自実装のキャッシュを持っていたが、共通化により両画面に拡張された）。

### データソース・更新タイミング

- WBGT予測データは環境省 熱中症予防情報サイトが1日3回（5時・10時・17時頃、JST）発表するCSVが正本。
- 自前バックエンドがこのCSVを定期取得しS3に保存、アプリはそのS3データをAPI経由で参照する（環境省サイトに直接アクセスはしない）。
- 気象詳細（気温・降水・週間予報）はOpen-Meteoから都度取得しており、自前バックエンドは介さない。

### 非機能要件 / 制約

- 対応OS: iOS / Android（Expoでビルド、EASでapp-bundle配布）。Web出力も技術的には可能（react-native-web）だが主用途ではない。
- 位置情報の許可が必須（Android: `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION`）。
- 自前APIはAPI Gateway + Lambda + S3構成（サーバーレス、運用コストほぼ無し）。CDKで管理（`backend/`に統合済み）。
- すべてのAPI呼び出しは `Result<T>` 判別ユニオン（`{ok:true,data}` / `{ok:false,message}`）で結果を扱う方針。Service層はこの方針を維持し、TanStack Queryのフック層（`hooks/*`）でthrow/catchに変換して接続する。

## 技術スタック

- Expo SDK 53 / React Native 0.79 / React 19、Expo Router（file-based routing）でタブ画面を構成
- TypeScript、グローバル型は `types/*.d.ts`（ambient、import不要）
- `@tanstack/react-query` でデータ取得・キャッシュを管理。`@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister` でAsyncStorageへ永続化（アプリ再起動後もオフライン時に前回データを表示できる）
- `react-native-gifted-charts` で気温の折れ線グラフ（固定Y軸・横スクロール・データポイントラベルをライブラリ標準機能で実現）。グラデーション系の任意機能用に `expo-linear-gradient` も導入（Expo Go対応、`react-native-linear-gradient`は不使用）
- `expo-location` で現在地の緯度経度取得・逆ジオコーディング（Web版では`reverseGeocodeAsync`が未対応のため、Webでは現在地情報の解析エラーになる仕様上の制約がある）

## 画面構成

- `app/_layout.tsx` — ルートレイアウト（フォント読込、テーマ、`PersistQueryClientProvider`でTanStack Queryをセットアップ）
- `app/(tabs)/_layout.tsx` — タブナビゲーション（WBGT / Weather の2タブ）
- `app/(tabs)/wbgt.tsx` — メイン画面。現在地のWBGT値・危険度レベル・発表時刻を表示
- `app/(tabs)/weather-info.tsx` — 気象詳細画面。1時間ごとの気温グラフ（横スクロール、固定Y軸）、降水/天気アイコン帯、週間予報カード
- `hooks/useGeocode.ts` / `useWbgtLatest.ts` / `useHourlyWeather.ts` / `useDailyWeather.ts` — Service層をTanStack Queryでラップしたフック。`services/queryClient.ts`に共通の`QueryClient`を定義

## データフロー

1. `GeoService.checkLocationPermission()`（位置情報の利用許可確認、画面側で直接呼ぶ）→ 許可後に `hooks/useGeocode.ts` が `GeoService.getGeocode()` を呼び、現在地の都道府県・市区町村・緯度経度を取得（`expo-location` の `reverseGeocodeAsync` を使用）。結果はTanStack Queryのキャッシュ（`staleTime: Infinity`）と`GeoService`内のstaticフィールドの二重にキャッシュされる。
2. WBGTタブ: `utils.getLatestWbgtDateTime()` で直近の発表時刻（05/10/17時のいずれか）を判定 → `hooks/useWbgtLatest.ts` が `WeatherService.getWbgtLatest(pref, city, time)` を呼び、自前のAWS API (`/wbgt/v1/latest`) からWBGTデータを取得。取得失敗時はTanStack Queryの永続化キャッシュ（前回成功値）がそのまま表示され続け、画面には「前回データを表示中」の注記が出る。
3. Weatherタブ: `hooks/useHourlyWeather.ts` / `useDailyWeather.ts` が `WeatherService.getHourlyWeather` / `getDailyWeather` を呼び、Open-Meteo API (`api.open-meteo.com`) から直接、時間別・日別の気温・降水・天気コードを取得。

## API

- 自前API（WBGT用）: `Constants.expoConfig.extra.apiBaseUrl`（`app.config.ts` で設定、AWS API Gateway）+ `/wbgt/v1/latest`。レスポンス型は `types/wbgt-api.d.ts`（`WbgtApiResponse`）。都道府県別・地点別の `maxWbgt5/10/17`（時刻別の最高WBGT予測マップ）を含む。
- 外部API（気象用）: Open-Meteo（`https://api.open-meteo.com/v1/forecast`）を `WeatherService` から直接呼び出し（API Gatewayを経由しない）。

### バックエンド構成（AWS、リージョン: ap-northeast-1）

- API Gateway（API ID: `xh4o6krnn2`）に `/wbgt/v1/latest/GET` と `/wbgt/latest/GET` の2ルートがあり、両方とも同一の `get-wbgt` Lambda に統合されている（後者は旧パスの互換用と思われる）。
- `get-wbgt` Lambda（`src/lambdas/get-wbgt.ts`）は読み取り専用: S3バケット（環境変数 `BUCKET_NAME`）の `${OBJECT_KEY_PREFIX ?? "wbgt"}/latest.json`（=`wbgt/latest.json`）をそのまま読んで返すだけ。CORS全許可、エラー時は500 + `{ok:false,message}`。
- `fetch-wbgt` Lambda（`src/lambdas/fetch-wbgt.ts`）がデータの取得・生成元。EventBridgeの定期実行でトリガーされる。
  - データソース: 環境省熱中症予防情報サイトのCSV `https://www.wbgt.env.go.jp/alert/dl/{年}/alert_{yyyymmdd}_{hh}.csv`
  - JST現在時刻から本日17時→10時→5時→前日17時の順に候補URLを作り、最初に200で取れたCSVを採用（404はスキップして次候補、その他エラーは例外）
  - CSVは `InternalFlag` 行を境にヘッダ/データを分離してパースし、地点ごとに `maxWbgt5/10/17`（`地点名:値` 形式のセルをパース）を構築
  - ファイル名の `_HH` から `publishedAtJst` を算出
  - S3に `wbgt/history/{yyyymmdd_HH}.json`（履歴、90日でライフサイクル削除）と `wbgt/latest.json`（最新、`get-wbgt` が読む。ライフサイクル対象外）の2つを書き込む
  - 注意: 発表時刻（5/10/17時）の判定ロジックが `utils/utils.ts` の `getLatestWbgtDateTime()` とバックエンド側で重複実装されている。
  - `fetch-wbgt` がエラーで終了するとCloudWatch Alarm経由でSNS（`xenepic.takku@gmail.com`宛メール）に通知される。
- インフラはAWS CDKで管理（スタック名 `WbgtCdkStack`、Lambda論理ID例: `FetchWbgtFnCB4FCB74`）。CDKソースは本リポジトリの `backend/`（旧 `wbgt-cdk` リポジトリをコード統合、git履歴は持たず移植）。フロントとは独立した`package.json`/`node_modules`を持つ（依存衝突回避のためnpm workspacesには参加しない）。
  - 操作: `cd backend && npm install` → `npx cdk synth` / `npx cdk diff` / `npx cdk deploy`（deployはAWS認証情報が必要、実行前に差分を必ず確認する）
  - テスト: `cd backend && npx jest`
- `fetch-wbgt` の起動はEventBridgeのcronルール `0 20,2,8 * * ? *`（UTC）= JST **5:00 / 11:00 / 17:00**。
  - **既知の時刻ズレ**: フロントの `getLatestWbgtDateTime()` は10:00〜16:59を `time:"10"` として扱うが、バックエンドの10時データ取得は実際には **JST 11:00** 実行のため、10:00〜11:00の間はS3の `latest.json` がまだ前回（5時 or 前日17時）データのままになる可能性がある（cronの時刻自体は変更していない。実害は小さいため未対応）。

## 型定義の方針

- `types/global.d.ts`: 共通の `Result<T>` 型（成功/失敗の判別ユニオン）、`GeocodeResult`
- `types/api.d.ts`: Open-Meteo由来の `HourlyForecast` / `DailyForecast`
- `types/wbgt-api.d.ts`: WBGT関連の型を一本化（`WbgtTime`, `WbgtData`, `WbgtMap`, `WbgtApiResponse`, `WeatherServiceWbgtResponse`）

## テスト

- フロント: `npm test`（jest-expo、`utils/utils.test.ts` に発表時刻判定・WBGTレベル判定などのユニットテスト）
- バックエンド: `cd backend && npx jest`（CDKスタックのアサーション、`fetch-wbgt`のCSVパース・URL候補生成等のユニットテスト）
- 型チェック: ルートは `node_modules/.bin/tsc --noEmit`（`backend/`は別tsconfigなのでルートのtsconfigから除外済み）

## 既知の課題

- フロントの発表時刻判定（`getLatestWbgtDateTime`）とバックエンドのcronスケジュール（JST 5:00/11:00/17:00）の間に10時台のズレがある（前述）。実害は小さいため未対応。
- `expo-location` の `reverseGeocodeAsync` がWeb版で動作しないため、Web出力では現在地解析エラーになる（iOS/Androidが主用途のため許容）。
- `npx expo start` 時に一部Expo関連パッケージのバージョンdrift警告が出る（`expo@53.0.20`が`~53.0.27`を期待、等）。動作に支障はないが、いずれ `npx expo install --fix` での追従が望ましい。

## リファクタ履歴

過去にChatGPTと進めていた実装を、設計レベルで見直すリファクタを実施済み（2026年6月）。
- バックエンド（旧`wbgt-cdk`リポジトリ）をこのリポジトリの `backend/` に統合（git履歴は持たずコードのみ移植）。
- バックエンド: S3履歴オブジェクトのライフサイクル設定（`wbgt/history/`配下90日）、CloudWatch Alarm + SNS通知追加、ユニットテスト追加、`cdk deploy`実施済み。
- フロント: 型定義の重複解消（`WbgtTime`/`WbgtMap`/`WbgtData`を`wbgt-api.d.ts`に一本化）。
- フロント: データ取得層をTanStack Queryに移行し、手動AsyncStorageキャッシュ実装を撤廃。
- フロント: グラフ描画ライブラリを`react-native-chart-kit`から`react-native-gifted-charts`に移行し、手動オフセット計算（マジックナンバー）を撤廃。
- フロント・バックエンドともにユニットテストを追加し、Expo Web版での画面表示・実APIとの結合動作を確認済み。
