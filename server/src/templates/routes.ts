import path from 'node:path'

import { ZipArchive } from 'archiver'
import { Router, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'

import { parseImportFile, type TemplateEngineOptions } from './import.js'
import { TemplateStore, TemplateStoreError } from './store.js'
import type { TemplateImportFailure, TemplateImportResult, TemplateMetadata } from './types.js'
import { normalizeMultipartFileName } from '../upload.js'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 2, fields: 4 },
})

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 200, fields: 4 },
})

const uploadTemplateFiles = upload.fields([
  { name: 'htmlFile', maxCount: 1 },
  { name: 'jsonFile', maxCount: 1 },
])

/** Creates the template search, create, update, delete, and download routes. */
export function createTemplateRouter(storageDirectory: string, engine: TemplateEngineOptions): Router {
  const router = Router()
  const store = new TemplateStore(storageDirectory)

  router.get('/search', asyncRoute(async (request, response) => {
    const keyword = typeof request.query.keyword === 'string' ? request.query.keyword : ''
    response.json(await store.search(keyword))
  }))

  router.get('/name-exists', asyncRoute(async (request, response) => {
    const name = readRequiredField(request.query.name, 'name')
    response.json({ exists: await store.nameExists(name) })
  }))

  router.post('/', uploadTemplateFiles, asyncRoute(async (request, response) => {
    const files = collectUploadedFiles(request)
    const htmlFile = files.htmlFile?.[0] && normalizeMultipartFileName(files.htmlFile[0])
    const jsonFile = files.jsonFile?.[0] && normalizeMultipartFileName(files.jsonFile[0])
    if (!htmlFile) {
      response.status(400).json({ message: 'htmlFile is required' })
      return
    }

    const template = await store.create({
      name: readRequiredField(request.body?.name, 'name'),
      description: readOptionalField(request.body?.description),
      htmlFile,
      jsonFile,
    })
    response.status(201).json(template)
  }))

  router.post('/import', importUpload.array('files', 200), asyncRoute(async (request, response) => {
    const files = collectImportFiles(request)
    if (!files.length) {
      response.status(400).json({ message: 'files is required' })
      return
    }

    const imported: TemplateMetadata[] = []
    const failed: TemplateImportFailure[] = []
    for (const rawFile of files) {
      const file = normalizeMultipartFileName(rawFile)
      try {
        const entries = await parseImportFile(file, engine)
        for (const entry of entries) {
          try {
            imported.push(await store.createImported(entry))
          } catch (error) {
            failed.push({ name: entry.name, message: resolveImportError(error) })
          }
        }
      } catch (error) {
        failed.push({ name: file.originalname, message: resolveImportError(error) })
      }
    }

    const result: TemplateImportResult = { imported, failed }
    response.json(result)
  }))

  router.get('/:id/content', asyncRoute(async (request, response) => {
    response.set('Cache-Control', 'no-store')
    response.json(await store.getContent(readRouteId(request.params.id)))
  }))

  router.put('/:id', uploadTemplateFiles, asyncRoute(async (request, response) => {
    const files = collectUploadedFiles(request)
    const template = await store.update(readRouteId(request.params.id), {
      name: readOptionalField(request.body?.name),
      description: readOptionalField(request.body?.description),
      htmlFile: files.htmlFile?.[0] && normalizeMultipartFileName(files.htmlFile[0]),
      jsonFile: files.jsonFile?.[0] && normalizeMultipartFileName(files.jsonFile[0]),
      removeJsonFile: readOptionalBooleanField(request.body?.removeJsonFile, 'removeJsonFile'),
    })
    response.json(template)
  }))

  router.delete('/:id', asyncRoute(async (request, response) => {
    await store.delete(readRouteId(request.params.id))
    response.status(204).send()
  }))

  router.get('/:id/download', asyncRoute(async (request, response) => {
    const files = await store.getArchiveFiles(readRouteId(request.params.id))
    const archive = new ZipArchive({ zlib: { level: 9 } })
    archive.once('error', () => undefined)

    response.attachment(`${safeArchiveName(files.metadata.name)}.zip`)
    response.set('Cache-Control', 'no-store')
    archive.pipe(response)
    archive.file(files.htmlPath, { name: files.metadata.htmlFileName })
    if (files.jsonPath && files.metadata.jsonFileName) {
      archive.file(files.jsonPath, { name: files.metadata.jsonFileName })
    }
    archive.append(`${JSON.stringify(files.metadata, null, 2)}\n`, { name: 'metadata.json' })
    await archive.finalize()
  }))

  return router
}

type AsyncRouteHandler = (request: Request, response: Response, next: NextFunction) => Promise<void>

/** Forwards rejected async route handlers to Express error middleware. */
function asyncRoute(handler: AsyncRouteHandler) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next)
  }
}

/** Normalizes Multer uploads into an object indexed by field name. */
function collectUploadedFiles(request: Request): Record<string, Express.Multer.File[]> {
  if (!request.files || Array.isArray(request.files)) return {}
  return request.files
}

/** Collects files uploaded with the batch import array field. */
function collectImportFiles(request: Request): Express.Multer.File[] {
  return Array.isArray(request.files) ? request.files : []
}

/** Converts any thrown error into a stable import failure message. */
function resolveImportError(error: unknown): string {
  if (error instanceof TemplateStoreError) return error.message
  return error instanceof Error ? error.message : String(error)
}

/** Reads a required text field and throws a 400 error when absent. */
function readRequiredField(value: unknown, name: string): string {
  if (typeof value !== 'string') throw new TemplateStoreError(`${name} is required`, 400)
  return value
}

/** Reads an optional text field and ignores non-string values. */
function readOptionalField(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/** Reads an optional multipart boolean field. */
function readOptionalBooleanField(value: unknown, name: string): boolean | undefined {
  if (value === undefined) return undefined
  if (value === 'true') return true
  if (value === 'false') return false
  throw new TemplateStoreError(`${name} must be true or false`, 400)
}

/** Narrows an Express route parameter to one template identifier. */
function readRouteId(value: string | string[]): string {
  if (typeof value !== 'string') throw new TemplateStoreError('Invalid template id', 400)
  return value
}

/** Sanitizes a template name for use as a ZIP download filename. */
function safeArchiveName(value: string): string {
  const sanitized = value.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, '-').replace(/[. ]+$/g, '')
  return path.basename(sanitized || 'template').slice(0, 100)
}
