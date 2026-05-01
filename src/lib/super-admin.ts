const DEFAULT_PROTECTED_SUPER_ADMINS = ['martijn@webhunk.nl']

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function getProtectedSuperAdminEmails(): string[] {
  const fromEnv = process.env.PROTECTED_SUPER_ADMIN_EMAILS
  if (!fromEnv) return DEFAULT_PROTECTED_SUPER_ADMINS

  const parsed = fromEnv
    .split(',')
    .map(normalizeEmail)
    .filter(Boolean)

  return parsed.length > 0 ? parsed : DEFAULT_PROTECTED_SUPER_ADMINS
}

export function isProtectedSuperAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const normalized = normalizeEmail(email)
  return getProtectedSuperAdminEmails().includes(normalized)
}
