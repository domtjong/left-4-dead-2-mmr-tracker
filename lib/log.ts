// Structured server-side logging. Every line is JSON with an `event` field, so
// on Vercel you can filter Runtime Logs by event (e.g. `event:"match.new.error"`)
// or search the payload. Errors are ALSO persisted to the Supabase `app_logs`
// table so they survive beyond Vercel's log retention and stay queryable.
//
// Server-only. Never log secrets — payloads here are match data (player names,
// maps, scores), which is fine to record.

type Data = Record<string, unknown>;

function emit(stream: "log" | "error", event: string, data: Data) {
  // One JSON object per line = one structured log entry in Vercel.
  console[stream](JSON.stringify({ t: new Date().toISOString(), event, ...data }));
}

// Best-effort durable copy to Supabase `app_logs`. Never throws — logging must
// not break the request it is reporting on. No-ops until 003_app_logs.sql runs.
async function persist(level: "error" | "event", event: string, message: string | null, data: Data) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/app_logs`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ level, event, message, data }),
    });
  } catch {
    // swallow — a logging failure must never surface to the user
  }
}

/** An action happened. `data` is the payload you want to see in the logs. */
export function logEvent(event: string, data: Data = {}) {
  emit("log", event, data);
}

/**
 * Something failed. Records the error message alongside context — to the Vercel
 * logs and, durably, to `app_logs`. Await it so the row is written before a
 * serverless function returns.
 */
export async function logError(event: string, error: unknown, data: Data = {}) {
  const message = error instanceof Error ? error.message : String(error);
  const ev = `${event}.error`;
  emit("error", ev, { level: "error", message, ...data });
  await persist("error", ev, message, data);
}
