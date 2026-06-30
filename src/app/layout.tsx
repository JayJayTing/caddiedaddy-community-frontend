import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { UIProvider } from '@/contexts/UIContext'
import { NotificationsProvider } from '@/contexts/NotificationsContext'

export const metadata: Metadata = {
  title: 'Forely',
  description: '找到你的下一場球局，與球隊一起打球。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
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
