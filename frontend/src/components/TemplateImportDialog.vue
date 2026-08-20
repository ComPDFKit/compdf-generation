<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CloseCircleFilledIcon,
  UploadIcon,
} from 'tdesign-icons-vue-next'
import UploadLogo from '@/assets/images/icons/upload.svg?component'
import SupportLogo from '@/assets/images/icons/support.svg?component'

const props = defineProps<{
  visible: boolean
  importing?: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'confirm': [files: File[]]
}>()

const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
const selectedFiles = ref<File[]>([])

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => {
    if (!value && props.importing) return
    emit('update:visible', value)
  },
})

watch(
  () => props.visible,
  (visible) => {
    if (!visible) resetDialog()
  },
)

/** Closes the dialog and clears its temporary file selection. */
function closeDialog() {
  if (props.importing) return
  resetDialog()
  dialogVisible.value = false
}

/** Resets local upload state before opening or after closing the dialog. */
function resetDialog() {
  dragging.value = false
  selectedFiles.value = []
}

/** Checks whether a file uses one of the supported batch-import extensions. */
function isSupportedFile(file: File): boolean {
  return /\.(zip|dito)$/i.test(file.name)
}

/** Adds supported files while skipping duplicates and unsupported extensions. */
function addFiles(files: FileList | File[] | null) {
  if (!files?.length) return

  const incoming = Array.from(files)
  const validFiles = incoming.filter(isSupportedFile)
  const hasInvalidFiles = incoming.length !== validFiles.length
  const existingKeys = new Set(selectedFiles.value.map(file => `${file.name}-${file.size}`))
  const newFiles = validFiles.filter(file => !existingKeys.has(`${file.name}-${file.size}`))

  if (newFiles.length) selectedFiles.value = [...selectedFiles.value, ...newFiles]
  if (hasInvalidFiles) MessagePlugin.error(t('template.import.invalidFile'))
}

/** Forwards files selected through the native file picker. */
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  addFiles(input.files)
  input.value = ''
}

/** Stops drag styling and forwards dropped files. */
function handleDrop(event: DragEvent) {
  dragging.value = false
  addFiles(event.dataTransfer?.files ?? null)
}

/** Removes one file from the uncommitted import selection. */
function removeFile(index: number) {
  selectedFiles.value.splice(index, 1)
}

/** Emits the selected files after confirming there is at least one. */
function handleConfirm() {
  if (props.importing) return
  if (!selectedFiles.value.length) {
    MessagePlugin.error(t('template.import.noFile'))
    return
  }
  emit('confirm', selectedFiles.value.slice())
}
</script>

<template>
  <t-dialog
    v-model:visible="dialogVisible"
    dialog-class-name="template-import-dialog"
    placement="center"
    :width="600"
    :header="t('template.import.title')"
    :cancel-btn="t('template.form.cancel')"
    :confirm-btn="{
      content: t('template.editor.importData'),
      disabled: selectedFiles.length === 0,
    }"
    :confirm-loading="importing"
    :close-on-overlay-click="!importing"
    :close-on-esc-keydown="!importing"
    @cancel="closeDialog"
    @close="closeDialog"
    @confirm="handleConfirm"
  >
    <div class="template-import-dialog__notice">
      <SupportLogo />
      <span>{{ t('template.import.description') }}</span>
    </div>

    <div
      class="template-import-dialog__dropzone"
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
      <div class="template-import-dialog__dropzone-content">
        <t-button variant="outline" theme="primary" tabindex="-1" @click="fileInput?.click()">
          <template #icon>
            <UploadIcon />
          </template>
          {{ t('template.editor.selectFiles') }}
        </t-button>
        <span>{{ t('template.editor.or') }}</span>
        <strong>{{ t('template.editor.dragDropFiles') }}</strong>
        <input
          ref="fileInput"
          class="visually-hidden"
          type="file"
          accept=".zip,.dito"
          multiple
          @change="handleFileChange"
        >
      </div>

      <div v-if="selectedFiles.length" class="template-import-dialog__selected-files">
        <div
          v-for="(file, index) in selectedFiles"
          :key="`${file.name}-${file.size}-${index}`"
          class="template-import-dialog__selected-file"
        >
          <UploadLogo />
          <span>{{ file.name }}</span>
          <button
            type="button"
            :aria-label="t('template.import.removeFile')"
            @click.stop="removeFile(index)"
          >
            <CloseCircleFilledIcon />
          </button>
        </div>
      </div>
    </div>

    <p class="template-import-dialog__upload-hint">
      {{ t('template.import.localOnly') }}
    </p>
  </t-dialog>
</template>

<style scoped lang="less">
:global(.template-import-dialog.t-dialog) {
  overflow: hidden;
  padding: 0;
  border-radius: 9px;
}

:global(.template-import-dialog .t-dialog__header) {
  min-height: 24px;
  padding: 32px 32px 0;
  border: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
}

:global(.template-import-dialog .t-dialog__close) {
  top: 34px;
  right: 32px;
}

:global(.template-import-dialog .t-dialog__body) {
  padding: 12px 32px 0;
}

:global(.template-import-dialog .t-dialog__footer) {
  min-height: 32px;
  padding: 12px 32px 32px;
  border: 0;
}

:global(.template-import-dialog .t-dialog__footer .t-button) {
  height: 32px;
  padding: 0 16px;
  border: 0;
  border-radius: 3px;
  font-size: 14px;
}

:global(.template-import-dialog .t-dialog__cancel) {
  background: var(--td-gray-color-3);
  color: var(--td-text-color-primary);
}

.template-import-dialog__notice {
  display: flex;
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

.template-import-dialog__notice svg {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  padding: 2px;
}

.template-import-dialog__dropzone {
  display: flex;
  min-height: 252px;
  align-items: stretch;
  flex-direction: column;
  gap: 4px;
  margin-top: 12px;
  padding: 16px;
  border: 1px dashed var(--td-brand-color-5);
  border-radius: var(--td-radius-medium);
  background: var(--td-bg-color-container);
  cursor: pointer;
  text-align: center;
  transition: border-color .2s, background-color .2s;
}

.template-import-dialog__dropzone-content {
  display: flex;
  min-height: 0;
  flex: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2px;
  border-radius: 2px;
  flex-shrink: 0;
}

.template-import-dialog__dropzone:hover,
.template-import-dialog__dropzone:focus-visible,
.template-import-dialog__dropzone.is-dragging {
  border-color: var(--td-brand-color);
  outline: 0;
  background: var(--td-brand-color-light);
}

.template-import-dialog__dropzone-content :deep(.t-button) {
  height: 32px;
  margin-bottom: 0;
  padding: 0 16px;
  border-radius: 3px;
  font-size: 14px;
  flex-shrink: 0;
}

.template-import-dialog__dropzone-content strong {
  color: var(--td-text-color-secondary);
  font-size: 14px;
  font-weight: 400;
  line-height: 22px;
}

.template-import-dialog__dropzone-content > span {
  color: var(--td-text-color-secondary);
  font-size: 14px;
  line-height: 22px;
}

.template-import-dialog__selected-files {
  display: flex;
  overflow: auto;
  min-height: 0;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }
}

.template-import-dialog__selected-file {
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

.template-import-dialog__selected-file > svg,
.template-import-dialog__selected-file > button > svg {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
}

.template-import-dialog__selected-file > span {
  overflow: hidden;
  min-width: 0;
  flex: 1;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-import-dialog__selected-file > button {
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

.template-import-dialog__upload-hint {
  height: 20px;
  margin: 4px 0 0;
  color: var(--td-text-color-placeholder);
  font-size: 12px;
  line-height: 20px;
  text-align: center;
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
  :global(.template-import-dialog.t-dialog) {
    width: calc(100vw - 32px) !important;
  }

  :global(.template-import-dialog .t-dialog__header),
  :global(.template-import-dialog .t-dialog__body),
  :global(.template-import-dialog .t-dialog__footer) {
    padding-right: var(--td-size-6);
    padding-left: var(--td-size-6);
  }
}
</style>
