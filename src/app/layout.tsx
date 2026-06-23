import type { Metadata } from 'next'
import { Fraunces, Manrope } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { UIProvider } from '@/contexts/UIContext'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})
const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'CaddieDaddy Community',
  description: 'Find your next round. Play with your community.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        <LanguageProvider>
          <AuthProvider>
            <UIProvider>
              {children}
            </UIProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
