// Typed client for the credit wallet (balance, ledger, bulk-buy packages).
// Credits are par with NT$ (1 credit = NT$0.01), so amounts are cents and render
// through the same formatMoney() helper as prices. Wraps the shared `api` helper.
import { api } from './api'

export type CreditEntryType =
  | 'purchase'
  | 'bonus'
  | 'booking_spend'
  | 'booking_refund'
  | 'adjustment'

export interface CreditEntry {
  id: string
  type: CreditEntryType
  deltaCents: number // + credit, - spend
  balanceAfterCents: number
  note: string | null
  createdAt: string
}

export interface Wallet {
  balanceCents: number
  entries: CreditEntry[]
}

export interface CreditPackage {
  id: string
  name: string
  priceCents: number // real money the golfer pays
  creditCents: number // credits received
}

export const creditsApi = {
  getWallet: () => api.get<{ data: Wallet }>('/credits/me').then((r) => r.data),

  getPackages: () => api.get<{ data: CreditPackage[] }>('/credits/packages').then((r) => r.data),

  // Returns the new balance when CREDITS_AUTOCONFIRM grants immediately (pilot),
  // otherwise balanceCents is null and the purchase stays pending.
  purchase: (packageId: string) =>
    api
      .post<{ data: { id: string; status: string; balanceCents: number | null } }>(
        '/credits/purchase',
        { packageId },
      )
      .then((r) => r.data),
}
