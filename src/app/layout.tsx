import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { UIProvider } from '@/contexts/UIContext'
import { NotificationsProvider } from '@/contexts/NotificationsContext'

export const metadata: Metadata = {
  title: 'Forely',
  description: '找齊第四人，開場球局，和你的球友一起打球。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        {/* Forely type pairing — Sora (display) + Plus Jakarta Sans (body).
            Loaded here so the CSS custom properties in variables.css resolve. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <LanguageProvider>
          <AuthProvider>
            <UIProvider>
              <NotificationsProvider>
                {children}
              </NotificationsProvider>
            </UIProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
