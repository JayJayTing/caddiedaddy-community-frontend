'use client'
import { useEffect, useState } from 'react'
import { useUI } from '@/contexts/UIContext'
import { useLang } from '@/contexts/LanguageContext'
import { formatMoney, timeAgo } from '@/lib/utils'
import { ApiError } from '@/lib/api'
import { creditsApi, Wallet, CreditPackage, CreditEntryType } from '@/lib/credits'
import { TranslationKey } from '@/lib/translations'
import { Skeleton } from '@/components/ui/Skeleton'
import { BottomSheet } from './BottomSheet'

const ENTRY_ICON: Record<CreditEntryType, string> = {
  purchase: '＋',
  bonus: '🎁',
  booking_spend: '⛳',
  booking_refund: '↩',
  adjustment: '⚙',
}

const ENTRY_LABEL: Record<CreditEntryType, TranslationKey> = {
  purchase: 'wallet.entry.purchase',
  bonus: 'wallet.entry.bonus',
  booking_spend: 'wallet.entry.booking_spend',
  booking_refund: 'wallet.entry.booking_refund',
  adjustment: 'wallet.entry.adjustment',
}

export function WalletSheet() {
  const { openSheet, closeSheet, dataVersion, refreshData, showSuccess } = useUI()
  const { t } = useLang()
  const isOpen = openSheet === 'wallet'

  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [packages, setPackages] = useState<CreditPackage[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null) // packageId in flight
  const [error, setError] = useState<string | null>(null)

  // Load wallet; re-pull when credits change elsewhere (e.g. after a booking).
  useEffect(() => {
    if (!isOpen) return
    let stale = false
    creditsApi.getWallet().then((w) => { if (!stale) setWallet(w) }).catch(() => {})
    return () => { stale = true }
  }, [isOpen, dataVersion.credits])

  // Load packages once per open.
  useEffect(() => {
    if (!isOpen) return
    let stale = false
    creditsApi.getPackages().then((p) => { if (!stale) setPackages(p) }).catch(() => {})
    return () => { stale = true }
  }, [isOpen])

  const buy = async (pkg: CreditPackage) => {
    if (busy) return
    setBusy(pkg.id)
    setError(null)
    try {
      await creditsApi.purchase(pkg.id)
      refreshData('credits')
      showSuccess(t('wallet.purchased'), formatMoney(pkg.creditCents))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('wallet.buyFailed'))
    } finally {
      setBusy(null)
    }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} title={t('wallet.title')}>
      <div style={{ padding: '4px 20px 28px' }}>
        {/* Balance */}
        <div style={{ background: 'linear-gradient(135deg,#3A6080,#5C7A9A)', borderRadius: 'var(--r-lg)', padding: '18px 20px', color: 'white', marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', opacity: 0.8 }}>{t('wallet.balance')}</div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{wallet ? formatMoney(wallet.balanceCents) : '—'}</div>
        </div>

        {/* Buy packages */}
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>{t('wallet.buy')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {(packages ?? []).map((p) => (
            <div
              key={p.id}
              onClick={() => buy(p)}
              style={{
                padding: '14px 8px', textAlign: 'center', cursor: busy ? 'default' : 'pointer',
                borderRadius: 'var(--r-md)', border: '1.5px solid var(--line)', background: 'var(--surface)',
                opacity: busy && busy !== p.id ? 0.5 : 1,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{p.name}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>{formatMoney(p.priceCents)}</div>
              {p.creditCents !== p.priceCents && (
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{formatMoney(p.creditCents)} {t('wallet.credits')}</div>
              )}
            </div>
          ))}
        </div>
        {busy && <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', padding: '8px 0 0' }}>{t('wallet.buying')}</div>}
        {error && <div style={{ marginTop: 10, background: '#FDECEA', color: '#B71C1C', borderRadius: 'var(--r-md)', padding: '10px 12px', fontSize: 13 }}>{error}</div>}

        {/* History */}
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '20px 0 8px' }}>{t('wallet.history')}</div>
        {!wallet ? (
          <div>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <Skeleton w={34} h={34} r="50%" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skeleton w="45%" h={13} />
                  <Skeleton w="30%" h={10} />
                </div>
                <Skeleton w={56} h={14} />
              </div>
            ))}
          </div>
        ) : wallet.entries.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, fontSize: 13, color: 'var(--ink-3)', background: 'var(--surface)', borderRadius: 'var(--r-lg)' }}>{t('wallet.empty')}</div>
        ) : (
          <div>
            {wallet.entries.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--bg-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{ENTRY_ICON[e.type] ?? '•'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{t(ENTRY_LABEL[e.type])}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}>{timeAgo(e.createdAt)}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: e.deltaCents >= 0 ? '#2E7D32' : 'var(--ink)' }}>
                  {e.deltaCents >= 0 ? '+' : '−'}{formatMoney(Math.abs(e.deltaCents))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
