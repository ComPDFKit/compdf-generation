![banner](./images/banner.png)

[English](README.md) | [繁體中文](README_TW.md) | [日本語](README_JA.md) | [简体中文](README_CN.md)

# ComPDF Generation - Open-Source PDF Document Generation SDK

**ComPDF Generation** is part of the KDAN ecosystem. It is an open-source PDF document generation SDK built for developers and enterprise systems that need to automate contracts, invoices, reports, certificates, and other business documents, balancing output quality, integration efficiency, and a clear path to commercial deployment.

> - If ComPDF Generation helps your project, we'd love your ⭐ **Star** on GitHub.
> - If you have questions, suggestions, or real-world use cases to discuss, feel free to reach out through **[Issues](https://github.com/ComPDFKit/compdf-generation/issues)** and **[Discussions](https://github.com/ComPDFKit/compdf-generation/discussions)**.

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/license-AGPL%20v3%20%2B%20Commercial-blue" alt="License"></a>
  <a href="#"><img src="https://img.shields.io/github/stars/ComPDFKit/compdf-generation" alt="GitHub Stars"></a>
  <a href="#"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs Welcome"></a>
</p>

<p align="center">
  <a href="#why-compdf-generation"><b>Why ComPDF Generation</b></a> •
  <a href="#core-capabilities"><b>Core Capabilities</b></a> •
  <a href="#quick-start"><b>Quick Start</b></a> •
  <a href="#when-to-upgrade-to-the-commercial-edition"><b>Commercial Upgrade</b></a> •
  <a href="#use-cases"><b>Use Cases</b></a> •
  <a href="#compdf-generation-vs-other-open-source-pdf-libraries"><b>Comparison</b></a> •
  <a href="#license"><b>License</b></a> •
  <a href="#support"><b>Support</b></a>
</p>

## Why ComPDF Generation

**ComPDF Generation** is designed to improve integration speed and template reusability for **business document generation** workflows. With a visual template editor and real-time preview, teams can create templates and test document output with zero-code support. API access is also available, making it easy to build automated, template-driven document workflows.

### Key Advantages

- Built for contracts, invoices, reports, certificates, and other business documents
- Supports HTML-template-based PDF generation
- No document generation quota, with multithreaded processing for higher batch efficiency
- Helps AI agents generate documents while reducing token usage
- Open-sourced under AGPL for fast evaluation and prototyping
- Offers a commercial license for seamless production and enterprise deployment

## Core Capabilities

| Module                               | Description                                                                                                                                                                                                                                     |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generate PDF from HTML templates     | Create PDFs from HTML templates and support multithreaded batch document generation                                                                                                                                                             |
| Template editor                      | Design contracts, invoices, reports, and certificate templates visually with zero-code support                                                                                                                                                  |
| Template management                  | Reuse and manage templates to reduce repetitive development work                                                                                                                                                                                |
| Preview with templates and JSON data | Test templates and review final PDF output before delivery                                                                                                                                                                                      |
| Supported Template Elements         | ComPDF Generation provides essential PDF generation capabilities, from text, tables, and images to dynamic variables, conditional logic, PDF forms, and visual templates, enabling flexible document automation for complex business workflows. |

![](./images/example.gif)

## Quick Start

### Prerequisites

- Docker Desktop on Windows or macOS, or Docker Engine with the Docker Compose plugin on Linux
- Access to pull the `compdfkit/pdf-generation:1.0.0` image from Docker Hub

### Get the Project

Clone the repository and enter the project directory:

```bash
git clone https://github.com/ComPDFKit/compdf-generation.git
cd compdf-generation
```

### Configure and Launch

The project includes a trial license in `.env.example`. Copy and rename this file to `.env` before deployment to use the trial license. PDFs generated with the trial license include a watermark.

For production use without the trial watermark, replace `COMPDF_LICENSE_KEY` with a formal license. [Contact sales](https://www.compdf.com/zh-cn/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en) to obtain one. Use the command for your operating system to copy the environment file:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS or Linux
cp .env.example .env
```

Start the services:

```bash
docker compose up -d --build
docker compose ps
```

When `compdf-app` becomes `healthy`, open `http://localhost:8090`. If you deploy to a remote Linux server, open the same address from a browser that can access the server's `8090` port.

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

### Verify the Deployment

```bash
docker compose ps
docker compose logs --tail=100 compdf-generation compdf-app
```

Both services should be running, and `compdf-app` must be `healthy` before PDF generation is available. If the service needs to be accessed from other devices, allow inbound TCP traffic on `APP_PORT` (default `8090`) in the server firewall or security group.

### Create a Template and Generate a PDF

1. Create a new template in the template list and enter its name and description.
2. Open the template editor and write the HTML content.
3. Add JSON data as needed, then save the template.
4. Generate the PDF in the editor, and the browser will download the file.

Templates are stored in `TEMPLATE_STORAGE_DIR`, which defaults to `./data/templates`. Rebuilding the application container does not remove this data.

## When to Upgrade to the Commercial Edition

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

## Use Cases

- **Automated contract generation**: Draft and populate sales contracts, procurement agreements, service terms, and more to shorten signing cycles.
- **Automated invoices and financial documents**: Connect business data to generate VAT invoices, settlement forms, statements, and other financial documents with fewer manual errors.
- **Batch report generation**: Produce monthly reports, quarterly reports, and analytical reports at scale for high-frequency business workflows.
- **Certificate and proof document generation**: Quickly create employment certificates, academic certificates, qualification documents, and other standardized proof documents.
- **PDF output for internal systems**: Integrate with CRM, ERP, OA, and other enterprise systems to export forms, approvals, and business documents on demand.

## ComPDF Generation vs Other Open-Source PDF Libraries

| Dimension           | ComPDF Generation                                                             | Other PDF Libraries                             |
| ------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| Positioning         | Business document generation with easy, scenario-based template customization | Low-level PDF capability wrappers               |
| Document generation | Batch generation with no output quota                                         | Usually subject to certain limitations          |
| Scenario focus      | Contracts / invoices / reports / certificates                                 | General drawing and layout                      |
| Templating          | Zero-code visual HTML template editing, with import and reuse support         | Requires custom development                     |
| Commercial path     | Seamless upgrade to a commercial edition                                      | Expansion often needs to be built independently |

## License

- The open-source portion of this project is released under the **GNU Affero General Public License v3.0**.
- If you need to use it in a closed-source commercial project, formal production environment, or enterprise delivery scenario, please apply for a **commercial License**.
- See the [LICENSE](LICENSE) file in this repository for details.

## Support

If you have any questions or suggestions, you are welcome to:

- Submit an [Issue](https://github.com/ComPDFKit/compdf-generation/issues)
- Join the [Discussions](https://github.com/ComPDFKit/compdf-generation/discussions)
- [Contact the ComPDF team](https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en) for a commercial License

If ComPDF Generation helps your project, we'd love your ⭐ **Star**.

---

<p align="center">
  <b>Built by the ComPDF team.</b><br>
  <a href="https://www.compdf.com/?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en">Website</a> ·
  <a href="https://www.compdf.com/contact-sales?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en">Contact Sales</a> ·
  <a href="https://www.compdf.com/guides/generation-sdk/java/overview?utm_source=github_generation_newopen&utm_medium=referral&utm_campaign=generation_open&ref_platform_id=github_compdf_en">Documentation</a>
</p>
