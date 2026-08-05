import { createI18n } from 'vue-i18n'

import en from './lang/en'
import ja from './lang/ja'
import ko from './lang/ko'
import th from './lang/th'
import zhCn from './lang/zh-cn'
import zhTw from './lang/zh-tw'

export const LOCALE_STORAGE_KEY = 'compdf-generation-locale'

const supportedLocales = ['zh-CN', 'en', 'zh-TW', 'ja', 'ko', 'th'] as const

type SupportedLocale = (typeof supportedLocales)[number]

/** Checks whether a string is a supported locale identifier. */
function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale)
}

/** Maps a browser language identifier to a supported locale. */
function matchBrowserLanguage(value: string): SupportedLocale | null {
  const language = value.toLowerCase()

  if (
    language.startsWith('zh-hant') ||
    language.startsWith('zh-tw') ||
    language.startsWith('zh-hk') ||
    language.startsWith('zh-mo')
  ) {
    return 'zh-TW'
  }
  if (language.startsWith('zh')) return 'zh-CN'
  if (language.startsWith('ja')) return 'ja'
  if (language.startsWith('ko')) return 'ko'
  if (language.startsWith('th')) return 'th'
  if (language.startsWith('en')) return 'en'
  return null
}

/** Detects the initial locale from the browser language priority list. */
function detectBrowserLocale(): SupportedLocale {
  if (typeof navigator === 'undefined') return 'en'

  const languages = navigator.languages?.length ? navigator.languages : [navigator.language]
  for (const language of languages) {
    const matchedLocale = matchBrowserLanguage(language)
    if (matchedLocale) return matchedLocale
  }
  return 'en'
}

/** Resolves the saved locale, then browser locale, and finally English. */
function resolveInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'en'

  try {
    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (storedLocale && isSupportedLocale(storedLocale)) return storedLocale
  } catch {
    // Storage may be unavailable in privacy mode; browser language still works.
  }

  const detectedLocale = detectBrowserLocale()
  saveLocalePreference(detectedLocale)
  return detectedLocale
}

/** Persists the locale explicitly selected by the user. */
export function saveLocalePreference(locale: string) {
  if (typeof window === 'undefined' || !isSupportedLocale(locale)) return
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Keep the in-memory locale when persistent storage is unavailable.
  }
}

export const i18n = createI18n({
  legacy: false,
  locale: resolveInitialLocale(),
  fallbackLocale: 'en',
  messages: {
    'zh-CN': zhCn,
    'zh-TW': zhTw,
    en,
    ja,
    ko,
    th,
  },
})
