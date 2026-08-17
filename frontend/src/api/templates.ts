import axios from 'axios'

import type {
  CreateTemplateParams,
  TemplateDownloadResult,
  TemplateContent,
  TemplateImportResult,
  TemplateNameExistsResult,
  TemplateRecord,
  TemplateSearchResult,
  UpdateTemplateParams,
} from '@/api/model'
import { request } from '@/api/request'

/** Searches templates by keyword and returns the matching records and total. */
export async function apiSearchTemplatesApi(keyword = ''): Promise<TemplateSearchResult> {
  try {
    const response = await request.get<TemplateSearchResult>('/templates/search', {
      params: { keyword },
    })
    return response.data
  } catch (error) {
    throw new Error(resolveApiErrorMessage(error, 'Unable to load templates'))
  }
}

/** Checks whether a template name is already in use. */
export async function apiTemplateNameExistsApi(name: string): Promise<boolean> {
  try {
    const response = await request.get<TemplateNameExistsResult>('/templates/name-exists', {
      params: { name },
    })
    return response.data.exists
  } catch (error) {
    throw new Error(resolveApiErrorMessage(error, 'Unable to check template name'))
  }
}

/** Loads one template's metadata and editable HTML and JSON source. */
export async function apiGetTemplateContentApi(id: string): Promise<TemplateContent> {
  try {
    const response = await request.get<TemplateContent>(`/templates/${id}/content`)
    return response.data
  } catch (error) {
    throw new Error(resolveApiErrorMessage(error, 'Unable to load template content'))
  }
}

/** Creates a template by uploading its metadata, HTML file, and optional JSON file. */
export async function apiCreateTemplateApi(params: CreateTemplateParams): Promise<TemplateRecord> {
  try {
    const response = await request.post<TemplateRecord>('/templates', createTemplateForm(params))
    return response.data
  } catch (error) {
    throw new Error(resolveApiErrorMessage(error, 'Unable to create template'))
  }
}

/** Imports HTML, DITO, and ZIP template packages in a batch. */
export async function apiImportTemplatesApi(files: File[]): Promise<TemplateImportResult> {
  const form = new FormData()
  files.forEach(file => form.append('files', file))

  try {
    const response = await request.post<TemplateImportResult>('/templates/import', form)
    return response.data
  } catch (error) {
    throw new Error(resolveApiErrorMessage(error, 'Unable to import templates'))
  }
}

/** Updates template metadata and optionally replaces its HTML or JSON file. */
export async function apiUpdateTemplateApi(params: UpdateTemplateParams): Promise<TemplateRecord> {
  const form = new FormData()
  if (params.name !== undefined) form.append('name', params.name)
  if (params.description !== undefined) form.append('description', params.description)
  if (params.htmlFile) form.append('htmlFile', params.htmlFile)
  if (params.jsonFile) form.append('jsonFile', params.jsonFile)
  if (params.removeJsonFile !== undefined) {
    form.append('removeJsonFile', String(params.removeJsonFile))
  }

  try {
    const response = await request.put<TemplateRecord>(`/templates/${params.id}`, form)
    return response.data
  } catch (error) {
    throw new Error(resolveApiErrorMessage(error, 'Unable to update template'))
  }
}

/** Deletes a template and its server-side storage directory. */
export async function apiDeleteTemplateApi(id: string): Promise<void> {
  try {
    await request.delete(`/templates/${id}`)
  } catch (error) {
    throw new Error(resolveApiErrorMessage(error, 'Unable to delete template'))
  }
}

/** Downloads a template ZIP and resolves its filename from the response. */
export async function apiDownloadTemplateApi(id: string): Promise<TemplateDownloadResult> {
  try {
    const response = await request.get<Blob>(`/templates/${id}/download`, {
      responseType: 'blob',
    })
    const disposition = response.headers['content-disposition']
    return {
      blob: response.data,
      filename: parseFilename(typeof disposition === 'string' ? disposition : null) || 'template.zip',
    }
  } catch (error) {
    throw new Error(resolveApiErrorMessage(error, 'Unable to download template'))
  }
}

/** Converts template creation parameters into a multipart form payload. */
function createTemplateForm(params: CreateTemplateParams): FormData {
  const form = new FormData()
  form.append('name', params.name)
  if (params.description !== undefined) form.append('description', params.description)
  form.append('htmlFile', params.htmlFile)
  if (params.jsonFile) form.append('jsonFile', params.jsonFile)
  return form
}

/** Extracts a backend message from an Axios error or returns the fallback. */
function resolveApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return error instanceof Error ? error.message : fallback
  const data = error.response?.data as unknown
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return error.message || fallback
}

/** Parses a download filename from the Content-Disposition header. */
function parseFilename(value: string | null): string | null {
  if (!value) return null
  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded?.[1]) return decodeFilename(encoded[1])
  const plain = value.match(/filename="?([^";]+)"?/i)
  return plain?.[1] ? decodeFilename(plain[1]) : null
}

/** Safely decodes a URL-encoded download filename. */
function decodeFilename(value: string): string {
  try {
    return decodeURIComponent(value.trim())
  } catch {
    return value.trim()
  }
}
