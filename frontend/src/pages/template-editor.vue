<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import type { DropdownProps } from 'tdesign-vue-next'
import {
  ChevronDownIcon,
  DownloadIcon,
  Edit2Icon,
  FilePdfIcon,
  SaveIcon,
  TaskIcon,
} from 'tdesign-icons-vue-next'

import {
  apiCreateTemplateApi,
  apiDownloadTemplateApi,
  apiGeneratePdfApi,
  apiGetTemplateContentApi,
  apiUpdateTemplateApi,
  GeneratePdfError,
} from '@/api'
import type { TemplateRecord } from '@/api/model'
import AppHeader from '@/components/AppHeader.vue'
import JsonDataSourceEditor from '@/components/JsonDataSourceEditor.vue'
import RichTextEditor from '@/components/RichTextEditor.vue'
import TemplateFormDialog from '@/components/TemplateFormDialog.vue'
import type { TemplateFormValues } from '@/components/TemplateFormDialog.vue'
import { validateJson } from '@/utils/json-data-source'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const metadata = ref<TemplateRecord | null>(null)
const html = ref('')
const json = ref('')
const jsonFileName = ref('')
const richTextEditorRef = ref<InstanceType<typeof RichTextEditor>>()
const savedHtml = ref('')
const savedJson = ref('')
const savedJsonFileName = ref('')
const loading = ref(true)
const saving = ref(false)
const generating = ref(false)
const templateDialogVisible = ref(false)
const templateSubmitting = ref(false)
const saveAsDialogVisible = ref(false)
const saveAsSubmitting = ref(false)

const templateId = computed(() => typeof route.params.id === 'string' ? route.params.id : '')
const hasJsonDataSource = computed(() => Boolean(jsonFileName.value))
const isDirty = computed(() => html.value !== savedHtml.value
  || json.value !== savedJson.value
  || jsonFileName.value !== savedJsonFileName.value)
const jsonValidation = computed(() => validateJson(json.value))
const jsonStatusText = computed(() => jsonValidation.value.valid
  ? t('template.editor.jsonValid')
  : t('template.editor.jsonInvalid', {
      line: jsonValidation.value.line,
      reason: jsonValidation.value.reason === 'missingClosingBrace'
        ? t('template.editor.jsonMissingClosingBrace')
        : jsonValidation.value.detail || t('template.editor.jsonInvalidUnknown'),
    }))
const saveOptions = computed<DropdownProps['options']>(() => [
  { content: t('template.editor.save'), value: 'save-changes' },
  { content: t('template.editor.saveAsNew'), value: 'save-as-new' },
])

const generationErrorMessageKeys: Record<string, string> = {
  BAD_REQUEST: 'template.generationError.invalidRequest',
  VALIDATION_ERROR: 'template.generationError.invalidRequest',
  INVALID_REQUEST: 'template.generationError.invalidRequest',
  INVALID_ARGUMENT: 'template.generationError.invalidRequest',
  INVALID_JSON: 'template.generationError.invalidJson',
  INVALID_FILE_TYPE: 'template.generationError.invalidFileType',
  FILE_REQUIRED: 'template.generationError.fileRequired',
  FILE_COUNT_MISMATCH: 'template.generationError.fileCountMismatch',
  FILE_TOO_LARGE: 'template.generationError.fileTooLarge',
  PAGE_LIMIT_EXCEEDED: 'template.generationError.pageLimitExceeded',
  INVALID_PAGE_RANGE: 'template.generationError.invalidRequest',
  INVALID_PAGE_INDEX: 'template.generationError.invalidRequest',
  INVALID_RECT: 'template.generationError.invalidRequest',
  INVALID_QUAD_RECTS: 'template.generationError.invalidRequest',
  PAGE_RANGE_EMPTY: 'template.generationError.invalidRequest',
  INVALID_OUTPUT_FILE_NAME: 'template.generationError.invalidOutputFileName',
  UNAUTHORIZED: 'template.generationError.unauthorized',
  FORBIDDEN: 'template.generationError.forbidden',
  INVALID_TOKEN: 'template.generationError.forbidden',
  NOT_FOUND: 'template.generationError.notFound',
  TASK_NOT_READY: 'template.generationError.invalidState',
  INVALID_STATE: 'template.generationError.invalidState',
  CONCURRENCY_EXCEEDED: 'template.generationError.concurrencyExceeded',
  CONCURRENCY_LIMIT: 'template.generationError.concurrencyExceeded',
  INTERNAL_ERROR: 'template.generationError.internalError',
  CONVERT_FAILED: 'template.generationError.processingFailed',
  SDK_PROCESS_FAILED: 'template.generationError.processingFailed',
  PASSWORD_REQUIRED: 'template.generationError.processingFailed',
  INVALID_PASSWORD: 'template.generationError.processingFailed',
  ICC_PROFILE_REQUIRED: 'template.generationError.processingFailed',
  ICC_PROFILE_INVALID: 'template.generationError.processingFailed',
  PDF_PASSWORD_ERROR: 'template.generationError.processingFailed',
  PDF_FORMAT_ERROR: 'template.generationError.processingFailed',
  PDF_SECURITY_ERROR: 'template.generationError.processingFailed',
  OCR_FAILURE: 'template.generationError.processingFailed',
  SDK_FILE_ERROR: 'template.generationError.processingFailed',
  JOB_TIMEOUT: 'template.generationError.timeout',
  UPSTREAM_ERROR: 'template.generationError.upstreamError',
}

onMounted(() => {
  window.addEventListener('beforeunload', confirmBrowserLeave)
  void loadContent()
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', confirmBrowserLeave)
})

onBeforeRouteLeave(() => {
  if (!isDirty.value) return true
  return confirmRouteLeave()
})

onBeforeRouteUpdate(async (to) => {
  const nextTemplateId = typeof to.params.id === 'string' ? to.params.id : ''
  if (!nextTemplateId || nextTemplateId === templateId.value) return true
  if (isDirty.value && !(await confirmRouteLeave())) return false
  return loadContent(nextTemplateId)
})

/** Loads the template source files for editing. */
async function loadContent(id = templateId.value): Promise<boolean> {
  if (!id) {
    await router.replace('/')
    return false
  }
  loading.value = true
  try {
    const result = await apiGetTemplateContentApi(id)
    metadata.value = result.metadata
    html.value = result.html
    json.value = result.json ?? ''
    jsonFileName.value = result.metadata.jsonFileName ?? ''
    savedHtml.value = result.html
    savedJson.value = result.json ?? ''
    savedJsonFileName.value = result.metadata.jsonFileName ?? ''
    return true
  } catch (error) {
    console.error(error)
    MessagePlugin.error(t('template.editor.loadFailed'))
    return false
  } finally {
    loading.value = false
  }
}

/** Saves the HTML source and the optional JSON data source. */
async function saveChanges(): Promise<boolean> {
  if (!metadata.value || saving.value) return false
  if (hasJsonDataSource.value && !jsonValidation.value.valid) {
    MessagePlugin.error(jsonStatusText.value)
    return false
  }
  const templateHtml = richTextEditorRef.value?.getTemplateHtml() ?? html.value
  html.value = templateHtml
  const htmlFile = new File([templateHtml], metadata.value.htmlFileName, { type: 'text/html;charset=utf-8' })
  const jsonFile = hasJsonDataSource.value
    ? new File([json.value], jsonFileName.value, { type: 'application/json' })
    : undefined
  saving.value = true
  try {
    metadata.value = await apiUpdateTemplateApi({
      id: metadata.value.id,
      htmlFile,
      jsonFile,
      removeJsonFile: !jsonFile && Boolean(metadata.value.jsonFileName),
    })
    savedHtml.value = templateHtml
    savedJson.value = json.value
    jsonFileName.value = metadata.value.jsonFileName ?? ''
    savedJsonFileName.value = metadata.value.jsonFileName ?? ''
    MessagePlugin.success(t('template.editor.saveSuccess'))
    return true
  } catch (error) {
    console.error(error)
    MessagePlugin.error(t('template.editor.saveFailed'))
    return false
  } finally {
    saving.value = false
  }
}

/** Updates the current template name and description from the shared form dialog. */
async function updateTemplateMetadata(values: TemplateFormValues) {
  if (!metadata.value || templateSubmitting.value) return
  templateSubmitting.value = true
  try {
    metadata.value = await apiUpdateTemplateApi({
      id: metadata.value.id,
      name: values.name,
      description: values.description,
    })
    templateDialogVisible.value = false
    MessagePlugin.success(t('template.message.updateSuccess'))
  } catch (error) {
    console.error(error)
    MessagePlugin.error(t('template.message.updateFailed'))
  } finally {
    templateSubmitting.value = false
  }
}

/** Creates a new template from the current HTML and optional JSON source. */
async function saveAsNewTemplate(values: TemplateFormValues) {
  if (!metadata.value || saveAsSubmitting.value) return
  if (hasJsonDataSource.value && !jsonValidation.value.valid) {
    MessagePlugin.error(jsonStatusText.value)
    return
  }

  const templateHtml = richTextEditorRef.value?.getTemplateHtml() ?? html.value
  html.value = templateHtml
  const htmlFile = new File([templateHtml], metadata.value.htmlFileName, { type: 'text/html;charset=utf-8' })
  const jsonFile = hasJsonDataSource.value
    ? new File([json.value], jsonFileName.value, { type: 'application/json' })
    : undefined
  saveAsSubmitting.value = true
  try {
    const created = await apiCreateTemplateApi({
      name: values.name,
      description: values.description,
      htmlFile,
      jsonFile,
    })
    metadata.value = created
    savedHtml.value = templateHtml
    savedJson.value = json.value
    jsonFileName.value = created.jsonFileName ?? ''
    savedJsonFileName.value = created.jsonFileName ?? ''
    saveAsDialogVisible.value = false
    MessagePlugin.success(t('template.message.createSuccess'))
    await router.replace({ name: 'template-editor', params: { id: created.id } })
  } catch (error) {
    console.error(error)
    MessagePlugin.error(t('template.message.createFailed'))
  } finally {
    saveAsSubmitting.value = false
  }
}

/** Opens the new-template dialog from the save action menu. */
const selectSaveAction: DropdownProps['onClick'] = (option) => {
  if (option.value === 'save-changes') {
    void saveChanges()
    return
  }
  if (option.value === 'save-as-new') saveAsDialogVisible.value = true
}

/** Downloads the complete template archive. */
async function downloadTemplate() {
  if (!metadata.value) return
  try {
    const result = await apiDownloadTemplateApi(metadata.value.id)
    const url = URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch (error) {
    console.error(error)
    MessagePlugin.error(t('template.message.downloadFailed'))
  }
}

/** Maps documented ComPDF error codes to localized messages. */
function resolveGenerationErrorMessage(error: unknown): string {
  if (error instanceof GeneratePdfError) {
    const key = error.errorCode ? generationErrorMessageKeys[error.errorCode] : undefined
    return key ? t(key) : error.message || t('template.generationError.generic')
  }
  return t('template.generationError.generic')
}

/** Generates and downloads a PDF using the HTML and optional JSON data source. */
async function generatePdf() {
  if (!metadata.value || generating.value) return
  if (hasJsonDataSource.value && !jsonValidation.value.valid) {
    MessagePlugin.error(jsonStatusText.value)
    return
  }

  const templateHtml = richTextEditorRef.value?.getTemplateHtml() ?? html.value
  const templateFile = new File([templateHtml], metadata.value.htmlFileName, { type: 'text/html;charset=utf-8' })
  const dataFile = hasJsonDataSource.value
    ? new File([json.value], jsonFileName.value, { type: 'application/json' })
    : undefined
  generating.value = true
  try {
    const result = await apiGeneratePdfApi({
      request: {},
      templateFile,
      dataFile,
    })
    const url = URL.createObjectURL(result.blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  } catch (error) {
    console.error(error)
    MessagePlugin.error(resolveGenerationErrorMessage(error))
  } finally {
    generating.value = false
  }
}

/** Warns the browser when a refresh or tab close would discard edits. */
function confirmBrowserLeave(event: BeforeUnloadEvent) {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

/** Asks whether to save, discard, or continue editing before route navigation. */
function confirmRouteLeave(): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: boolean) => {
      if (settled) return
      settled = true
      resolve(value)
    }
    const dialog = DialogPlugin.confirm({
      theme: "warning",
      header: t('template.editor.unsavedTitle'),
      body: t('template.editor.unsavedBody'),
      confirmBtn: t('template.editor.yes'),
      cancelBtn: t('template.editor.no'),
      onConfirm: async () => {
        dialog.setConfirmLoading(true)
        const saved = await saveChanges()
        dialog.setConfirmLoading(false)
        if (saved) {
          dialog.destroy()
          finish(true)
        }
      },
      onCancel: () => {
        dialog.destroy()
        finish(true)
      },
      onClose: () => {
        dialog.destroy()
        finish(false)
      },
      onClosed: () => {
        dialog.destroy()
        finish(false)
      },
    })
  })
}

</script>

<template>
  <div class="editor-page">
    <AppHeader />

    <main class="editor-page__main">
      <t-loading :loading="loading" show-overlay>
        <section class="editor-panel">
          <t-breadcrumb class="editor-breadcrumb" :aria-label="t('template.editor.breadcrumbLabel')" :max-item-width="'200'">
            <t-breadcrumb-item class="editor-breadcrumb__link" @click="router.push('/')">
              {{ t('template.title') }}
            </t-breadcrumb-item>
            <t-breadcrumb-item>
              {{ t('template.header.editor') }}
            </t-breadcrumb-item>
          </t-breadcrumb>

          <div class="editor-toolbar">
            <div class="editor-toolbar__title">
              <TaskIcon size="18px" />
              <span>{{ t('template.editor.current') }}</span>
              <strong>{{ metadata?.name || '-' }}</strong>
              <button
                class="editor-toolbar__edit-button"
                type="button"
                :aria-label="t('template.action.edit')"
                :disabled="!metadata || templateSubmitting"
                @click="templateDialogVisible = true"
              >
                <Edit2Icon size="18px" />
              </button>
            </div>

            <div class="editor-toolbar__actions">
              <t-dropdown
                :options="saveOptions"
                placement="bottom-left"
                trigger="click"
                :min-column-width="180"
                @click="selectSaveAction"
              >
                <t-button
                  variant="outline"
                  theme="primary"
                  :loading="saving"
                  :disabled="loading || saveAsSubmitting"
                >
                  <template #icon><SaveIcon /></template>
                  <div class="editor-toolbar__save">
                    {{ t('template.form.save') }}
                    <ChevronDownIcon size="16px" />
                  </div>
                </t-button>
              </t-dropdown>
              <t-button
                variant="outline"
                theme="primary"
                :loading="generating"
                :disabled="loading || generating"
                @click="generatePdf"
              >
                <template #icon><FilePdfIcon /></template>
                {{ t('template.editor.exportPdf') }}
              </t-button>
              <t-button
                class="editor-toolbar__download"
                :disabled="loading"
                @click="downloadTemplate"
              >
                <template #icon><DownloadIcon /></template>
                {{ t('template.editor.download') }}
              </t-button>
            </div>
          </div>

          <t-steps class="editor-steps" readonly>
            <t-step-item
              v-for="step in 4"
              :key="step"
              status="process"
              :title="t(`template.editor.step${step}Title`)"
              :content="t(`template.editor.step${step}Description`)"
            />
          </t-steps>

          <div class="source-grid">
            <section class="source-card source-card--html">
              <RichTextEditor
                :key="templateId"
                ref="richTextEditorRef"
                v-model="html"
                class="source-card__rich-editor"
                height="auto"
                :source-id="templateId"
                :aria-label="t('template.editor.htmlTitle')"
                :placeholder="t('template.editor.htmlPlaceholder')"
              />
            </section>

            <JsonDataSourceEditor
              v-model="json"
              v-model:filename="jsonFileName"
              class="source-card source-card--json"
              @insert-placeholder="richTextEditorRef?.insertContent($event)"
              @insert-table-placeholder="richTextEditorRef?.insertTableDataRow($event.columns, $event.collectionPath)"
            />
          </div>
        </section>
      </t-loading>
    </main>

    <TemplateFormDialog
      v-model:visible="templateDialogVisible"
      :submitting="templateSubmitting"
      :template="metadata"
      @submit="updateTemplateMetadata"
    />
    <TemplateFormDialog
      v-model:visible="saveAsDialogVisible"
      :submitting="saveAsSubmitting"
      :template="null"
      @submit="saveAsNewTemplate"
    />
  </div>
</template>

<style scoped lang="less">
.editor-page {
  min-height: 100vh;
  background: var(--td-brand-color-light);
  color: var(--td-text-color-primary);
}

.editor-page__main {
  min-height: calc(100vh - 56px);
  padding: var(--td-size-8);
}

.editor-panel {
  display: flex;
  max-width: 2000px;
  margin: 0 auto;
  padding: var(--td-size-8);
  min-height: calc(100vh - 104px);
  flex-direction: column;
  gap: var(--td-size-8);
  padding: var(--td-size-10);
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-container);
}

.editor-breadcrumb,
.editor-toolbar,
.editor-toolbar__title,
.editor-toolbar__actions {
  display: flex;
  align-items: center;
}

.editor-breadcrumb {
  font: var(--td-font-body-medium);
}

.editor-breadcrumb__link {
  cursor: pointer;
}

.editor-toolbar {
  min-height: var(--td-size-12);
  justify-content: space-between;
  gap: var(--td-size-8);
}

.editor-toolbar__title {
  overflow: hidden;
  min-width: 0;
  gap: var(--td-size-4);
  padding: var(--td-size-4) var(--td-size-5);
  border-radius: var(--td-radius-medium);
  font: var(--td-font-title-medium);
  white-space: nowrap;
  strong{
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.editor-toolbar__edit-button {
  display: grid;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--td-text-color-placeholder);
  cursor: pointer;
  place-items: center;
}

.editor-toolbar__edit-button:disabled {
  color: var(--td-text-color-disabled);
  cursor: not-allowed;
}

.editor-toolbar__edit-button :deep(svg) {
  width: 18px;
  height: 18px;
}

.editor-toolbar__actions {
  flex: 0 0 auto;
  gap: var(--td-size-4);
}

.editor-toolbar__save {
  display: flex;
  align-items: center;
  gap: var(--td-size-2);
  font: var(--td-font-body-medium);
}

.editor-steps {
  gap: var(--td-size-6);
  padding: var(--td-size-8) var(--td-size-6);
  border-radius: var(--td-radius-large);
  background: var(--td-brand-color-light);
}

.editor-steps :deep(.t-steps-item) {
  min-width: 0;
  margin-right: 0;
}

.editor-steps :deep(.t-steps-item:last-child) {
  flex: 1;
}

.editor-steps :deep(.t-steps-item__inner) {
  width: 100%;
  padding: var(--td-size-4) 0;
}

.editor-steps :deep(.t-steps-item__icon) {
  flex: 0 0 var(--td-size-8);
  margin-right: var(--td-size-6);
}

.editor-steps :deep(.t-steps-item__icon--number) {
  box-sizing: border-box;
  width: var(--td-size-8);
  height: var(--td-size-8);
  border: 0;
  font: var(--td-font-title-medium);
}

.editor-steps :deep(.t-steps-item__content) {
  overflow: hidden;
  min-width: 0;
  flex: 1;
}

.editor-steps :deep(.t-steps-item__title) {
  max-width: calc(100% - var(--td-size-6));
  margin-bottom: var(--td-size-2);
  padding-right: var(--td-size-6);
  color: var(--td-brand-color);
  font: var(--td-font-title-medium);
  white-space: nowrap;
}

.editor-steps :deep(.t-steps-item:not(:last-child) .t-steps-item__title::after) {
  border-bottom-width: 2px;
  border-bottom-color: var(--td-gray-color-4);
}

.editor-steps :deep(.t-steps-item__description) {
  margin: 0;
  padding-right: var(--td-size-6);
  color: var(--td-text-color-secondary);
  font: var(--td-font-body-small);
}

.source-grid {
  display: grid;
  flex: 1;
  grid-template-columns: minmax(0, 3fr) minmax(320px, 2fr);
  gap: var(--td-size-6);
  min-height: 460px;
}

.source-card {
  display: flex;
  min-width: 0;
  flex-direction: column;
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-large);
  background: var(--td-bg-color-container);
  height: calc(100vh - 455px);
  min-height: 700px;
  overflow-y: auto;
}

.source-card__rich-editor {
  min-height: 0;
  flex: 1;
  border: 0;
  border-radius: 0;
}

@media (max-width: 1100px) {
  .editor-steps {
    overflow-x: auto;
  }

  .editor-steps :deep(.t-steps-item) {
    min-width: 260px;
  }

  .source-grid {
    grid-template-columns: 1fr;
  }

  .source-card {
    min-height: 420px;
  }
}
</style>
