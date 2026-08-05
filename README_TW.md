

![banner](./images/banner.png)

[English](README.md) | [繁體中文](README_TW.md) | [日本語](README_JA.md) | [简体中文](README_CN.md)

# **ComPDF Generation \- 開源 PDF 文件產生 SDK**

**ComPDF Generation** 是 KDAN 生態系的一部分，專為開發者與企業系統打造的開源 PDF 文件產生 SDK，適用於合約、發票、報表、證書等自動化文件產生情境，兼顧輸出品質、導入效率，以及升級至商業應用的彈性。

> - 如果您覺得 ComPDF Generation 實用，歡迎在 GitHub 上為我們點亮一顆 ⭐ Star，支持我們持續成長與改進。   
> - 有任何問題或想法？歡迎前往 **[Issues](https://github.com/ComPDFKit/compdf-generation/issues)** / **[Discussions](https://github.com/ComPDFKit/compdf-generation/discussions)** 與我們交流。

License GitHub Stars PRs Welcome

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/license-AGPL%20v3%20%2B%20Commercial-blue" alt="License"></a>
  <a href="#"><img src="https://img.shields.io/github/stars/ComPDFKit/compdf-generation" alt="GitHub Stars"></a>
  <a href="#"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome"></a>
</p>

<p align="center">
  <a href="#為什麼選擇-compdf-generation"><b>為什麼選擇 ComPDF Generation</b></a> •
  <a href="#功能"><b>功能</b></a> •
  <a href="#快速開始"><b>快速開始</b></a> •
  <a href="#何時升級至商業版"><b>商業版升級</b></a> •
  <a href="#適用場景"><b>適用場景</b></a> •
  <a href="#compdf-generation-與其他開源-pdf-函式庫比較"><b>產品比較</b></a> •
  <a href="#授權條款"><b>授權條款</b></a> •
  <a href="#支援"><b>支援</b></a>
</p>

## **為什麼選擇 ComPDF Generation**

**ComPDF Generation** 著重提升**商務文件**產生流程的導入效率與範本重用性。 透過視覺化範本編輯器與即時預覽功能，使用者無須撰寫程式碼，即可建立範本並測試輸出結果；同時也提供 API，方便企業串接範本化、自動化的文件產生流程。

### **核心優勢**

- 適用於合約、發票、報表、證書等商務文件情境  
- 支援以 HTML 範本產生 PDF  
- 不限制文件產生數量，並支援多執行緒處理，提升批次與大量文件的產生效率  
- 支援由 AI Agent 觸發文件產生流程，降低 AI Token 使用量  
- 採用 AGPL 開源授權，方便開發者快速驗證與導入  
- 提供商業版授權 (License)，可順利升級至正式生產環境與企業級應用

## **功能**

| 能力模組                         | 說明                                                                                                                     |
|:---------------------------- |:---------------------------------------------------------------------------------------------------------------------- |
| HTML 範本產生 PDF 文件             | 依據 HTML **範本**產出 PDF，並支援多執行緒與批次處理                                                                                      |
| 範本編輯器                        | 提供無須撰寫程式碼的視覺化範本設計方式，可建立合約、發票、報表與證書等範本                                                                                  |
| 範本管理                         | 支援範本管理與重用，降低重複開發成本                                                                                                     |
| 範本與 JSON 資料預覽                | 可依據範本與 JSON 資料預覽內容，方便確認範本內容與最終 PDF 輸出效果                                                                                |
| 範本元素支援 | ComPDF Generation 支援文字、表格、圖片、超連結、頁首頁尾、頁碼、條碼、CSS 樣式、動態變數與計算、迴圈／條件邏輯、PDF 表單，以及視覺化模板編輯等核心 PDF 生成元件，可滿足複雜業務文件的模板化與動態化生成需求。 |

![](./images/example.gif)

## **快速開始**

### **開始前準備**

- Windows、macOS：請安裝 Docker Desktop  
- Linux：請安裝 Docker Engine 與 Docker Compose 外掛程式  
- 可從 Docker Hub 拉取 `compdfkit/compdf-app:1.0.0` 映像檔

### **授權金鑰**


### **取得專案**

複製儲存庫並進入專案目錄：

```shell
git clone https://github.com/ComPDFKit/compdf-generation.git
cd compdf-generation
```

### **設定並啟動**

專案已於 `.env.example` 中提供試用授權金鑰。部署前，請先複製此檔案並完成設定，即可開始使用。

請注意，使用預設試用授權產生的 PDF 會加上浮水印。若要移除浮水印部署於正式生產環境，請[聯絡團隊](https://www.compdf.com/zh-cn/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw)取得商業授權，並更新 `COMPDF_LICENSE_KEY`。

```
# Windows PowerShell
Copy-Item .env.example .env
```

```shell
# macOS 或 Linux
cp .env.example .env
```

啟動服務：

```shell
docker compose up -d --build
docker compose ps
```

當 `compdf-app` 狀態顯示為 `healthy` 後，請開啟 `http://localhost:8090`。若部署在遠端 Linux 伺服器，請改以瀏覽器存取：

`http://<伺服器位址>:8090` 

### **環境變數**

啟動服務前，可於 `.env` 中設定以下變數：

| 變數                      | 預設值                     | 說明                                                                                                |
|:----------------------- |:----------------------- |:------------------------------------------------------------------------------------------------- |
| `COMPDF_LICENSE_KEY`    | 必填                      | 具備 PDF Generation 或 HTML 轉 PDF 權限的 ComPDF License Key。`.env.example` 內的試用 Key 產生 PDF 時，輸出檔會加上浮水印。 |
| `COMPDF_IMAGE_PLATFORM` | `linux/amd64`           | `compdf-app` 映像檔的目標平台。僅當映像檔支援部署主機所需的平台架構時，才需要調整。                                                  |
| `NODE_IMAGE`            | `node:22-bookworm-slim` | 用於建置 Web 與 API 服務 Docker 多階段映像檔的 Node.js 映像檔。                                                     |
| `APP_PORT`              | `8090`                  | 對外公開的 ComPDF Generation Web 介面與 API 連接埠。若 `8090` 已被占用，可改用其他可用連接埠。                                 |
| `COMPDF_TIMEOUT_MS`     | `120000`                | Web/API 服務等待 ComPDF 引擎回應的最長時間，單位為毫秒。若範本較大或較複雜，可適度調高。                                              |
| `TEMPLATE_STORAGE_DIR`  | `./data/templates`      | 用於永久儲存 HTML 範本、JSON 資料來源與中繼資料 (Metadata) 的主機目錄。 若需固定儲存位置，可改用絕對路徑。                                 |

### **驗證部署**

```shell
docker compose ps
docker compose logs --tail=100 compdf-generation compdf-app
```

兩項服務都必須處於執行狀態，且 `compdf-app` 的健康狀態必須為 `healthy` ，才能產生 PDF。若要允許其他裝置連線，請在伺服器防火牆或安全群組中開放 `APP_PORT`（預設 `8090`）的 TCP 入站流量。

### **建立範本並產生 PDF**

1. 在範本清單中建立新範本，填寫名稱與說明。  
2. 開啟範本編輯器，撰寫 HTML 內容。  
3. 依需求加入 JSON 資料並儲存範本。  
4. 在編輯器中產生 PDF，瀏覽器會自動下載輸出檔。

範本會儲存在 `TEMPLATE_STORAGE_DIR`，預設路徑為 `./data/templates`。即使重新建置應用程式容器，這些資料也不會被刪除。

## **何時升級至商業版**

若您的企業需要正式商業部署、移除浮水印或取得企業級技術支援，可升級至[商業版本](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw)。

| 功能           | 開源版     | 商業版  |
|:------------ |:------- |:---- |
| 文件產生 API     | ✅       | ✅    |
| HTML 範本設計與匯入 | ✅       | ✅    |
| 範本管理         | ✅       | ✅    |
| 批次產生         | ✅       | ✅    |
| 輸出浮水印        | 有浮水印    | 無浮水印 |
| 正式生產環境適用     | 不建議     | ✅    |
| SLA / 技術支援   | 社群支援    | 專屬支援 |
| 授權方式         | AGPL v3 | 商業授權 |

## **適用場景**

- **合約自動化產生**：支援銷售合約、採購協議、服務條款等各類合約的自動產生與欄位填入，縮短文件準備與簽署流程。  
- **發票與財務單據自動化產生**：串接業務資料，自動產生發票、結算單、對帳單等財務文件，降低人工操作錯誤。  
- **報表批次產生**：支援月報、季報、資料分析報告等週期性文件的大量輸出，滿足定期與大量文件產生需求。  
- **證書與證明文件產生**：快速產出在職證明、學歷證書、資格認證等標準化證明文件，提升內部作業效率。  
- **企業內部系統 PDF 輸出**：可串接 CRM、ERP、OA 等企業系統，依需求匯出業務單據、簽核表單等 PDF 文件。

## **ComPDF Generation 與其他開源 PDF 函式庫比較**

| 評比項目   | ComPDF Generation                | 其他 PDF 函式庫            |
|:------ |:-------------------------------- |:--------------------- |
| 產品定位   | 聚焦商務文件產生，可依使用情境快速自訂範本            | 著重底層 PDF 功能           |
| 文件產生能力 | 支援批次產生，且不限制產生數量                  | 依不同函式庫而異，部分功能或限制需自行處理 |
| 應用場景   | 合約 / 發票 / 報表 / 證書                | 通用繪圖與排版               |
| 範本化能力  | 提供無須撰寫程式碼的視覺化 HTML 範本編輯器，支援匯入與重用 | 通常需要自行開發或封裝相關功能       |
| 商業升級方式 | 可直接升級至商業版                        | 擴充需求通常需自行開發或整合        |

## **授權條款**

- 本專案的開源版本部分採用 **GNU Affero General Public License v3.0（AGPL v3）** 授權發布。  
- 若要用於不公開原始碼的商業專案、正式生產環境或企業交付情境，請申請**商業授權**。  
- 詳細說明請參閱儲存庫中的 [LICENSE](http://LICENSE) 檔案。

## **支援**

若有任何問題或建議，歡迎：

- 提交 [Issue](https://github.com/ComPDFKit/compdf-generation/issues)
- 參與 [Discussions](https://github.com/ComPDFKit/compdf-generation/discussions) 
- [聯絡 ComPDF 團隊](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw)，洽詢商業授權

如果您覺得 **ComPDF Generatio**n 實用，歡迎在 GitHub 上為我們點亮一顆 ⭐ Star，支持我們持續成長與改進。 

---
<p align="center">
  <b>由 ComPDF 團隊打造</b><br>
  <a href="https://www.compdf.com/?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw">官網</a> ·
  <a href="https://www.compdf.com/guides/generation-sdk/java/overview?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw">技術文件</a> ·
  <a href="https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_tw">企業洽詢</a>
</p>
