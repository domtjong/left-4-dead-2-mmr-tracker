// Await a Supabase query and throw on error instead of silently yielding null.
// Without this, `const { data } = await db.from(...)` swallows failures — a
// broken query then renders identically to "no rows", which is a silent blank.
export async function unwrap<T>(
  label: string,
  query: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(`Supabase query "${label}" failed: ${error.message}`);
  return (data ?? []) as T;
}

// PostgREST caps a single select at 1000 rows (server max-rows). This pages
// through with .range() until a short page signals the end. Pass a builder that
// applies a STABLE .order() so pages don't overlap or skip rows.
export async function fetchAllRows<T>(
  make: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await make(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as T[];
    out.push(...batch);
    if (batch.length < pageSize) break;
  }
  return out;
}
