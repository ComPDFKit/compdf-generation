import axios from 'axios'

import type { ComPdfErrorResponse, GeneratePdfParams, GeneratePdfResult } from '@/api/model'
import { request } from '@/api/request'

/** Generates a PDF from a template and returns download metadata. */
export async function apiGeneratePdfApi(params: GeneratePdfParams): Promise<GeneratePdfResult> {
  const form = new FormData()
  form.append('request', JSON.stringify(params.request))
  form.append('templateFile', params.templateFile)
  if (params.dataFile) form.append('dataFile', params.dataFile)

  try {
    const response = await request.post<Blob>('/v1/process/pdf/generation/template-to-pdf', form, {
      responseType: 'blob',
    })
    const disposition = response.headers['content-disposition']
    return {
      blob: response.data,
      size: response.data.size,
      filename:
        parseFilename(typeof disposition === 'string' ? disposition : null) ||
        'template-result.pdf',
    }
  } catch (error) {
    throw await resolveGenerationError(error, 'PDF generation failed')
  }
}

export class GeneratePdfError extends Error {
  constructor(
    message: string,
    readonly errorCode?: string,
    readonly bizCode?: number,
    readonly code?: string,
  ) {
    super(message)
  }
}

/** Converts an Axios exception into a structured PDF generation error. */
async function resolveGenerationError(error: unknown, fallback: string): Promise<GeneratePdfError> {
  if (!axios.isAxiosError(error)) {
    return new GeneratePdfError(error instanceof Error ? error.message : fallback)
  }

  const status = error.response?.status
  const data = error.response?.data as unknown
  const body = data instanceof Blob ? await readBlobError(data) : readError(data)
  return new GeneratePdfError(
    body?.msg || error.message || `${fallback}${status ? ` (${status})` : ''}`,
    body?.errorCode,
    body?.bizCode,
    body?.code,
  )
}

/** Reads the ComPDF error JSON returned in a Blob response. */
async function readBlobError(blob: Blob): Promise<ComPdfErrorResponse | undefined> {
  return readError(await blob.text())
}

/** Extracts a normalized ComPDF error response from text or an object. */
function readError(data: unknown): ComPdfErrorResponse | undefined {
  if (typeof data === 'string') {
    try {
      return readError(JSON.parse(data) as unknown)
    } catch {
      return undefined
    }
  }
  if (data && typeof data === 'object' && 'msg' in data && 'code' in data) {
    const error = data as Partial<ComPdfErrorResponse>
    if (typeof error.msg === 'string' && typeof error.code === 'string') {
      return error as ComPdfErrorResponse
    }
  }
  return undefined
}

/** Parses the PDF filename from the Content-Disposition header. */
function parseFilename(value: string | null): string | null {
  if (!value) return null
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded?.[1]) return decodeFilename(encoded[1])
  const plain = value.match(/filename="?([^";]+)"?/i)
  return plain?.[1] ? decodeFilename(plain[1]) : null
}

/** Safely decodes a URL-encoded PDF filename. */
function decodeFilename(value: string): string {
  try {
    return decodeURIComponent(value.trim())
  } catch {
    return value.trim()
  }
}
