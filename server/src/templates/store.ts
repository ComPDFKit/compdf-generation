import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

import type {
  CreateTemplateInput,
  TemplateArchiveFiles,
  TemplateContent,
  TemplateMetadata,
  TemplateSearchResult,
  UpdateTemplateInput,
} from './types.js'

const metadataFileName = 'metadata.json'
const htmlFileName = 'template.html'
const jsonFileName = 'data.json'
const templateIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class TemplateStoreError extends Error {
  /** Creates a template business error with an HTTP status code. */
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'TemplateStoreError'
  }
}

export class TemplateStore {
  /** Initializes the filesystem template store with the given directory. */
  constructor(private readonly baseDirectory: string) {}

  /** Searches names and descriptions and sorts results by update time. */
  async search(keyword = ''): Promise<TemplateSearchResult> {
    await this.ensureBaseDirectory()
    const entries = await fs.readdir(this.baseDirectory, { withFileTypes: true })
    const records = await Promise.all(entries
      .filter((entry) => entry.isDirectory() && templateIdPattern.test(entry.name))
      .map(async (entry) => {
        try {
          return await this.readMetadata(entry.name)
        } catch (error) {
          console.warn(`Skipping invalid template directory ${entry.name}:`, error)
          return null
        }
      }))

    const normalizedKeyword = keyword.trim().toLocaleLowerCase()
    const items = records
      .filter((record): record is TemplateMetadata => record !== null)
      .filter((record) => !normalizedKeyword
        || `${record.name} ${record.description}`.toLocaleLowerCase().includes(normalizedKeyword))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))

    return { items, total: items.length }
  }

  /** Checks whether a normalized template name is already in use. */
  async nameExists(name: string): Promise<boolean> {
    const normalizedName = normalizeName(name)
    const { items } = await this.search()
    return items.some((item) => normalizeName(item.name) === normalizedName)
  }

  /** Validates and atomically creates the template directory and files. */
  async create(input: CreateTemplateInput): Promise<TemplateMetadata> {
    validateName(input.name)
    validateHtmlFile(input.htmlFile)
    if (input.jsonFile) validateJsonFile(input.jsonFile)

    await this.ensureBaseDirectory()
    if (await this.nameExists(input.name)) {
      throw new TemplateStoreError('Template name already exists', 409)
    }
    const id = randomUUID()
    const finalDirectory = this.resolveTemplateDirectory(id)
    const temporaryDirectory = path.join(this.baseDirectory, `.${id}.tmp`)
    const timestamp = new Date().toISOString()
    const metadata: TemplateMetadata = {
      id,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      htmlFileName: safeOriginalFileName(input.htmlFile.originalname, htmlFileName),
      jsonFileName: input.jsonFile
        ? safeOriginalFileName(input.jsonFile.originalname, jsonFileName)
        : null,
      htmlSize: input.htmlFile.size,
      jsonSize: input.jsonFile?.size ?? 0,
      jsonFieldCount: input.jsonFile ? countJsonFields(input.jsonFile.buffer) : 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    try {
      await fs.mkdir(temporaryDirectory, { recursive: false })
      const writes = [
        fs.writeFile(path.join(temporaryDirectory, htmlFileName), input.htmlFile.buffer),
        fs.writeFile(path.join(temporaryDirectory, metadataFileName), serializeMetadata(metadata), 'utf8'),
      ]
      if (input.jsonFile) {
        writes.push(fs.writeFile(path.join(temporaryDirectory, jsonFileName), input.jsonFile.buffer))
      }
      await Promise.all(writes)
      await fs.rename(temporaryDirectory, finalDirectory)
      return metadata
    } catch (error) {
      await fs.rm(temporaryDirectory, { recursive: true, force: true })
      throw error
    }
  }

  /** Updates metadata and atomically replaces optional template files. */
  async update(id: string, input: UpdateTemplateInput): Promise<TemplateMetadata> {
    const current = await this.readMetadata(id)
    if (input.name !== undefined) validateName(input.name)
    if (input.htmlFile) validateHtmlFile(input.htmlFile)
    if (input.jsonFile) validateJsonFile(input.jsonFile)
    if (input.jsonFile && input.removeJsonFile) {
      throw new TemplateStoreError('jsonFile and removeJsonFile cannot be used together', 400)
    }

    const directory = this.resolveTemplateDirectory(id)
    const removeJsonFile = input.removeJsonFile === true
    const updated: TemplateMetadata = {
      ...current,
      name: input.name?.trim() ?? current.name,
      description: input.description?.trim() ?? current.description,
      htmlFileName: input.htmlFile
        ? safeOriginalFileName(input.htmlFile.originalname, htmlFileName)
        : current.htmlFileName,
      jsonFileName: input.jsonFile
        ? safeOriginalFileName(input.jsonFile.originalname, jsonFileName)
        : removeJsonFile ? null : current.jsonFileName,
      htmlSize: input.htmlFile?.size ?? current.htmlSize,
      jsonSize: input.jsonFile?.size ?? (removeJsonFile ? 0 : current.jsonSize),
      jsonFieldCount: input.jsonFile
        ? countJsonFields(input.jsonFile.buffer)
        : removeJsonFile ? 0 : current.jsonFieldCount,
      updatedAt: new Date().toISOString(),
    }

    if (input.htmlFile) await atomicWrite(path.join(directory, htmlFileName), input.htmlFile.buffer)
    if (input.jsonFile) await atomicWrite(path.join(directory, jsonFileName), input.jsonFile.buffer)
    if (removeJsonFile) await fs.rm(path.join(directory, jsonFileName), { force: true })
    await atomicWrite(path.join(directory, metadataFileName), serializeMetadata(updated))
    return updated
  }

  /** Verifies that a template exists before removing its directory. */
  async delete(id: string): Promise<void> {
    await this.readMetadata(id)
    await fs.rm(this.resolveTemplateDirectory(id), { recursive: true, force: false })
  }

  /** Returns metadata and file paths required to build a download archive. */
  async getArchiveFiles(id: string): Promise<TemplateArchiveFiles> {
    const metadata = await this.readMetadata(id)
    const directory = this.resolveTemplateDirectory(id)
    return {
      metadata,
      directory,
      htmlPath: path.join(directory, htmlFileName),
      jsonPath: metadata.jsonFileName ? path.join(directory, jsonFileName) : undefined,
    }
  }

  /** Returns template metadata together with the editable UTF-8 source files. */
  async getContent(id: string): Promise<TemplateContent> {
    const metadata = await this.readMetadata(id)
    const directory = this.resolveTemplateDirectory(id)
    const html = await fs.readFile(path.join(directory, htmlFileName), 'utf8')
    const json = metadata.jsonFileName
      ? await fs.readFile(path.join(directory, jsonFileName), 'utf8')
      : null
    return { metadata, html, json }
  }

  /** Ensures that the template storage root directory exists. */
  private async ensureBaseDirectory(): Promise<void> {
    await fs.mkdir(this.baseDirectory, { recursive: true })
  }

  /** Validates a template UUID and resolves its controlled directory. */
  private resolveTemplateDirectory(id: string): string {
    if (!templateIdPattern.test(id)) throw new TemplateStoreError('Invalid template id', 400)
    return path.join(this.baseDirectory, id)
  }

  /** Reads metadata and supports legacy records without a field count. */
  private async readMetadata(id: string): Promise<TemplateMetadata> {
    const directory = this.resolveTemplateDirectory(id)
    try {
      const raw = await fs.readFile(path.join(directory, metadataFileName), 'utf8')
      const metadata = JSON.parse(raw) as TemplateMetadata
      if (metadata.id !== id || !metadata.name || !metadata.htmlFileName) {
        throw new Error('Invalid metadata')
      }
      return {
        ...metadata,
        jsonFileName: typeof metadata.jsonFileName === 'string' && metadata.jsonFileName
          ? metadata.jsonFileName
          : null,
        jsonSize: Number.isFinite(metadata.jsonSize) ? metadata.jsonSize : 0,
        jsonFieldCount: Number.isFinite(metadata.jsonFieldCount) ? metadata.jsonFieldCount : 0,
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new TemplateStoreError('Template not found', 404)
      }
      throw error
    }
  }
}

/** Validates that the template name is present and within its limit. */
function validateName(value: string): void {
  const name = value.trim()
  if (!name) throw new TemplateStoreError('Template name is required', 400)
  if (name.length > 120) throw new TemplateStoreError('Template name must not exceed 120 characters', 400)
}

/** Normalizes a template name for case-insensitive duplicate checks. */
function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

/** Validates that the uploaded file is a non-empty HTML document. */
function validateHtmlFile(file: Express.Multer.File): void {
  if (!/\.html?$/i.test(file.originalname)) {
    throw new TemplateStoreError('htmlFile must be an HTML file', 400)
  }
  if (!file.size) throw new TemplateStoreError('htmlFile must not be empty', 400)
}

/** Validates that the uploaded file contains parseable JSON. */
function validateJsonFile(file: Express.Multer.File): void {
  if (!/\.json$/i.test(file.originalname)) {
    throw new TemplateStoreError('jsonFile must be a JSON file', 400)
  }
  try {
    JSON.parse(file.buffer.toString('utf8'))
  } catch {
    throw new TemplateStoreError('jsonFile must contain valid JSON', 400)
  }
}

/** Counts top-level object fields or array entries in a JSON file. */
function countJsonFields(buffer: Buffer): number {
  const value = JSON.parse(buffer.toString('utf8')) as unknown
  if (Array.isArray(value)) return value.length
  if (value && typeof value === 'object') return Object.keys(value).length
  return 0
}

/** Serializes metadata as formatted JSON with a trailing newline. */
function serializeMetadata(metadata: TemplateMetadata): string {
  return `${JSON.stringify(metadata, null, 2)}\n`
}

/** Sanitizes an uploaded filename to remove unsafe paths and characters. */
function safeOriginalFileName(value: string, fallback: string): string {
  const sanitized = path.basename(value).replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').replace(/[. ]+$/g, '')
  return sanitized || fallback
}

/** Writes a file atomically through a temporary file and rename. */
async function atomicWrite(filePath: string, data: string | Buffer): Promise<void> {
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`
  try {
    await fs.writeFile(temporaryPath, data)
    await fs.rename(temporaryPath, filePath)
  } catch (error) {
    await fs.rm(temporaryPath, { force: true })
    throw error
  }
}
