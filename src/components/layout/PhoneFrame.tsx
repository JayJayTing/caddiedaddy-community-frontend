'use client'
import { useLang } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'
import { TranslationKey } from '@/lib/translations'

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { t, toggleLang } = useLang()
  const { user } = useAuth()
  return (
    <div className="phone-outer">
      {/* Pre-login only: once signed in, the toggle lives in Profile → Settings. */}
      {!user && (
        <button className="phone-lang-toggle" onClick={toggleLang}>
          {t('lang.toggle' as TranslationKey)}
        </button>
      )}
      <div className="phone">
        {children}
      </div>
    </div>
  )
}
