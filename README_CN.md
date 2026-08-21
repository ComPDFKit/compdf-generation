![banner](./images/banner.png)

[English](README.md) | [繁體中文](README_TW.md) | [日本語](README_JA.md) | [简体中文](README_CN.md)

# ComPDF Generation — 开源私有化部署 PDF 生成 SDK 与平台

通过 HTML 模板和 JSON 数据生成业务 PDF，支持可视化模板编辑、模板复用、批量处理和 API 集成。

<p align="center">
  <a href="https://github.com/ComPDFKit/compdf-generation/stargazers"><img src="https://img.shields.io/github/stars/ComPDFKit/compdf-generation?style=flat-square" alt="GitHub Stars"></a>
  <a href="https://github.com/ComPDFKit/compdf-generation/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL%20v3%20%2B%20Commercial-blue?style=flat-square" alt="许可证: AGPL v3 + Commercial"></a>
  <a href="https://github.com/ComPDFKit/compdf-generation/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome"></a>
</p>

<p align="center">
  <a href="https://www.compdf.com/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_cn">文档</a>
    •  
  <a href="https://www.compdf.com?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_cn">官网</a>
    •  
  <a href="https://github.com/ComPDFKit/compdf-generation/discussions">讨论区</a>
</p>

</div>

---

## 目录

- [为什么选择 ComPDF Generation](#为什么选择-compdf-generation)
- [功能特性](#功能特性)
- [快速开始](#快速开始)
- [用户指南](#用户指南)
- [部署配置](#部署配置)
- [应用场景](#应用场景)
- [开源版与商业版](#开源版与商业版)
- [与其他开源 PDF 库的对比](#与其他开源-pdf-库的对比)
- [许可证](#许可证)
- [支持](#支持)

---

## 为什么选择 ComPDF Generation

ComPDF Generation 是面向开发者和团队的开源、私有化部署 PDF 生成 SDK 与平台，适用于需要基于模板反复生成业务文档的工作流。它支持以结构化数据生成业务文档，并让团队自主掌控部署、模板和工作流集成。

## 功能特性

- **可视化模板编辑**：以可视化方式创建、测试和预览模板；需要高级定制时，可直接编辑 HTML。
- **私有化 Web UI 与 API**：通过私有化 Web UI 管理和测试模板，并通过 API 与 SDK 能力将文档生成工作流接入应用。
- **JSON 数据支持**：使用 JSON 数据源生成定制化文档。
- **高容量处理**：支持多线程批量生成，不设文档生成配额。
- **面向 AI 的文档工作流**：使用结构化模板和数据输入支持 AI 辅助文档工作流，减少重复构建提示词。
- **批量模板导入与迁移**：*支持批量导入 DITO 模板及 ComPDF Generation 模板，轻松实现从 iText 等竞品到 ComPDF Generation 的平滑迁移。导入后的模板支持按需编辑，灵活使用。*

<div align="center">    
<img src="./images/example.gif" width="850" alt="ComPDF Generation template editor preview">    
</div>


## 快速开始

### Windows PowerShell

请确认已安装 Docker Desktop，并可从 Docker Hub 拉取 `compdfkit/pdf-generation:1.0.0` 镜像；以下命令会克隆项目、复制环境变量文件并启动服务，确认 `compdf-app` 的状态变为 `healthy` 后访问 `http://localhost:8090`。`.env.example` 中提供试用许可证，生成的 PDF 会带有水印；正式生产使用时，请将 `COMPDF_LICENSE_KEY` 替换为正式许可证，并可[联系销售](https://www.compdf.com/zh-cn/contact-sales?utm_source=github_generation_newopen\&utm_medium=referral\&utm_campaign=generation_open\&ref_platform_id=github_compdf_cn)获取正式许可证。

```powershell
git clone https://github.com/ComPDFKit/compdf-generation.git
cd compdf-generation
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
```

### macOS 或 Linux

请确认已安装 Docker Desktop（macOS）或带 Docker Compose 插件的 Docker Engine（Linux），并可从 Docker Hub 拉取 `compdfkit/pdf-generation:1.0.0` 镜像；以下命令会克隆项目、复制环境变量文件并启动服务，确认 `compdf-app` 的状态变为 `healthy` 后访问 `http://localhost:8090`。`.env.example` 中提供试用许可证，生成的 PDF 会带有水印；正式生产使用时，请将 `COMPDF_LICENSE_KEY` 替换为正式许可证，并可[联系销售](https://www.compdf.com/zh-cn/contact-sales?utm_source=github_generation_newopen\&utm_medium=referral\&utm_campaign=generation_open\&ref_platform_id=github_compdf_cn)获取正式许可证。

```bash
git clone https://github.com/ComPDFKit/compdf-generation.git
cd compdf-generation
cp .env.example .env
docker compose up -d --build
docker compose ps
```

如果部署在远程 Linux 服务器上，请在可访问该服务器 `8090` 端口的浏览器中打开对应地址。

## 用户指南

有关模板编写和数据绑定，请参阅[私有化部署文档生成用户指南](https://www.compdf.com/zh-cn/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen\&utm_medium=referral\&utm_campaign=generation_open\&ref_platform_id=github_compdf_cn)。

## 部署配置

### 环境变量

启动服务前，可在 `.env` 中配置以下变量：

| 变量                      | 默认值                     | 说明                                                                           |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------- |
| `COMPDF_LICENSE_KEY`    | 必填                      | 具有 PDF 生成或 HTML 转 PDF 权限的 ComPDF 许可证密钥。`.env.example` 中提供的试用密钥生成的 PDF 会带有水印。 |
| `COMPDF_IMAGE_PLATFORM` | `linux/amd64`           | `compdf-app` 镜像使用的平台。仅当镜像支持部署主机所需的平台时才修改该值。                                  |
| `NODE_IMAGE`            | `node:22-bookworm-slim` | 用于构建 Web 和 API 服务 Docker 多阶段镜像的 Node.js 镜像。                                  |
| `APP_PORT`              | `8090`                  | 映射到宿主机的 ComPDF Generation Web 界面和 API 端口。`8090` 被占用时可改为其他可用端口。               |
| `COMPDF_TIMEOUT_MS`     | `120000`                | Web/API 服务等待 ComPDF 引擎响应的最长时间，单位为毫秒。处理大型或复杂模板耗时较长时，可适当调大此值。                  |
| `TEMPLATE_STORAGE_DIR`  | `./data/templates`      | 宿主机上用于持久化 HTML 模板、JSON 数据源和元数据的目录。部署需要固定数据位置时可使用绝对路径。                        |

```bash
docker compose ps
docker compose logs --tail=100 compdf-generation compdf-app
```

在 PDF 生成功能可用前，`compdf-app` 必须处于 `healthy` 状态。模板存储在 `TEMPLATE_STORAGE_DIR` 中（默认为 `./data/templates`），重新构建应用容器不会删除这些数据。

## 应用场景

- 自动生成合同和协议
- 发票、对账单和财务文件
- 批量生成月报、季报和分析报告
- 证书和标准化证明文件
- CRM、ERP、OA 等内部系统的按需 PDF 输出

## 开源版与商业版

需要生产部署、无水印输出或企业支持？请升级至[商业版](https://www.compdf.com/zh-cn/contact-sales?utm_source=github_generation_newopen\&utm_medium=referral\&utm_campaign=generation_open\&ref_platform_id=github_compdf_cn)。

| 能力           | 开源版     | 商业版   |
| ------------ | ------- | ----- |
| 文档生成 API     | ✅       | ✅     |
| HTML 模板设计与导入 | ✅       | ✅     |
| 模板管理         | ✅       | ✅     |
| 批量生成         | ✅       | ✅     |
| 无水印导出        | 带水印     | 无水印   |
| 正式生产环境使用     | 不建议     | ✅     |
| SLA / 技术支持   | 社区支持    | 专属支持  |
| 许可证          | AGPL v3 | 商业许可证 |

正式部署时，请使用正式的商业许可证，并遵循所在组织的运营和合规要求。

## 与其他开源 PDF 库的对比

| 维度     | ComPDF Generation            | 其他 PDF 库     |
| ------ | ---------------------------- | ------------ |
| 产品定位   | 面向业务文档生成，可按业务场景轻松自定义模板       | 底层 PDF 能力封装  |
| 文档生成能力 | 支持批量生成，不限制生成数量               | 通常存在一定限制     |
| 重点场景   | 合同 / 发票 / 报告 / 证书            | 通用绘制与排版      |
| 模板化能力  | 无需编码即可可视化编辑 HTML 模板，并支持导入和复用 | 需要自行开发       |
| 商业升级路径 | 可无缝升级至商业版                    | 扩展需求通常需要自行构建 |

## 许可证

- 本项目的开源部分采用 [GNU Affero 通用公共许可证 v3.0](LICENSE) 发布。
- 如需用于闭源商业项目、正式生产环境或企业交付场景，请申请**商业许可证**。
- 详细信息请参阅本仓库中的 [许可证文件](LICENSE)。

## 支持

可提交[问题反馈](https://github.com/ComPDFKit/compdf-generation/issues)、加入[讨论区](https://github.com/ComPDFKit/compdf-generation/discussions)，或联系 ComPDF 团队获取商业许可证。

---

<div align="center">
  <p><strong>由 ComPDF 团队打造。</strong></p>
  <p>
    <a href="https://www.compdf.com?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_cn">官网</a>
      ·  
    <a href="https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_cn">联系销售</a>
      ·  
    <a href="https://www.compdf.com/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_cn">文档</a>
  </p>
</div>
