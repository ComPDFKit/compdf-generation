<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { FormInstanceFunctions, FormProps } from 'tdesign-vue-next'

import { apiTemplateNameExistsApi } from '@/api'
import type { TemplateRecord } from '@/api/model'

export interface TemplateFormValues {
  name: string
  description: string
}

const props = defineProps<{
  visible: boolean
  submitting: boolean
  template?: TemplateRecord | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'submit': [value: TemplateFormValues]
}>()

const { t } = useI18n()
const formRef = ref<FormInstanceFunctions>()
const formData = reactive<TemplateFormValues>({
  name: '',
  description: '',
})
const checkingName = ref(false)

const dialogVisible = computed({
  get: () => props.visible,
  set: value => {
    if (!value && props.submitting) return
    emit('update:visible', value)
  },
})
const dialogTitle = computed(() => props.template ? t('template.edit') : t('template.form.title'))
const confirmText = computed(() => props.template ? t('template.form.save') : t('template.form.create'))
const formRules = computed<FormProps['rules']>(() => ({
  name: [
    { required: true, whitespace: true, message: t('template.form.nameRequired') },
  ],
}))

watch(
  () => [props.visible, props.template] as const,
  async ([visible, template]) => {
    if (!visible) return
    formData.name = template?.name || ''
    formData.description = template?.description || ''
    nextTick(()=>{
      setTimeout(() => {
        formRef.value?.clearValidate()
      }, 0);
    })
  },
)

/** Validates a new template name before emitting the form values. */
async function handleConfirm() {
  const result = await formRef.value?.validate()
  if (result !== true) return
  if (!props.template) {
    checkingName.value = true
    try {
      if (await apiTemplateNameExistsApi(formData.name.trim())) {
        MessagePlugin.error(t('template.form.nameExists'))
        return
      }
    } catch (error) {
      console.error(error)
      MessagePlugin.error(t('template.message.nameCheckFailed'))
      return
    } finally {
      checkingName.value = false
    }
  }
  emit('submit', {
    name: formData.name.trim(),
    description: formData.description.trim(),
  })
}

/** Closes the dialog only when a submission is not in progress. */
function handleClose() {
  if (!props.submitting) dialogVisible.value = false
}
</script>

<template>
  <t-dialog
    v-model:visible="dialogVisible"
    dialog-class-name="template-form-dialog"
    placement="center"
    :width="480"
    :header="dialogTitle"
    :cancel-btn="t('template.form.cancel')"
    :confirm-btn="confirmText"
    :confirm-loading="submitting || checkingName"
    :close-on-overlay-click="!submitting && !checkingName"
    :close-on-esc-keydown="!submitting && !checkingName"
    @cancel="handleClose"
    @close="handleClose"
    @confirm="handleConfirm"
  >
    <t-form
      ref="formRef"
      :data="formData"
      :rules="formRules"
      label-align="top"
      required-mark-position="right"
      :show-error-message="true"
    >
      <t-form-item :label="t('template.form.name')" name="name">
        <t-input
          v-model="formData.name"
          autofocus
          :maxlength="120"
          :placeholder="t('template.form.namePlaceholder')"
        />
      </t-form-item>
      <t-form-item :label="t('template.form.description')" name="description">
        <t-textarea
          v-model="formData.description"
          :autosize="{ minRows: 2, maxRows: 5 }"
          :placeholder="t('template.form.descriptionPlaceholder')"
        />
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<style scoped lang="less">
:global(.template-form-dialog.t-dialog) {
  overflow: hidden;
  padding: 0;
  border-radius: var(--td-radius-large);
}

:global(.template-form-dialog .t-dialog__header) {
  min-height: 72px;
  padding: var(--td-size-8) var(--td-size-10);
  border-bottom: 1px solid var(--td-component-stroke);
  font: var(--td-font-title-medium);
}

:global(.template-form-dialog .t-dialog__close) {
  right: var(--td-size-10);
}

:global(.template-form-dialog .t-dialog__body) {
  padding: var(--td-size-8) var(--td-size-10);
}

:global(.template-form-dialog .t-form__item) {
  margin-bottom: var(--td-size-8);
}

:global(.template-form-dialog .t-form__item:last-child) {
  margin-bottom: 0;
}

:global(.template-form-dialog .t-form__label) {
  padding-bottom: var(--td-size-4);
  color: var(--td-text-color-primary);
  font: var(--td-font-body-medium);
}

:global(.template-form-dialog .t-input),
:global(.template-form-dialog .t-textarea__inner) {
  border-color: var(--td-component-border);
  border-radius: var(--td-radius-default);
}

:global(.template-form-dialog .t-input) {
  height: 32px;
}

:global(.template-form-dialog .t-textarea__inner) {
  min-height: 62px;
  padding: var(--td-size-3) var(--td-size-4);
}

:global(.template-form-dialog .t-dialog__footer) {
  min-height: 72px;
  padding: var(--td-size-8) var(--td-size-10);
  border-top: 1px solid var(--td-component-stroke);
}

:global(.template-form-dialog .t-dialog__footer .t-button) {
  height: 32px;
  padding: 0 var(--td-size-6);
  border: 0;
  border-radius: var(--td-radius-default);
}

:global(.template-form-dialog .t-dialog__cancel) {
  background: var(--td-bg-color-component);
}
</style>
