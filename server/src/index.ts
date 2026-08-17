import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import express, { type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'

import { createTemplateRouter } from './templates/routes.js'
import { TemplateStoreError } from './templates/store.js'
import { normalizeMultipartFileName } from './upload.js'

const app = express()
const port = Number(process.env.PORT || 8090)
// Docker supplies its internal service address; local development uses the published engine port.
const pdfBaseUrl = (process.env.COMPDF_PDF_BASE_URL || 'http://localhost:7001').replace(/\/$/, '')
const timeoutMs = Number(process.env.COMPDF_TIMEOUT_MS || 120_000)
const templateStorageDir = path.resolve(process.env.TEMPLATE_STORAGE_DIR || path.join(process.cwd(), 'data/templates'))
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 2 },
})

app.disable('x-powered-by')
app.use('/api', (_request, response, next) => {
  response.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Expose-Headers': 'Content-Disposition, X-Trace-Id',
  })
  if (_request.method === 'OPTIONS') {
    response.status(204).end()
    return
  }
  next()
})
app.use('/api/templates', createTemplateRouter(templateStorageDir, { pdfBaseUrl, timeoutMs }))

app.post('/api/v1/process/pdf/generation/template-to-pdf', upload.fields([
  { name: 'templateFile', maxCount: 1 },
  { name: 'dataFile', maxCount: 1 },
]), async (request, response) => {
  await proxyGeneration({
    upstreamPath: '/v1/sync/generation/template-to-pdf',
    request,
    response,
    fileFields: ['templateFile', 'dataFile'],
  })
})

interface ComPdfErrorResponse {
  code: string
  msg: string
  data: null
  errorCode: string
  bizCode?: number
  traceId: string
  details?: unknown
}

class GenerationRequestError extends Error {
  /** Creates a normalized client request error. */
  constructor(
    message: string,
    readonly errorCode: 'INVALID_JSON' | 'INVALID_ARGUMENT' = 'INVALID_ARGUMENT',
    readonly bizCode = errorCode === 'INVALID_JSON' ? 100002 : 100001,
  ) {
    super(message)
  }
}

interface ProxyGenerationOptions {
  upstreamPath: string
  request: Request
  response: Response
  fileFields: string[]
}

/** Proxies a PDF generation request to ComPDF and returns its result. */
async function proxyGeneration(options: ProxyGenerationOptions): Promise<void> {
  const traceId = randomUUID()
  const startedAt = Date.now()
  try {
    const form = new FormData()
    form.append('request', normalizeRequestJson(options.request.body?.request))

    const files = collectFiles(options.request).map(normalizeMultipartFileName)
    for (const field of options.fileFields) {
      const file = files.find((item) => item.fieldname === field)
      if (file) {
        form.append(field, new Blob([new Uint8Array(file.buffer)], { type: file.mimetype }), file.originalname)
      }
    }

    const upstream = await fetch(`${pdfBaseUrl}${options.upstreamPath}`, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    })
    const buffer = Buffer.from(await upstream.arrayBuffer())
    console.log(JSON.stringify({ traceId, path: options.upstreamPath, status: upstream.status, bytes: buffer.length, durationMs: Date.now() - startedAt }))

    if (!upstream.ok) {
      sendUpstreamError(options.response, upstream, buffer, traceId)
      return
    }

    options.response.status(200)
    options.response.set('Cache-Control', 'no-store')
    options.response.set('Content-Type', upstream.headers.get('content-type') || 'application/pdf')
    options.response.set('Content-Disposition', safeDisposition(upstream.headers.get('content-disposition')))
    options.response.set('X-Trace-Id', traceId)
    options.response.send(buffer)
  } catch (error) {
    if (error instanceof GenerationRequestError) {
      sendComPdfError(options.response, 400, {
        msg: error.message,
        errorCode: error.errorCode,
        bizCode: error.bizCode,
        traceId,
      })
      return
    }
    const timeout = (error as { name?: string })?.name === 'TimeoutError'
    sendComPdfError(options.response, 502, {
      msg: timeout
        ? `ComPDF did not respond within ${timeoutMs}ms`
        : `Unable to call ComPDF: ${error instanceof Error ? error.message : String(error)}`,
      errorCode: 'UPSTREAM_ERROR',
      traceId,
    })
  }
}

/** Normalizes Multer single and multi-field uploads into one file array. */
function collectFiles(request: Request): Express.Multer.File[] {
  if (request.file) return [request.file]
  if (!request.files) return []
  if (Array.isArray(request.files)) return request.files
  return Object.values(request.files).flat()
}

/** Validates and normalizes the request JSON sent to ComPDF. */
function normalizeRequestJson(raw: unknown): string {
  const text = typeof raw === 'string' && raw.trim() ? raw : '{}'
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    throw new GenerationRequestError('request must contain valid JSON', 'INVALID_JSON')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new GenerationRequestError('request must be a JSON object')
  }
  return text
}

/** Parses an upstream error and returns it with the request trace ID. */
function sendUpstreamError(response: Response, upstream: globalThis.Response, buffer: Buffer, traceId: string): void {
  const raw = buffer.toString('utf8')
  let parsed: Record<string, unknown> | undefined
  try {
    const body = JSON.parse(raw) as unknown
    if (body && typeof body === 'object' && !Array.isArray(body)) parsed = body as Record<string, unknown>
  } catch {
    // Preserve non-JSON error text as the normalized message.
  }
  const status = upstream.status >= 400 && upstream.status < 600 ? upstream.status : 502
  const upstreamCode = typeof parsed?.code === 'number' ? parsed.code : Number(parsed?.code)
  sendComPdfError(response, status, {
    msg: readErrorMessage(parsed) || raw || `ComPDF returned ${upstream.status}`,
    errorCode: readErrorCode(parsed, status),
    bizCode: Number.isInteger(upstreamCode) && upstreamCode >= 100000 ? upstreamCode : readNumber(parsed?.bizCode),
    traceId,
    details: parsed?.details,
  })
}

/** Writes the documented ComPDF JSON error response. */
function sendComPdfError(response: Response, status: number, error: Omit<ComPdfErrorResponse, 'code' | 'data'>): void {
  const body: ComPdfErrorResponse = {
    code: String(status),
    msg: error.msg,
    data: null,
    errorCode: error.errorCode,
    traceId: error.traceId,
  }
  if (error.bizCode !== undefined) body.bizCode = error.bizCode
  if (error.details !== undefined) body.details = error.details
  response.status(status).json(body)
}

/** Extracts an upstream error message without trusting its response shape. */
function readErrorMessage(body: Record<string, unknown> | undefined): string | undefined {
  const value = body?.msg ?? body?.message
  return typeof value === 'string' && value.trim() ? value : undefined
}

/** Resolves the semantic error code defined by the ComPDF API. */
function readErrorCode(body: Record<string, unknown> | undefined, status: number): string {
  if (typeof body?.errorCode === 'string' && body.errorCode) return body.errorCode
  return ({
    400: 'INVALID_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'INVALID_STATE',
    413: 'FILE_TOO_LARGE',
    429: 'CONCURRENCY_EXCEEDED',
    500: 'INTERNAL_ERROR',
  } as Record<number, string>)[status] || 'UPSTREAM_ERROR'
}

/** Safely reads an optional numeric upstream business code. */
function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** Validates Content-Disposition to prevent response header injection. */
function safeDisposition(value: string | null): string {
  if (!value || /[\r\n]/.test(value)) return 'attachment; filename="generated.pdf"'
  return value
}

app.use('/api', (_request, response) => {
  response.status(404).json({ message: 'API endpoint not found' })
})

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.resolve(currentDir, '../public')
app.use(express.static(publicDir, { index: false }))
app.get('*', (_request, response) => response.sendFile(path.join(publicDir, 'index.html')))

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof multer.MulterError) {
    if (_request.path === '/api/v1/process/pdf/generation/template-to-pdf') {
      sendComPdfError(response, error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, {
        msg: error.message,
        errorCode: error.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'INVALID_ARGUMENT',
        bizCode: error.code === 'LIMIT_FILE_SIZE' ? 100104 : 100001,
        traceId: randomUUID(),
      })
      return
    }
    response.status(400).json({ message: `Upload rejected: ${error.message}` })
    return
  }
  if (error instanceof TemplateStoreError) {
    response.status(error.status).json({ message: error.message })
    return
  }
  response.status(500).json({ message: error instanceof Error ? error.message : 'Unexpected server error' })
})

app.listen(port, '0.0.0.0', () => {
  console.log(`ComPDF Generation listening on http://0.0.0.0:${port}`)
  console.log(`PDF upstream: ${pdfBaseUrl}`)
  console.log(`Template storage: ${templateStorageDir}`)
})
