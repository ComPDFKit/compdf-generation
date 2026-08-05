export interface TemplateRecord {
  id: string
  name: string
  description: string
  htmlFileName: string
  jsonFileName: string | null
  htmlSize: number
  jsonSize: number
  jsonFieldCount: number
  createdAt: string
  updatedAt: string
}

export interface TemplateSearchResult {
  items: TemplateRecord[]
  total: number
}

export interface TemplateNameExistsResult {
  exists: boolean
}

export interface TemplateContent {
  metadata: TemplateRecord
  html: string
  json: string | null
}

export interface CreateTemplateParams {
  name: string
  description?: string
  htmlFile: File
  jsonFile?: File
}

export interface UpdateTemplateParams {
  id: string
  name?: string
  description?: string
  htmlFile?: File
  jsonFile?: File
  removeJsonFile?: boolean
}

export interface TemplateDownloadResult {
  blob: Blob
  filename: string
}
