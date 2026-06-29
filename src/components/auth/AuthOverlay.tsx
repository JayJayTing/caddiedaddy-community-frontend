'use client'
import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { WelcomeStep } from './WelcomeStep'
import { MethodStep, AuthMethod } from './MethodStep'
import { PhoneStep } from './PhoneStep'
import { OtpStep } from './OtpStep'
import { EmailStep } from './EmailStep'

type Step = 'welcome' | 'method' | 'phone' | 'otp' | 'email'

interface Props {
  onComplete: () => void
}

export function AuthOverlay({ onComplete }: Props) {
  const { sendOtp, verifyOtp, loginWithEmail, signupWithEmail, getGoogleUrl } = useAuth()
  const { t } = useLang()
  const [step, setStep] = useState<Step>('welcome')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [visible, setVisible] = useState(true)

  const finish = useCallback(() => {
    setVisible(false)
    setTimeout(onComplete, 350)
  }, [onComplete])

  const handleMethodSelect = useCallback(async (method: AuthMethod) => {
    setError(undefined)
    if (method === 'phone') {
      setStep('phone')
    } else if (method === 'email') {
      setStep('email')
    } else if (method === 'google') {
      try {
        setIsLoading(true)
        const url = await getGoogleUrl()
        window.location.href = url
      } catch {
        setError(t('auth.error.googleUnavailable'))
      } finally {
        setIsLoading(false)
      }
    } else if (method === 'apple') {
      setError(t('auth.error.appleSoon'))
    }
  }, [getGoogleUrl, t])

  const handleSendCode = useCallback(async (fullPhone: string) => {
    setError(undefined)
    setIsLoading(true)
    try {
      await sendOtp(fullPhone)
      setPhone(fullPhone)
      setStep('otp')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.error.sendCodeFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [sendOtp, t])

  const handleVerifyOtp = useCallback(async (otp: string) => {
    setError(undefined)
    setIsLoading(true)
    try {
      await verifyOtp(phone, otp)
      finish()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.error.invalidCode'))
    } finally {
      setIsLoading(false)
    }
  }, [phone, verifyOtp, finish, t])

  const handleResend = useCallback(async () => {
    setError(undefined)
    try {
      await sendOtp(phone)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.error.resendFailed'))
    }
  }, [phone, sendOtp, t])

  const handleLogin = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    setError(undefined)
    setIsLoading(true)
    try {
      await loginWithEmail(email, password, rememberMe)
      finish()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.error.signInFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [loginWithEmail, finish, t])

  const handleSignup = useCallback(async (email: string, password: string, displayName: string) => {
    setError(undefined)
    setIsLoading(true)
    try {
      await signupWithEmail(email, password, displayName)
      finish()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.error.signUpFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [signupWithEmail, finish, t])

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 200, overflow: 'hidden',
      opacity: visible ? 1 : 0,
      transition: 'opacity .3s ease',
      pointerEvents: visible ? 'all' : 'none',
    }}>
      {step === 'welcome' && (
        <WelcomeStep
          onNext={() => { setError(undefined); setStep('method') }}
          onSignIn={() => { setError(undefined); setStep('method') }}
        />
      )}
      {step === 'method' && (
        <MethodStep
          onBack={() => setStep('welcome')}
          onSelect={handleMethodSelect}
        />
      )}
      {step === 'phone' && (
        <PhoneStep
          onBack={() => setStep('method')}
          onSendCode={handleSendCode}
          onUseEmail={() => { setError(undefined); setStep('email') }}
          isLoading={isLoading}
          error={error}
        />
      )}
      {step === 'otp' && (
        <OtpStep
          onBack={() => setStep('phone')}
          onVerify={handleVerifyOtp}
          onResend={handleResend}
          phone={phone}
          isLoading={isLoading}
          error={error}
        />
      )}
      {step === 'email' && (
        <EmailStep
          onBack={() => setStep('method')}
          onLogin={handleLogin}
          onSignup={handleSignup}
          isLoading={isLoading}
          error={error}
        />
      )}
    </div>
  )
}
