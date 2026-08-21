![banner](./images/banner.png)

[English](README.md) | [繁體中文](README_TW.md) | [日本語](README_JA.md) | [简体中文](README_CN.md)

# ComPDF Generation — Open-Source Self-Hosted PDF Generation SDK & Platform

Generate business PDFs from HTML templates and JSON data with visual template editing, reusable templates, batch processing, and API integration.

<p align="center">
  <a href="https://github.com/ComPDFKit/compdf-generation/stargazers"><img src="https://img.shields.io/github/stars/ComPDFKit/compdf-generation?style=flat-square" alt="GitHub Stars"></a>
  <a href="https://github.com/ComPDFKit/compdf-generation/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-AGPL%20v3%20%2B%20Commercial-blue?style=flat-square" alt="License: AGPL v3 + Commercial"></a>
  <a href="https://github.com/ComPDFKit/compdf-generation/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs Welcome"></a>
</p>

<p align="center">
  <a href="https://www.compdf.com/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en">Documentation</a>
    •  
  <a href="https://www.compdf.com?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en">Website</a>
    •  
  <a href="https://github.com/ComPDFKit/compdf-generation/discussions">Discussions</a>
</p>

</div>

---

## Contents

- [Why ComPDF Generation](#why-compdf-generation)
- [Features](#features)
- [Quick Start](#quick-start)
- [User Guide](#user-guide)
- [Deployment Configuration](#deployment-configuration)
- [Use Cases](#use-cases)
- [Open Source & Commercial Editions](#open-source--commercial-editions)
- [Comparison with Other Open-Source PDF Libraries](#comparison-with-other-open-source-pdf-libraries)
- [License](#license)
- [Support](#support)

---

## Why ComPDF Generation

ComPDF Generation is an open-source, self-hosted PDF generation SDK and platform for developers and teams that need reusable, template-based document workflows. It keeps deployment, templates, and workflow integration under your control.

## Features

- **Visual Template Editor** — Create, test, and preview templates visually. Edit HTML directly when advanced customization is needed.
- **Self-Hosted Web UI and API** — Manage templates in the Web UI, then integrate workflows through API access and SDK capabilities.
- **Structured JSON Data** — Generate customized documents from JSON data sources.
- **High-Volume Processing** — Use multithreaded batch generation with no document-generation quota.
- **AI-Friendly Workflows** — Use structured templates and data inputs to support AI-assisted document workflows and reduce repeated prompt construction.
- **Batch Template Import and Migration** — Import DITO templates and ComPDF Generation templates in batches, making it easy to migrate smoothly from iText and other competing PDF generation solutions to ComPDF Generation. Imported templates can be edited as needed for flexible reuse.

<div align="center">
<img src="./images/example.gif" width="850" alt="ComPDF Generation template editor preview">
</div>

---

## Quick Start

### Windows PowerShell

Make sure Docker Desktop is installed and that you can pull the `compdfkit/pdf-generation:1.0.0` image from Docker Hub. The commands below clone the project, copy the environment file, and start the services; wait until `compdf-app` becomes `healthy`, then open `http://localhost:8090`. `.env.example` includes a trial license, which adds a watermark to generated PDFs; for production use, replace `COMPDF_LICENSE_KEY` with a formal license and [contact sales](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en) to obtain one.

```powershell
git clone https://github.com/ComPDFKit/compdf-generation.git
cd compdf-generation
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
```

### macOS or Linux

Make sure Docker Desktop (macOS) or Docker Engine with the Docker Compose plugin (Linux) is installed and that you can pull the `compdfkit/pdf-generation:1.0.0` image from Docker Hub. The commands below clone the project, copy the environment file, and start the services; wait until `compdf-app` becomes `healthy`, then open `http://localhost:8090`. `.env.example` includes a trial license, which adds a watermark to generated PDFs; for production use, replace `COMPDF_LICENSE_KEY` with a formal license and [contact sales](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en) to obtain one.

```bash
git clone https://github.com/ComPDFKit/compdf-generation.git
cd compdf-generation
cp .env.example .env
docker compose up -d --build
docker compose ps
```

For a remote Linux server, open the same address from a browser that can access the server's `8090` port. Templates are stored in `TEMPLATE_STORAGE_DIR`, which defaults to `./data/templates`; rebuilding the application container does not remove this data.

## User Guide

See the [Self-Hosted Generation User Manual](https://www.compdf.com/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en) for template authoring and data binding.

## Deployment Configuration

### Environment Variables

Before starting the services, you can configure the following variables in `.env`:

| Variable                | Default                 | Description                                                                                                                                |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `COMPDF_LICENSE_KEY`    | Required                | A ComPDF License Key with PDF Generation or HTML-to-PDF permissions. The trial key in `.env.example` adds a watermark to generated PDFs.   |
| `COMPDF_IMAGE_PLATFORM` | `linux/amd64`           | Platform used by the `compdf-app` image. Change only if the image supports the target deployment platform.                                 |
| `NODE_IMAGE`            | `node:22-bookworm-slim` | Node.js image used to build the multi-stage Docker image for the Web and API services.                                                     |
| `APP_PORT`              | `8090`                  | Port exposed for the ComPDF Generation Web UI and API. Change it if `8090` is already in use.                                              |
| `COMPDF_TIMEOUT_MS`     | `120000`                | Maximum time in milliseconds for the Web/API services to wait for the ComPDF engine. Increase this for large or complex templates.         |
| `TEMPLATE_STORAGE_DIR`  | `./data/templates`      | Host directory used to persist HTML templates, JSON data sources, and metadata. Use an absolute path if you need a fixed storage location. |

```bash
docker compose ps
docker compose logs --tail=100 compdf-generation compdf-app
```

`compdf-app` must be `healthy` before PDF generation is available. Templates are stored in `TEMPLATE_STORAGE_DIR` (`./data/templates` by default), and rebuilding the application container does not remove this data.

## Use Cases

- Automated contracts and agreements
- Invoices, statements, and financial documents
- Batch monthly, quarterly, and analytical reports
- Certificates and standardized proof documents
- On-demand PDF output for CRM, ERP, OA, and other internal systems

## Open Source & Commercial Editions

Need production deployment, watermark-free output, or enterprise support? Upgrade to the [commercial edition](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en).

| Capability                      | Open-Source Edition | Commercial Edition |
| ------------------------------- | ------------------- | ------------------ |
| Document generation API         | ✅                   | ✅                  |
| HTML template design and import | ✅                   | ✅                  |
| Template management             | ✅                   | ✅                  |
| Batch generation                | ✅                   | ✅                  |
| Export without watermark        | Watermarked         | No watermark       |
| Production use                  | Not recommended     | ✅                  |
| SLA / technical support         | Community support   | Dedicated support  |
| License                         | AGPL v3             | Commercial License |

For production deployment, use a formal commercial License and follow your organization's operational and compliance requirements.

## Comparison with Other Open-Source PDF Libraries

| Dimension           | ComPDF Generation                                                             | Other PDF Libraries                             |
| ------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| Positioning         | Business document generation with easy, scenario-based template customization | Low-level PDF capability wrappers               |
| Document generation | Batch generation with no output quota                                         | Usually subject to certain limitations          |
| Scenario focus      | Contracts / invoices / reports / certificates                                 | General drawing and layout                      |
| Templating          | Zero-code visual HTML template editing, with import and reuse support         | Requires custom development                     |
| Commercial path     | Seamless upgrade to a commercial edition                                      | Expansion often needs to be built independently |

## License

- The open-source portion of this project is released under the [GNU Affero General Public License v3.0](LICENSE).
- For closed-source commercial projects, formal production environments, or enterprise delivery, please apply for a **commercial License**.

## Support

Submit an [Issue](https://github.com/ComPDFKit/compdf-generation/issues), join [Discussions](https://github.com/ComPDFKit/compdf-generation/discussions), or contact the ComPDF team for a commercial License.

---

<div align="center">
  <p><strong>Built by the ComPDF team.</strong></p>
  <p>
    <a href="https://www.compdf.com?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en">Website</a>
      ·  
    <a href="https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en">Contact Sales</a>
      ·  
    <a href="https://www.compdf.com/guides/pdf-sdk/self-hosted-generation/user-manual?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en">Documentation</a>
  </p>
</div>
