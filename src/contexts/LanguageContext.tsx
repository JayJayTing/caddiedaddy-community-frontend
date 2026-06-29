'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language, TranslationKey } from '@/lib/translations'
import { setFormatLang } from '@/lib/utils'

interface LanguageContextType {
  lang: Language
  t: (key: TranslationKey) => string
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to Chinese ('zh') so server and first client render match; adopt the
  // saved language after mount to avoid a hydration mismatch.
  const [lang, setLang] = useState<Language>('zh')

  useEffect(() => {
    const saved = localStorage.getItem('caddie_lang')
    if (saved === 'en' || saved === 'zh') setLang(saved)
  }, [])

  // Keep the non-React formatting helpers (utils.ts) in sync with the language.
  useEffect(() => { setFormatLang(lang) }, [lang])

  const t = (key: TranslationKey) => translations[lang][key] ?? key

  const toggleLang = () => {
    const next = lang === 'en' ? 'zh' : 'en'
    setLang(next)
    if (typeof window !== 'undefined') localStorage.setItem('caddie_lang', next)
  }

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used within LanguageProvider')
  return ctx
}
