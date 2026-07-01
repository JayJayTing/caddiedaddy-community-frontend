const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

// A session lives in localStorage ("remember me" on) or sessionStorage (off).
// Reads prefer whichever currently holds the access token; refreshed tokens are
// written back to that same store so the persistence choice is preserved.
function tokenStore(): Storage | null {
  if (typeof window === 'undefined') return null
  if (localStorage.getItem('caddie_token')) return localStorage
  if (sessionStorage.getItem('caddie_token')) return sessionStorage
  return null
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('caddie_token') ?? sessionStorage.getItem('caddie_token')
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

function sessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('caddie:session-expired'))
  }
}

async function parseError(res: Response): Promise<string> {
  const body = await res.text()
  try {
    // Our routes return { error: "<message>" }. A validation failure, though,
    // yields a non-string error object — never hand that to `new Error()`, which
    // would stringify it to the useless "[object Object]".
    const err = JSON.parse(body).error
    return typeof err === 'string' ? err : body
  } catch { return body }
}

// A single in-flight refresh shared by all concurrent 401s, so a burst of requests
// triggers exactly one token refresh (avoids hammering refresh-token rotation).
let refreshInFlight: Promise<boolean> | null = null

async function refreshSession(): Promise<boolean> {
  const store = tokenStore()
  const refresh = store?.getItem('caddie_refresh')
  if (!store || !refresh) return false
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    })
    if (!res.ok) return false
    const { session } = (await res.json()) as {
      session: { access_token: string; refresh_token: string }
    }
    store.setItem('caddie_token', session.access_token)
    store.setItem('caddie_refresh', session.refresh_token)
    return true
  } catch {
    return false
  }
}

// Runs the shared refresh once for a 401, returning whether a retry should proceed.
async function tryRefreshOnce(): Promise<boolean> {
  refreshInFlight = refreshInFlight ?? refreshSession()
  const ok = await refreshInFlight
  refreshInFlight = null
  return ok
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  _retried = false,
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  })

  // Access token likely expired — refresh once and retry the original request.
  if (res.status === 401 && !_retried && token && path !== '/auth/refresh') {
    if (await tryRefreshOnce()) return apiFetch<T>(path, options, true)
    sessionExpired()
    throw new ApiError(401, await parseError(res))
  }

  if (!res.ok) {
    const msg = await parseError(res)
    if (res.status === 401) sessionExpired()
    throw new ApiError(res.status, msg)
  }
  return res.json() as Promise<T>
}

// Multipart upload — sends a File as form-data. Does NOT set Content-Type so the
// browser adds the multipart boundary itself.
export async function apiUpload<T>(
  path: string,
  file: File,
  field = 'file',
  _retried = false,
): Promise<T> {
  const token = getToken()
  const fd = new FormData()
  fd.append(field, file)
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: fd,
  })

  if (res.status === 401 && !_retried && token) {
    if (await tryRefreshOnce()) return apiUpload<T>(path, file, field, true)
    sessionExpired()
    throw new ApiError(401, await parseError(res))
  }

  if (!res.ok) {
    const msg = await parseError(res)
    if (res.status === 401) sessionExpired()
    throw new ApiError(res.status, msg)
  }
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File, field?: string) => apiUpload<T>(path, file, field),
}
