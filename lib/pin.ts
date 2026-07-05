/**
 * Rotating daily PIN gate for logging/deleting matches. Not real security —
 * it's a public formula (ddmmyy of today's date) anyone in the group can
 * compute — just a light deterrent so a stranger who finds the page can't
 * casually mutate the match log.
 */
export function todaysPin(date: Date = new Date()): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear() % 100).padStart(2, "0");
  return `${dd}${mm}${yy}`;
}

export function isValidPin(input: string): boolean {
  return input.trim() === todaysPin();
}
