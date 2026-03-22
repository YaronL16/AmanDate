import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import heCommon from './locales/he/common.json'
import enCommon from './locales/en/common.json'

const LANGUAGE_STORAGE_KEY = 'amandate.language'

function getInitialLanguage(): string {
  if (typeof window === 'undefined') return 'he'
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
  if (stored === 'en' || stored === 'he') return stored
  return 'he'
}

i18n.use(initReactI18next).init({
  resources: {
    he: { common: heCommon },
    en: { common: enCommon },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  supportedLngs: ['he', 'en'],
  nonExplicitSupportedLngs: true,
  defaultNS: 'common',
  ns: ['common'],
  react: { useSuspense: false },
  interpolation: { escapeValue: false },
})

function applyDirection() {
  const dir = i18n.dir(i18n.language)
  document.documentElement.dir = dir
  document.documentElement.lang = i18n.language
}

applyDirection()
i18n.on('languageChanged', applyDirection)

export { LANGUAGE_STORAGE_KEY }
export default i18n
