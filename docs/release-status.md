# Play Store 提出ステータス

このドキュメントは、wbgt-appをGoogle Playに正式リリースするまでの経緯・現状・残作業をまとめたものです。コードの仕組みは [CLAUDE.md](../CLAUDE.md) を参照してください。こちらは運用・進行状況のメモなので、状況が変わったら都度更新してください。

最終更新: 2026年6月20日

## 経緯

- もとはChatGPTと進めていた実装。設計レベルで見直すリファクタを実施（[CLAUDE.md](../CLAUDE.md)の「リファクタ履歴」参照）。
  - バックエンド（旧`wbgt-cdk`）を`backend/`にモノレポ統合、S3ライフサイクル・CloudWatch Alarm追加
  - フロントの型統合、TanStack Query導入、グラフライブラリを`react-native-gifted-charts`に移行
  - リファクタ中に重大バグを複数発見・修正
    - `app.config.ts`が`app.json`の設定（Android権限・パッケージ名・EASプロジェクトID等）を丸ごと上書きしていた
    - `app/index.tsx`が存在せずアプリ起動時に "This screen does not exist" になっていた
    - グラフ上の天気アイコン・降水量が`react-native-gifted-charts`の`hideDataPoints`仕様により常に非表示になっていた
    - WBGT平均値計算で小数点以下が丸められず`WBGT 26.636363636363637`のような表示になっていた
  - Expo SDKを53→55にアップグレード（Google Playが2026/8/31以降の新規アプリ・更新にAndroid 16 / API 36ターゲットを必須化するため対応）
  - アプリアイコンを再作成（背景とモチーフを分離し、丸トリミングされても欠けない安全圏配置のアダプティブアイコン化）
- GitHubリポジトリを新規作成し`main`ブランチとしてpush: https://github.com/xenepic/wbgt-app
- プライバシーポリシーを作成し、GitHub Pagesで公開: https://xenepic.github.io/wbgt-app/privacy-policy/
- 既存のGoogle Play Developerアカウント（2025年7月作成、アプリ名「WBGTカウンター」、パッケージ`com.hoshino.wbgtApp`）に対して、最新コードの本番ビルド（EAS Build、versionCode 2、SDK 55）をクローズドテスト用リリースとしてアップロード
- テスター集めのため、参加自由のGoogleグループ `wbgtapp@googlegroups.com` を作成（メンバー一覧・メールアドレスの表示は管理者のみに制限）
- ストア掲載アセット（フィーチャーグラフィック、phone/7インチ/10インチタブレットのスクリーンショット）を作成し`store-assets/`に格納
- クローズドテストのリリースをGoogleの審査に送信済み（2026年6月20日）

## 現状

| 項目 | 状態 |
|---|---|
| Google Play Developerアカウント | 作成済み |
| アプリ登録 | 済み（「WBGTカウンター」/ `com.hoshino.wbgtApp`） |
| プライバシーポリシー | 公開済み・Play Consoleに登録済み |
| 内部テスト | 有効（審査不要、いつでも動作確認可能） |
| クローズドテスト | **審査中**（2026年6月20日申請、最新ビルド versionCode 2 をアップロード済み） |
| テスター募集 | Googleグループ作成済み、12人集め・周知はこれから |
| ストア掲載アセット | フィーチャーグラフィック・スクリーンショット作成済み |
| データセーフティ／コンテンツのレーティング等の宣言 | Play Console「公開の概要」のチェックリストに沿って入力済み（要再確認推奨） |

## 残作業（次にやること）

1. **クローズドテストの審査結果を待つ**（通常〜7日程度）
2. 承認後、Googleグループの参加リンクとPlay ConsoleのオプトインURLを知人・SNSで共有し、**12人が14日間継続してオプトイン**するのを待つ
   - 途中で誰かがオプトアウト/アンインストールするとカウントがリセットされる点に注意
3. 14日間の条件を満たしたら、Play Consoleダッシュボードから「本番環境へのアクセスを申請」
4. アンケートに回答し、Googleの審査を待つ（最大7日程度）
5. 承認後、製品版リリースを作成して正式公開

## 関連リンク・参照情報

- GitHubリポジトリ: https://github.com/xenepic/wbgt-app
- プライバシーポリシー: https://xenepic.github.io/wbgt-app/privacy-policy/
- テスター用Googleグループ: wbgtapp@googlegroups.com
- EAS（Expoビルド）プロジェクト: `@hitode/wbgt-app`（EASアカウント: hitode / xenepic.takku@gmail.com）
- ストア掲載アセット: `store-assets/`（リポジトリ内）

## 既知の課題（運用面）

- フロントの発表時刻判定とバックエンドのcronスケジュールに10時台のズレがある（実害小、詳細は[CLAUDE.md](../CLAUDE.md)参照）
- ProGuard/R8の難読化解除ファイル未対応（Play Consoleで警告表示、対応は任意）
