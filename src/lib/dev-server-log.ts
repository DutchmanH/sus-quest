import type { NextRequest } from 'next/server'

const ENABLED =
  process.env.NODE_ENV === 'development' &&
  process.env.DEV_REQUEST_LOG !== '0'

/** Skip noisy internal Next.js asset / HMR paths (matcher should already exclude most). */
function isSkippablePath(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.webmanifest')
  )
}

function requestContext(request: NextRequest): string | null {
  const headers = request.headers
  if (headers.get('rsc') === '1') return 'RSC'
  if (headers.get('next-router-prefetch')) return 'prefetch'
  if (headers.get('purpose') === 'prefetch') return 'prefetch'
  if (headers.get('x-nextjs-data') === '1') return 'client-nav'
  return null
}

/**
 * Logs incoming HTTP requests during `npm run dev`.
 * - Page / document navigations → `Front-end: METHOD /path`
 * - API routes → `Backend: METHOD /api/...`
 *
 * Set `DEV_REQUEST_LOG=0` to disable without changing NODE_ENV.
 */
export function logDevIncomingRequest(
  request: NextRequest,
  detail?: string,
): void {
  if (!ENABLED) return

  const { pathname, search } = request.nextUrl
  if (isSkippablePath(pathname)) return

  const path = `${pathname}${search}`
  const method = request.method
  const ctx = requestContext(request)
  const ctxSuffix = ctx ? ` (${ctx})` : ''
  const detailSuffix = detail ? ` — ${detail}` : ''

  if (pathname.startsWith('/api/')) {
    console.log(`Backend: ${method} ${path}${ctxSuffix}${detailSuffix}`)
  } else {
    console.log(`Front-end: ${method} ${path}${ctxSuffix}${detailSuffix}`)
  }
}

export function logDevProxyRedirect(request: NextRequest, target: string): void {
  if (!ENABLED) return
  const { pathname, search } = request.nextUrl
  const kind = pathname.startsWith('/api/') ? 'Backend' : 'Front-end'
  console.log(`${kind}: ${request.method} ${pathname}${search} → redirect ${target}`)
}
