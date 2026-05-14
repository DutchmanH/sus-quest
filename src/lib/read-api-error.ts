/**
 * User-visible error text from a failed `fetch` `Response`.
 * Handles JSON `{ error }` from API routes and plain/HTML error bodies.
 */
export async function readApiErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  let fromJson: string | undefined
  if (text) {
    try {
      const j = JSON.parse(text) as { error?: unknown }
      if (typeof j?.error === 'string' && j.error.trim()) fromJson = j.error.trim()
    } catch {
      /* not JSON */
    }
  }
  if (fromJson) return fromJson
  if (res.status === 404) {
    return 'Niet gevonden (404). Bestaat deze room nog, of klopt de link?'
  }
  if (res.status === 401) {
    return 'Niet ingelogd of sessie verlopen — log opnieuw in en probeer opnieuw.'
  }
  if (res.status === 403) {
    return 'Geen rechten voor deze actie.'
  }
  if (res.status === 410) {
    return 'Deze game bestaat niet meer of is verlopen.'
  }
  if (res.status >= 500) {
    return 'Serverfout. Probeer het zo opnieuw.'
  }
  const trimmed = text.trim()
  if (trimmed && trimmed.length < 280 && !trimmed.startsWith('<')) {
    return trimmed
  }
  const tail = res.statusText ? ` ${res.statusText}` : ''
  return `Verzoek mislukt (${res.status}${tail})`.trim()
}

/** Safe room code segment for `/api/rooms/:code/...` URLs */
export function apiRoomCodeSegment(code: string): string {
  return encodeURIComponent(code.trim())
}
