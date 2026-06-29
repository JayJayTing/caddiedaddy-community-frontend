'use client'
import { useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLang } from '@/contexts/LanguageContext'
import { WelcomeStep } from './WelcomeStep'
import { MethodStep, AuthMethod } from './MethodStep'
import { PhoneStep } from './PhoneStep'
import { OtpStep } from './OtpStep'
import { EmailStep } from './EmailStep'
import { ResetPasswordStep } from './ResetPasswordStep'
import { ApiError } from '@/lib/api'

type Step = 'welcome' | 'method' | 'phone' | 'otp' | 'email' | 'email-otp' | 'reset-otp' | 'reset-password'

interface Props {
  onComplete: () => void
}

export function AuthOverlay({ onComplete }: Props) {
  const { sendOtp, verifyOtp, loginWithEmail, signupWithEmail, loginWithProvider, loginWithLine, verifyEmailOtp, resendEmailOtp, forgotPassword, updatePassword } = useAuth()
  const { t } = useLang()
  const [step, setStep] = useState<Step>('welcome')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
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
    } else if (method === 'google' || method === 'apple') {
      try {
        setIsLoading(true)
        await loginWithProvider(method) // redirects the browser to the provider
      } catch {
        setError(method === 'google' ? t('auth.error.googleUnavailable') : t('auth.error.appleUnavailable'))
        setIsLoading(false)
      }
    } else if (method === 'line') {
      try {
        setIsLoading(true)
        await loginWithLine() // redirects the browser to LINE
      } catch {
        setError(t('auth.error.signInFailed'))
        setIsLoading(false)
      }
    }
  }, [loginWithProvider, loginWithLine, t])

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

  const handleLogin = useCallback(async (loginEmail: string, password: string, rememberMe?: boolean) => {
    setError(undefined)
    setIsLoading(true)
    try {
      await loginWithEmail(loginEmail, password, rememberMe)
      finish()
    } catch (e: unknown) {
      // Email not verified yet → route to the verification step and re-send a code.
      if (e instanceof ApiError && e.status === 403) {
        setEmail(loginEmail)
        setStep('email-otp')
        resendEmailOtp(loginEmail).catch(() => {})
      } else {
        setError(e instanceof Error ? e.message : t('auth.error.signInFailed'))
      }
    } finally {
      setIsLoading(false)
    }
  }, [loginWithEmail, resendEmailOtp, finish, t])

  const handleSignup = useCallback(async (signupEmail: string, password: string, displayName: string) => {
    setError(undefined)
    setIsLoading(true)
    try {
      const res = await signupWithEmail(signupEmail, password, displayName)
      if (res.pendingVerification) {
        // Email verification on → go enter the 6-digit code before the account is usable.
        setEmail(signupEmail)
        setStep('email-otp')
      } else {
        finish() // instant signup → logged in
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.error.signUpFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [signupWithEmail, finish, t])

  const handleVerifyEmail = useCallback(async (otp: string) => {
    setError(undefined)
    setIsLoading(true)
    try {
      await verifyEmailOtp(email, otp)
      finish()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.error.invalidCode'))
    } finally {
      setIsLoading(false)
    }
  }, [email, verifyEmailOtp, finish, t])

  const handleResendEmail = useCallback(async () => {
    setError(undefined)
    try {
      await resendEmailOtp(email)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.error.resendFailed'))
    }
  }, [email, resendEmailOtp, t])

  // ── Password reset ──
  const handleForgot = useCallback(async (forgotEmail: string) => {
    setError(undefined)
    if (!forgotEmail.includes('@')) { setError(t('auth.email.error')); return }
    setIsLoading(true)
    try {
      await forgotPassword(forgotEmail)
      setEmail(forgotEmail)
      setStep('reset-otp')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.error.sendCodeFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [forgotPassword, t])

  const handleVerifyReset = useCallback(async (otp: string) => {
    setError(undefined)
    setIsLoading(true)
    try {
      await verifyEmailOtp(email, otp) // verifying the code establishes a session
      setStep('reset-password')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.error.invalidCode'))
    } finally {
      setIsLoading(false)
    }
  }, [email, verifyEmailOtp, t])

  const handleSetNewPassword = useCallback(async (password: string) => {
    setError(undefined)
    setIsLoading(true)
    try {
      await updatePassword(password)
      finish()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('auth.error.signInFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [updatePassword, finish, t])

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
          destination={phone}
          channel="phone"
          isLoading={isLoading}
          error={error}
        />
      )}
      {step === 'email' && (
        <EmailStep
          onBack={() => setStep('method')}
          onLogin={handleLogin}
          onSignup={handleSignup}
          onForgot={handleForgot}
          isLoading={isLoading}
          error={error}
        />
      )}
      {step === 'email-otp' && (
        <OtpStep
          onBack={() => { setError(undefined); setStep('email') }}
          onVerify={handleVerifyEmail}
          onResend={handleResendEmail}
          destination={email}
          channel="email"
          isLoading={isLoading}
          error={error}
        />
      )}
      {step === 'reset-otp' && (
        <OtpStep
          onBack={() => { setError(undefined); setStep('email') }}
          onVerify={handleVerifyReset}
          onResend={handleResendEmail}
          destination={email}
          channel="email"
          isLoading={isLoading}
          error={error}
        />
      )}
      {step === 'reset-password' && (
        <ResetPasswordStep
          onBack={() => { setError(undefined); setStep('email') }}
          onSubmit={handleSetNewPassword}
          isLoading={isLoading}
          error={error}
        />
      )}
    </div>
  )
}
