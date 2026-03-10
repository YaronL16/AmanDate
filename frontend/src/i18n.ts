import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import heCommon from './locales/he/common.json'
import enCommon from './locales/en/common.json'

i18n.use(initReactI18next).init({
  resources: {
    he: { common: heCommon },
    en: { common: enCommon },
  },
  lng: 'he',
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

function applyDirection() {
  const dir = i18n.dir(i18n.language)
  document.documentElement.dir = dir
  document.documentElement.lang = i18n.language
}

applyDirection()
i18n.on('languageChanged', applyDirection)

export default i18n
