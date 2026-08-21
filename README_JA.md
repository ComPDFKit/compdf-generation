![banner](./images/banner.png)

[English](README.md) | [繁體中文](README_TW.md) | [日本語](README_JA.md) | [简体中文](README_CN.md)

# ComPDF Generation — オープンソース・セルフホスト型 PDF 生成 SDK およびプラットフォーム

HTML テンプレートと JSON データからビジネス PDF を生成できます。ビジュアルテンプレート編集、テンプレートの再利用、バッチ処理、API 連携に対応しています。

<p align="center">
  <a href="https://github.com/ComPDFKit/compdf-generation/stargazers"><img src="https://img.shields.io/github/stars/ComPDFKit/compdf-generation?style=flat-square" alt="GitHub Stars"></a>
  <a href="https://github.com/ComPDFKit/compdf-generation/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL%20v3%20%2B%20Commercial-blue?style=flat-square" alt="ライセンス: AGPL v3 + Commercial"></a>
  <a href="https://github.com/ComPDFKit/compdf-generation/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome"></a>
</p>

<p align="center">
  <a href="https://www.compdf.com/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_ja">ドキュメント</a>
    •  
  <a href="https://www.compdf.com?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_ja">公式サイト</a>
    •  
  <a href="https://github.com/ComPDFKit/compdf-generation/discussions">ディスカッション</a>
</p>

</div>

---

## 目次

- [ComPDF Generation を選ぶ理由](#compdf-generation-を選ぶ理由)
- [機能](#機能)
- [クイックスタート](#クイックスタート)
- [ユーザーガイド](#ユーザーガイド)
- [デプロイ設定](#デプロイ設定)
- [ユースケース](#ユースケース)
- [オープンソース版と商用版](#オープンソース版と商用版)
- [他のオープンソース PDF ライブラリとの比較](#他のオープンソース-pdf-ライブラリとの比較)
- [ライセンス](#ライセンス)
- [サポート](#サポート)

---

## ComPDF Generation を選ぶ理由

ComPDF Generation は、再利用可能なテンプレートベースの文書ワークフローを必要とする開発者やチームのための、オープンソース・セルフホスト型 PDF 生成 SDK およびプラットフォームです。構造化データからビジネス文書を生成し、デプロイ、テンプレート、ワークフロー連携を自社で管理できます。

## 機能

- **ビジュアルテンプレート編集**：テンプレートを視覚的に作成、テスト、プレビューできます。高度なカスタマイズが必要な場合は HTML を直接編集できます。
- **セルフホスト型 Web UI と API**：Web UI でテンプレートを管理・テストし、API と SDK 機能で文書生成ワークフローを統合できます。
- **JSON データ対応**：JSON データソースからカスタマイズした文書を生成できます。
- **大量処理**：文書生成数の上限なしで、マルチスレッドのバッチ生成を利用できます。
- **AI 支援文書ワークフロー**：構造化テンプレートとデータ入力で AI 支援ワークフローを支援し、プロンプト作成の重複を減らします。
- **テンプレートの一括インポートと移行**：DITO テンプレートと ComPDF Generation テンプレートの一括インポートに対応し、iText などの競合 PDF 生成ソリューションから ComPDF Generation へスムーズに移行できます。インポートしたテンプレートは必要に応じて編集でき、柔軟に活用できます。

<div align="center">
<img src="./images/example.gif" width="850" alt="ComPDF Generation template editor preview">
</div>

---

## クイックスタート

### Windows PowerShell

Docker Desktop がインストールされ、Docker Hub から `compdfkit/pdf-generation:1.0.0` イメージを取得できることを確認してください。以下のコマンドでプロジェクトを clone し、環境ファイルをコピーしてサービスを起動します。`compdf-app` の状態が `healthy` になったら、`http://localhost:8090` を開いてください。`.env.example` にはトライアルライセンスが含まれており、生成された PDF には透かしが入ります。本番環境では `COMPDF_LICENSE_KEY` を正式なライセンスに差し替え、[営業窓口へお問い合わせ](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_ja)ください。

```powershell
git clone https://github.com/ComPDFKit/compdf-generation.git
cd compdf-generation
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
```

### macOS または Linux

Docker Desktop（macOS）または Docker Compose プラグインを含む Docker Engine（Linux）がインストールされ、Docker Hub から `compdfkit/pdf-generation:1.0.0` イメージを取得できることを確認してください。以下のコマンドでプロジェクトを clone し、環境ファイルをコピーしてサービスを起動します。`compdf-app` の状態が `healthy` になったら、`http://localhost:8090` を開いてください。`.env.example` にはトライアルライセンスが含まれており、生成された PDF には透かしが入ります。本番環境では `COMPDF_LICENSE_KEY` を正式なライセンスに差し替え、[営業窓口へお問い合わせ](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_ja)ください。

```bash
git clone https://github.com/ComPDFKit/compdf-generation.git
cd compdf-generation
cp .env.example .env
docker compose up -d --build
docker compose ps
```

リモート Linux サーバーへデプロイする場合は、そのサーバーの `8090` ポートへアクセス可能なブラウザから `http://<サーバーアドレス>:8090` を開いてください。

## ユーザーガイド

テンプレート作成とデータバインディングについては、[Self-Hosted Generation User Manual](https://www.compdf.com/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_ja) をご確認ください。

## デプロイ設定

### 環境変数

サービス起動前に、`.env` で以下の変数を設定できます。

| 変数                      | 既定値                     | 説明                                                                                                 |
| ----------------------- | ----------------------- | -------------------------------------------------------------------------------------------------- |
| `COMPDF_LICENSE_KEY`    | 必須                      | PDF Generation または HTML to PDF 権限を持つ ComPDF ライセンス Key。`.env.example` の試用 Key で生成した PDF には透かしが入ります。 |
| `COMPDF_IMAGE_PLATFORM` | `linux/amd64`           | `compdf-app` イメージで使用するプラットフォーム。対象ホストで対応している場合のみ変更してください。                                           |
| `NODE_IMAGE`            | `node:22-bookworm-slim` | Web / API サービスの Docker マルチステージビルドで使用する Node.js イメージ。                                               |
| `APP_PORT`              | `8090`                  | ComPDF Generation の Web UI と API を公開するポート。`8090` が使用中の場合は別の空きポートへ変更してください。                         |
| `COMPDF_TIMEOUT_MS`     | `120000`                | Web/API サービスが ComPDF エンジンの応答を待つ最大時間（ミリ秒）。大きなテンプレートや複雑なテンプレートでは調整してください。                            |
| `TEMPLATE_STORAGE_DIR`  | `./data/templates`      | HTML テンプレート、JSON データソース、メタデータを永続化するホスト側ディレクトリ。固定保存先が必要な場合は絶対パスを指定してください。                           |

```bash
docker compose ps
docker compose logs --tail=100 compdf-generation compdf-app
```

PDF 生成を利用するには、`compdf-app` が `healthy` の状態になっている必要があります。テンプレートは `TEMPLATE_STORAGE_DIR`（既定値：`./data/templates`）に保存され、アプリケーションコンテナを再構築しても削除されません。

## ユースケース

- 契約書・合意書の自動生成
- 請求書、明細書、財務文書
- 月次・四半期・分析レポートの一括生成
- 証明書・標準化された証憑文書
- CRM、ERP、OA など社内システム向けのオンデマンド PDF 出力

## オープンソース版と商用版

本番デプロイ、透かしなしの出力、またはエンタープライズサポートが必要ですか？ [商用版](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_ja)をご検討ください。

| 機能                   | オープンソース版   | 商用版     |
| -------------------- | ---------- | ------- |
| 文書生成 API             | ✅          | ✅       |
| HTML テンプレートの設計とインポート | ✅          | ✅       |
| テンプレート管理             | ✅          | ✅       |
| 一括生成                 | ✅          | ✅       |
| 透かしなし出力              | 透かしあり      | 透かしなし   |
| 本番環境での利用             | 非推奨        | ✅       |
| SLA / 技術サポート         | コミュニティサポート | 専任サポート  |
| ライセンス                | AGPL v3    | 商用ライセンス |

本番環境へデプロイする場合は、正式な商用ライセンス を使用し、組織の運用要件およびコンプライアンス要件に従ってください。

## 他のオープンソース PDF ライブラリとの比較

| 観点       | ComPDF Generation                      | その他の PDF ライブラリ           |
| -------- | -------------------------------------- | ------------------------ |
| 製品の位置付け  | 業務文書生成に特化し、用途別テンプレートを簡単にカスタマイズ可能       | 低レイヤーの PDF 機能をラップしたものが中心 |
| 文書生成能力   | 一括生成に対応し、生成数の制限なし                      | 一定の制約があることが多い            |
| 想定シーン    | 契約書 / 請求書 / レポート / 証明書                 | 汎用描画やレイアウト               |
| テンプレート活用 | ノーコードのビジュアル HTML テンプレート編集、インポート、再利用に対応 | 独自実装が必要                  |
| 商用拡張性    | 商用版へスムーズに移行可能                          | 拡張要件は自前で補うケースが多い         |

## ライセンス

- 本プロジェクトのオープンソース部分は、[GNU Affero General Public ライセンス v3.0](LICENSE) のもとで提供されています。
- クローズドソースの商用プロジェクト、本番環境、または企業向け提供で利用する場合は、**商用ライセンス** を申請してください。

## サポート

[Issue](https://github.com/ComPDFKit/compdf-generation/issues) の登録、[Discussions](https://github.com/ComPDFKit/compdf-generation/discussions) への参加、または商用ライセンス に関する ComPDF チームへのお問い合わせをご利用ください。

---

<div align="center">
  <p><strong>ComPDF チームが提供しています。</strong></p>
  <p>
    <a href="https://www.compdf.com?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_ja">公式サイト</a>
      ·  
    <a href="https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_ja">営業窓口</a>
      ·  
    <a href="https://www.compdf.com/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_ja">ドキュメント</a>
  </p>
</div>
