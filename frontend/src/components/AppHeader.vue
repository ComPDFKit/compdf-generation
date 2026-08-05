<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DropdownProps } from 'tdesign-vue-next'
import { InternetIcon } from 'tdesign-icons-vue-next'

import ComPdfLogo from '@/assets/images/icons/logo.svg?component'
import { saveLocalePreference } from '@/locales'

const { locale, t } = useI18n()

const languageLabels: Record<string, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  ko: '한국어',
  ja: '日本語',
  th: 'ไทย',
}

const languageLabel = computed(() => languageLabels[locale.value] || 'En')
const languageOptions = computed<DropdownProps['options']>(() => [
  { content: t('template.language.en'), value: 'en', active: locale.value === 'en' },
  { content: t('template.language.zhCn'), value: 'zh-CN', active: locale.value === 'zh-CN' },
  { content: t('template.language.zhTw'), value: 'zh-TW', active: locale.value === 'zh-TW' },
  { content: t('template.language.ko'), value: 'ko', active: locale.value === 'ko' },
  { content: t('template.language.ja'), value: 'ja', active: locale.value === 'ja' },
  { content: t('template.language.th'), value: 'th', active: locale.value === 'th' },
])

watch(
  locale,
  (value) => {
    document.documentElement.lang = value
  },
  { immediate: true },
)

/** Switches the active locale and persists the user's selection. */
const selectLanguage: DropdownProps['onClick'] = (option) => {
  if (typeof option.value !== 'string') return
  locale.value = option.value
  saveLocalePreference(option.value)
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__brand">
      <ComPdfLogo class="app-header__logo" aria-label="ComPDF" />
      <span class="app-header__title">{{ t('template.header.title') }}</span>
    </div>

    <div class="app-header__actions">
      <t-dropdown
        :options="languageOptions"
        placement="bottom-right"
        trigger="click"
        :min-column-width="140"
        @click="selectLanguage"
      >
        <button
          class="app-header__language"
          type="button"
          :aria-label="t('template.header.switchLanguage')"
        >
          <InternetIcon />
          <span>{{ languageLabel }}</span>
        </button>
      </t-dropdown>
    </div>
  </header>
</template>

<style scoped lang="less">
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 56px;
  padding: 0 var(--td-size-8);
  background: var(--td-bg-color-container);
  color: var(--td-text-color-primary);
}

.app-header__brand,
.app-header__actions,
.app-header__nav,
.app-header__nav-item,
.app-header__language {
  display: flex;
  align-items: center;
}

.app-header__brand {
  min-width: 0;
  gap: var(--td-size-4);
}

.app-header__logo {
  flex: 0 0 160px;
  width: 160px;
  height: 56px;
}

.app-header__title {
  overflow: hidden;
  font: var(--td-font-body-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.app-header__actions {
  flex-shrink: 0;
  gap: var(--td-size-6);
  height: 100%;
}


.app-header__nav {
  gap: var(--td-size-2);
  padding: var(--td-size-2);
  border: 1px solid var(--td-brand-color-focus);
  border-radius: var(--td-radius-default);
  background: var(--td-brand-color-light);
}

.app-header__nav-item,
.app-header__language {
  gap: var(--td-size-4);
  border: 0;
  color: var(--td-text-color-primary);
  font: var(--td-font-body-medium);
  white-space: nowrap;
}

.app-header__nav-item {
  height: 28px;
  padding: 0 var(--td-size-6);
  border-radius: var(--td-radius-default);
  background: transparent;
}

.app-header__nav-item--active {
  background: var(--td-bg-color-container);
  color: var(--td-brand-color);
}

.app-header__nav-item :deep(svg),
.app-header__language :deep(svg) {
  width: 16px;
  height: 16px;
}

.app-header__language {
  height: 32px;
  padding: 0 var(--td-size-3);
  background: transparent;
}

.app-header__language :deep(svg) {
  width: 20px;
  height: 20px;
}
</style>
