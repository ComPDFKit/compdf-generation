![banner](./images/banner.png)

[English](README.md) | [繁體中文](README_TW.md) | [日本語](README_JA.md) | [简体中文](README_CN.md)

# ComPDF Generation - 开源 PDF 文档生成 SDK

**ComPDF Generation** 是 KDAN 生态的一部分，面向开发者与企业业务系统的开源 PDF 文档生成 SDK，适用于合同、发票、报告、证书等自动化文档生成场景，兼顾生成效果、接入效率与商业升级路径。

> - 如果你觉得 ComPDF Generation 对你的项目有帮助，欢迎在 GitHub 上给我们一个 ⭐ **Star**。
> - 有问题、建议或场景需求，欢迎通过 **[Issues](https://github.com/ComPDFKit/compdf-generation/issues)** 与 **[Discussions](https://github.com/ComPDFKit/compdf-generation/discussions)** 与我们交流。

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/license-AGPL%20v3%20%2B%20Commercial-blue" alt="License"></a>
  <a href="#"><img src="https://img.shields.io/github/stars/ComPDFKit/compdf-generation" alt="GitHub Stars"></a>
    <a href="#"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome"></a>
</p>

<p align="center">
  <a href="#为什么选择-compdf-generation"><b>为什么选择 ComPDF Generation</b></a> •
  <a href="#功能"><b>功能</b></a> •
  <a href="#快速开始"><b>快速开始</b></a> •
  <a href="#为什么升级为商业版compdf-generation"><b>升级为商业版</b></a> •
  <a href="#适用场景"><b>适用场景</b></a> •
  <a href="#compdf-generation-开源项目-vs-其他开源-pdf-库"><b>ComPDF Generation 开源项目 vs 其他开源 PDF 库</b></a> •
  <a href="#许可协议"><b>许可协议</b></a> •
   <a href="#支持"><b>支持</b></a> 
</p>

## 为什么选择 ComPDF Generation

**ComPDF Generation** 专注提升**业务文档生成**场景下的接入效率与模板复用能力。支持零代码操作，用户可通过可视化模板编辑器实时预览，轻松完成模板创建与文档生成测试；同时提供 API 接口，便于串联构建基于模板的文档生成自动化工作流。

### 核心优势

- 面向合同、发票、报告、证书等业务文档场景
- 支持基于 HTML 模板的 PDF 生成流程
- 不限文档生成数量、支持多线程文档生成，有效提升批量文档生成效率
- 可赋能 Agent 文档生成，降低 AI Token 消耗
- AGPL 开源，便于开发者快速验证
- 提供商业版 License，可无缝向正式生产与企业场景升级

## 功能

| 能力模块                         | 说明                                                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| HTML 模板生成 PDF 文件             | 基于 HTML 模板，生成 PDF 生成 <br/>支持多线程批量生成文档                                                                                |
| 模板编辑器                        | 提供模板编辑器，支持零代码和可视化地围绕业务场景自由设计合同、发票、报告、证书模板                                                                            |
| 模板管理                         | 支持基础模板管理与复用，降低重复开发成本                                                                                                 |
| 基于模板与 JSON 数据生成预览            | 便于测试模板和最终 PDF 输出效果                                                                                                   |
| 模板支持元素 | ComPDF Generation 支持文本、表格、图片、超链接、页眉页脚、页码、条码、CSS 样式、动态变量与计算、循环/条件逻辑、PDF 表单及可视化模板编辑等核心 PDF 生成元素，可满足复杂业务文档的模板化与动态化生成需求。 |

![](./images/example.gif)

## 快速开始

### 开始前准备

- Windows 或 macOS 上的 Docker Desktop，或 Linux 上的 Docker Engine 和 Docker Compose plugin。
- 可从 Docker Hub 拉取 `compdfkit/pdf-generation:1.0.0` 镜像。

### 获取项目

克隆仓库并进入项目目录：

```bash
git clone https://github.com/ComPDFKit/compdf-generation.git
cd compdf-generation
```

### 配置并启动
项目会在 `.env.example` 中提供试用 License。部署前复制该文件重命名为`.env`即可使用试用 License；使用试用 License 生成的 PDF 会带有水印。

正式生产使用时，请将 `COMPDF_LICENSE_KEY` 替换为正式 License，以移除试用水印。可[联系销售](https://www.compdf.com/zh-cn/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_cn)获取正式 License。请根据操作系统选择对应命令复制环境变量文件：

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS 或 Linux
cp .env.example .env
```

启动服务：

```bash
docker compose up -d --build
docker compose ps
```

当`compdf-app` 状态变为 `healthy` 后，打开 `http://localhost:8090`。部署到远程 Linux 服务器时，请在能访问该服务器 `8090` 端口的浏览器中打开该地址。

### 环境变量

启动服务前，可在 `.env` 中配置以下变量：

| 变量                      | 默认值                     | 说明                                                                                             |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| `COMPDF_LICENSE_KEY`    | 必填                      | 具有 PDF Generation 或 HTML 转 PDF 权限的 ComPDF License Key。`.env.example` 中提供的试用 Key 生成的 PDF 会带有水印。 |
| `COMPDF_IMAGE_PLATFORM` | `linux/amd64`           | `compdf-app` 镜像使用的平台。仅当镜像支持部署主机所需的平台时才修改该值。                                                    |
| `NODE_IMAGE`            | `node:22-bookworm-slim` | 用于构建 Web 和 API 服务 Docker 多阶段镜像的 Node.js 镜像。                                                    |
| `APP_PORT`              | `8090`                  | 映射到宿主机的 ComPDF Generate Web 界面和 API 端口。`8090` 被占用时可改为其他可用端口。                                   |
| `COMPDF_TIMEOUT_MS`     | `120000`                | Web/API 服务等待 ComPDF 引擎响应的最长时间，单位为毫秒。处理大型或复杂模板耗时较长时，可适当调大此值。                                    |
| `TEMPLATE_STORAGE_DIR`  | `./data/templates`      | 宿主机上用于持久化 HTML 模板、JSON 数据源和元数据的目录。部署需要固定数据位置时可使用绝对路径。                                          |

### 验证部署

```bash
docker compose ps
docker compose logs --tail=100 compdf-generate compdf-app
```

两个服务均需处于运行状态，且 `compdf-app` 必须为 healthy 后才能生成 PDF。需要从其他设备访问服务时，请在服务器防火墙或安全组中放行 `APP_PORT`（默认 `8090`）的入站 TCP 流量。

### 创建并生成模板

1. 在模板列表中新建模板，并填写名称和描述。
2. 打开模板编辑器，编写 HTML 内容。
3. 按需添加 JSON 数据，并保存模板。
4. 在编辑器中生成 PDF，浏览器会下载结果文件。

模板存储在 `TEMPLATE_STORAGE_DIR` 中，默认路径为 `./data/templates`。重建应用容器不会删除这些数据。

## 为什么升级为商业版ComPDF Generation

需要正式商业环境接入、水印去除、企业支持？您可以升级至[商业版本](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_cn)。

| 能力           | 开源版     | 商业版        |
| ------------ | ------- | ---------- |
| 文档生成 API     | ✅       | ✅          |
| HTML 模板设计与导入 | ✅       | ✅          |
| 模板管理         | ✅       | ✅          |
| 批量生成         | ✅       | ✅          |
| 水印导出         | 带水印     | 无水印        |
| 正式生产环境       | 不建议     | ✅          |
| SLA / 技术支持   | 社区支持    | 专属支持       |
| License      | AGPL v3 | 商业 License |

## 适用场景

* **合同自动化生成** —— 支持销售合同、采购协议、服务条款等各类合同的自动起草与填充，大幅缩短签署周期

* **发票与单据自动化生成** —— 对接业务数据，自动生成增值税发票、结算单、对账单等财务单据，减少人工操作错误

* **报告批量生成** —— 支持月报、季报、数据分析报告等周期性文档的批量输出，满足高频、大规模业务需求

* **证书与证明文档生成** —— 快速生成员工在职证明、学历证书、资质认证等标准化证明文件，提升内部服务效率

* **内部业务系统 PDF 输出** —— 无缝集成 CRM、ERP、OA 等企业系统，按需导出业务单据、审批表单等 PDF 文档

## ComPDF Generation 开源项目 vs 其他开源 PDF 库

| 维度     | ComPDF Generation                | 其他 PDF 库    |
| ------ | -------------------------------- | ----------- |
| 产品定位   | 业务文档生成，轻松按业务场景自定义模板              | 底层 PDF 能力封装 |
| 文档生成能力 | 批量生成、不限生成数量                      | 基本存在一定限制    |
| 场景聚焦   | 合同 / 发票 / 报告 / 证书                | 通用绘制、排版     |
| 模板化能力  | 无需编码，可视化编辑HTML模板，支持模板导入进行设计或直接复用 | 需自行封装       |
| 商业升级路径 | 支持无缝升级到商业版                       | 往往需自行补足拓展需求 |

## 许可协议

- 本项目开源部分采用 **GNU Affero General Public License v3.0** 发布。
- 如需在闭源商业项目、正式生产环境或企业交付场景中使用，请申请 **商业版 License**。
- 详细说明请参见仓库中的 [LICENSE](LICENSE) 文件。

## 支持

有任何问题或建议，欢迎：

* 提交  [Issue](https://github.com/ComPDFKit/compdf-generation/issues)
* 参与 [Discussions](https://github.com/ComPDFKit/compdf-generation/discussions)
* [联系 ComPDF 团队](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_cn)获取商业License

如果你觉得 **ComPDF Generation** 对你的项目有帮助，欢迎给我们一个 ⭐ **Star**。

---

<p align="center">
  <b>由 ComPDF 团队打造。</b><br>
  <a href="https://www.compdf.com/?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_cn">官网</a> ·
  <a href="https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_cn">商业咨询</a> ·
  <a href="https://www.compdf.com/guides/generation-sdk/java/overview?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_cn">文档</a>
</p>
