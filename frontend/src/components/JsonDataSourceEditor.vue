<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  AddIcon,
  AddRectangleIcon,
  AdjustmentIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  CloseCircleFilledIcon,
  CodeIcon,
  CopyIcon,
  DataBaseIcon,
  FileCode1Icon,
  HashtagIcon,
  ImageIcon,
  InfoCircleIcon,
  HelpCircleIcon,
  LightbulbIcon,
  NoResultIcon,
  TextboxIcon,
  UploadIcon,
} from 'tdesign-icons-vue-next'
import BooleanLogo from '@/assets/images/icons/boolean.svg?component'
import TableLogo from '@/assets/images/icons/table.svg?component'
import HelpLogo from '@/assets/images/icons/help.svg?component'
import UploadLogo from '@/assets/images/icons/upload.svg?component'
import SupportLogo from '@/assets/images/icons/support.svg?component'

import { identifyJsonFields, inferJsonFieldType, validateJson } from '@/utils/json-data-source'
import type { JsonFieldInfo, JsonFieldType } from '@/utils/json-data-source'

type InputMode = 'file' | 'text'
type TextFunction = 'none' | 'concat' | 'upper' | 'lower'
type NumberFormat = 'currency' | 'percentage' | 'plain'
type CurrencySymbol = '¥' | '$' | '£'
type SymbolPosition = 'before' | 'after'
type RoundingMode = '' | 'round' | 'ceil' | 'floor'
type NumberFunction = 'none' | 'add' | 'subtract' | 'multiply' | 'divide' | 'power'
  | 'modulo' | 'product' | 'divisibleBy' | 'even' | 'odd' | 'equal' | 'notEqual'
  | 'greater' | 'greaterOrEqual' | 'less' | 'lessOrEqual'
type DateFormat = '' | 'YYYY年MM月DD日' | 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD HH:mm:ss'
type TableColumnType = Exclude<JsonFieldType, 'table' | 'object'>
type DataSourceValidationResult = ReturnType<typeof validateJson> | {
  valid: false
  line: 1
  column: 1
  detail: ''
  reason: 'rootObject'
}
interface TablePlaceholderColumn {
  key: string
  name: string
  placeholder: string
  enabled: boolean
}

const numberFormatValues: NumberFormat[] = ['currency', 'percentage', 'plain']
const currencySymbolValues: CurrencySymbol[] = ['¥', '$', '£']
const symbolPositionValues: SymbolPosition[] = ['before', 'after']

const props = withDefaults(defineProps<{
  modelValue?: string
  filename?: string
}>(), {
  modelValue: '',
  filename: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:filename': [value: string]
  'insertPlaceholder': [value: string]
  'insertTablePlaceholder': [{ columns: TablePlaceholderColumn[]; collectionPath: string }]
}>()

const { t } = useI18n()
// Temporary import-dialog state; values reach the parent only after confirmation.
const dialogVisible = ref(false)
const inputMode = ref<InputMode>('file')
const uploadJson = ref('')
const selectedFileName = ref('')
const manualJson = ref('')
const manualFilename = ref('')
const activeFilename = ref('')
const activeSourceMode = ref<InputMode>('file')
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const expandedFieldPath = ref('')
const preservingFieldConfig = ref(false)
// Keep source numeric values independent from formatting rewrites in the editable JSON.
const originalJson = ref(props.modelValue)
// Field types and placeholder settings are keyed by JSON path for the active data source only.
const fieldTypeOverrides = ref<Partial<Record<string, JsonFieldType>>>({})
const textFunctions = ref<Record<string, TextFunction>>({})
const stitchTexts = ref<Record<string, string>>({})
const numberFormats = ref<Record<string, NumberFormat>>({})
const currencySymbols = ref<Record<string, CurrencySymbol>>({})
const symbolPositions = ref<Record<string, SymbolPosition>>({})
const decimalPlaces = ref<Record<string, string>>({})
const thousandSeparators = ref<Record<string, boolean>>({})
const roundingModes = ref<Record<string, RoundingMode>>({})
const numberFunctions = ref<Record<string, NumberFunction>>({})
const numberFunctionArgs = ref<Record<string, string>>({})
const dateFormats = ref<Record<string, DateFormat>>({})
const imageWidths = ref<Record<string, string>>({})
const imageHeights = ref<Record<string, string>>({})
const booleanTrueTexts = ref<Record<string, string>>({})
const booleanFalseTexts = ref<Record<string, string>>({})
const expandedTableColumnPath = ref('')
const expandedTableGuidePath = ref('')
const tableColumnEnabled = ref<Record<string, boolean>>({})
const tableColumnTypes = ref<Partial<Record<string, TableColumnType>>>({})

// Parse fields only when the JSON is valid to avoid stale or incomplete configuration.
const validation = computed(() => validateDataSourceJson(props.modelValue))
const fields = computed(() => validation.value.valid
  ? identifyJsonFields(validation.value.value).filter(field => field.type !== 'object')
  : [])
const manualValidation = computed(() => validateDataSourceJson(manualJson.value))
const manualValidationMessage = computed(() => {
  if (!manualJson.value.trim() || manualValidation.value.valid) return ''
  return formatValidationMessage(manualValidation.value)
})
const statusText = computed(() => formatValidationMessage(validation.value))
const displayedFilename = computed(() => activeFilename.value || props.filename)
const fieldTypeOptions = computed(() => [
  { label: t('template.editor.jsonType.text'), value: 'text' },
  { label: t('template.editor.jsonType.number'), value: 'number' },
  { label: t('template.editor.jsonType.date'), value: 'date' },
  { label: t('template.editor.jsonType.image'), value: 'image' },
  { label: t('template.editor.jsonType.boolean'), value: 'boolean' },
  { label: t('template.editor.jsonType.table'), value: 'table' },
])
const tableColumnTypeOptions = computed(() => fieldTypeOptions.value.filter(option => option.value !== 'table'))
const tableFillDemoColumns = computed(() => [
  t('template.editor.tableFillDemoProductName'),
  t('template.editor.tableFillDemoUnitPrice'),
  t('template.editor.tableFillDemoQuantity'),
  t('template.editor.tableFillDemoTotalPrice'),
])
const tableFillDemoVariable = '{{products}}'
const textFunctionOptions = computed(() => [
  { label: t('template.editor.textFunctionNone'), value: 'none' },
  { label: t('template.editor.textFunction.concat'), value: 'concat' },
  { label: t('template.editor.textFunction.upper'), value: 'upper' },
  { label: t('template.editor.textFunction.lower'), value: 'lower' },
])
const numberFunctionOptions = computed(() => [
  { label: t('template.editor.numberFunction.none'), value: 'none' },
  { label: t('template.editor.numberFunction.add'), value: 'add' },
  { label: t('template.editor.numberFunction.subtract'), value: 'subtract' },
  { label: t('template.editor.numberFunction.multiply'), value: 'multiply' },
  { label: t('template.editor.numberFunction.divide'), value: 'divide' },
  { label: t('template.editor.numberFunction.power'), value: 'power' },
  { label: t('template.editor.numberFunction.modulo'), value: 'modulo' },
  { label: t('template.editor.numberFunction.product'), value: 'product' },
  { label: t('template.editor.numberFunction.divisibleBy'), value: 'divisibleBy' },
  { label: t('template.editor.numberFunction.even'), value: 'even' },
  { label: t('template.editor.numberFunction.odd'), value: 'odd' },
  { label: t('template.editor.numberFunction.equal'), value: 'equal' },
  { label: t('template.editor.numberFunction.notEqual'), value: 'notEqual' },
  { label: t('template.editor.numberFunction.greater'), value: 'greater' },
  { label: t('template.editor.numberFunction.greaterOrEqual'), value: 'greaterOrEqual' },
  { label: t('template.editor.numberFunction.less'), value: 'less' },
  { label: t('template.editor.numberFunction.lessOrEqual'), value: 'lessOrEqual' },
])
const roundingOptions = computed(() => [
  { label: t('template.editor.rounding.placeholder'), value: '' },
  { label: t('template.editor.rounding.round'), value: 'round' },
  { label: t('template.editor.rounding.ceil'), value: 'ceil' },
  { label: t('template.editor.rounding.floor'), value: 'floor' },
])
const dateFormatOptions = computed(() => [
  { label: t('template.editor.dateFormatNone'), value: '' },
  { label: 'YYYY年MM月DD日', value: 'YYYY年MM月DD日' },
  { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
  { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
  { label: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss' },
])

watch(
  () => props.modelValue,
  (value) => {
    if (preservingFieldConfig.value) {
      preservingFieldConfig.value = false
      return
    }
    originalJson.value = value
    // Reset path-based settings when the source changes so old fields cannot affect the new JSON.
    expandedFieldPath.value = ''
    fieldTypeOverrides.value = {}
    textFunctions.value = {}
    stitchTexts.value = {}
    numberFormats.value = {}
    currencySymbols.value = {}
    symbolPositions.value = {}
    decimalPlaces.value = {}
    thousandSeparators.value = {}
    roundingModes.value = {}
    numberFunctions.value = {}
    numberFunctionArgs.value = {}
    dateFormats.value = {}
    imageWidths.value = {}
    imageHeights.value = {}
    booleanTrueTexts.value = {}
    booleanFalseTexts.value = {}
    expandedTableColumnPath.value = ''
    expandedTableGuidePath.value = ''
    tableColumnEnabled.value = {}
    tableColumnTypes.value = {}
  },
)

watch(
  () => props.filename,
  (filename) => {
    if (filename === activeFilename.value) return
    activeFilename.value = filename
    activeSourceMode.value = 'file'
    selectedFileName.value = filename
    uploadJson.value = props.modelValue
    manualFilename.value = stripJsonExtension(filename)
    manualJson.value = props.modelValue
  },
  { immediate: true },
)

watch(
  [uploadJson, selectedFileName],
  ([json, filename]) => {
    if (manualJson.value !== json) manualJson.value = json
    const manualName = stripJsonExtension(filename)
    if (manualFilename.value !== manualName) manualFilename.value = manualName
  },
)

watch(
  [manualJson, manualFilename],
  ([json, filename]) => {
    if (uploadJson.value !== json) uploadJson.value = json
    const uploadName = filename.trim() ? normalizeJsonFilename(filename) : ''
    if (selectedFileName.value !== uploadName) selectedFileName.value = uploadName
  },
)

function openDialog() {
  inputMode.value = activeSourceMode.value
  resetDialogDraft()
  dragging.value = false
  dialogVisible.value = true
}

/** Closes the import dialog without committing its temporary state. */
function closeDialog() {
  dialogVisible.value = false
  resetDialogDraft()
}

/** Resets the import dialog draft to the currently committed data source. */
function resetDialogDraft() {
  const filename = displayedFilename.value
  uploadJson.value = props.modelValue
  selectedFileName.value = filename
  manualJson.value = props.modelValue
  manualFilename.value = stripJsonExtension(filename)
}

/** Validates and reads a JSON file selected through either upload entry point. */
async function selectFile(file: File | undefined) {
  if (!file) return
  if (!file.name.toLowerCase().endsWith('.json')) {
    MessagePlugin.error(t('template.editor.importInvalid'))
    return
  }

  try {
    const content = await file.text()
    if (!validateDataSourceJson(content).valid) {
      MessagePlugin.error(t('template.editor.importInvalid'))
      return
    }
    selectedFileName.value = file.name
    uploadJson.value = content
  } catch (error) {
    console.error(error)
    MessagePlugin.error(t('template.editor.importInvalid'))
  }
}

/** Clears the native file input and forwards its selected file for validation. */
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  void selectFile(file)
}

/** Clears the selected file from the uncommitted import-dialog draft. */
function clearSelectedFileDraft() {
  selectedFileName.value = ''
  uploadJson.value = ''
}

/** Stops drag styling and forwards the first dropped file for validation. */
function handleDrop(event: DragEvent) {
  dragging.value = false
  void selectFile(event.dataTransfer?.files[0])
}

/** Validates the draft source and emits it to the parent only after confirmation. */
function handleConfirm() {
  const isFileMode = inputMode.value === 'file'
  const source = isFileMode ? uploadJson.value : manualJson.value
  const result = validateDataSourceJson(source)
  if (isFileMode && (!selectedFileName.value || !result.valid)) {
    MessagePlugin.error(t('template.editor.importInvalid'))
    return
  }
  if (!isFileMode && !manualFilename.value.trim()) {
    MessagePlugin.error(t('template.editor.filenameRequired'))
    return
  }
  if (!result.valid) {
    MessagePlugin.error(formatValidationMessage(result))
    return
  }

  const filename = normalizeJsonFilename(isFileMode
    ? selectedFileName.value
    : manualFilename.value)
  selectedFileName.value = filename
  manualFilename.value = stripJsonExtension(filename)
  activeFilename.value = filename
  activeSourceMode.value = inputMode.value
  emit('update:modelValue', source)
  emit('update:filename', filename)
  dialogVisible.value = false
  MessagePlugin.success(isFileMode
    ? t('template.editor.importSuccess', { name: filename })
    : t('template.editor.jsonValid'))
}

/** Clears local draft state and removes the active data source from the parent. */
function clearDataSource() {
  activeFilename.value = ''
  selectedFileName.value = ''
  uploadJson.value = ''
  manualFilename.value = ''
  manualJson.value = ''
  emit('update:modelValue', '')
  emit('update:filename', '')
}

/** Trims a filename and ensures it has the required JSON extension. */
function normalizeJsonFilename(value: string): string {
  const filename = value.trim()
  return filename.toLowerCase().endsWith('.json') ? filename : `${filename}.json`
}

/** Removes one trailing JSON extension for the manual filename field. */
function stripJsonExtension(value: string): string {
  return value.replace(/\.json$/i, '')
}

/** Copies the configured placeholder for one top-level JSON field. */
async function copyPlaceholder(field: JsonFieldInfo) {
  if (resolvedFieldType(field) === 'table') {
    await copyTablePlaceholder(field)
    return
  }
  await copyTemplateValue(insertionValueFor(field))
}

/** Copies a table template together with mapping metadata for editor table-cell pastes. */
async function copyTablePlaceholder(field: JsonFieldInfo) {
  const columns = tablePlaceholderColumns(field)
  if (!validateTableMapping(field, columns)) return
  const template = tablePlaceholder(field)
  const marker = `<span data-compdf-table-version="1" data-compdf-table-collection="${encodeURIComponent(field.path)}" data-compdf-table-columns="${encodeURIComponent(JSON.stringify(columns))}">${escapeHtml(rawPlaceholder(field.path))}</span>`
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([template], { type: 'text/plain' }),
        'text/html': new Blob([marker], { type: 'text/html' }),
      }),
    ])
  } catch {
    await copyTemplateValue(template)
    return
  }
  MessagePlugin.success(t('template.editor.copySuccess'))
}

/** Copies the configured placeholder for one table column. */
async function copyTableColumnPlaceholder(column: JsonFieldInfo) {
  if (!isSafeTemplateIdentifier(column.name)) {
    MessagePlugin.error(t('template.editor.tableUnsupportedFieldName', { field: column.name }))
    return
  }
  await copyTemplateValue(tableColumnPlaceholder(column))
}

/** Copies a generated template value with a clipboard fallback for unsupported browsers. */
async function copyTemplateValue(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
  MessagePlugin.success(t('template.editor.copySuccess'))
}

/** Emits a placeholder insertion request, with table columns handled as a group. */
function insertPlaceholder(field: JsonFieldInfo) {
  const value = insertionValueFor(field)
  if (resolvedFieldType(field) === 'table') {
    const columns = tablePlaceholderColumns(field)
    if (!validateTableMapping(field, columns)) return
    emit('insertTablePlaceholder', {
      collectionPath: field.path,
      columns,
    })
    return
  }
  emit('insertPlaceholder', value)
}

/** Emits a single table-column placeholder insertion request. */
function insertTableColumnPlaceholder(column: JsonFieldInfo) {
  if (!isSafeTemplateIdentifier(column.name)) {
    MessagePlugin.error(t('template.editor.tableUnsupportedFieldName', { field: column.name }))
    return
  }
  emit('insertPlaceholder', tableColumnPlaceholder(column))
}

/** Builds the copyable and insertable template placeholder for the field configuration. */
function placeholderFor(field: JsonFieldInfo): string {
  const type = resolvedFieldType(field)
  if (type === 'text') return textPlaceholder(field.path)
  if (type === 'number') return numberPlaceholder(field.path)
  if (type === 'date') return rawPlaceholder(field.path)
  if (type === 'image') {
    const width = positiveInteger(imageWidths.value[field.path])
    const height = positiveInteger(imageHeights.value[field.path])
    const size = `${width ? `width: ${width}px; ` : ''}${height ? `height: ${height}px;` : ''}`
    const style = size ? ` style="${size.trim()}"` : ''
    return `<img src="{{${field.path}}}"${style} alt="" />`
  }
  if (type === 'boolean') {
    const truthy = booleanTrueTexts.value[field.path] || t('template.editor.booleanTrueDefault')
    const falsy = booleanFalseTexts.value[field.path] || t('template.editor.booleanFalseDefault')
    return `{% if ${field.path} %}${truthy}{% else %}${falsy}{% endif %}`
  }
  if (type === 'table') return tablePlaceholder(field)
  return `{{${field.path}}}`
}

/** Uses the array variable as the table's first-cell marker for ComPDF horizontal mapping. */
function insertionValueFor(field: JsonFieldInfo): string {
  return resolvedFieldType(field) === 'table'
    ? rawPlaceholder(field.path)
    : placeholderFor(field)
}

/** Builds a text placeholder using the configured text transformation. */
function textPlaceholder(path: string, configPath = path): string {
  const fn = textFunctions.value[configPath] || 'none'
  const argument = stitchTexts.value[configPath] || ''
  if (fn === 'concat') return `{{ ${quote(argument)} + ${path} }}`
  if (fn === 'upper' || fn === 'lower') return `{{ ${fn}(${path}) }}`
  return `{{${path}}}`
}

/** Builds a number placeholder using the configured display format and operation. */
function numberPlaceholder(path: string, configPath = path, defaultFormat: NumberFormat = 'plain'): string {
  const format = numberFormats.value[configPath] || defaultFormat
  const expression = format === 'plain'
    ? numberFunctionExpression(path, configPath)
    : path
  if (format === 'percentage') return `{{${expression}}}%`
  if (format === 'plain') return `{{${expression}}}`
  const symbol = currencySymbols.value[configPath] || '$'
  const placeholder = `{{${expression}}}`
  return symbolPositions.value[configPath] === 'after'
    ? `${placeholder}${symbol}`
    : `${symbol}${placeholder}`
}

/** Builds the expression nested inside a numeric placeholder. */
function numberFunctionExpression(path: string, configPath = path): string {
  const operation = numberFunctions.value[configPath] || 'none'
  const argument = numberFunctionArgs.value[configPath]?.trim() || '0'
  const binaryOperators: Partial<Record<NumberFunction, string>> = {
    add: '+', subtract: '-', multiply: '*', divide: '/', power: '^', modulo: '%',
    equal: '==', notEqual: '!=', greater: '>', greaterOrEqual: '>=', less: '<', lessOrEqual: '<=',
  }
  if (binaryOperators[operation]) return `${path} ${binaryOperators[operation]} ${argument}`
  if (operation === 'product' || operation === 'divisibleBy') return `${operation}(${path}, ${argument})`
  if (operation === 'even' || operation === 'odd') return `${operation}(${path})`
  return path
}

/** Escapes a string for use as a template-function argument. */
function quote(value: string): string {
  return JSON.stringify(value)
}

/** Wraps a data path in the plain template placeholder syntax. */
function rawPlaceholder(path: string): string {
  return `{{${path}}}`
}

/** Parses a non-negative integer configuration value or returns null. */
function positiveInteger(value: string | undefined): number | null {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

/** Returns a user override when present, otherwise the inferred field type. */
function resolvedFieldType(field: JsonFieldInfo): JsonFieldType {
  return fieldTypeOverrides.value[field.path] || field.type
}

/** Validates and stores a field-type override selected from the UI. */
function changeFieldType(path: string, value: unknown) {
  if (typeof value !== 'string') return
  if (!fieldTypeOptions.value.some(option => option.value === value)) return
  fieldTypeOverrides.value[path] = value as JsonFieldType
  ensureFieldConfig(path)
}

/** Expands or collapses one field configuration panel and initializes its defaults. */
function toggleFieldSettings(path: string) {
  expandedFieldPath.value = expandedFieldPath.value === path ? '' : path
  ensureFieldConfig(path)
}

/** Initializes every configuration category for a field on first access. */
function ensureFieldConfig(path: string) {
  // Initialize defaults on first access so previews and insertions always use stable settings.
  textFunctions.value[path] ??= 'none'
  stitchTexts.value[path] ??= ''
  numberFormats.value[path] ??= 'plain'
  currencySymbols.value[path] ??= '$'
  symbolPositions.value[path] ??= 'before'
  decimalPlaces.value[path] ??= '2'
  thousandSeparators.value[path] ??= false
  roundingModes.value[path] ??= ''
  numberFunctions.value[path] ??= 'none'
  numberFunctionArgs.value[path] ??= ''
  dateFormats.value[path] ??= ''
  imageWidths.value[path] ??= ''
  imageHeights.value[path] ??= ''
  booleanTrueTexts.value[path] ??= t('template.editor.booleanTrueDefault')
  booleanFalseTexts.value[path] ??= t('template.editor.booleanFalseDefault')
}

/** Selects the icon component that represents the resolved field type. */
function fieldIconFor(field: JsonFieldInfo) {
  const type = resolvedFieldType(field)
  if (type === 'number') return HashtagIcon
  if (type === 'date') return CalendarIcon
  if (type === 'image') return ImageIcon
  if (type === 'boolean') return BooleanLogo
  if (type === 'table') return TableLogo
  return TextboxIcon
}

/** Infers a stable column union from every object item in an array field. */
function tableColumns(field: JsonFieldInfo): JsonFieldInfo[] {
  const value = valueAtPath(field.pathSegments)
  if (!Array.isArray(value)) return []
  const samples = new Map<string, unknown>()
  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    for (const [name, columnValue] of Object.entries(item)) {
      if (!samples.has(name) || (samples.get(name) === null && columnValue !== null)) {
        samples.set(name, columnValue)
      }
    }
  }
  return Array.from(samples, ([name, columnValue]) => ({
    name,
    path: tableColumnConfigKey(field.pathSegments, name),
    pathSegments: [...field.pathSegments, name],
    depth: field.depth + 1,
    valuePreview: previewValue(columnValue),
    ...inferJsonFieldType(name, columnValue),
  }))
}

/** Builds a lossless table-column payload so disabled columns keep their position. */
function tablePlaceholderColumns(field: JsonFieldInfo): TablePlaceholderColumn[] {
  return tableColumns(field).map(column => ({
    key: column.path,
    name: column.name,
    placeholder: tableColumnPlaceholder(column),
    enabled: tableColumnEnabled.value[column.path] !== false,
  }))
}

/** Rejects mappings that cannot be represented safely by the documented dot-path syntax. */
function validateTableMapping(field: JsonFieldInfo, columns: TablePlaceholderColumn[]): boolean {
  if (!columns.length || !columns.some(column => column.enabled)) {
    MessagePlugin.error(t('template.editor.tableNoEnabledColumns'))
    return false
  }
  const unsafeSegment = field.pathSegments.find(segment => !isSafeTemplateIdentifier(segment))
  if (unsafeSegment) {
    MessagePlugin.error(t('template.editor.tableUnsupportedFieldName', { field: unsafeSegment }))
    return false
  }
  const unsafeColumn = columns.find(column => column.enabled && !isSafeTemplateIdentifier(column.name))
  if (unsafeColumn) {
    MessagePlugin.error(t('template.editor.tableUnsupportedFieldName', { field: unsafeColumn.name }))
    return false
  }
  return true
}

/** Uses an opaque key for local settings so dotted and prototype-like names cannot collide. */
function tableColumnConfigKey(collectionSegments: string[], columnName: string): string {
  return JSON.stringify([...collectionSegments, columnName])
}

/** Matches the identifier subset supported by generated dot-path template expressions. */
function isSafeTemplateIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)
    && !['__proto__', 'prototype', 'constructor'].includes(value)
}

/** Escapes generated clipboard marker text without changing its encoded metadata. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Builds one first-cell table template so the renderer can map all enabled columns horizontally. */
function tablePlaceholder(field: JsonFieldInfo): string {
  const cells = tableColumns(field)
    .filter(column => tableColumnEnabled.value[column.path] !== false)
    .map(column => `<td>${tableColumnPlaceholder(column)}</td>`)
  return [
    `<!-- {% for item in ${field.path} %} -->`,
    '<tr>',
    ...cells,
    '</tr>',
    '<!-- {% endfor %} -->',
  ].join('\n')
}

/** Builds the placeholder for a column using the loop item's scope. */
function tableColumnPlaceholder(column: JsonFieldInfo): string {
  const expressionPath = `item.${column.name}`
  const type = resolvedTableColumnType(column)
  if (type === 'text') return textPlaceholder(expressionPath, column.path)
  if (type === 'number') return numberPlaceholder(expressionPath, column.path, 'plain')
  if (type === 'date') return rawPlaceholder(expressionPath)
  if (type === 'image') {
    const width = positiveInteger(imageWidths.value[column.path])
    const height = positiveInteger(imageHeights.value[column.path])
    const size = `${width ? `width: ${width}px; ` : ''}${height ? `height: ${height}px;` : ''}`
    const style = size ? ` style="${size.trim()}"` : ''
    return `<img src="{{${expressionPath}}}"${style} alt="" />`
  }
  const truthy = booleanTrueTexts.value[column.path] || t('template.editor.booleanTrueDefault')
  const falsy = booleanFalseTexts.value[column.path] || t('template.editor.booleanFalseDefault')
  return `{% if ${expressionPath} %}${truthy}{% else %}${falsy}{% endif %}`
}

/** Resolves a table column override while preventing unsupported nested types. */
function resolvedTableColumnType(column: JsonFieldInfo): TableColumnType {
  const configuredType = tableColumnTypes.value[column.path]
  if (configuredType) return configuredType
  return column.type === 'table' || column.type === 'object' ? 'text' : column.type
}

/** Validates and stores a user-selected table-column type override. */
function changeTableColumnType(column: JsonFieldInfo, value: unknown) {
  if (typeof value !== 'string') return
  if (!tableColumnTypeOptions.value.some(option => option.value === value)) return
  tableColumnTypes.value[column.path] = value as TableColumnType
  numberFormats.value[column.path] ??= 'plain'
  ensureFieldConfig(column.path)
}

/** Resolves a value from the validated source using unescaped path segments. */
function valueAtPath(pathSegments: string[]): unknown {
  // Resolve values from the original JSON using raw key segments, so keys may contain dots.
  if (!validation.value.valid) return undefined
  return valueAtPathFrom(validation.value.value, pathSegments)
}

/** Traverses object keys without treating dots inside keys as separators. */
function valueAtPathFrom(source: unknown, pathSegments: string[]): unknown {
  return pathSegments.reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return undefined
    return (current as Record<string, unknown>)[key]
  }, source)
}

/** Serializes a value for a compact table-column preview. */
function previewValue(value: unknown): string {
  const result = JSON.stringify(value)
  return result === undefined ? String(value) : result
}

/** Preserves literal numeric formatting when rendering a field preview. */
function displayedValuePreview(field: JsonFieldInfo): string {
  if (resolvedFieldType(field) === 'table') {
    const literal = rawJsonValueLiteral(field.pathSegments)
    if (literal !== null) return truncatePreview(literal)
  }
  return rawJsonNumberLiteral(field.pathSegments) || field.valuePreview
}

/** Reads the original JSON literal so table previews retain numeric trailing zeroes. */
function rawJsonValueLiteral(pathSegments: string[]): string | null {
  const range = findJsonAnyValueRange(props.modelValue, pathSegments)
  return range ? props.modelValue.slice(range.start, range.end) : null
}

/** Reads the original numeric literal to retain source precision in previews. */
function rawJsonNumberLiteral(pathSegments: string[]): string | null {
  const range = findJsonValueRange(props.modelValue, pathSegments)
  if (!range) return null
  const literal = props.modelValue.slice(range.start, range.end)
  const value = literal.startsWith('"') ? JSON.parse(literal) as unknown : literal
  return normalizeNumericValue(value) === null ? null : String(value)
}

/** Bounds long JSON literals so field cards remain readable. */
function truncatePreview(value: string): string {
  return value.length > 200 ? `${value.slice(0, 197)}...` : value
}

/** Expands or collapses a table-column configuration panel. */
function toggleTableColumn(path: string) {
  expandedTableColumnPath.value = expandedTableColumnPath.value === path ? '' : path
  tableColumnEnabled.value[path] ??= true
  numberFormats.value[path] ??= 'plain'
  ensureFieldConfig(path)
}

/** Expands or collapses the table insertion guide for one field. */
function toggleTableGuide(path: string) {
  expandedTableGuidePath.value = expandedTableGuidePath.value === path ? '' : path
}

/** Rewrites one numeric field when its precision, rounding, or grouping changes. */
function applyNumberValueSettings(
  path: string,
  pathSegments: string[],
  decimalValue: unknown = decimalPlaces.value[path],
  roundingValue: unknown = roundingModes.value[path],
  forceRestoreWhenUnrounded = false,
) {
  decimalPlaces.value[path] = String(decimalValue ?? '')
  roundingModes.value[path] = resolveRoundingMode(roundingValue)
  const rounding = resolveRoundingMode(roundingValue)
  const source = props.modelValue.trim()
  if (!source) return
  const parsed = validateJson(source)
  if (!parsed.valid) return
  const original = validateJson(originalJson.value)
  if (!original.valid) return
  const useThousands = numberFormats.value[path] === 'currency' && thousandSeparators.value[path] !== false
  if (!rounding) {
    if (!forceRestoreWhenUnrounded && useThousands) {
      const nextJson = formatOriginalNumberWithThousands(source, originalJson.value, pathSegments)
      if (nextJson === null) return
      fieldTypeOverrides.value[path] = 'number'
      commitFormattedJson(nextJson)
      return
    }
    const nextJson = restoreOriginalNumberValue(source, originalJson.value, pathSegments)
    if (nextJson === null) return
    fieldTypeOverrides.value[path] = 'number'
    commitFormattedJson(nextJson)
    return
  }
  const places = positiveInteger(String(decimalValue ?? '')) ?? 0
  const nextValue = formatJsonNumberValue(
    valueAtPathFrom(original.value, pathSegments),
    places,
    rounding,
    useThousands,
  )
  if (nextValue === null) return
  const nextJson = replaceJsonNumberLiteral(source, pathSegments, nextValue)
  if (nextJson === null) return
  fieldTypeOverrides.value[path] = 'number'
  preservingFieldConfig.value = true
  emit('update:modelValue', nextJson)
}

/** Changes a field's numeric output format and reapplies its value settings. */
function changeNumberFormat(path: string, pathSegments: string[], format: NumberFormat) {
  numberFormats.value[path] = format
  if (format !== 'currency') thousandSeparators.value[path] = false
  applyNumberValueSettings(path, pathSegments)
}

/** Toggles thousand separators and reapplies the field's numeric formatting. */
function changeThousandSeparator(path: string, pathSegments: string[], value: unknown) {
  thousandSeparators.value[path] = Boolean(value)
  applyNumberValueSettings(path, pathSegments)
}

/** Applies a numeric output configuration to every matching value in a table column. */
function applyTableNumberValueSettings(
  column: JsonFieldInfo,
  decimalValue: unknown = decimalPlaces.value[column.path],
  roundingValue: unknown = roundingModes.value[column.path],
  forceRestoreWhenUnrounded = false,
) {
  decimalPlaces.value[column.path] = String(decimalValue ?? '')
  roundingModes.value[column.path] = resolveRoundingMode(roundingValue)
  const rounding = resolveRoundingMode(roundingValue)
  const source = props.modelValue.trim()
  if (!source) return
  const parsed = validateJson(source)
  if (!parsed.valid) return
  const original = validateJson(originalJson.value)
  if (!original.valid) return
  const originalCollection = valueAtPathFrom(original.value, column.pathSegments.slice(0, -1))
  if (!Array.isArray(originalCollection)) return
  const useThousands = numberFormats.value[column.path] === 'currency'
    && thousandSeparators.value[column.path] !== false
  if (!rounding) {
    if (!forceRestoreWhenUnrounded && useThousands) {
      const nextJson = formatOriginalTableColumnWithThousands(
        source,
        originalJson.value,
        column.pathSegments.slice(0, -1),
        column.name,
      )
      if (nextJson === null) return
      tableColumnTypes.value[column.path] = 'number'
      commitFormattedJson(nextJson)
      return
    }
    const nextJson = restoreOriginalTableColumnNumberValues(
      source,
      originalJson.value,
      column.pathSegments.slice(0, -1),
      column.name,
    )
    if (nextJson === null) return
    commitFormattedJson(nextJson)
    return
  }
  // Thousand separators are stored as strings, but the configured output type remains numeric.
  tableColumnTypes.value[column.path] = 'number'
  const places = positiveInteger(String(decimalValue ?? '')) ?? 0
  const nextJson = replaceJsonTableColumnNumberLiterals(
    source,
    column.pathSegments.slice(0, -1),
    column.name,
    (value, itemIndex) => {
      const originalItem = originalCollection[itemIndex]
      const originalValue = originalItem && typeof originalItem === 'object' && !Array.isArray(originalItem)
        ? (originalItem as Record<string, unknown>)[column.name]
        : value
      return formatJsonNumberValue(originalValue, places, rounding, useThousands)
    },
  )
  if (nextJson === null) return
  commitFormattedJson(nextJson)
}

/** Changes a table column's numeric format and reapplies it to each row. */
function changeTableNumberFormat(column: JsonFieldInfo, format: NumberFormat) {
  numberFormats.value[column.path] = format
  if (format !== 'currency') thousandSeparators.value[column.path] = false
  applyTableNumberValueSettings(column)
}

/** Toggles thousand separators for every numeric value in a table column. */
function changeTableThousandSeparator(column: JsonFieldInfo, value: unknown) {
  thousandSeparators.value[column.path] = Boolean(value)
  applyTableNumberValueSettings(column)
}

/** Rewrites one date value according to its selected output format. */
function applyDateValueSettings(path: string, pathSegments: string[], formatValue: unknown) {
  const previousFormat = dateFormats.value[path] || 'MM/DD/YYYY'
  const format = resolveDateFormat(formatValue)
  dateFormats.value[path] = format
  const source = props.modelValue.trim()
  if (!source) return
  const parsed = validateJson(source)
  if (!parsed.valid) return
  const original = validateJson(originalJson.value)
  if (!original.valid) return
  if (!format) {
    const originalValue = valueAtPathFrom(original.value, pathSegments)
    if (typeof originalValue !== 'string') return
    const nextJson = replaceJsonStringValue(source, pathSegments, originalValue)
    if (nextJson === null) return
    fieldTypeOverrides.value[path] = 'date'
    commitFormattedJson(nextJson)
    return
  }
  const nextValue = formatJsonDateValue(valueAtPath(pathSegments), format, previousFormat)
  if (nextValue === null) return
  const nextJson = replaceJsonStringValue(source, pathSegments, nextValue)
  if (nextJson === null) return
  fieldTypeOverrides.value[path] = 'date'
  commitFormattedJson(nextJson)
}

/** Applies a date output configuration to every matching value in a table column. */
function applyTableDateValueSettings(column: JsonFieldInfo, formatValue: unknown) {
  const previousFormat = dateFormats.value[column.path] || 'MM/DD/YYYY'
  const format = resolveDateFormat(formatValue)
  dateFormats.value[column.path] = format
  const source = props.modelValue.trim()
  if (!source) return
  const parsed = validateJson(source)
  if (!parsed.valid) return
  const collection = valueAtPathFrom(parsed.value, column.pathSegments.slice(0, -1))
  if (!Array.isArray(collection)) return
  const original = validateJson(originalJson.value)
  if (!original.valid) return
  const originalCollection = valueAtPathFrom(original.value, column.pathSegments.slice(0, -1))
  if (!Array.isArray(originalCollection)) return
  let changed = false
  for (const [itemIndex, item] of collection.entries()) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const record = item as Record<string, unknown>
    if (!format) {
      const originalItem = originalCollection[itemIndex]
      const originalValue = originalItem && typeof originalItem === 'object' && !Array.isArray(originalItem)
        ? (originalItem as Record<string, unknown>)[column.name]
        : undefined
      if (typeof originalValue === 'string' && record[column.name] !== originalValue) {
        record[column.name] = originalValue
        changed = true
      }
      continue
    }
    const nextValue = formatJsonDateValue(record[column.name], format, previousFormat)
    if (nextValue === null) continue
    record[column.name] = nextValue
    changed = true
  }
  if (!changed) return
  commitFormattedJson(JSON.stringify(parsed.value, null, 2))
}

/** Keeps both source editors aligned when a field setting rewrites the JSON value. */
function commitFormattedJson(nextJson: string) {
  preservingFieldConfig.value = true
  uploadJson.value = nextJson
  manualJson.value = nextJson
  emit('update:modelValue', nextJson)
}

/** Formats a JSON numeric value as a literal or a quoted thousands-separated string. */
function formatJsonNumberValue(
  value: unknown,
  places: number,
  rounding: RoundingMode,
  useThousands: boolean,
): string | null {
  const literal = formatNumberLiteral(value, places, rounding)
  if (literal === null) return null
  return useThousands ? JSON.stringify(addThousands(literal)) : literal
}

/** Rounds a finite numeric value and serializes it with the requested precision. */
function formatNumberLiteral(value: unknown, places: number, rounding: RoundingMode): string | null {
  const numericValue = normalizeNumericValue(value)
  if (numericValue === null) return null
  const scale = 10 ** Math.min(places, 10)
  const nextValue = rounding === 'ceil'
    ? Math.ceil(numericValue * scale) / scale
    : rounding === 'floor'
      ? Math.floor(numericValue * scale) / scale
      : Math.round(numericValue * scale) / scale
  return places > 0 ? nextValue.toFixed(places) : String(nextValue)
}

/** Restores one numeric field to the literal from the active source's original JSON. */
function restoreOriginalNumberValue(
  source: string,
  originalSource: string,
  pathSegments: string[],
): string | null {
  const originalRange = findJsonValueRange(originalSource, pathSegments)
  if (!originalRange) return null
  return replaceJsonNumberLiteral(
    source,
    pathSegments,
    originalSource.slice(originalRange.start, originalRange.end),
  )
}

/** Applies thousands grouping to one original numeric literal without rounding it. */
function formatOriginalNumberWithThousands(
  source: string,
  originalSource: string,
  pathSegments: string[],
): string | null {
  const originalRange = findJsonValueRange(originalSource, pathSegments)
  if (!originalRange) return null
  const formattedLiteral = formatOriginalNumberLiteralWithThousands(
    originalSource.slice(originalRange.start, originalRange.end),
  )
  if (formattedLiteral === null) return null
  return replaceJsonNumberLiteral(source, pathSegments, formattedLiteral)
}

/** Restores every numeric value in a table column to its original JSON literal. */
function restoreOriginalTableColumnNumberValues(
  source: string,
  originalSource: string,
  collectionPathSegments: string[],
  columnName: string,
): string | null {
  const originalLiterals = tableColumnNumberLiterals(originalSource, collectionPathSegments, columnName)
  return replaceJsonTableColumnNumberLiterals(
    source,
    collectionPathSegments,
    columnName,
    (_value, itemIndex) => originalLiterals[itemIndex] || null,
  )
}

/** Applies thousands grouping to every original numeric literal in a table column. */
function formatOriginalTableColumnWithThousands(
  source: string,
  originalSource: string,
  collectionPathSegments: string[],
  columnName: string,
): string | null {
  const originalLiterals = tableColumnNumberLiterals(originalSource, collectionPathSegments, columnName)
  return replaceJsonTableColumnNumberLiterals(
    source,
    collectionPathSegments,
    columnName,
    (_value, itemIndex) => {
      const literal = originalLiterals[itemIndex]
      return literal ? formatOriginalNumberLiteralWithThousands(literal) : null
    },
  )
}

/** Converts an original JSON numeric literal into a grouped JSON string literal. */
function formatOriginalNumberLiteralWithThousands(literal: string): string | null {
  const value = literal.startsWith('"') ? JSON.parse(literal) as unknown : literal
  if (normalizeNumericValue(value) === null) return null
  return JSON.stringify(addThousands(String(value)))
}

/** Reads numeric JSON literals for a column without normalizing source precision. */
function tableColumnNumberLiterals(
  source: string,
  collectionPathSegments: string[],
  columnName: string,
): Array<string | null> {
  const collectionRange = findJsonAnyValueRange(source, collectionPathSegments)
  if (!collectionRange || source[collectionRange.start] !== '[') return []
  return findJsonArrayItemRanges(source, collectionRange.start, collectionRange.end).map((itemRange) => {
    if (source[itemRange.start] !== '{') return null
    const propertyRange = findJsonObjectPropertyRange(source, itemRange.start, columnName)
    if (!propertyRange) return null
    const numberRange = numericJsonValueRangeAt(source, propertyRange.start)
    return numberRange ? source.slice(numberRange.start, numberRange.end) : null
  })
}

/** Parses a number or a comma-separated numeric string into a finite number. */
function normalizeNumericValue(value: unknown): number | null {
  const normalized = typeof value === 'string' ? value.replace(/,/g, '') : value
  if (typeof normalized !== 'number' && typeof normalized !== 'string') return null
  const numberValue = Number(normalized)
  return Number.isFinite(numberValue) ? numberValue : null
}

/** Adds grouping separators to a signed decimal literal without changing precision. */
function addThousands(literal: string): string {
  const sign = literal.startsWith('-') ? '-' : ''
  const unsigned = sign ? literal.slice(1) : literal
  const [integer = '', decimal] = unsigned.split('.')
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${formattedInteger}${decimal === undefined ? '' : `.${decimal}`}`
}

/** Narrows arbitrary UI values to a supported rounding mode. */
function resolveRoundingMode(value: unknown): RoundingMode {
  return value === 'round' || value === 'ceil' || value === 'floor' ? value : ''
}

/** Narrows arbitrary UI values to a supported date format. */
function resolveDateFormat(value: unknown): DateFormat {
  return dateFormatOptions.value.some(option => option.value === value)
    ? value as DateFormat
    : ''
}

/** Formats validated date parts into the selected date output representation. */
function formatJsonDateValue(
  value: unknown,
  format: DateFormat,
  currentFormat: DateFormat,
): string | null {
  const parts = parseDateParts(value, currentFormat)
  if (!parts) return null
  const year = String(parts.year).padStart(4, '0')
  const month = String(parts.month).padStart(2, '0')
  const day = String(parts.day).padStart(2, '0')
  const hour = String(parts.hour).padStart(2, '0')
  const minute = String(parts.minute).padStart(2, '0')
  const second = String(parts.second).padStart(2, '0')
  if (format === 'YYYY年MM月DD日') return `${year}年${month}月${day}日`
  if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`
  if (format === 'YYYY-MM-DD HH:mm:ss') return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  return `${month}/${day}/${year}`
}

/** Parses supported date strings using the selected format as the first preference. */
function parseDateParts(
  value: unknown,
  currentFormat: DateFormat,
): { year: number; month: number; day: number; hour: number; minute: number; second: number } | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  const orderedParsers = [
    () => parseDateByFormat(normalized, currentFormat),
    () => parseIsoLikeDate(normalized),
    () => parseChineseDate(normalized),
    () => parseSlashDate(normalized, 'MM/DD/YYYY'),
    () => parseSlashDate(normalized, 'DD/MM/YYYY'),
  ]
  for (const parse of orderedParsers) {
    const result = parse()
    if (result) return result
  }
  return null
}

/** Delegates date parsing to the parser matching the selected display format. */
function parseDateByFormat(value: string, format: DateFormat) {
  if (format === 'YYYY年MM月DD日') return parseChineseDate(value)
  if (format === 'YYYY-MM-DD HH:mm:ss') return parseIsoLikeDate(value)
  if (format === 'DD/MM/YYYY') return parseSlashDate(value, 'DD/MM/YYYY')
  return parseSlashDate(value, 'MM/DD/YYYY')
}

/** Parses an ISO-like date with an optional time component. */
function parseIsoLikeDate(value: string) {
  const match = value.match(/^(\d{4})[-/](\d{2})[-/](\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!match) return null
  const [, year, month, day, hour, minute, second] = match
  if (!year || !month || !day) return null
  return normalizeDateParts(year, month, day, hour, minute, second)
}

/** Parses a Chinese year-month-day date string. */
function parseChineseDate(value: string) {
  const match = value.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$/)
  if (!match) return null
  const [, year, month, day] = match
  if (!year || !month || !day) return null
  return normalizeDateParts(year, month, day)
}

/** Parses a slash-separated date using the provided day/month ordering. */
function parseSlashDate(value: string, format: Extract<DateFormat, 'MM/DD/YYYY' | 'DD/MM/YYYY'>) {
  const match = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const [, first, second, year] = match
  if (!first || !second || !year) return null
  const month = format === 'MM/DD/YYYY' ? first : second
  const day = format === 'MM/DD/YYYY' ? second : first
  return normalizeDateParts(year, month, day)
}

/** Validates parsed date/time parts and returns a normalized structured value. */
function normalizeDateParts(
  yearValue: string,
  monthValue: string,
  dayValue: string,
  hourValue = '0',
  minuteValue = '0',
  secondValue = '0',
) {
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const hour = Number(hourValue)
  const minute = Number(minuteValue)
  const second = Number(secondValue)
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || second < 0 || second > 59) return null
  return { year, month, day, hour, minute, second }
}

/** Replaces a numeric JSON literal at a path while retaining the surrounding source layout. */
function replaceJsonNumberLiteral(source: string, pathSegments: string[], nextLiteral: string): string | null {
  const range = findJsonValueRange(source, pathSegments)
  if (!range) return null
  const currentLiteral = source.slice(range.start, range.end)
  const currentValue = currentLiteral.startsWith('"') ? JSON.parse(currentLiteral) as unknown : currentLiteral
  if (normalizeNumericValue(currentValue) === null) return null
  return `${source.slice(0, range.start)}${nextLiteral}${source.slice(range.end)}`
}

/** Replaces a string JSON value at a path while retaining the surrounding source layout. */
function replaceJsonStringValue(source: string, pathSegments: string[], nextValue: string): string | null {
  const range = findJsonAnyValueRange(source, pathSegments)
  if (!range) return null
  const currentLiteral = source.slice(range.start, range.end)
  if (!currentLiteral.startsWith('"')) return null
  const currentValue = JSON.parse(currentLiteral) as unknown
  if (typeof currentValue !== 'string') return null
  return `${source.slice(0, range.start)}${JSON.stringify(nextValue)}${source.slice(range.end)}`
}

/** Rewrites a numeric property in every object item while preserving JSON number precision. */
function replaceJsonTableColumnNumberLiterals(
  source: string,
  collectionPathSegments: string[],
  columnName: string,
  formatValue: (value: unknown, itemIndex: number) => string | null,
): string | null {
  const collectionRange = findJsonAnyValueRange(source, collectionPathSegments)
  if (!collectionRange || source[collectionRange.start] !== '[') return null
  const replacements: Array<{ start: number; end: number; value: string }> = []
  const itemRanges = findJsonArrayItemRanges(source, collectionRange.start, collectionRange.end)
  for (const [itemIndex, itemRange] of itemRanges.entries()) {
    if (source[itemRange.start] !== '{') continue
    const propertyRange = findJsonObjectPropertyRange(source, itemRange.start, columnName)
    if (!propertyRange) continue
    const numberRange = numericJsonValueRangeAt(source, propertyRange.start)
    if (!numberRange) continue
    const literal = source.slice(numberRange.start, numberRange.end)
    const value = literal.startsWith('"') ? JSON.parse(literal) as unknown : literal
    const nextValue = formatValue(value, itemIndex)
    if (nextValue !== null) replacements.push({ ...numberRange, value: nextValue })
  }
  if (!replacements.length) return null
  return replacements.reduceRight(
    (nextSource, replacement) => `${nextSource.slice(0, replacement.start)}${replacement.value}${nextSource.slice(replacement.end)}`,
    source,
  )
}

/** Returns source ranges for the direct items contained in a JSON array. */
function findJsonArrayItemRanges(
  source: string,
  arrayStart: number,
  arrayEnd: number,
): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = []
  let index = skipJsonWhitespace(source, arrayStart + 1)
  while (index < arrayEnd && source[index] !== ']') {
    const end = readJsonValueEnd(source, index)
    if (end === null) return []
    ranges.push({ start: index, end })
    index = skipJsonWhitespace(source, end)
    if (source[index] !== ',') break
    index = skipJsonWhitespace(source, index + 1)
  }
  return ranges
}

/** Finds the source range of any JSON value addressed by raw object-key segments. */
function findJsonAnyValueRange(source: string, pathSegments: string[]): { start: number; end: number } | null {
  if (!pathSegments.length) {
    const start = skipJsonWhitespace(source, 0)
    const end = readJsonValueEnd(source, start)
    return end === null ? null : { start, end }
  }
  let range: { start: number; end: number } | null = {
    start: skipJsonWhitespace(source, 0),
    end: source.length,
  }
  for (const key of pathSegments) {
    if (!range || source[range.start] !== '{') return null
    range = findJsonObjectPropertyRange(source, range.start, key)
  }
  return range
}

/** Finds the source range of a numeric or numeric-string value at a JSON path. */
function findJsonValueRange(source: string, pathSegments: string[]): { start: number; end: number } | null {
  if (!pathSegments.length) return numericJsonValueRangeAt(source, skipJsonWhitespace(source, 0))
  let range: { start: number; end: number } | null = {
    start: skipJsonWhitespace(source, 0),
    end: source.length,
  }
  for (const key of pathSegments) {
    if (!range || source[range.start] !== '{') return null
    range = findJsonObjectPropertyRange(source, range.start, key)
  }
  return range ? numericJsonValueRangeAt(source, range.start) : null
}

/** Returns a numeric literal range, accepting quoted numeric strings as well. */
function numericJsonValueRangeAt(source: string, start: number): { start: number; end: number } | null {
  const numberRange = numberRangeAt(source, start)
  if (numberRange) return numberRange
  if (source[start] !== '"') return null
  const stringEnd = readJsonStringEnd(source, start)
  if (stringEnd === null) return null
  const value = JSON.parse(source.slice(start, stringEnd)) as unknown
  return normalizeNumericValue(value) === null ? null : { start, end: stringEnd }
}

/** Finds a direct object property's value range without parsing and reserializing the source. */
function findJsonObjectPropertyRange(
  source: string,
  objectStart: number,
  targetKey: string,
): { start: number; end: number } | null {
  let index = skipJsonWhitespace(source, objectStart + 1)
  while (index < source.length && source[index] !== '}') {
    if (source[index] !== '"') return null
    const keyEnd = readJsonStringEnd(source, index)
    if (keyEnd === null) return null
    const key = JSON.parse(source.slice(index, keyEnd)) as string
    index = skipJsonWhitespace(source, keyEnd)
    if (source[index] !== ':') return null
    const valueStart = skipJsonWhitespace(source, index + 1)
    const valueEnd = readJsonValueEnd(source, valueStart)
    if (valueEnd === null) return null
    if (key === targetKey) return { start: valueStart, end: valueEnd }
    index = skipJsonWhitespace(source, valueEnd)
    if (source[index] === ',') index = skipJsonWhitespace(source, index + 1)
  }
  return null
}

/** Reads the exclusive end offset of a JSON value beginning at the given source index. */
function readJsonValueEnd(source: string, start: number): number | null {
  const first = source[start]
  if (first === '"') return readJsonStringEnd(source, start)
  if (first === '{') return readJsonContainerEnd(source, start, '{', '}')
  if (first === '[') return readJsonContainerEnd(source, start, '[', ']')
  if (first === '-' || /\d/.test(first || '')) return numberRangeAt(source, start)?.end ?? null
  if (source.startsWith('true', start)) return start + 4
  if (source.startsWith('false', start)) return start + 5
  if (source.startsWith('null', start)) return start + 4
  return null
}

/** Reads a balanced JSON object or array while skipping quoted strings. */
function readJsonContainerEnd(source: string, start: number, open: string, close: string): number | null {
  let depth = 0
  let index = start
  while (index < source.length) {
    const character = source[index]
    if (character === '"') {
      const stringEnd = readJsonStringEnd(source, index)
      if (stringEnd === null) return null
      index = stringEnd
      continue
    }
    if (character === open) depth += 1
    if (character === close) {
      depth -= 1
      if (depth === 0) return index + 1
    }
    index += 1
  }
  return null
}

/** Reads the exclusive end offset of a JSON string, honoring escape sequences. */
function readJsonStringEnd(source: string, start: number): number | null {
  let escaped = false
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index]
    if (escaped) {
      escaped = false
      continue
    }
    if (character === '\\') {
      escaped = true
      continue
    }
    if (character === '"') return index + 1
  }
  return null
}

/** Reads the source range for a JSON number literal. */
function numberRangeAt(source: string, start: number): { start: number; end: number } | null {
  const match = source.slice(start).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)
  return match ? { start, end: start + match[0].length } : null
}

/** Advances an index past JSON whitespace. */
function skipJsonWhitespace(source: string, start: number): number {
  let index = start
  while (/\s/.test(source[index] || '')) index += 1
  return index
}

/** Reports whether the selected numeric template function needs a user argument. */
function numberFunctionNeedsArgument(value: NumberFunction | undefined): boolean {
  return value !== undefined && !['none', 'even', 'odd'].includes(value)
}

/** Validates that a data source is valid JSON with an object at its root. */
function validateDataSourceJson(value: string): DataSourceValidationResult {
  const result = validateJson(value)
  if (!result.valid) return result
  if (typeof result.value === 'object' && result.value !== null && !Array.isArray(result.value)) return result
  return { valid: false, line: 1, column: 1, detail: '', reason: 'rootObject' }
}

/** Maps data source validation output to the localized message shown by the component. */
function formatValidationMessage(result: DataSourceValidationResult): string {
  if (result.valid) return t('template.editor.jsonValid')
  return t('template.editor.jsonInvalid', {
    line: result.line,
    reason: result.reason === 'missingClosingBrace'
      ? t('template.editor.jsonMissingClosingBrace')
      : result.reason === 'rootObject'
        ? t('template.editor.jsonRootObjectRequired')
        : result.detail || t('template.editor.jsonInvalidUnknown'),
  })
}
</script>

<template>
  <section class="json-data-source">
    <header class="json-data-source__header">
      <div class="json-data-source__title">
        <DataBaseIcon />
        <strong>{{ t('template.editor.jsonTitle') }}</strong>
      </div>
      <t-button
        v-if="!displayedFilename"
        class="json-data-source__add"
        size="small"
        theme="primary"
        @click="openDialog"
      >
        <template #icon><AddIcon /></template>
        {{ t('template.editor.addDataSource') }}
      </t-button>
      <div
        v-else
        class="json-data-source__file-button"
        :title="displayedFilename"
      >
        <button type="button" @click="openDialog">
          <FileCode1Icon />
          <span>{{ displayedFilename }}</span>
        </button>
        <button
          class="json-data-source__file-remove"
          type="button"
          :aria-label="t('template.editor.removeDataSource')"
          @click="clearDataSource"
        >
          <CloseIcon />
        </button>
      </div>
    </header>

    <div v-if="displayedFilename" class="json-data-source__fields">
      <ul>
        <li
          v-for="field in fields"
          :key="field.path"
          class="json-field-card"
          :class="{ 'is-expanded': expandedFieldPath === field.path }"
        >
          <div class="json-field-card__header">
            <span class="json-field-card__name" :title="field.path">
              <component :is="fieldIconFor(field)" />
              <strong>{{ field.name }}</strong>
            </span>
            <span class="json-field-card__actions">
              <t-select
                class="json-field-card__type-select"
                size="small"
                :value="resolvedFieldType(field)"
                :options="fieldTypeOptions"
                :aria-label="t('template.editor.fieldType')"
                @change="changeFieldType(field.path, $event)"
              />
              <t-button
                class="json-field-card__settings-button"
                shape="square"
                size="small"
                theme="primary"
                :aria-label="t('template.editor.configureField', { field: field.name })"
                @click="toggleFieldSettings(field.path)"
              >
                <template #icon><AdjustmentIcon /></template>
              </t-button>
            </span>
          </div>

          <div class="json-field-card__value">
            <span>{{ t('template.editor.jsonValue') }}</span>
            <strong :title="displayedValuePreview(field)">{{ displayedValuePreview(field) }}</strong>
          </div>

          <div class="json-field-card__placeholder">
            <code :title="placeholderFor(field)">{{ placeholderFor(field) }}</code>
            <span class="json-field-card__placeholder-actions">
              <t-button size="small" theme="primary" @click="insertPlaceholder(field)">
                <template #icon><AddRectangleIcon /></template>
                {{ t('template.editor.insertAtCursor') }}
              </t-button>
              <t-tooltip :content="t('template.editor.copyPlaceholder')">
                <t-button
                  shape="square"
                  variant="outline"
                  size="small"
                  theme="primary"
                  class="json-field-card__copy-button"
                  :aria-label="t('template.editor.copyPlaceholder', { field: field.name })"
                  @click="copyPlaceholder(field)"
                >
                  <template #icon><CopyIcon /></template>
                </t-button>
              </t-tooltip>
            </span>
          </div>

          <section
            v-if="resolvedFieldType(field) === 'table' && expandedFieldPath !== field.path"
            class="table-fill-guide"
            :class="{ 'is-expanded': expandedTableGuidePath === field.path }"
          >
            <header class="table-fill-guide__header">
              <span>
                <HelpLogo  />
                {{ t('template.editor.tableFillGuideTitle') }}
              </span>
              <button type="button" @click="toggleTableGuide(field.path)">
                {{ t(expandedTableGuidePath === field.path
                  ? 'template.editor.collapse'
                  : 'template.editor.expand') }}
                <ChevronDownIcon :class="{ 'is-open': expandedTableGuidePath === field.path }" />
              </button>
            </header>
            <div v-if="expandedTableGuidePath === field.path" class="table-fill-guide__content">
              <p>{{ t('template.editor.tableFillGuideDescription') }}</p>
              <div class="table-fill-guide__demo">
                <header>
                  <strong>{{ t('template.editor.tableFillDemoTitle') }}</strong>
                  <span>{{ t('template.editor.tableFillDemoCell') }}</span>
                </header>
                <div class="table-fill-guide__grid">
                  <div
                    v-for="(column, index) in tableFillDemoColumns"
                    :key="`header-${index}`"
                    class="table-fill-guide__cell"
                  >
                    {{ column }}
                  </div>
                  <div
                    v-for="(_, index) in tableFillDemoColumns"
                    :key="`value-${index}`"
                    class="table-fill-guide__cell"
                    :class="{ 'is-target': index === 0 }"
                  >
                    {{ index === 0 ? tableFillDemoVariable : t('template.editor.tableFillDemoAutoParse') }}
                  </div>
                </div>
                <div class="table-fill-guide__instructions">
                  <strong><LightbulbIcon />{{ t('template.editor.tableFillAutoGuide') }}</strong>
                  <p>{{ t('template.editor.tableFillAutoDescription') }}</p>
                </div>
              </div>
            </div>
          </section>

          <div v-if="expandedFieldPath === field.path" class="json-field-card__configuration">
            <template v-if="resolvedFieldType(field) === 'text'">
              <label>
                <span>{{ t('template.editor.textConversionFunctions') }}</span>
                <t-select
                  v-model="textFunctions[field.path]"
                  size="small"
                  :options="textFunctionOptions"
                />
              </label>
              <label v-if="textFunctions[field.path] === 'concat'">
                <span>{{ t('template.editor.stitchText') }}:</span>
                <t-input
                  v-model="stitchTexts[field.path]"
                  size="small"
                  :placeholder="t('template.editor.stitchTextPlaceholder')"
                />
              </label>
            </template>

            <template v-else-if="resolvedFieldType(field) === 'number'">
              <label>
                <span>{{ t('template.editor.numberFormat') }}</span>
                <span class="placeholder-segmented">
                  <button
                    v-for="format in numberFormatValues"
                    :key="format"
                    type="button"
                    :class="{ 'is-active': numberFormats[field.path] === format }"
                    @click="changeNumberFormat(field.path, field.pathSegments, format)"
                  >
                    {{ t(`template.editor.numberFormat.${format}`) }}
                  </button>
                </span>
              </label>
              <div v-if="numberFormats[field.path] === 'currency'" class="json-field-card__configuration-grid">
                <label>
                  <span>{{ t('template.editor.currencySymbol') }}</span>
                  <span class="placeholder-segmented">
                    <button
                      v-for="symbol in currencySymbolValues"
                      :key="symbol"
                      type="button"
                      :class="{ 'is-active': currencySymbols[field.path] === symbol }"
                      @click="currencySymbols[field.path] = symbol"
                    >
                      {{ symbol }}
                    </button>
                  </span>
                </label>
                <label>
                  <span>{{ t('template.editor.symbolPosition') }}</span>
                  <span class="placeholder-segmented">
                    <button
                      v-for="position in symbolPositionValues"
                      :key="position"
                      type="button"
                      :class="{ 'is-active': symbolPositions[field.path] === position }"
                      @click="symbolPositions[field.path] = position"
                    >
                      {{ t(`template.editor.symbolPosition.${position}`) }}
                    </button>
                  </span>
                </label>
              </div>
              <div class="json-field-card__configuration-grid">
                <label>
                  <span>{{ t('template.editor.decimalPlaces') }}</span>
                  <t-input-number
                    v-model="decimalPlaces[field.path]"
                    theme="column" 
                    :min="0"
                    :max="10"
                    size="small"
                    :allowInputOverLimit="false"
                    placeholder=""
                    :disabled="roundingModes[field.path] === ''"
                    @change="applyNumberValueSettings(field.path, field.pathSegments, $event, roundingModes[field.path])"
                  />
                </label>
                <label>
                  <span>{{ t('template.editor.roundingMode') }}</span>
                  <t-select
                    v-model="roundingModes[field.path]"
                    size="small"
                    :options="roundingOptions"
                    @change="applyNumberValueSettings(field.path, field.pathSegments, decimalPlaces[field.path], $event, true)"
                  />
                </label>
              </div>
              <t-checkbox
                v-if="numberFormats[field.path] === 'currency'"
                :model-value="thousandSeparators[field.path] !== false"
                size="small"
                @change="changeThousandSeparator(field.path, field.pathSegments, $event)"
              >
                {{ t('template.editor.thousandSeparator') }}
              </t-checkbox>
              <div
                v-if="numberFormats[field.path] === 'plain'"
                class="json-field-card__configuration-plain"
              >
                <label>
                  <span class="json-field-card__label-with-help">
                    {{ t('template.editor.numberFunction') }}
                    <t-tooltip :content="t('template.editor.numberFunctionDescription')" placement="top">
                      <HelpCircleIcon class="json-field-card__label-help" />
                    </t-tooltip>
                  </span>
                  <t-select v-model="numberFunctions[field.path]" size="small" :options="numberFunctionOptions" />
                </label>
                <label v-if="numberFunctionNeedsArgument(numberFunctions[field.path])">
                  <span>{{ t('template.editor.operationArgument') }}</span>
                  <t-input
                    v-model="numberFunctionArgs[field.path]"
                    size="small"
                    :placeholder="t('template.editor.operationArgumentPlaceholder')"
                  />
                </label>
              </div>
            </template>

            <template v-else-if="resolvedFieldType(field) === 'date'">
              <label>
                <span>{{ t('template.editor.dateFormat') }}</span>
                <t-select
                  :value="dateFormats[field.path] ?? ''"
                  size="small"
                  :options="dateFormatOptions"
                  @change="applyDateValueSettings(field.path, field.pathSegments, $event)"
                />
              </label>
            </template>

            <div v-else-if="resolvedFieldType(field) === 'image'" class="json-field-card__configuration-grid">
              <label>
                <span>{{ t('template.editor.imageWidth') }}</span>
                <t-input-number
                    v-model="imageWidths[field.path]"
                    theme="column" 
                    :min="0"
                    size="small"
                    :allowInputOverLimit="false"
                    placeholder=""
                  />
              </label>
              <label>
                <span>{{ t('template.editor.imageHeight') }}</span>
                <t-input-number
                    v-model="imageHeights[field.path]"
                    theme="column" 
                    :min="0"
                    size="small"
                    :allowInputOverLimit="false"
                    placeholder=""
                  />
              </label>
            </div>

            <div v-else-if="resolvedFieldType(field) === 'boolean'" class="json-field-card__configuration-grid">
              <label>
                <span>{{ t('template.editor.booleanTrueText') }}</span>
                <t-input v-model="booleanTrueTexts[field.path]" size="small" placeholder="" />
              </label>
              <label>
                <span>{{ t('template.editor.booleanFalseText') }}</span>
                <t-input v-model="booleanFalseTexts[field.path]" size="small" placeholder="" />
              </label>
            </div>

            <template v-else-if="resolvedFieldType(field) === 'table'">
              <span class="json-field-card__configuration-title">{{ t('template.editor.tableMapSettings') }}</span>
              <div v-if="tableColumns(field).length" class="table-column-list">
                <div v-for="column in tableColumns(field)" :key="column.path" class="table-column-item">
                  <div class="table-column-item__header">
                    <t-checkbox
                      :model-value="tableColumnEnabled[column.path] !== false"
                      size="small"
                      @change="tableColumnEnabled[column.path] = Boolean($event)"
                    >
                      {{ column.name }}
                    </t-checkbox>
                    <button type="button" @click="toggleTableColumn(column.path)">
                      {{ t('template.editor.tableColumnSetting') }}
                      <ChevronDownIcon v-if="expandedTableColumnPath === column.path" />
                      <ChevronRightIcon v-else />
                    </button>
                  </div>
                  <div v-if="expandedTableColumnPath === column.path" class="table-column-item__settings">
                    <label class="table-column-item__type">
                      <span>{{ t('template.editor.tableOutputType') }}</span>
                      <t-select
                        :value="resolvedTableColumnType(column)"
                        size="small"
                        :options="tableColumnTypeOptions"
                        @change="changeTableColumnType(column, $event)"
                      />
                    </label>

                    <template v-if="resolvedTableColumnType(column) === 'text'">
                      <label>
                        <span>{{ t('template.editor.textConversionFunctions') }}</span>
                        <t-select
                          v-model="textFunctions[column.path]"
                          size="small"
                          :options="textFunctionOptions"
                        />
                      </label>
                      <label v-if="textFunctions[column.path] === 'concat'">
                        <span>{{ t('template.editor.stitchText') }}:</span>
                        <t-input
                          v-model="stitchTexts[column.path]"
                          size="small"
                          :placeholder="t('template.editor.stitchTextPlaceholder')"
                        />
                      </label>
                    </template>

                    <template v-else-if="resolvedTableColumnType(column) === 'number'">
                      <label>
                        <span>{{ t('template.editor.numberFormat') }}</span>
                        <span class="placeholder-segmented">
                          <button
                            v-for="format in numberFormatValues"
                            :key="format"
                            type="button"
                            :class="{ 'is-active': numberFormats[column.path] === format }"
                            @click="changeTableNumberFormat(column, format)"
                          >
                            {{ t(`template.editor.numberFormat.${format}`) }}
                          </button>
                        </span>
                      </label>
                      <div v-if="numberFormats[column.path] === 'currency'" class="json-field-card__configuration-grid">
                        <label>
                          <span>{{ t('template.editor.currencySymbol') }}</span>
                          <span class="placeholder-segmented">
                            <button
                              v-for="symbol in currencySymbolValues"
                              :key="symbol"
                              type="button"
                              :class="{ 'is-active': currencySymbols[column.path] === symbol }"
                              @click="currencySymbols[column.path] = symbol"
                            >
                              {{ symbol }}
                            </button>
                          </span>
                        </label>
                        <label>
                          <span>{{ t('template.editor.symbolPosition') }}</span>
                          <span class="placeholder-segmented">
                            <button
                              v-for="position in symbolPositionValues"
                              :key="position"
                              type="button"
                              :class="{ 'is-active': symbolPositions[column.path] === position }"
                              @click="symbolPositions[column.path] = position"
                            >
                              {{ t(`template.editor.symbolPosition.${position}`) }}
                            </button>
                          </span>
                        </label>
                      </div>
                      <div class="json-field-card__configuration-grid">
                        <label>
                          <span>{{ t('template.editor.decimalPlaces') }}</span>
                          <t-input-number
                            v-model="decimalPlaces[column.path]"
                            theme="column" 
                            :min="0"
                            :max="10"
                            size="small"
                            placeholder=""
                            :allowInputOverLimit="false"
                            :disabled="roundingModes[column.path] === ''"
                             @change="applyTableNumberValueSettings(column, $event, roundingModes[column.path])"
                          />
                        </label>
                        <label>
                          <span>{{ t('template.editor.roundingMode') }}</span>
                          <t-select
                            v-model="roundingModes[column.path]"
                            size="small"
                            :options="roundingOptions"
                            @change="applyTableNumberValueSettings(column, decimalPlaces[column.path], $event, true)"
                          />
                        </label>
                      </div>
                      <t-checkbox
                        v-if="numberFormats[column.path] === 'currency'"
                        :model-value="thousandSeparators[column.path] !== false"
                        size="small"
                        @change="changeTableThousandSeparator(column, $event)"
                      >
                        {{ t('template.editor.thousandSeparator') }}
                      </t-checkbox>
                      <div v-if="numberFormats[column.path] === 'plain'" class="json-field-card__configuration-grid">
                        <label>
                          <span class="json-field-card__label-with-help">
                            {{ t('template.editor.numberFunction') }}
                            <t-tooltip :content="t('template.editor.numberFunctionDescription')" placement="top">
                              <InfoCircleIcon class="json-field-card__label-help" />
                            </t-tooltip>
                          </span>
                          <t-select v-model="numberFunctions[column.path]" size="small" :options="numberFunctionOptions" />
                        </label>
                        <label v-if="numberFunctionNeedsArgument(numberFunctions[column.path])">
                          <span>{{ t('template.editor.operationArgument') }}</span>
                          <t-input
                            v-model="numberFunctionArgs[column.path]"
                            size="small"
                            :placeholder="t('template.editor.operationArgumentPlaceholder')"
                          />
                        </label>
                      </div>
                    </template>

                    <label v-else-if="resolvedTableColumnType(column) === 'date'">
                      <span>{{ t('template.editor.dateFormat') }}</span>
                      <t-select
                        :value="dateFormats[column.path] ?? ''"
                        size="small"
                        :options="dateFormatOptions"
                        @change="applyTableDateValueSettings(column, $event)"
                      />
                    </label>

                    <div
                      v-else-if="resolvedTableColumnType(column) === 'image'"
                      class="json-field-card__configuration-grid"
                    >
                      <label>
                        <span>{{ t('template.editor.imageWidth') }}</span>
                        <t-input-number
                          v-model="imageWidths[column.path]"
                          theme="column" 
                          :min="0"
                          size="small"
                          :allowInputOverLimit="false"
                          placeholder=""
                        />
                      </label>
                      <label>
                        <span>{{ t('template.editor.imageHeight') }}</span>
                        <t-input-number
                          v-model="imageHeights[column.path]"
                          theme="column" 
                          :min="0"
                          size="small"
                          :allowInputOverLimit="false"
                          placeholder=""
                        />
                      </label>
                    </div>

                    <div v-else class="json-field-card__configuration-grid">
                      <label>
                        <span>{{ t('template.editor.booleanTrueText') }}</span>
                        <t-input v-model="booleanTrueTexts[column.path]" size="small" placeholder="" />
                      </label>
                      <label>
                        <span>{{ t('template.editor.booleanFalseText') }}</span>
                        <t-input v-model="booleanFalseTexts[column.path]" size="small" placeholder="" />
                      </label>
                    </div>
                    <div class="table-column-item__placeholder">
                      <code>{{ tableColumnPlaceholder(column) }}</code>
                      <span class="table-column-item__placeholder-actions">
                        <t-tooltip :content="t('template.editor.insertAtCursor')">
                          <t-button
                            shape="square"
                            size="small"
                            variant="text"
                            theme="primary"
                            :aria-label="t('template.editor.insertAtCursor')"
                            @click="insertTableColumnPlaceholder(column)"
                          >
                            <template #icon><AddRectangleIcon /></template>
                          </t-button>
                        </t-tooltip>
                        <t-tooltip :content="t('template.editor.copyVariable')">
                          <t-button
                            shape="square"
                            size="small"
                            variant="text"
                            theme="primary"
                            :aria-label="t('template.editor.copyVariable')"
                            @click="copyTableColumnPlaceholder(column)"
                          >
                            <template #icon><CopyIcon /></template>
                          </t-button>
                        </t-tooltip>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <span v-else class="json-field-card__configuration-hint">
                {{ t('template.editor.tableNoColumns') }}
              </span>
            </template>
          </div>
        </li>
      </ul>
    </div>

    <div v-else class="json-data-source__empty">
      <NoResultIcon />
      <strong>{{ t('template.editor.noDataSource') }}</strong>
      <span>{{ t('template.editor.noDataSourceDescription') }}</span>
      <t-button variant="outline" theme="primary" @click="openDialog">
        <template #icon><AddIcon /></template>
        {{ t('template.editor.addDataSource') }}
      </t-button>
    </div>

    <footer
      v-if="displayedFilename && !validation.valid"
      class="json-data-source__status is-invalid"
      role="status"
      aria-live="polite"
    >
      <span aria-hidden="true" />
      {{ statusText }}
    </footer>

    <t-dialog
      v-model:visible="dialogVisible"
      dialog-class-name="json-import-dialog"
      placement="center"
      :width="600"
      :header="t('template.editor.importDialogTitle')"
      :cancel-btn="t('template.form.cancel')"
      :confirm-btn="inputMode === 'file'
        ? t('template.editor.uploadConfirm')
        : t('template.editor.jsonConfirm')"
      :confirm-on-enter="false"
      @cancel="closeDialog"
      @close="closeDialog"
      @confirm="handleConfirm"
    >
      <t-tabs v-model="inputMode" class="json-import-dialog__tabs">
        <t-tab-panel value="file">
          <template #label>
            <span class="json-import-dialog__tab-label">
              <UploadLogo />
              {{ t('template.editor.uploadFile') }}
            </span>
          </template>
          <div class="json-import-dialog__notice">
            <SupportLogo />
            <span>{{ t('template.editor.importDialogDescription') }}</span>
          </div>
          <div
            class="json-import-dialog__dropzone"
            :class="{ 'is-dragging': dragging }"
            role="button"
            tabindex="0"
            @keydown.enter.prevent="fileInput?.click()"
            @keydown.space.prevent="fileInput?.click()"
            @dragenter.prevent="dragging = true"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="handleDrop"
          >
            <div class="json-import-dialog__dropzone-content">
              <t-button variant="outline" theme="primary" tabindex="-1" @click="fileInput?.click()">
                <template #icon><UploadIcon /></template>
                {{ t('template.editor.selectFiles') }}
              </t-button>
              <span>{{ t('template.editor.or') }}</span>
              <strong>{{ t('template.editor.dragDropFiles') }}</strong>
              <input
                ref="fileInput"
                class="visually-hidden"
                type="file"
                accept=".json,application/json"
                @change="handleFileChange"
              >
            </div>
            <div v-if="selectedFileName" class="json-import-dialog__selected-file">
              <span>{{ selectedFileName }}</span>
              <button
                type="button"
                :aria-label="t('template.editor.removeDataSource')"
                @click.stop="clearSelectedFileDraft"
              >
                <CloseCircleFilledIcon />
              </button>
            </div>
          </div>
          <p class="json-import-dialog__upload-hint">
            {{ t('template.editor.uploadDropDescription') }}
          </p>
        </t-tab-panel>

        <t-tab-panel value="text">
          <template #label>
            <span class="json-import-dialog__tab-label">
              <CodeIcon />
              {{ t('template.editor.jsonPlaceholder') }}
            </span>
          </template>
          <div class="json-import-dialog__notice">
            <SupportLogo />
            <span>{{ t('template.editor.inputDialogDescription') }}</span>
          </div>
          <div class="json-import-dialog__manual-form">
            <label class="json-import-dialog__form-field">
              <span>{{ t('template.editor.dataSourceFileName') }}</span>
              <t-input
                v-model="manualFilename"
                :placeholder="t('template.editor.filenamePlaceholder')"
              />
            </label>
            <label class="json-import-dialog__form-field json-import-dialog__form-field--json">
              <span>{{ t('template.editor.jsonPlaceholder') }}</span>
              <t-textarea
                v-model="manualJson"
                class="json-import-dialog__textarea"
                :placeholder="t('template.editor.filenamePlaceholder')"
                :status="manualValidationMessage ? 'error' : 'default'"
                :tips="manualValidationMessage"
                spellcheck="false"
              />
            </label>
          </div>
        </t-tab-panel>
      </t-tabs>
    </t-dialog>
  </section>
</template>

<style scoped lang="less">
.json-data-source {
  display: flex;
  overflow: hidden;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  border: 1px solid var(--td-gray-color-4);
  border-radius: var(--td-radius-large);
  background: var(--td-bg-color-container);
}

.json-data-source__header,
.json-data-source__title,
.json-data-source__status,
.json-import-dialog__selected-file,
.json-import-dialog__validation {
  display: flex;
  align-items: center;
}

.json-data-source__header {
  min-height: 56px;
  justify-content: space-between;
  gap: var(--td-size-3);
  padding: var(--td-size-4) var(--td-size-6);
  border-bottom: 1px solid var(--td-gray-color-3);
}

.json-data-source__title {
  overflow: hidden;
  min-width: 0;
  gap: var(--td-size-3);
}

.json-data-source__title > svg {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  color: var(--td-text-color-primary);
}

.json-data-source__title strong {
  flex: 0 0 auto;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

.json-data-source__add {
  height: 32px;
  padding: 0 var(--td-size-6);
  border-radius: 3px;
  font-size: 14px;
}

.json-data-source__file-button {
  display: flex;
  overflow: hidden;
  height: 32px;
  max-width: 300px;
  align-items: center;
  padding: 0;
  border: 1px solid var(--td-brand-color);
  border-radius: 3px;
  background: var(--td-bg-color-container);
  color: var(--td-brand-color);
}

.json-data-source__file-button > button {
  display: flex;
  overflow: hidden;
  min-width: 0;
  height: 100%;
  flex: 1;
  align-items: center;
  gap: var(--td-size-3);
  padding: 0 0 0 var(--td-size-4);
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.json-data-source__file-button > button > svg {
  width: 16px;
  height: 16px;
  flex: 0 0 auto;
}

.json-data-source__file-button > button > span {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  font-size: 14px;
  line-height: 22px;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.json-data-source__file-button > .json-data-source__file-remove {
  width: 36px;
  min-width: 36px;
  flex: 0 0 36px;
  justify-content: center;
  padding: 0;
}

.json-data-source__fields {
  overflow: auto;
  min-height: 0;
  flex: 1;
  padding: var(--td-size-4);
}

.json-data-source__fields ul {
  display: flex;
  flex-direction: column;
  gap: var(--td-size-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.json-field-card {
  display: flex;
  overflow: hidden;
  min-width: 0;
  flex: 0 0 auto;
  flex-direction: column;
  border: 2px solid var(--td-gray-color-4);
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-container);
}

.json-field-card.is-expanded {
  border-color: var(--td-brand-color-5);
}

.json-field-card__header,
.json-field-card__name,
.json-field-card__actions,
.json-field-card__value,
.json-field-card__placeholder,
.json-field-card__placeholder-actions {
  display: flex;
  align-items: center;
}

.json-field-card__header {
  min-height: 47px;
  justify-content: space-between;
  gap: var(--td-size-3);
  padding: var(--td-size-4) var(--td-size-6);
  border-bottom: 1px solid var(--td-gray-color-3);
}

.json-field-card__name {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  gap: var(--td-size-3);
}

.json-field-card__name > svg {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  color: var(--td-brand-color);
}

.json-field-card__name strong {
  overflow: hidden;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.json-field-card__actions {
  flex: 0 0 auto;
  gap: var(--td-size-2);
}

.json-field-card__type-select {
  width: 120px;
}

.json-field-card__type-select :deep(.t-input),
.json-field-card__type-select :deep(.t-input__wrap),
.json-field-card__type-select :deep(.t-select-input) {
  height: 24px;
  min-height: 24px;
  border-radius: 3px;
  font-size: 12px;
}

.json-field-card__settings-button {
  width: 24px;
  min-width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 3px;
}

.json-field-card__value {
  min-height: 36px;
  gap: var(--td-size-2);
  padding: var(--td-size-3) var(--td-size-6);
  background: var(--td-brand-color-light);
  font-size: 12px;
  line-height: 20px;
  white-space: nowrap;
}

.json-field-card__value span {
  flex: 0 0 auto;
  color: var(--td-text-color-placeholder);
}

.json-field-card__value strong {
  overflow: hidden;
  color: var(--td-brand-color);
  font-weight: 400;
  text-overflow: ellipsis;
}

.json-field-card__placeholder {
  min-height: 40px;
  justify-content: space-between;
  gap: var(--td-size-3);
  padding: var(--td-size-4) var(--td-size-6);
  background: var(--td-gray-color-12);
}

.json-field-card__placeholder code {
  min-width: 0;
  flex: 1;
  color: var(--td-brand-color-3);
  font: 12px/20px Consolas, 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.json-field-card__placeholder-actions {
  flex: 0 0 auto;
  gap: var(--td-size-2);
  .json-field-card__copy-button{
    background: transparent;
  }
}

.json-field-card__placeholder-actions :deep(.t-button) {
  height: 24px;
  min-height: 24px;
  font-size: 12px;
}

.json-field-card__placeholder-actions :deep(.t-button--shape-square) {
  width: 24px;
  min-width: 24px;
  padding: 0;
}

.table-fill-guide {
  padding: 12px 16px;
  border-top: 1px solid var(--td-gray-color-4);
  background: var(--td-warning-color-light);
  color: var(--td-text-color-primary);
  font-size: 12px;
  line-height: 20px;
}

.table-fill-guide__header,
.table-fill-guide__header > span,
.table-fill-guide__header > button,
.table-fill-guide__demo > header,
.table-fill-guide__instructions > strong {
  display: flex;
  align-items: center;
}

.table-fill-guide__header {
  min-height: 24px;
  justify-content: space-between;
  gap: 8px;
  color: var(--td-warning-color);
}

.table-fill-guide__header > span {
  min-width: 0;
  gap: 8px;
  font-size: 14px;
  line-height: 22px;
}

.table-fill-guide__header svg {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
}

.table-fill-guide__header > button {
  flex: 0 0 auto;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--td-brand-color);
  cursor: pointer;
  font-size: 12px;
  line-height: 20px;
}

.table-fill-guide__header > button svg {
  width: 14px;
  height: 14px;
  transition: transform .2s;
}

.table-fill-guide__header > button svg.is-open {
  transform: rotate(180deg);
}

.table-fill-guide__content > p {
  margin: 8px 0;
}

.table-fill-guide__demo {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-container);
  box-shadow: var(--td-shadow-2);
}

.table-fill-guide__demo > header {
  justify-content: space-between;
  gap: 8px;
}

.table-fill-guide__demo > header strong {
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
}

.table-fill-guide__demo > header span {
  color: var(--td-text-color-secondary);
}

.table-fill-guide__grid {
  display: grid;
  overflow: hidden;
  grid-template-columns: repeat(var(--table-column-count, 4), minmax(0, 1fr));
  border-radius: 3px;
}

.table-fill-guide__cell {
  display: flex;
  overflow: hidden;
  min-width: 0;
  height: 32px;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  border: 1px solid var(--td-gray-color-4);
  color: var(--td-text-color-secondary);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-fill-guide__cell.is-target {
  border: 2px solid var(--td-warning-color);
  background: var(--td-warning-color-light);
  color: var(--td-warning-color);
}

.table-fill-guide__instructions > strong {
  gap: 6px;
  color: var(--td-warning-color);
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
}

.table-fill-guide__instructions > strong svg {
  width: 16px;
  height: 16px;
}

.table-fill-guide__instructions > p {
  margin: 8px 0 0;
  color: var(--td-text-color-secondary);
}

.json-data-source__fields .table-fill-guide__instructions > ul {
  display: block;
  margin: 0;
  padding-left: 18px;
  color: var(--td-text-color-secondary);
  list-style: disc;
}

.json-field-card__configuration {
  display: flex;
  flex-direction: column;
  gap: var(--td-size-3);
  padding: var(--td-size-4) var(--td-size-6);
  border-top: 1px solid var(--td-gray-color-3);
  background: var(--td-bg-color-container);
}

.json-field-card__configuration label {
  display: flex;
  flex-direction: column;
  gap: var(--td-size-1);
}

.json-field-card__configuration label > span {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  line-height: 20px;
}

.json-field-card__label-with-help {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.json-field-card__label-help {
  width: 16px;
  height: 16px;
  color: var(--td-text-color-placeholder);
  cursor: help;
}

.json-field-card__configuration-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--td-size-3);
}

.json-field-card__configuration-grid :deep(.t-input-number){
  width: 100%;
}


.json-field-card__configuration-plain {
  display: flex;
  flex-direction: column;
  gap: var(--td-size-3);
}

.json-field-card__configuration-title {
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  line-height: 20px;
}

.json-field-card__configuration-hint {
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 20px;
}

.json-field-card__configuration :deep(.t-input),
.json-field-card__configuration :deep(.t-input__wrap),
.json-field-card__configuration :deep(.t-select-input) {
  min-height: 24px;
  border-radius: 3px;
  font-size: 12px;
}
.json-field-card__configuration :deep(.t-checkbox) {
  flex-direction: row;
}

.placeholder-segmented {
  display: flex;
  min-height: 24px;
  padding: 2px;
  border-radius: 3px;
  background: var(--td-gray-color-3);
}

.placeholder-segmented > button {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  padding: 0 var(--td-size-3);
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.placeholder-segmented > button.is-active {
  background: var(--td-bg-color-container);
  color: var(--td-text-color-primary);
  box-shadow: var(--td-shadow-1);
}

.table-column-list {
  display: flex;
  flex-direction: column;
  gap: var(--td-size-3);
}

.table-column-item {
  overflow: hidden;
  border: 1px solid var(--td-gray-color-4);
  border-radius: 3px;
}

.table-column-item__header {
  display: flex;
  min-height: 40px;
  align-items: center;
  justify-content: space-between;
  gap: var(--td-size-3);
  padding: var(--td-size-3);
}

.table-column-item__header > button {
  display: flex;
  align-items: center;
  gap: var(--td-size-1);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--td-brand-color);
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
}

.table-column-item__header > button svg {
  width: 14px;
  height: 14px;
}

.table-column-item__settings {
  display: flex;
  flex-direction: column;
  gap: var(--td-size-3);
  padding: var(--td-size-3);
  background: var(--td-brand-color-light);
}

.table-column-item__type {
  flex-direction: row !important;
  align-items: center;
  justify-content: space-between;
  gap: var(--td-size-3);
}

.table-column-item__type > .t-select__wrap {
  width: 120px;
  flex: 0 0 120px;
}

.table-column-item__placeholder {
  display: flex;
  align-items: center;
  gap: var(--td-size-2);
  overflow: hidden;
  padding: var(--td-size-2) var(--td-size-3);
  background: var(--td-brand-color-2);
  color: var(--td-brand-color);
  font: 12px/20px Consolas, 'Courier New', monospace;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-column-item__placeholder code {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  font: inherit;
  text-overflow: ellipsis;
  color: var(--td-brand-color-7);
}

.table-column-item__placeholder-actions {
  display: flex;
  flex: 0 0 auto;
  gap: var(--td-size-2);
}

.table-column-item__placeholder-actions :deep(.t-button) {
  width: 24px;
  min-width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 3px;
  color: var(--td-brand-color-7);
}

.json-data-source__empty {
  display: flex;
  min-height: 260px;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--td-size-3);
  padding: var(--td-size-8);
  color: var(--td-text-color-secondary);
  text-align: center;
}

.json-data-source__empty > svg {
  width: 48px;
  height: 48px;
  margin-bottom: var(--td-size-2);
  color: var(--td-brand-color-disabled);
}

.json-data-source__empty strong {
  color: var(--td-text-color-primary);
  font: var(--td-font-title-medium);
}

.json-data-source__empty span {
  max-width: 320px;
  margin-bottom: var(--td-size-4);
  font: var(--td-font-body-small);
}

.json-data-source__status,
.json-import-dialog__validation {
  gap: var(--td-size-3);
  color: var(--td-text-color-secondary);
  font: var(--td-font-body-small);
}

.json-data-source__status {
  min-height: var(--td-size-10);
  padding: var(--td-size-2) var(--td-size-6);
  border-top: 1px solid var(--td-component-stroke);
}

.json-data-source__status > span,
.json-import-dialog__validation > span {
  width: var(--td-size-3);
  height: var(--td-size-3);
  flex: 0 0 auto;
  border-radius: var(--td-radius-round);
  background: currentcolor;
}

.is-valid {
  color: var(--td-success-color);
}

.is-invalid {
  color: var(--td-error-color);
}

:global(.json-import-dialog.t-dialog) {
  overflow: hidden;
  padding: 0;
  border-radius: 9px;
}

:global(.json-import-dialog .t-dialog__header) {
  min-height: 24px;
  padding: 32px 32px 0;
  border: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

:global(.json-import-dialog .t-dialog__close) {
  top: 34px;
  right: 32px;
}

:global(.json-import-dialog .t-dialog__body) {
  padding: 12px 32px 0;
}

:global(.json-import-dialog .t-dialog__footer) {
  min-height: 32px;
  padding: 12px 32px 32px;
  border: 0;
}

:global(.json-import-dialog .t-dialog__footer .t-button) {
  height: 32px;
  padding: 0 16px;
  border: 0;
  border-radius: 3px;
  font-size: 14px;
}

:global(.json-import-dialog .t-dialog__cancel) {
  background: var(--td-gray-color-3);
  color: var(--td-text-color-primary);
}

.json-import-dialog__tabs :deep(.t-tabs__nav-container) {
  height: 48px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--td-gray-color-3);
}

.json-import-dialog__tabs :deep(.t-tabs__nav-item) {
  height: 48px;
  padding: 8px 16px;
  font-size: 14px;
}

.json-import-dialog__tabs :deep(.t-tabs__bar) {
  height: 3px;
}

.json-import-dialog__tabs :deep(.t-tab-panel) {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 0;
}

.json-import-dialog__tab-label,
.json-import-dialog__notice {
  display: flex;
  align-items: center;
}

.json-import-dialog__tab-label {
  gap: var(--td-size-3);
}

.json-import-dialog__tab-label svg {
  width: 16px;
  height: 16px;
}

.json-import-dialog__notice {
  align-items: flex-start;
  gap: var(--td-size-2);
  padding: 5px 12px;
  border: 1px solid var(--td-brand-color-3);
  border-radius: var(--td-radius-medium);
  background: var(--td-brand-color-light);
  color: var(--td-brand-color);
  font-size: 12px;
  line-height: 20px;
}

.json-import-dialog__notice svg {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  padding: 2px;
}

.json-import-dialog__dropzone {
  display: flex;
  height: 252px;
  align-items: stretch;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border: 1px dashed var(--td-brand-color-5);
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-container);
  cursor: pointer;
  text-align: center;
  transition: border-color .2s, background-color .2s;
}

.json-import-dialog__dropzone-content {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  border-radius: 2px;
}

.json-import-dialog__dropzone:hover,
.json-import-dialog__dropzone:focus-visible,
.json-import-dialog__dropzone.is-dragging {
  border-color: var(--td-brand-color);
  outline: 0;
  background: var(--td-brand-color-light);
}

.json-import-dialog__dropzone-content :deep(.t-button) {
  height: 32px;
  margin-bottom: 0;
  padding: 0 16px;
  border-radius: 3px;
  font-size: 14px;
  .t-button__text {
    max-width: 200px;
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.json-import-dialog__dropzone-content strong {
  color: var(--td-text-color-secondary);
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
}

.json-import-dialog__dropzone-content > span {
  color: var(--td-text-color-secondary);
  font-size: 14px;
  line-height: 22px;
}

.json-import-dialog__selected-file {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 3px;
  background: var(--td-brand-color-light);
  color: var(--td-text-color-secondary);
  font-size: 12px;
  line-height: 20px;
}

.json-import-dialog__selected-file > span {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.json-import-dialog__selected-file > button {
  display: flex;
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--td-text-color-placeholder);
  cursor: pointer;
}

.json-import-dialog__selected-file > button > svg {
  width: 16px;
  height: 16px;
}

.json-import-dialog__upload-hint {
  height: 20px;
  margin: -8px 0 0;
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}

.json-import-dialog__manual-form {
  display: flex;
  height: 298px;
  flex-direction: column;
  gap: 12px;
}

.json-import-dialog__form-field {
  display: flex;
  height: 62px;
  flex: 0 0 62px;
  flex-direction: column;
  gap: 8px;
}

.json-import-dialog__form-field--json {
  height: 224px;
  flex-basis: 224px;
}

.json-import-dialog__form-field > span {
  height: 22px;
  color: var(--td-text-color-primary);
  font-size: 14px;
  line-height: 22px;
}

.json-import-dialog__form-field > .t-input__wrap {
  height: 32px;
}

.json-import-dialog__manual-form :deep(.t-input) {
  height: 32px;
  border-radius: 3px;
  font-size: 14px;
}

.json-import-dialog__textarea {
  height: 194px;
}

.json-import-dialog__textarea :deep(.t-textarea__inner) {
  height: 172px !important;
  min-height: 172px;
  resize: none;
  border-radius: 3px;
  font: 13px/1.65 Consolas, 'Courier New', monospace;
  tab-size: 2;
}

.visually-hidden {
  position: absolute;
  overflow: hidden;
  width: 1px;
  height: 1px;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 680px) {
  .json-field-card__configuration-grid {
    grid-template-columns: 1fr;
  }

  .table-fill-guide__demo {
    overflow-x: auto;
  }

  .table-fill-guide__grid {
    min-width: 390px;
  }

  :global(.json-import-dialog.t-dialog) {
    width: calc(100vw - 32px) !important;
  }

  :global(.json-import-dialog .t-dialog__header),
  :global(.json-import-dialog .t-dialog__body),
  :global(.json-import-dialog .t-dialog__footer) {
    padding-right: var(--td-size-6);
    padding-left: var(--td-size-6);
  }
}
</style>
