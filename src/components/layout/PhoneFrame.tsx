'use client'
import { useLang } from '@/contexts/LanguageContext'
import { TranslationKey } from '@/lib/translations'

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { t, toggleLang } = useLang()
  return (
    <div className="phone-outer">
      <button className="phone-lang-toggle" onClick={toggleLang}>
        {t('lang.toggle' as TranslationKey)}
      </button>
      <div className="phone">
        {children}
      </div>
    </div>
  )
}
