export interface GeneratePdfParams {
  request: Record<string, unknown>
  templateFile: File
  dataFile?: File
}

export interface GeneratePdfResult {
  blob: Blob
  filename: string
  size: number
}

export interface ComPdfErrorResponse {
  code: string
  msg: string
  data: null
  errorCode: string
  bizCode?: number
  traceId?: string
  details?: unknown
}
