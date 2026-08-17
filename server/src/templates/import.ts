import { Readable } from 'node:stream'

import { unzipSync, type Unzipped } from 'fflate'

import { TemplateStoreError } from './store.js'
import type { TemplateImportEntry } from './types.js'

export interface TemplateEngineOptions {
  pdfBaseUrl: string
  timeoutMs: number
}

interface ZipEntry {
  name: string
  data: Buffer
}

/** Parses one uploaded file into one or more importable template entries. */
export async function parseImportFile(
  file: Express.Multer.File,
  engine: TemplateEngineOptions,
): Promise<TemplateImportEntry[]> {
  if (isHtmlFile(file.originalname)) return [createHtmlEntry(file.originalname, file)]
  if (isDitoFile(file.originalname)) {
    const htmlFile = await convertDitoToHtml(file, engine)
    return [createHtmlEntry(htmlFile.originalname, htmlFile)]
  }
  if (isZipFile(file.originalname)) return parseZipFile(file, engine)
  throw new TemplateStoreError(`Unsupported file type: ${file.originalname}`, 400)
}

/** Converts a .dito file to an HTML template through the ComPDF engine. */
export async function convertDitoToHtml(
  file: Express.Multer.File,
  engine: TemplateEngineOptions,
): Promise<Express.Multer.File> {
  const form = new FormData()
  form.append('ditoFile', new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname)

  let upstream: globalThis.Response
  try {
    upstream = await fetch(`${engine.pdfBaseUrl}/v1/sync/generation/convert_dito_to_jinja`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(engine.timeoutMs),
    })
  } catch (error) {
    const timeout = (error as { name?: string })?.name === 'TimeoutError'
    throw new TemplateStoreError(
      timeout
        ? 'DITO conversion timed out'
        : `Unable to call DITO converter: ${error instanceof Error ? error.message : String(error)}`,
      502,
    )
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  if (!upstream.ok) {
    throw new TemplateStoreError(
      `DITO conversion failed (${upstream.status}): ${buffer.toString('utf8').slice(0, 500)}`,
      502,
    )
  }
  if (!buffer.length) {
    throw new TemplateStoreError('DITO converter returned an empty HTML file', 502)
  }

  return createHtmlFile(buffer, file.originalname.replace(/\.dito$/i, '.html'), file)
}

/** Builds an import entry for one HTML file using its base name as the template name. */
function createHtmlEntry(name: string, htmlFile: Express.Multer.File): TemplateImportEntry {
  return { name: importBaseName(name), htmlFile }
}

/** Extracts all ZIP entries into memory and validates the archive. */
function extractZipEntries(buffer: Buffer): ZipEntry[] {
  let unzipped: Unzipped
  try {
    unzipped = unzipSync(new Uint8Array(buffer))
  } catch (error) {
    throw new TemplateStoreError(`Invalid ZIP archive: ${errorMessage(error)}`, 400)
  }
  return Object.entries(unzipped).map(([name, data]) => ({ name, data: Buffer.from(data) }))
}

/** Parses a ZIP archive into system-package entries or loose template groups. */
async function parseZipFile(
  zipFile: Express.Multer.File,
  engine: TemplateEngineOptions,
): Promise<TemplateImportEntry[]> {
  const entries = extractZipEntries(zipFile.buffer)
  if (entries.some(entry => baseName(entry.name) === 'metadata.json')) {
    return [restoreSystemPackage(zipFile, entries)]
  }

  const htmlEntries = entries.filter(entry => !isIgnoredEntry(entry.name) && isHtmlFile(entry.name))
  const ditoEntries = entries.filter(entry => !isIgnoredEntry(entry.name) && isDitoFile(entry.name))
  const jsonEntries = entries.filter(entry => !isIgnoredEntry(entry.name) && isJsonFile(entry.name))
  if (!htmlEntries.length && !ditoEntries.length) {
    throw new TemplateStoreError('ZIP archive does not contain any supported template files', 400)
  }

  const templates: TemplateImportEntry[] = []
  const usedJsonNames = new Set<string>()
  for (const entry of htmlEntries) {
    templates.push({
      name: importBaseName(entry.name),
      htmlFile: toMulterFile(entry, 'htmlFile', 'text/html'),
      jsonFile: takeMatchingJson(entry.name, jsonEntries, usedJsonNames),
    })
  }
  for (const entry of ditoEntries) {
    const htmlFile = await convertDitoToHtml(toMulterFile(entry, 'ditoFile', 'application/octet-stream'), engine)
    templates.push({
      name: importBaseName(entry.name),
      htmlFile,
      jsonFile: takeMatchingJson(entry.name, jsonEntries, usedJsonNames),
    })
  }
  return templates
}

/** Restores a template exported by this system from its metadata and source files. */
function restoreSystemPackage(zipFile: Express.Multer.File, entries: ZipEntry[]): TemplateImportEntry {
  const metadataEntry = entries.find(entry => baseName(entry.name) === 'metadata.json')
  if (!metadataEntry) throw new TemplateStoreError('ZIP archive is missing metadata.json', 400)

  let metadata: {
    name?: unknown
    description?: unknown
    htmlFileName?: unknown
    jsonFileName?: unknown
  }
  try {
    metadata = JSON.parse(metadataEntry.data.toString('utf8')) as typeof metadata
  } catch {
    throw new TemplateStoreError('ZIP archive contains invalid metadata.json', 400)
  }

  const htmlName = typeof metadata.htmlFileName === 'string' && metadata.htmlFileName
    ? metadata.htmlFileName
    : 'template.html'
  const htmlEntry = entries.find(entry => baseName(entry.name) === baseName(htmlName))
    ?? entries.find(entry => baseName(entry.name) === 'template.html')
    ?? entries.find(entry => baseName(entry.name) === 'template.htm')
  if (!htmlEntry) throw new TemplateStoreError('ZIP archive is missing the HTML template', 400)

  const name = typeof metadata.name === 'string' && metadata.name.trim()
    ? metadata.name.trim()
    : importBaseName(zipFile.originalname)
  if (!name) throw new TemplateStoreError('Unable to determine template name from ZIP archive', 400)

  let jsonEntry = typeof metadata.jsonFileName === 'string' && metadata.jsonFileName
    ? entries.find(entry => baseName(entry.name) === baseName(metadata.jsonFileName as string))
    : undefined
  jsonEntry ??= entries.find(entry => baseName(entry.name) === 'data.json')

  return {
    name,
    description: typeof metadata.description === 'string' ? metadata.description.trim() : '',
    htmlFile: toMulterFile(htmlEntry, 'htmlFile', 'text/html'),
    jsonFile: jsonEntry ? toMulterFile(jsonEntry, 'jsonFile', 'application/json') : undefined,
  }
}

/** Returns the first unused JSON entry whose base name matches the HTML file. */
function takeMatchingJson(
  htmlName: string,
  jsonEntries: ZipEntry[],
  usedNames: Set<string>,
): Express.Multer.File | undefined {
  const target = importBaseName(htmlName).toLocaleLowerCase()
  const match = jsonEntries.find(entry => {
    if (usedNames.has(entry.name)) return false
    return importBaseName(entry.name).toLocaleLowerCase() === target
  })
  if (!match) return undefined
  usedNames.add(match.name)
  return toMulterFile(match, 'jsonFile', 'application/json')
}

/** Creates an in-memory Multer file from a ZIP entry. */
function toMulterFile(entry: ZipEntry, fieldname: string, mimetype: string): Express.Multer.File {
  const name = baseName(entry.name)
  return {
    fieldname,
    originalname: name,
    encoding: '7bit',
    mimetype,
    size: entry.data.length,
    stream: Readable.from(entry.data),
    destination: '',
    filename: name,
    path: '',
    buffer: entry.data,
  }
}

/** Creates an in-memory Multer file containing converted DITO HTML. */
function createHtmlFile(buffer: Buffer, name: string, source: Express.Multer.File): Express.Multer.File {
  return {
    fieldname: 'htmlFile',
    originalname: name,
    encoding: source.encoding,
    mimetype: 'text/html',
    size: buffer.length,
    stream: Readable.from(buffer),
    destination: '',
    filename: name,
    path: '',
    buffer,
  }
}

/** Removes the trailing extension from a file name. */
function importBaseName(value: string): string {
  return baseName(value).replace(/\.[^.]+$/, '')
}

/** Extracts the final path segment using either slash style. */
function baseName(value: string): string {
  const segments = value.replace(/\\/g, '/').split('/')
  return segments[segments.length - 1] || value
}

/** Skips macOS metadata and hidden files inside archives. */
function isIgnoredEntry(name: string): boolean {
  return name
    .replace(/\\/g, '/')
    .split('/')
    .some(segment => segment === '__MACOSX' || (segment.startsWith('.') && segment !== '.'))
}

function isHtmlFile(name: string): boolean {
  return /\.html?$/i.test(name)
}

function isDitoFile(name: string): boolean {
  return /\.dito$/i.test(name)
}

function isZipFile(name: string): boolean {
  return /\.zip$/i.test(name)
}

function isJsonFile(name: string): boolean {
  return /\.json$/i.test(name)
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
