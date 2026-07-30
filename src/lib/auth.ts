export const AUTH_COOKIE = 'fw_auth'   // admin session (shared password)
export const USER_COOKIE = 'fw_user'   // per-person session: "<userId>.<token>"

// SHA-256 hex — works in both the edge (proxy) and node (route handler) runtimes.
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}
