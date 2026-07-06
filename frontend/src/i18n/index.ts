import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ar from './locales/ar.json'

const STORAGE_KEY = 'urs-language'
const RTL_LANGUAGES = ['ar']

export const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
]

function applyDirection(lang: string) {
  const dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr'
  document.documentElement.dir = dir
  document.documentElement.lang = lang
}

const initialLanguage = localStorage.getItem(STORAGE_KEY) ?? 'ar'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: initialLanguage,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

applyDirection(initialLanguage)

i18n.on('languageChanged', (lang) => {
  localStorage.setItem(STORAGE_KEY, lang)
  applyDirection(lang)
})

export default i18n
