<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  AddIcon,
  ArrowRightUpIcon,
  DeleteIcon,
  DownloadIcon,
  Edit2Icon,
  File1Icon,
  SearchIcon,
  TagIcon,
} from 'tdesign-icons-vue-next'

import {
  apiCreateTemplateApi,
  apiDeleteTemplateApi,
  apiDownloadTemplateApi,
  apiSearchTemplatesApi,
  apiUpdateTemplateApi,
} from '@/api'
import type { TemplateRecord } from '@/api/model'
import AppHeader from '@/components/AppHeader.vue'
import TemplateFormDialog from '@/components/TemplateFormDialog.vue'
import type { TemplateFormValues } from '@/components/TemplateFormDialog.vue'

const { t } = useI18n()
const router = useRouter()
const keyword = ref('')
const templates = ref<TemplateRecord[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const submitting = ref(false)
const editingTemplate = ref<TemplateRecord | null>(null)
let searchTimer: ReturnType<typeof setTimeout> | undefined
let searchRequestId = 0

onMounted(loadTemplates)

watch(keyword, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(loadTemplates, 300)
})

onBeforeUnmount(() => {
  if (searchTimer) clearTimeout(searchTimer)
})

/** Loads templates for the current keyword and ignores stale responses. */
async function loadTemplates() {
  const requestId = ++searchRequestId
  loading.value = true
  try {
    const result = await apiSearchTemplatesApi(keyword.value.trim())
    if (requestId === searchRequestId) templates.value = result.items
  } catch (error) {
    console.error(error)
    if (requestId === searchRequestId) MessagePlugin.error(t('template.message.loadFailed'))
  } finally {
    if (requestId === searchRequestId) loading.value = false
  }
}

/** Opens the create dialog and clears the current editing record. */
function openCreateDialog() {
  editingTemplate.value = null
  dialogVisible.value = true
}

/** Opens the edit dialog and pre-fills the selected template. */
function openEditDialog(template: TemplateRecord) {
  editingTemplate.value = template
  dialogVisible.value = true
}

/** Opens the template editor for the selected template. */
function openTemplateEditor(template: TemplateRecord) {
  void router.push({ name: 'template-editor', params: { id: template.id } })
}

/** Creates a template and opens its editor, or updates existing template metadata. */
async function submitTemplate(values: TemplateFormValues) {
  submitting.value = true
  try {
    if (editingTemplate.value) {
      await apiUpdateTemplateApi({
        id: editingTemplate.value.id,
        ...values,
      })
      MessagePlugin.success(t('template.message.updateSuccess'))
    } else {
      const htmlFile = new File(
        ['<!doctype html>\n<html><head><meta charset="UTF-8"></head><body></body></html>\n'],
        'template.html',
        { type: 'text/html;charset=utf-8' },
      )
      const template = await apiCreateTemplateApi({ ...values, htmlFile })
      MessagePlugin.success(t('template.message.createSuccess'))
      dialogVisible.value = false
      await router.push({ name: 'template-editor', params: { id: template.id } })
      return
    }
    dialogVisible.value = false
    await loadTemplates()
  } catch (error) {
    console.error(error)
    MessagePlugin.error(t(editingTemplate.value
      ? 'template.message.updateFailed'
      : 'template.message.createFailed'))
  } finally {
    submitting.value = false
  }
}

/** Downloads a template ZIP and triggers a browser file save. */
async function downloadTemplate(template: TemplateRecord) {
  try {
    const result = await apiDownloadTemplateApi(template.id)
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

/** Opens a confirmation dialog and deletes the template when confirmed. */
function confirmDeleteTemplate(template: TemplateRecord) {
  const dialog = DialogPlugin.confirm({
    header: t('template.delete.title'),
    body: t('template.delete.confirm', { name: template.name }),
    confirmBtn: t('template.action.delete'),
    cancelBtn: t('template.form.cancel'),
    theme: 'warning',
    onConfirm: async () => {
      dialog.setConfirmLoading(true)
      try {
        await apiDeleteTemplateApi(template.id)
        MessagePlugin.success(t('template.message.deleteSuccess'))
        dialog.destroy()
        await loadTemplates()
      } catch (error) {
        console.error(error)
        MessagePlugin.error(t('template.message.deleteFailed'))
        dialog.setConfirmLoading(false)
      }
    },
    onClosed: () => dialog.destroy(),
  })
}

</script>

<template>
  <div class="template-page">
    <AppHeader />

    <main class="template-page__main">
      <section class="template-panel">
        <div class="template-panel__heading">
          <h1>{{ t('template.title') }}</h1>

          <div class="template-panel__toolbar">
            <t-input
              v-model="keyword"
              class="template-search"
              clearable
              :placeholder="t('template.searchPlaceholder')"
            >
              <template #prefix-icon>
                <SearchIcon />
              </template>
            </t-input>

            <div class="template-panel__summary">
              <div class="template-count">
                <span>{{ t('template.countLabel') }}</span>
                <strong>{{ t('template.count', { count: templates.length }) }}</strong>
              </div>
              <t-button class="new-template-button" size="large" @click="openCreateDialog">
                <template #icon>
                  <AddIcon />
                </template>
                {{ t('template.new') }}
              </t-button>
            </div>
          </div>
        </div>

        <div class="template-panel__divider" />

        <t-loading :loading="loading" show-overlay>
          <div class="template-grid">

            <article v-for="item in templates" :key="item.id" class="template-card">
              <div class="template-card__body">
                <div class="template-card__top">
                  <span class="template-card__icon"><File1Icon /></span>
                  <t-tag theme="success" variant="light" size="small">
                    {{ t('template.card.type') }}
                  </t-tag>
                </div>

                <div class="template-card__copy">
                  <h2>{{ item.name }}</h2>
                  <p>{{ item.description }}</p>
                </div>

                <div class="template-card__separator" />

                <div class="template-card__fields">
                  <TagIcon />
                  <span>{{ t('template.card.fields', { count: item.jsonFieldCount }) }}</span>
                </div>
              </div>

              <footer class="template-card__footer">
                <div class="template-card__tools">
                  <t-tooltip :content="t('template.action.download')">
                    <button type="button" :aria-label="t('template.action.download')" @click="downloadTemplate(item)">
                      <DownloadIcon />
                    </button>
                  </t-tooltip>
                  <t-tooltip :content="t('template.action.edit')">
                    <button type="button" :aria-label="t('template.action.edit')" @click="openEditDialog(item)">
                      <Edit2Icon />
                    </button>
                  </t-tooltip>
                  <t-tooltip :content="t('template.action.delete')">
                    <button type="button" :aria-label="t('template.action.delete')" @click="confirmDeleteTemplate(item)">
                      <DeleteIcon />
                    </button>
                  </t-tooltip>
                </div>

                <t-button class="edit-template-button" theme="default" @click="openTemplateEditor(item)">
                  {{ t('template.design') }}
                  <template #suffix>
                    <ArrowRightUpIcon />
                  </template>
                </t-button>
              </footer>
            </article>

            <button class="create-card" type="button" @click="openCreateDialog">
              <span class="create-card__icon"><AddIcon /></span>
              <span class="create-card__copy">
                <strong>{{ t('template.create.title') }}</strong>
                <span>{{ t('template.create.description') }}</span>
              </span>
            </button>
          </div>
        </t-loading>
      </section>
    </main>

    <TemplateFormDialog
      v-model:visible="dialogVisible"
      :submitting="submitting"
      :template="editingTemplate"
      @submit="submitTemplate"
    />
  </div>
</template>

<style scoped lang="less">
.template-page {
  min-height: 100vh;
  background: var(--td-brand-color-light);
  color: var(--td-text-color-primary);
}

.template-page__main {
  min-height: calc(100vh - 56px);
  padding: var(--td-size-8);
}

.template-panel {
  min-height: calc(100vh - 104px);
  max-width: 2000px;
  margin: 0 auto;
  padding: var(--td-size-10);
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-container);
}

.template-panel__heading {
  display: flex;
  flex-direction: column;
  gap: var(--td-size-8);
}

.template-panel__heading h1 {
  font: var(--td-font-title-large);
}

.template-panel__toolbar,
.template-panel__summary,
.template-count,
.template-card__top,
.template-card__fields,
.template-card__footer,
.template-card__tools {
  display: flex;
  align-items: center;
}

.template-panel__toolbar {
  justify-content: space-between;
  gap: var(--td-size-8);
}

.template-search {
  width: 600px;
}

.template-search :deep(.t-input) {
  height: 32px;
  border-color: var(--td-component-border);
  border-radius: var(--td-radius-default);
}

.template-panel__summary {
  flex-shrink: 0;
  gap: var(--td-size-8);
}

.template-count {
  gap: var(--td-size-6);
  color: var(--td-text-color-secondary);
  font: var(--td-font-title-small);
}

.template-count strong {
  height: 30px;
  padding: 3px var(--td-size-5);
  border-radius: var(--td-radius-medium);
  background: var(--td-brand-color-light);
  color: var(--td-brand-color);
  font: var(--td-font-body-large);
}

:deep(.new-template-button.t-button) {
  height: 40px;
  padding: 0 var(--td-size-8);
  border-radius: var(--td-radius-medium);
}

.template-panel__divider {
  width: 100%;
  height: 1px;
  margin: var(--td-size-8) 0;
  background: var(--td-component-stroke);
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--td-size-8);
  min-height: 300px;
}

.template-card,
.create-card {
  overflow: hidden;
  min-width: 0;
  border: 1px solid var(--td-component-border);
  border-radius: var(--td-radius-large);
  background: var(--td-bg-color-container);
}

.template-card {
  position: relative;
}

.template-card::before {
  position: absolute;
  z-index: 1;
  top: -1px;
  left: -1px;
  width: calc(100% + 2px);
  height: var(--td-size-2);
  border-radius: var(--td-radius-medium);
  background: var(--td-brand-color);
  content: '';
}

.template-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--td-size-6);
  padding: var(--td-size-8);
}

.template-card__top,
.template-card__footer {
  justify-content: space-between;
}

.template-card__top {
  height: 42px;
}

.template-card__icon {
  display: grid;
  width: 42px;
  height: 42px;
  border: 1px solid var(--td-brand-color-focus);
  border-radius: var(--td-radius-large);
  background: var(--td-brand-color-light);
  color: var(--td-brand-color);
  place-items: center;
}

.template-card__icon :deep(svg) {
  width: var(--td-size-7);
  height: var(--td-size-7);
}

.template-card :deep(.t-tag) {
  color: var(--td-success-color);
}

.template-card__copy {
  display: flex;
  flex-direction: column;
  gap: var(--td-size-4);
  min-width: 0;
}

.template-card__copy h2 {
  overflow: hidden;
  color: var(--td-text-color-primary);
  font: var(--td-font-title-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-card__copy p {
  display: -webkit-box;
  overflow: hidden;
  min-height: 44px;
  color: var(--td-text-color-secondary);
  font: var(--td-font-body-medium);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.template-card__separator {
  height: 1px;
  background: var(--td-component-stroke);
}

.template-card__fields {
  gap: var(--td-size-4);
  height: 22px;
  color: var(--td-text-color-placeholder);
  font: var(--td-font-body-medium);
  white-space: nowrap;
}

.template-card__fields :deep(svg) {
  width: 16px;
  height: 16px;
}

.template-card__size {
  overflow: hidden;
  margin-left: auto;
  text-overflow: ellipsis;
}

.template-card__footer {
  padding: var(--td-size-6) var(--td-size-8);
  background: var(--td-brand-color-light);
}

.template-card__tools {
  gap: var(--td-size-8);
}

.template-card__tools button {
  display: grid;
  width: 16px;
  height: 22px;
  border: 0;
  background: transparent;
  color: var(--td-text-color-primary);
  place-items: center;
}

.template-card__tools button :deep(svg) {
  width: 16px;
  height: 16px;
}

:deep(.edit-template-button.t-button) {
  height: 32px;
  padding: 0 var(--td-size-6);
  border-color: var(--td-text-color-primary);
  border-radius: var(--td-radius-default);
  background: var(--td-text-color-primary);
  color: var(--td-text-color-anti);
  &:hover {
    background: var(--td-text-color-secondary);
  }
}

.create-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--td-size-8);
  min-height: 300px;
  padding: var(--td-size-8);
  border-color: var(--td-brand-color-focus);
  color: var(--td-text-color-primary);
}

.create-card__icon {
  display: grid;
  width: 60px;
  height: 60px;
  border-radius: var(--td-radius-large);
  background: var(--td-brand-color-light);
  color: var(--td-brand-color);
  place-items: center;
}

.create-card__icon :deep(svg) {
  width: var(--td-size-8);
  height: var(--td-size-8);
}

.create-card__copy {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--td-size-3);
  max-width: 340px;
  text-align: center;
}

.create-card__copy strong {
  font: var(--td-font-title-medium);
}

.create-card__copy span {
  color: var(--td-text-color-secondary);
  font: var(--td-font-body-medium);
}

@media (max-width: 1320px) {
  .template-search {
    width: 500px;
  }
}
</style>
