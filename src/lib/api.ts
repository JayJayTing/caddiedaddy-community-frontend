const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('caddie_token')
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
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
  if (!res.ok) {
    const body = await res.text()
    let msg = body
    try { msg = JSON.parse(body).error ?? body } catch {}
    if (res.status === 401) {
      // Dispatch session expired event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('caddie:session-expired'))
      }
    }
    throw new ApiError(res.status, msg)
  }
  return res.json() as Promise<T>
}

// Multipart upload — sends a File as form-data. Does NOT set Content-Type so the
// browser adds the multipart boundary itself.
export async function apiUpload<T>(path: string, file: File, field = 'file'): Promise<T> {
  const token = getToken()
  const fd = new FormData()
  fd.append(field, file)
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: fd,
  })
  if (!res.ok) {
    const body = await res.text()
    let msg = body
    try { msg = JSON.parse(body).error ?? body } catch {}
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('caddie:session-expired'))
    }
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
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File, field?: string) => apiUpload<T>(path, file, field),
}
