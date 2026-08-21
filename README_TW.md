![banner](./images/banner.png)

[English](README.md) | [繁體中文](README_TW.md) | [日本語](README_JA.md) | [简体中文](README_CN.md)

# ComPDF Generation — 開源私有化部署 PDF 產生 SDK 與平台

透過 HTML 範本和 JSON 資料產生商務 PDF，支援視覺化範本編輯、範本重複使用、批次處理和 API 整合。

<p align="center">
  <a href="https://github.com/ComPDFKit/compdf-generation/stargazers"><img src="https://img.shields.io/github/stars/ComPDFKit/compdf-generation?style=flat-square" alt="GitHub Stars"></a>
  <a href="https://github.com/ComPDFKit/compdf-generation/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL%20v3%20%2B%20Commercial-blue?style=flat-square" alt="授權：AGPL v3 + 商業授權"></a>
  <a href="https://github.com/ComPDFKit/compdf-generation/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome"></a>
</p>

<p align="center">
  <a href="https://www.compdf.com/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw">技術文件</a>
    •  
  <a href="https://www.compdf.com?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw">官網</a>
    •  
  <a href="https://github.com/ComPDFKit/compdf-generation/discussions">討論區</a>
</p>

</div>

---

## 目錄

- [為什麼選擇 ComPDF Generation](#為什麼選擇-compdf-generation)
- [功能特色](#功能特色)
- [快速開始](#快速開始)
- [使用指南](#使用指南)
- [部署設定](#部署設定)
- [應用情境](#應用情境)
- [開源版與商用版](#開源版與商用版)
- [與其他開源 PDF 函式庫的比較](#與其他開源-pdf-函式庫的比較)
- [授權](#授權)
- [支援](#支援)

---

## 為什麼選擇 ComPDF Generation

ComPDF Generation 是專為需要以範本重複產生商務文件的開發者與團隊打造的開源、私有化部署 PDF 產生 SDK 與平台。它支援以結構化資料產生商務文件，並讓團隊自行掌控部署、範本與工作流程整合。

## 功能特色

- **視覺化範本編輯**：以視覺化方式建立、測試及預覽範本；需要進階自訂時，可直接編輯 HTML。
- **私有化 Web UI 與 API**：透過私有化 Web UI 管理及測試範本，再以 API 與 SDK 能力將文件產生工作流程整合至應用程式。
- **JSON 資料支援**：使用 JSON 資料來源產生自訂文件。
- **高容量處理**：支援多執行緒批次產生，不設文件產生配額。
- **AI 輔助文件工作流程**：使用結構化範本與資料輸入，支援 AI 輔助文件工作流程，減少重複建立提示詞的工作。
- **批次範本匯入與遷移**：支援批次匯入 DITO 範本及 ComPDF Generation 範本，協助您從 iText 等競品的 PDF 產生方案順利遷移至 ComPDF Generation。匯入後的範本可依需求編輯，彈性運用。

<div align="center">
<img src="./images/example.gif" width="850" alt="ComPDF Generation template editor preview">
</div>

---

## 快速開始

### Windows PowerShell

請確認已安裝 Docker Desktop，並可從 Docker Hub 拉取 `compdfkit/pdf-generation:1.0.0` 映像檔；以下指令會複製儲存庫、複製環境變數檔案並啟動服務，確認 `compdf-app` 的狀態顯示為 `healthy` 後，請開啟 `http://localhost:8090`。`.env.example` 中提供試用授權金鑰，使用試用授權產生的 PDF 會加上浮水印；正式生產環境請將 `COMPDF_LICENSE_KEY` 更新為正式商業授權，並[聯絡團隊](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw)取得商業授權。

```powershell
git clone https://github.com/ComPDFKit/compdf-generation.git
cd compdf-generation
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
```

### macOS 或 Linux

請確認已安裝 Docker Desktop（macOS）或含 Docker Compose 外掛程式的 Docker Engine（Linux），並可從 Docker Hub 拉取 `compdfkit/pdf-generation:1.0.0` 映像檔；以下指令會複製儲存庫、複製環境變數檔案並啟動服務，確認 `compdf-app` 的狀態顯示為 `healthy` 後，請開啟 `http://localhost:8090`。`.env.example` 中提供試用授權金鑰，使用試用授權產生的 PDF 會加上浮水印；正式生產環境請將 `COMPDF_LICENSE_KEY` 更新為正式商業授權，並[聯絡團隊](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw)取得商業授權。

```bash
git clone https://github.com/ComPDFKit/compdf-generation.git
cd compdf-generation
cp .env.example .env
docker compose up -d --build
docker compose ps
```

若部署在遠端 Linux 伺服器，請使用可存取該伺服器 `8090` 連接埠的瀏覽器開啟 `http://<伺服器位址>:8090`。

## 使用指南

範本編寫與資料繫結說明請參閱 [Self-Hosted Generation User Manual](https://www.compdf.com/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw)。

## 部署設定

### **環境變數**

啟動服務前，可於 `.env` 中設定以下變數：

| 變數                      | 預設值                     | 說明                                                                               |
|:----------------------- |:----------------------- |:-------------------------------------------------------------------------------- |
| `COMPDF_LICENSE_KEY`    | 必填                      | 具備 PDF 產生或 HTML 轉 PDF 權限的 ComPDF 授權金鑰。`.env.example` 內的試用授權金鑰產生 PDF 時，輸出檔會加上浮水印。 |
| `COMPDF_IMAGE_PLATFORM` | `linux/amd64`           | `compdf-app` 映像檔的目標平台。僅當映像檔支援部署主機所需的平台架構時，才需要調整。                                 |
| `NODE_IMAGE`            | `node:22-bookworm-slim` | 用於建置 Web 與 API 服務 Docker 多階段映像檔的 Node.js 映像檔。                                    |
| `APP_PORT`              | `8090`                  | 對外公開的 ComPDF Generation Web 介面與 API 連接埠。若 `8090` 已被占用，可改用其他可用連接埠。                |
| `COMPDF_TIMEOUT_MS`     | `120000`                | Web/API 服務等待 ComPDF 引擎回應的最長時間，單位為毫秒。若範本較大或較複雜，可適度調高。                             |
| `TEMPLATE_STORAGE_DIR`  | `./data/templates`      | 用於永久儲存 HTML 範本、JSON 資料來源與中繼資料（Metadata）的主機目錄。若需固定儲存位置，可改用絕對路徑。                   |

```bash
docker compose ps
docker compose logs --tail=100 compdf-generation compdf-app
```

在 PDF 產生功能可用前，`compdf-app` 必須處於 `healthy` 狀態。範本會儲存在 `TEMPLATE_STORAGE_DIR` 中（預設為 `./data/templates`），重新建置應用程式容器不會刪除這些資料。

## 應用情境

- 自動產生合約與協議
- 發票、對帳單與財務文件
- 批次產生月報、季報與分析報告
- 證明文件與標準化證書
- CRM、ERP、OA 等內部系統的隨選 PDF 輸出

## 開源版與商用版

需要正式環境部署、無浮水印輸出或企業支援嗎？請升級至[商用版](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw)。

| 功能           | 開源版     | 商業版  |
| ------------ | ------- | ---- |
| 文件產生 API     | ✅       | ✅    |
| HTML 範本設計與匯入 | ✅       | ✅    |
| 範本管理         | ✅       | ✅    |
| 批次產生         | ✅       | ✅    |
| 無浮水印輸出       | 有浮水印    | 無浮水印 |
| 正式生產環境適用     | 不建議     | ✅    |
| SLA / 技術支援   | 社群支援    | 專屬支援 |
| 授權方式         | AGPL v3 | 商業授權 |

正式部署時，請使用正式的商業授權，並遵循所在組織的營運與合規要求。

## 與其他開源 PDF 函式庫的比較

| 評比項目   | ComPDF Generation                | 其他 PDF 函式庫            |
| ------ | -------------------------------- | --------------------- |
| 產品定位   | 聚焦商務文件產生，可依使用情境快速自訂範本            | 著重底層 PDF 功能           |
| 文件產生能力 | 支援批次產生，且不限制產生數量                  | 依不同函式庫而異，部分功能或限制需自行處理 |
| 應用場景   | 合約 / 發票 / 報表 / 證書                | 通用繪圖與排版               |
| 範本化能力  | 提供無須撰寫程式碼的視覺化 HTML 範本編輯器，支援匯入與重用 | 通常需要自行開發或封裝相關功能       |
| 商業升級方式 | 可直接升級至商業版                        | 擴充需求通常需自行開發或整合        |

## 授權

- 本專案的開源版本部分採用 [GNU Affero General Public License v3.0（AGPL v3）](LICENSE) 授權發布。
- 若要用於不公開原始碼的商業專案、正式生產環境或企業交付情境，請申請**商業授權**。

## 支援

可提交[問題回報](https://github.com/ComPDFKit/compdf-generation/issues)、加入[討論區](https://github.com/ComPDFKit/compdf-generation/discussions)，或聯絡 ComPDF 團隊申請商業授權。

---

<div align="center">
  <p><strong>由 ComPDF 團隊打造。</strong></p>
  <p>
    <a href="https://www.compdf.com?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw">官網</a>
      ·  
    <a href="https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw">企業洽詢</a>
      ·  
    <a href="https://www.compdf.com/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw">技術文件</a>
  </p>
</div>
