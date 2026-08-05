export interface TemplateMetadata {
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
  items: TemplateMetadata[]
  total: number
}

export interface TemplateNameExistsResult {
  exists: boolean
}

export interface TemplateContent {
  metadata: TemplateMetadata
  html: string
  json: string | null
}

export interface CreateTemplateInput {
  name: string
  description?: string
  htmlFile: Express.Multer.File
  jsonFile?: Express.Multer.File
}

export interface UpdateTemplateInput {
  name?: string
  description?: string
  htmlFile?: Express.Multer.File
  jsonFile?: Express.Multer.File
  removeJsonFile?: boolean
}

export interface TemplateArchiveFiles {
  metadata: TemplateMetadata
  directory: string
  htmlPath: string
  jsonPath?: string
}
