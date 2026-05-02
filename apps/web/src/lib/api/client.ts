/**
 * HTTP client for the Laravel API. With Vite dev proxy, use relative URLs so session and
 * XSRF-TOKEN cookies stay on the SPA origin (see vite.config.ts).
 */

export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_URL
  if (base !== undefined && String(base).trim() !== '') {
    const b = String(base).replace(/\/$/, '')
    return path.startsWith('/') ? `${b}${path}` : `${b}/${path}`
  }
  return path.startsWith('/') ? path : `/${path}`
}

function readXsrfTokenFromCookie(): string | null {
  const row = document.cookie.split('; ').find((r) => r.startsWith('XSRF-TOKEN='))
  if (!row) {
    return null
  }
  return decodeURIComponent(row.slice('XSRF-TOKEN='.length))
}

export async function ensureCsrfCookie(): Promise<void> {
  const res = await fetch(apiUrl('/sanctum/csrf-cookie'), {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    const hint =
      res.status === 500
        ? ' On the API: check APP_KEY, run migrations, and if SESSION_DRIVER=database ensure PostgreSQL is up — or set SESSION_DRIVER=file in apps/api/.env. See storage/logs/laravel.log.'
        : ''
    const detail = await res.text().catch(() => '')
    const snippet = detail.replace(/\s+/g, ' ').trim().slice(0, 180)
    throw new Error(
      `CSRF cookie request failed (${res.status}).${hint}${snippet ? ` Response: ${snippet}` : ''}`,
    )
  }
}

export type ApiFetchInit = Omit<RequestInit, 'body'> & {
  json?: unknown
}

export async function apiFetch(path: string, init: ApiFetchInit = {}): Promise<Response> {
  const { json, headers: inputHeaders, ...rest } = init
  const headers = new Headers(inputHeaders)
  headers.set('Accept', 'application/json')

  let body: string | undefined
  if (json !== undefined) {
    await ensureCsrfCookie()
    const token = readXsrfTokenFromCookie()
    if (!token) {
      throw new Error(
        'Missing XSRF-TOKEN after CSRF cookie request. Use http://localhost:5173 (not 127.0.0.1), ' +
          'keep VITE_API_URL empty for the dev proxy, and run the API on http://localhost:8000.',
      )
    }
    headers.set('X-XSRF-TOKEN', token)
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(json)
  }

  return fetch(apiUrl(path), {
    ...rest,
    credentials: 'include',
    headers,
    body,
  })
}

export async function apiJson<T>(path: string, init: ApiFetchInit = {}): Promise<T> {
  const res = await apiFetch(path, init)
  const text = await res.text()
  const data = text === '' ? null : JSON.parse(text)
  if (!res.ok) {
    const err = new Error(`API ${res.status}`) as Error & { status: number; body: unknown }
    err.status = res.status
    err.body = data
    throw err
  }
  return data as T
}
