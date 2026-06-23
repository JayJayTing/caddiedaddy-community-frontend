'use client'
import { createContext, useContext, useState, ReactNode } from 'react'
import { translations, Language, TranslationKey } from '@/lib/translations'

interface LanguageContextType {
  lang: Language
  t: (key: TranslationKey) => string
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('caddie_lang') as Language
      if (saved === 'en' || saved === 'zh') return saved
    }
    return 'en'
  })

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
