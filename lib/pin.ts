/**
 * Shared write-gate PIN for logging/deleting matches. The value is a server-only
 * secret held in the MATCH_PIN env var — NOT committed to the repo, so it can't
 * be read off GitHub or derived from a formula. Set MATCH_PIN in `.env.local`
 * (local) and in Vercel (Production + Preview).
 *
 * Fails closed: if MATCH_PIN is unset, every PIN check fails (writes rejected)
 * rather than silently allowing them.
 */
export function isValidPin(input: string): boolean {
  const expected = process.env.MATCH_PIN;
  if (!expected) return false;
  return input.trim() === expected.trim();
}
