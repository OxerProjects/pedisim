/**
 * Email domain suffix used for username-based auth.
 * Supabase requires email format, so we append this to usernames.
 * e.g., "admin" becomes "admin@pedisim.app"
 */
export const EMAIL_DOMAIN = '@pedisim.app'

/**
 * Convert a username to the internal email format used by Supabase.
 */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}${EMAIL_DOMAIN}`
}

/**
 * Extract the username from an internal Supabase email.
 */
export function emailToUsername(email: string): string {
  return email.replace(EMAIL_DOMAIN, '')
}
