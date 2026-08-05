export type JsonFieldType = 'boolean' | 'number' | 'text' | 'date' | 'image' | 'table' | 'object'
export type JsonFieldConfidence = 'high' | 'medium' | 'low'

export interface JsonFieldInfo {
  name: string
  path: string
  pathSegments: string[]
  depth: number
  type: JsonFieldType
  confidence: JsonFieldConfidence
  valuePreview: string
}

export type JsonValidationResult =
  | { valid: true; line: 1; column: 1; detail: ''; value: unknown }
  | {
      valid: false
      line: number
      column: number
      detail: string
      reason: 'empty' | 'missingClosingBrace' | 'syntax'
    }

const isoDatePattern = /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
const chineseDatePattern = /^(\d{4})年(\d{1,2})月(\d{1,2})日$/
const slashDatePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
const imageFieldPattern = /(?:image|img|photo|picture|avatar|logo|icon|thumbnail|cover|qrcode|qr_code|barcode|图片|圖像|图像|照片|头像|頭像|封面|二维码|二維碼)/i
const dataImagePattern = /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/\s]+={0,2}$/i
const rawBase64Pattern = /^[a-z0-9+/\s]+={0,2}$/i

/** Parses JSON and returns a browser-independent best-effort error position. */
export function validateJson(value: string): JsonValidationResult {
  if (!value.trim()) {
    return { valid: false, line: 1, column: 1, detail: '', reason: 'empty' }
  }

  try {
    return { valid: true, line: 1, column: 1, detail: '', value: JSON.parse(value) as unknown }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const positionMatch = message.match(/position\s+(\d+)/i)
    const lineMatch = message.match(/line\s+(\d+)/i)
    const columnMatch = message.match(/column\s+(\d+)/i)
    const position = positionMatch ? Number(positionMatch[1]) : null
    const location = position === null
      ? { line: Number(lineMatch?.[1] || 1), column: Number(columnMatch?.[1] || 1) }
      : resolvePosition(value, position)
    const detail = message
      .replace(/\s+at position\s+\d+(?:\s+\(line\s+\d+\s+column\s+\d+\))?$/i, '')
      .trim()

    return {
      valid: false,
      ...location,
      detail,
      reason: hasUnclosedBrace(value) ? 'missingClosingBrace' : 'syntax',
    }
  }
}

/** Identifies every object field, including fields nested inside object values. */
export function identifyJsonFields(value: unknown): JsonFieldInfo[] {
  if (!isJsonObject(value)) {
    const inferred = inferJsonFieldType('$', value)
    return [{ name: '$', path: '$', pathSegments: [], depth: 0, valuePreview: formatValuePreview(value), ...inferred }]
  }

  const fields: JsonFieldInfo[] = []
  visitObject(value, [], 0, fields)
  return fields
}

/** Infers a field type in the priority order defined by the template editor. */
export function inferJsonFieldType(
  name: string,
  value: unknown,
): Pick<JsonFieldInfo, 'type' | 'confidence'> {
  if (typeof value === 'boolean') return { type: 'boolean', confidence: 'high' }
  if (typeof value === 'number') return { type: 'number', confidence: 'high' }
  if (value === null) return { type: 'text', confidence: 'low' }
  if (typeof value === 'string' && isDateValue(value)) return { type: 'date', confidence: 'medium' }
  if (typeof value === 'string' && isImageValue(name, value)) return { type: 'image', confidence: 'medium' }
  if (Array.isArray(value)) return { type: 'table', confidence: 'high' }
  if (isJsonObject(value)) return { type: 'object', confidence: 'high' }
  return { type: 'text', confidence: 'high' }
}

/** Recursively collects fields from nested object values without flattening arrays. */
function visitObject(
  value: Record<string, unknown>,
  parentSegments: string[],
  depth: number,
  fields: JsonFieldInfo[],
) {
  for (const [name, childValue] of Object.entries(value)) {
    const pathSegments = [...parentSegments, name]
    const path = pathSegments.join('.')
    fields.push({
      name,
      path,
      pathSegments,
      depth,
      valuePreview: formatValuePreview(childValue),
      ...inferJsonFieldType(name, childValue),
    })
    if (isJsonObject(childValue)) visitObject(childValue, pathSegments, depth + 1, fields)
  }
}

/** Converts a zero-based parser offset into a one-based line and column location. */
function resolvePosition(value: string, position: number): { line: number; column: number } {
  const prefix = value.slice(0, Math.max(0, position))
  const lines = prefix.split('\n')
  return { line: lines.length, column: (lines.at(-1)?.length || 0) + 1 }
}

/** Narrows an unknown value to a JSON object, excluding arrays and null. */
function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Serializes a field value into a bounded preview suitable for the UI. */
function formatValuePreview(value: unknown): string {
  const serialized = JSON.stringify(value)
  if (serialized === undefined) return String(value)
  return serialized.length > 200 ? `${serialized.slice(0, 197)}...` : serialized
}

/** Validates supported ISO, Chinese, and ambiguous slash-separated date formats. */
function isDateValue(value: string): boolean {
  const normalized = value.trim()
  const isoMatch = normalized.match(isoDatePattern)
  if (isoMatch) {
    return isValidDateParts(isoMatch[1], isoMatch[2], isoMatch[3], isoMatch[4], isoMatch[5], isoMatch[6])
  }
  const chineseMatch = normalized.match(chineseDatePattern)
  if (chineseMatch) return isValidDateParts(chineseMatch[1], chineseMatch[2], chineseMatch[3])
  const slashMatch = normalized.match(slashDatePattern)
  if (!slashMatch) return false
  return isValidDateParts(slashMatch[3], slashMatch[1], slashMatch[2])
    || isValidDateParts(slashMatch[3], slashMatch[2], slashMatch[1])
}

/** Checks date and optional time parts without relying on browser date parsing. */
function isValidDateParts(
  yearValue: string | undefined,
  monthValue: string | undefined,
  dayValue: string | undefined,
  hourValue = '0',
  minuteValue = '0',
  secondValue = '0',
): boolean {
  if (!yearValue || !monthValue || !dayValue) return false
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const hour = Number(hourValue)
  const minute = Number(minuteValue)
  const second = Number(secondValue)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && Number.isInteger(hour)
    && hour >= 0
    && hour <= 23
    && Number.isInteger(minute)
    && minute >= 0
    && minute <= 59
    && Number.isInteger(second)
    && second >= 0
    && second <= 59
}

/** Detects likely image fields that contain a data URL or a base64 payload. */
function isImageValue(name: string, value: string): boolean {
  if (!imageFieldPattern.test(name)) return false
  if (dataImagePattern.test(value)) return true
  const normalized = value.replace(/\s/g, '')
  return normalized.length >= 32 && normalized.length % 4 === 0 && rawBase64Pattern.test(normalized)
}

/** Detects unmatched object braces while ignoring content inside JSON strings. */
function hasUnclosedBrace(value: string): boolean {
  let depth = 0
  let inString = false
  let escaped = false

  for (const character of value) {
    if (escaped) {
      escaped = false
      continue
    }
    if (character === '\\' && inString) {
      escaped = true
      continue
    }
    if (character === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (character === '{') depth += 1
    if (character === '}') depth -= 1
  }

  return depth > 0
}
