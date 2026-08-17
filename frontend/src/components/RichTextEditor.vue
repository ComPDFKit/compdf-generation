<template>
  <div
    class="rich-text-editor"
    :class="{ 'is-disabled': disabled }"
    :style="editorStyle"
    role="group"
    :aria-label="ariaLabel"
  >
    <Toolbar
      :key="`toolbar-${editorRenderKey}`"
      class="rich-text-editor__toolbar"
      :editor="editorRef"
      :default-config="resolvedToolbarConfig"
      :mode="mode"
    />
    <Editor
      :key="`editor-${editorRenderKey}`"
      v-model="htmlValue"
      class="rich-text-editor__content"
      :default-config="resolvedEditorConfig"
      :mode="mode"
      @on-created="handleCreated"
      @on-change="handleChange"
      @paste.capture="handleTablePlaceholderPaste"
    />
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor'
import { SlateEditor, SlateElement, SlateNode, SlatePath, SlateTransforms } from '@wangeditor/editor'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'

import { changeWangEditorLanguage } from '@/locales/wang-editor'

type EditorMode = 'default' | 'simple'

interface TablePlaceholderColumn {
  key: string
  name: string
  placeholder: string
  enabled: boolean
}

interface TableLoopMetadata {
  collectionPath: string
  variableName: string
}

interface EditorTableCell {
  type?: string
  isHeader?: boolean
  colSpan?: number
  rowSpan?: number
  children?: unknown[]
}

interface EditorTableRow {
  type?: string
  compdfCollectionPath?: string
  compdfLoopVariable?: string
  children?: EditorTableCell[]
}

interface TypedSlateElement {
  type: string
  children: unknown[]
}

interface Props {
  modelValue?: string
  disabled?: boolean
  height?: string
  mode?: EditorMode
  sourceId?: string
  placeholder?: string
  ariaLabel?: string
  editorConfig?: Partial<IEditorConfig>
  toolbarConfig?: Partial<IToolbarConfig>
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  disabled: false,
  height: '320px',
  mode: 'default',
  sourceId: '',
  placeholder: '',
  editorConfig: () => ({}),
  toolbarConfig: () => ({}),
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  created: [editor: IDomEditor]
  change: [editor: IDomEditor]
}>()

const { t } = useI18n()
const editorRef = shallowRef<IDomEditor>()
const editorRenderKey = ref(0)
const pendingTableLoops = ref<Record<string, TableLoopMetadata>>({})
const applyingTableDataRow = ref(false)
const htmlValue = ref(toEditorHtml(props.modelValue))
const lastEmittedTemplateHtml = ref('')

changeWangEditorLanguage(t('wangEditor.locale'))

watch(
  () => props.modelValue,
  (value) => {
    if (value === lastEmittedTemplateHtml.value) {
      lastEmittedTemplateHtml.value = ''
      return
    }
    applyingTableDataRow.value = true
    htmlValue.value = toEditorHtml(value)
    void nextTick().then(() => {
      applyPendingTableLoops()
      applyingTableDataRow.value = false
    })
  },
  { flush: 'sync' },
)

watch(
  htmlValue,
  (value) => {
    // A table mapping updates several cells. Emit only its completed HTML so a
    // parent v-model update cannot feed a partial table back into WangEditor.
    if (applyingTableDataRow.value) return
    const templateHtml = toTemplateHtml(value)
    if (templateHtml === props.modelValue) return
    lastEmittedTemplateHtml.value = templateHtml
    emit('update:modelValue', templateHtml)
  },
  { flush: 'sync' },
)

const resolvedEditorConfig = computed<Partial<IEditorConfig>>(() => ({
  ...props.editorConfig,
  placeholder: props.placeholder || props.editorConfig.placeholder,
  readOnly: props.disabled,
  MENU_CONF: {
    ...props.editorConfig.MENU_CONF,
    uploadImage: {
      allowedFileTypes: ['image/*'],
      maxNumberOfFiles: 1,
      customUpload: uploadLocalImage,
      ...props.editorConfig.MENU_CONF?.uploadImage,
    },
  },
}))

const resolvedToolbarConfig = computed<Partial<IToolbarConfig>>(() => ({
  ...props.toolbarConfig,
  excludeKeys: [
    'group-video',
    'insertVideo',
    'uploadVideo',
    'insertImage',
    'fontFamily',
    'emotion',
    ...(props.toolbarConfig.excludeKeys || []),
  ],
}))

const editorStyle = computed<CSSProperties>(() => ({
  height: props.height,
  overflowY: 'hidden',
}))

/** Reads a local image as a data URL before inserting it into the editor. */
function uploadLocalImage(
  file: File,
  insertImage: (url: string, alt: string, href: string) => void,
) {
  const reader = new FileReader()
  reader.addEventListener('load', () => {
    if (typeof reader.result !== 'string') return
    insertImage(reader.result, file.name, '')
  })
  reader.readAsDataURL(file)
}

/** WangEditor stores image dimensions in the style field internally. */
function toEditorHtml(value: string): string {
  const htmlWithoutLoopMarkers = extractTableLoopMarkers(value)
  return wrapOrphanImages(htmlWithoutLoopMarkers).replace(/<img\b[^>]*>/gi, (tag) => {
    if (!tag.includes('{{')) return tag
    const width = getAttribute(tag, 'width')
    const height = getAttribute(tag, 'height')
    if (!width && !height) return tag
    const style = getAttribute(tag, 'style')
    const dimensions = [
      width ? `width: ${cssSize(width)};` : '',
      height ? `height: ${cssSize(height)};` : '',
    ].filter(Boolean).join(' ')
    const mergedStyle = [style, dimensions].filter(Boolean).join(' ').trim()
    let result = removeAttribute(removeAttribute(tag, 'width'), 'height')
    result = setAttribute(result, 'style', mergedStyle)
    return result
  })
}

/** Wraps images outside a WangEditor block so Slate can resolve their DOM nodes. */
function wrapOrphanImages(value: string): string {
  if (typeof document === 'undefined') return value
  const template = document.createElement('template')
  template.innerHTML = value
  template.content.querySelectorAll('img').forEach((image) => {
    const parent = image.parentElement
    if (!parent || !parent.closest('p, h1, h2, h3, h4, h5, td, th, blockquote, li, pre')) {
      const paragraph = document.createElement('p')
      image.replaceWith(paragraph)
      paragraph.appendChild(image)
    }
  })
  return template.innerHTML
}

/** Preserves loop metadata from existing template HTML before WangEditor removes comments. */
function extractTableLoopMarkers(value: string): string {
  if (typeof document === 'undefined') return value
  const template = document.createElement('template')
  template.innerHTML = value
  const tables = topLevelTables(template.content)
  const loopPaths: Record<string, TableLoopMetadata> = {}
  const comments: Comment[] = []
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_COMMENT)
  let node = walker.nextNode()
  while (node) {
    comments.push(node as Comment)
    node = walker.nextNode()
  }
  for (const comment of comments) {
    const match = comment.data.match(/^\s*{%\s*for\s+([A-Za-z_$][A-Za-z0-9_$]*)\s+in\s+([A-Za-z_$][A-Za-z0-9_$.]*)\s*%}\s*$/)
    if (!match?.[1] || !match[2] || !isSafeTemplatePath(match[2])) continue
    const row = nextTableRow(comment)
    const table = row?.closest('table')
    if (!row || !table) continue
    const endComment = nextTableLoopEndComment(row)
    if (!endComment) continue
    const tableIndex = tables.indexOf(table)
    const rowIndex = Array.from(table.rows).indexOf(row)
    if (tableIndex >= 0 && rowIndex >= 0) {
      loopPaths[`${tableIndex}:${rowIndex}`] = {
        variableName: match[1],
        collectionPath: match[2],
      }
      comment.remove()
      endComment.remove()
    }
  }
  pendingTableLoops.value = loopPaths
  return template.innerHTML
}

function nextTableRow(comment: Comment): HTMLTableRowElement | null {
  let sibling = comment.nextSibling
  while (sibling) {
    if (sibling instanceof HTMLTableRowElement) return sibling
    if (sibling.nodeType === Node.ELEMENT_NODE) return null
    sibling = sibling.nextSibling
  }
  return null
}

/** Finds the matching generated end marker immediately after a mapped row. */
function nextTableLoopEndComment(row: HTMLTableRowElement): Comment | null {
  let sibling = row.nextSibling
  while (sibling) {
    if (sibling.nodeType === Node.TEXT_NODE && !sibling.textContent?.trim()) {
      sibling = sibling.nextSibling
      continue
    }
    if (sibling.nodeType === Node.COMMENT_NODE
      && /^\s*{%\s*endfor\s*%}\s*$/.test((sibling as Comment).data)) {
      return sibling as Comment
    }
    return null
  }
  return null
}

/** Returns only outer tables because WangEditor stores tables as root blocks. */
function topLevelTables(root: ParentNode): HTMLTableElement[] {
  return Array.from(root.querySelectorAll('table'))
    .filter(table => !table.parentElement?.closest('table'))
}

/** Converts WangEditor's internal image style back to template width/height attributes. */
function toTemplateHtml(value: string): string {
  const normalized = value.replace(/<img\b[^>]*>/gi, (tag) => {
    if (!tag.includes('{{')) return tag
    const style = getAttribute(tag, 'style') || ''
    const width = styleValue(style, 'width')
    const height = styleValue(style, 'height')
    if (!width && !height) return tag
    const cleanStyle = style
      .replace(/(?:^|;)\s*width\s*:\s*[^;]+;?/i, '')
      .replace(/(?:^|;)\s*height\s*:\s*[^;]+;?/i, '')
      .trim()
    let result = removeAttribute(removeAttribute(tag, 'width'), 'height')
    result = cleanStyle ? setAttribute(result, 'style', cleanStyle) : removeAttribute(result, 'style')
    if (width) result = setAttribute(result, 'width', htmlSize(width))
    if (height) result = setAttribute(result, 'height', htmlSize(height))
    return result
  })
  return unwrapSingleImageParagraphs(
    restoreTemplateComparisonOperators(addTableLoopMarkers(addTableBorders(normalized))),
  )
}

/** Reverts editor-only image paragraphs so saved HTML keeps the source structure. */
function unwrapSingleImageParagraphs(value: string): string {
  if (typeof document === 'undefined') return value
  const template = document.createElement('template')
  template.innerHTML = value
  template.content.querySelectorAll('p').forEach((paragraph) => {
    const visibleChildren = Array.from(paragraph.childNodes).filter((node) => {
      if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim())
      return node.nodeType === Node.ELEMENT_NODE
    })
    if (visibleChildren.length === 1 && visibleChildren[0] instanceof HTMLImageElement) {
      paragraph.replaceWith(visibleChildren[0])
    }
  })
  return template.innerHTML
}

/** Restores comparison operators escaped by HTML serialization inside template expressions. */
function restoreTemplateComparisonOperators(value: string): string {
  return value.replace(/{{[\s\S]*?}}/g, expression => expression
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<'))
}

/** Adds inline table styles so generated HTML renders consistently outside WangEditor. */
function addTableBorders(value: string): string {
  if (typeof document === 'undefined') return value
  const template = document.createElement('template')
  template.innerHTML = value
  template.content.querySelectorAll('table').forEach((table) => {
    table.style.borderCollapse = 'collapse'
    table.style.border = '1px solid #dcdde1'
  })
  template.content.querySelectorAll('th, td').forEach((cell) => {
    if (!(cell instanceof HTMLElement)) return
    cell.style.border = '1px solid #dcdde1'
    cell.style.padding = '8px'
    if (cell.tagName === 'TH' && !cell.style.backgroundColor && !cell.getAttribute('bgcolor')) {
      // WangEditor's default header color is CSS-only and unavailable to the PDF renderer.
      cell.style.backgroundColor = '#f5f2f0'
      cell.setAttribute('bgcolor', '#f5f2f0')
    }
  })
  return template.innerHTML
}

/** Adds ComPDF loop comments around data rows configured through table placeholder insertion. */
function addTableLoopMarkers(value: string): string {
  const entries = currentTableLoopEntries()
  if (!entries.length || typeof document === 'undefined') return value
  const template = document.createElement('template')
  template.innerHTML = value
  const tables = topLevelTables(template.content)
  for (const [key, metadata] of entries) {
    const [tableIndex, rowIndex] = key.split(':').map(Number)
    if (tableIndex === undefined || rowIndex === undefined
      || !Number.isInteger(tableIndex) || !Number.isInteger(rowIndex)) continue
    const row = tables[tableIndex]?.rows[rowIndex]
    if (!row || !isSafeTableLoopMetadata(metadata)) continue
    row.before(document.createComment(` {% for ${metadata.variableName} in ${metadata.collectionPath} %} `))
    row.after(document.createComment(' {% endfor %} '))
  }
  return template.innerHTML
}

/** Reads loop metadata from live Slate rows so it follows table edits. */
function currentTableLoopEntries(): Array<[string, TableLoopMetadata]> {
  const editor = editorRef.value
  if (!editor || editor.isDestroyed) return Object.entries(pendingTableLoops.value)
  const entries: Array<[string, TableLoopMetadata]> = []
  let tableOrdinal = -1
  editor.children.forEach((node) => {
    if (!isSlateElementOfType(node, 'table')) return
    tableOrdinal += 1
    node.children.forEach((row, rowIndex) => {
      if (!isSlateElementOfType(row, 'table-row')) return
      const tableRow = row as EditorTableRow
      const metadata = {
        collectionPath: tableRow.compdfCollectionPath || '',
        variableName: tableRow.compdfLoopVariable || 'item',
      }
      if (isSafeTableLoopMetadata(metadata)) entries.push([`${tableOrdinal}:${rowIndex}`, metadata])
    })
  })
  return entries
}

/** Applies loop metadata extracted from HTML comments to the corresponding Slate rows. */
function applyPendingTableLoops(editor = editorRef.value) {
  if (!editor || editor.isDestroyed) return
  const entries = Object.entries(pendingTableLoops.value)
  SlateEditor.withoutNormalizing(editor, () => {
    const tablePaths = editor.children.reduce<number[][]>((paths, node, index) => {
      if (isSlateElementOfType(node, 'table')) paths.push([index])
      return paths
    }, [])
    tablePaths.forEach((tablePath) => {
      const table = SlateNode.get(editor, tablePath)
      if (!isSlateElementOfType(table, 'table')) return
      table.children.forEach((row, rowIndex) => {
        if (!isSlateElementOfType(row, 'table-row')) return
        SlateTransforms.unsetNodes(editor, ['compdfCollectionPath', 'compdfLoopVariable'], {
          at: [...tablePath, rowIndex],
        })
      })
    })
    for (const [key, metadata] of entries) {
      if (!isSafeTableLoopMetadata(metadata)) continue
      const [tableIndex, rowIndex] = key.split(':').map(Number)
      if (tableIndex === undefined || rowIndex === undefined
        || !Number.isInteger(tableIndex) || !Number.isInteger(rowIndex)) continue
      const tablePath = tablePaths[tableIndex]
      if (!tablePath) continue
      const rowPath = [...tablePath, rowIndex]
      if (!SlateEditor.hasPath(editor, rowPath)) continue
      const row = SlateNode.get(editor, rowPath)
      if (!isSlateElementOfType(row, 'table-row')) continue
      SlateTransforms.setNodes(editor, {
        compdfCollectionPath: metadata.collectionPath,
        compdfLoopVariable: metadata.variableName,
      } as never, { at: rowPath })
    }
  })
  pendingTableLoops.value = {}
}

function isSafeTableLoopMetadata(value: TableLoopMetadata): boolean {
  return isSafeTemplateIdentifier(value.variableName) && isSafeTemplatePath(value.collectionPath)
}

function isSafeTemplateIdentifier(value: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value)
    && !['__proto__', 'prototype', 'constructor'].includes(value)
}

function isSafeTemplatePath(value: string): boolean {
  return value.split('.').every(isSafeTemplateIdentifier)
}

/** Narrows WangEditor's open Slate element type to one registered node type. */
function isSlateElementOfType(node: unknown, type: string): node is TypedSlateElement {
  return SlateElement.isElement(node) && (node as { type?: unknown }).type === type
}

/** Applies WangEditor's full-width mode only to tables inserted in the current change. */
function setInsertedTablesToFullWidth(editor: IDomEditor) {
  const tablePaths = editor.operations.flatMap((operation) => {
    if (operation.type !== 'insert_node' || !isSlateElementOfType(operation.node, 'table')) return []
    return [operation.path]
  })
  if (!tablePaths.length) return

  SlateEditor.withoutNormalizing(editor, () => {
    tablePaths.forEach((path) => {
      if (!SlateEditor.hasPath(editor, path)) return
      const table = SlateNode.get(editor, path)
      if (!isSlateElementOfType(table, 'table')) return
      if ((table as TypedSlateElement & { width?: string }).width === '100%') return
      SlateTransforms.setNodes(editor, { width: '100%' } as never, { at: path })
    })
  })
}

/** Syncs programmatic table edits after WangEditor has discarded template comments. */
function syncTemplateHtmlFromEditor() {
  const templateHtml = getTemplateHtml()
  if (templateHtml === props.modelValue) return
  lastEmittedTemplateHtml.value = templateHtml
  emit('update:modelValue', templateHtml)
}

/** Returns the current editor HTML with template-only table markers restored. */
function getTemplateHtml(): string {
  const editor = editorRef.value
  return toTemplateHtml(!editor || editor.isDestroyed ? htmlValue.value : editor.getHtml())
}

/** Reads a quoted attribute value from a single HTML tag. */
function getAttribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))
  return match?.[1]
}

/** Removes a quoted attribute from a single HTML tag. */
function removeAttribute(tag: string, name: string): string {
  return tag.replace(new RegExp(`\\s+${name}\\s*=\\s*["'][^"']*["']`, 'i'), '')
}

/** Sets a safely escaped quoted attribute on a single HTML tag. */
function setAttribute(tag: string, name: string, value: string): string {
  const escapedValue = value.replace(/"/g, '&quot;')
  const attribute = ` ${name}="${escapedValue}"`
  const existing = new RegExp(`\\s+${name}\\s*=\\s*["'][^"']*["']`, 'i')
  if (existing.test(tag)) return tag.replace(existing, attribute)
  return tag.replace(/\s*(\/?>)$/, `${attribute} $1`)
}

/** Extracts one CSS declaration value from an inline style string. */
function styleValue(style: string, name: string): string | undefined {
  const match = style.match(new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`, 'i'))
  return match?.[1] ? match[1].trim() : undefined
}

/** Converts unitless HTML dimensions into pixel CSS dimensions. */
function cssSize(value: string): string {
  return /^\d+(?:\.\d+)?$/.test(value.trim()) ? `${value.trim()}px` : value.trim()
}

/** Converts pixel CSS dimensions back into HTML attribute values. */
function htmlSize(value: string): string {
  return value.trim().replace(/px$/i, '')
}

/** Stores the editor instance and forwards its creation event to the parent. */
function handleCreated(editor: IDomEditor) {
  editorRef.value = editor
  applyingTableDataRow.value = true
  applyPendingTableLoops(editor)
  applyingTableDataRow.value = false
  if (props.disabled) editor.disable()
  emit('created', editor)
}

/** Forwards editor change events without exposing implementation state. */
function handleChange(editor: IDomEditor) {
  setInsertedTablesToFullWidth(editor)
  emit('change', editor)
}

/** Expands copied table mappings when they are pasted into an existing editor table. */
function handleTablePlaceholderPaste(event: ClipboardEvent) {
  const html = event.clipboardData?.getData('text/html')
  const text = event.clipboardData?.getData('text/plain')
  if (typeof document === 'undefined') return
  if (html) {
    const template = document.createElement('template')
    template.innerHTML = html
    const marker = template.content.querySelector<HTMLElement>('[data-compdf-table-version="1"][data-compdf-table-collection][data-compdf-table-columns]')
    if (marker) {
      try {
        const collectionPath = decodeURIComponent(marker.dataset.compdfTableCollection || '')
        const columns = JSON.parse(decodeURIComponent(marker.dataset.compdfTableColumns || '')) as unknown
        if (!isSafeTemplatePath(collectionPath) || !isTablePlaceholderColumns(columns)) return
        event.preventDefault()
        event.stopPropagation()
        insertTableDataRow(columns, collectionPath)
        return
      } catch {
        // Continue with the HTML/plain-text fallback for clipboard implementations
        // that do not preserve the custom mapping marker.
      }
    }
  }
  const copiedTable = tableLoopPlaceholderFromHtml(html || text || '')
  if (!copiedTable) return
  event.preventDefault()
  event.stopPropagation()
  insertTableDataRow(copiedTable.columns, copiedTable.collectionPath)
}

/** Extracts a table-loop mapping from copied template HTML without custom clipboard data. */
function tableLoopPlaceholderFromHtml(value: string): { collectionPath: string; columns: TablePlaceholderColumn[] } | null {
  if (!value || typeof document === 'undefined') return null
  const template = document.createElement('template')
  // A standalone <tr> is discarded by some HTML parsers, so give plain-text
  // fallback content the table context it would have in a real template.
  template.innerHTML = `<table><tbody>${value}</tbody></table>`
  const comments: Comment[] = []
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_COMMENT)
  let node = walker.nextNode()
  while (node) {
    comments.push(node as Comment)
    node = walker.nextNode()
  }
  for (const comment of comments) {
    const match = comment.data.match(/^\s*{%\s*for\s+item\s+in\s+([A-Za-z_$][A-Za-z0-9_$.]*)\s*%}\s*$/)
    const row = nextTableRow(comment)
    if (!match?.[1] || !isSafeTemplatePath(match[1]) || !row) continue
    return {
      collectionPath: match[1],
      columns: Array.from(row.cells).map((cell, index) => ({
        key: `clipboard-${index}`,
        name: `column${index + 1}`,
        placeholder: clipboardCellPlaceholder(cell),
        enabled: true,
      })),
    }
  }
  return null
}

/** Treats clipboard cells as text unless they contain one strict image placeholder. */
function clipboardCellPlaceholder(cell: HTMLTableCellElement): string {
  const html = cell.innerHTML.trim()
  return parseTemplateImagePlaceholder(html) ? html : cell.textContent || ''
}

/** Validates the bounded clipboard schema before it can modify editor content. */
function isTablePlaceholderColumns(value: unknown): value is TablePlaceholderColumn[] {
  if (!Array.isArray(value) || !value.length || value.length > 256) return false
  return value.every((column) => {
    if (!column || typeof column !== 'object') return false
    const item = column as Partial<TablePlaceholderColumn>
    return typeof item.key === 'string'
      && item.key.length <= 1024
      && typeof item.name === 'string'
      && item.name.length <= 256
      && typeof item.placeholder === 'string'
      && item.placeholder.length <= 4096
      && typeof item.enabled === 'boolean'
  })
}

/** Inserts plain text at the current selection when the editor is available. */
function insertText(value: string) {
  const editor = editorRef.value
  if (!editor || editor.isDestroyed || props.disabled) return
  editor.focus()
  editor.insertText(value)
}

/** Fills cells from the selected table cell with validated column placeholders. */
function insertTableDataRow(columns: TablePlaceholderColumn[], collectionPath: string): boolean {
  const editor = editorRef.value
  if (!editor || editor.isDestroyed || props.disabled) return false
  if (!isSafeTemplatePath(collectionPath) || !isTablePlaceholderColumns(columns)) {
    MessagePlugin.error(t('template.editor.tableInvalidMapping'))
    return false
  }
  const target = selectedTableCellTarget(editor)
  if (!target) {
    MessagePlugin.warning(t('template.editor.tableSelectDataRow'))
    return false
  }
  const { rowPath, cellIndex: startCellIndex } = target
  const row = SlateNode.get(editor, rowPath) as EditorTableRow
  const cells = row.children
  if (!cells?.length || cells.some(cell => cell.isHeader)) {
    MessagePlugin.warning(t('template.editor.tableSelectDataRow'))
    return false
  }
  if (cells.some(cell => (cell.colSpan || 1) !== 1 || (cell.rowSpan || 1) !== 1)) {
    MessagePlugin.warning(t('template.editor.tableMergedCellsUnsupported'))
    return false
  }
  const availableCellCount = cells.length - startCellIndex
  const assignments = resolveTableColumnAssignments(columns, startCellIndex, availableCellCount)
  if (!assignments) {
    MessagePlugin.warning(t('template.editor.tableColumnCountMismatch', {
      available: availableCellCount,
      enabled: columns.filter(column => column.enabled).length,
      total: columns.length,
    }))
    return false
  }
  let completed = false
  applyingTableDataRow.value = true
  try {
    SlateEditor.withoutNormalizing(editor, () => {
      assignments.forEach(({ cellIndex, column }) => {
        replaceTableCell(editor, [...rowPath, cellIndex], column.placeholder)
      })
      SlateTransforms.setNodes(editor, {
        compdfCollectionPath: collectionPath,
        compdfLoopVariable: 'item',
      } as never, { at: rowPath })
    })
    editor.focus()
    completed = true
  } catch (error) {
    console.error(error)
    MessagePlugin.error(t('template.editor.tableInsertFailed'))
  } finally {
    applyingTableDataRow.value = false
  }
  if (!completed) return false
  // Slate transforms are synchronous. Persist the completed mapping in the
  // parent model immediately, then repeat after Vue has flushed WangEditor's
  // v-model update to cover any deferred editor normalization.
  syncTemplateHtmlFromEditor()
  void nextTick().then(syncTemplateHtmlFromEditor)
  return true
}

/** Resolves the single table cell containing both ends of the current selection. */
function selectedTableCellTarget(editor: IDomEditor): { rowPath: number[], cellIndex: number } | null {
  const domTarget = selectedTableCellTargetFromDom(editor)
  if (domTarget) return domTarget
  const selection = editor.selection
  if (!selection) return null
  const anchorRow = ancestorPathByType(editor, selection.anchor.path, 'table-row')
  const focusRow = ancestorPathByType(editor, selection.focus.path, 'table-row')
  if (!anchorRow || !focusRow || !SlatePath.equals(anchorRow, focusRow)) return null
  const anchorCell = ancestorPathByType(editor, selection.anchor.path, 'table-cell')
  const focusCell = ancestorPathByType(editor, selection.focus.path, 'table-cell')
  if (!anchorCell || !focusCell || !SlatePath.equals(anchorCell, focusCell)) return null
  const tablePath = ancestorPathByType(editor, anchorRow, 'table')
  if (!tablePath || anchorCell.length !== anchorRow.length + 1) return null
  const cellIndex = anchorCell[anchorCell.length - 1]
  return typeof cellIndex === 'number' && Number.isInteger(cellIndex) && cellIndex >= 0
    ? { rowPath: anchorRow, cellIndex }
    : null
}

/** Reads the browser selection first because sidebar actions can leave Slate with a stale table path. */
function selectedTableCellTargetFromDom(editor: IDomEditor): { rowPath: number[], cellIndex: number } | null {
  if (typeof window === 'undefined') return null
  const selection = window.getSelection()
  const anchorCell = selectionPointCell(selection?.anchorNode)
  const focusCell = selectionPointCell(selection?.focusNode)
  if (!anchorCell || !focusCell || anchorCell !== focusCell) return null
  const row = anchorCell.closest('tr')
  const table = anchorCell.closest('table')
  const editorRoot = table?.closest('[data-slate-editor]')
  if (!row || !table || !editorRoot) return null
  const tableIndex = Array.from(editorRoot.querySelectorAll('table')).indexOf(table)
  const rowIndex = Array.from(table.rows).indexOf(row)
  const cellIndex = Array.from(row.cells).indexOf(anchorCell)
  const tablePaths = editor.children.reduce<number[][]>((paths, node, index) => {
    if (isSlateElementOfType(node, 'table')) paths.push([index])
    return paths
  }, [])
  const tablePath = tablePaths[tableIndex]
  if (!tablePath || rowIndex < 0 || cellIndex < 0) return null
  const rowPath = [...tablePath, rowIndex]
  if (!SlateEditor.hasPath(editor, rowPath)) return null
  const slateRow = SlateNode.get(editor, rowPath)
  return isSlateElementOfType(slateRow, 'table-row') ? { rowPath, cellIndex } : null
}

/** Resolves a DOM selection point to its containing table cell. */
function selectionPointCell(node: Node | null | undefined): HTMLTableCellElement | null {
  const element = node instanceof Element ? node : node?.parentElement
  const cell = element?.closest('td, th')
  return cell instanceof HTMLTableCellElement ? cell : null
}

/** Walks a Slate path upward until it finds an element of the requested type. */
function ancestorPathByType(editor: IDomEditor, path: number[], type: string): number[] | null {
  for (let length = path.length; length > 0; length -= 1) {
    const candidate = path.slice(0, length)
    if (!SlateEditor.hasPath(editor, candidate)) continue
    const node = SlateNode.get(editor, candidate)
    if (isSlateElementOfType(node, type)) return candidate
  }
  return null
}

/** Maps source columns into the cells available at and after the selected cell. */
function resolveTableColumnAssignments(
  columns: TablePlaceholderColumn[],
  startCellIndex: number,
  availableCellCount: number,
) {
  const enabledColumns = columns.filter(column => column.enabled)
  if (!enabledColumns.length || enabledColumns.length > availableCellCount) return null
  return enabledColumns.map((column, enabledColumnIndex) => ({
    cellIndex: startCellIndex + enabledColumnIndex,
    column,
  }))
}

/** Replaces every inline child in a cell with one normalized text or image node. */
function replaceTableCell(editor: IDomEditor, cellPath: number[], placeholder: string) {
  const cell = SlateNode.get(editor, cellPath) as EditorTableCell
  const childCount = cell.children?.length || 0
  for (let index = childCount - 1; index >= 0; index -= 1) {
    SlateTransforms.removeNodes(editor, { at: [...cellPath, index] })
  }
  const image = parseTemplateImagePlaceholder(placeholder)
  SlateTransforms.insertNodes(editor, image || { text: placeholder }, { at: [...cellPath, 0] })
}

/** Parses only the exact image placeholder shape generated by JsonDataSourceEditor. */
function parseTemplateImagePlaceholder(value: string) {
  if (typeof document === 'undefined' || !/^\s*<img\b[^>]*\/?\s*>\s*$/i.test(value)) return null
  const template = document.createElement('template')
  template.innerHTML = value.trim()
  if (template.content.childNodes.length !== 1) return null
  const image = template.content.firstElementChild
  if (!(image instanceof HTMLImageElement)) return null
  if (Array.from(image.attributes).some(attribute => !['src', 'style', 'alt'].includes(attribute.name.toLowerCase()))) {
    return null
  }
  const src = image.getAttribute('src') || ''
  const expression = src.match(/^{{\s*(item\.[A-Za-z_$][A-Za-z0-9_$]*)\s*}}$/)
  if (!expression) return null
  const width = image.style.width
  const height = image.style.height
  if ((width && !/^\d+px$/.test(width)) || (height && !/^\d+px$/.test(height))) return null
  return {
    type: 'image',
    src,
    alt: '',
    href: '',
    style: { width, height },
    children: [{ text: '' }],
  }
}

/** Inserts template markup while preserving placeholders as editable text. */
function insertContent(value: string) {
  const editor = editorRef.value
  if (!editor || editor.isDestroyed || props.disabled) return
  editor.focus()
  if (/^\s*<img\b/i.test(value)) {
    editor.dangerouslyInsertHtml(value)
    return
  }
  editor.insertText(value)
}

defineExpose({ getTemplateHtml, insertText, insertContent, insertTableDataRow })

watch(
  () => props.disabled,
  (disabled) => {
    const editor = editorRef.value
    if (!editor || editor.isDestroyed) return
    if (disabled) editor.disable()
    else editor.enable()
  },
)

watch(
  () => props.sourceId,
  () => {
    // A new template must never inherit pending mappings from the previous one.
    pendingTableLoops.value = {}
    applyingTableDataRow.value = false
  },
  { flush: 'sync' },
)

watch(
  () => t('wangEditor.locale'),
  (locale) => {
    pendingTableLoops.value = Object.fromEntries(currentTableLoopEntries())
    editorRef.value?.destroy()
    editorRef.value = undefined
    changeWangEditorLanguage(locale)
    editorRenderKey.value += 1
  },
)

onBeforeUnmount(() => {
  editorRef.value?.destroy()
  editorRef.value = undefined
})
</script>

<style scoped lang="less">
.rich-text-editor {
  display: flex;
  overflow: hidden;
  min-height: 0;
  flex-direction: column;
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-container);

  &__toolbar {
    flex: 0 0 auto;
    border-bottom: 1px solid var(--td-component-border);
  }

  &__content {
    overflow-y: hidden;
    min-height: 0;
    flex: 1;
    background: var(--td-bg-color-container);

    // Template image placeholders have no browser-loadable URL in the editor.
    // Keep the original src in the HTML while making the element visible and bounded here.
    :deep(.w-e-text-container img[src^="{{"]) {
      display: inline-block;
      box-sizing: border-box;
      max-width: 100%;
      border: 1px dashed var(--td-brand-color);
      background: var(--td-brand-color-light);
      object-fit: contain;
      vertical-align: middle;
    }
  }

  &.is-disabled {
    background: var(--td-bg-color-component-disabled);
  }
  
  
  :deep(.w-e-text-container){
    input{
      -webkit-appearance: auto;
      appearance: auto;
      -moz-appearance: auto;
    }
    .table-container{
      overflow-x: hidden;
    }
  } 
  :deep(.w-e-bar) svg{
    flex-shrink: 0;
  }
}
</style>
