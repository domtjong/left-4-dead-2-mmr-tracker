// Structured server-side logging. Every line is JSON with an `event` field, so
// on Vercel you can filter Runtime Logs by event (e.g. `event:"match.new.error"`)
// or search the payload (player names, map, who entered the match, etc.).
//
// Server-only. Never log secrets — payloads here are match data, which is fine.

type Data = Record<string, unknown>;

function emit(stream: "log" | "error", event: string, data: Data) {
  // One JSON object per line = one structured log entry in Vercel.
  console[stream](JSON.stringify({ t: new Date().toISOString(), event, ...data }));
}

/** An action happened. `data` is the payload you want to see in the logs. */
export function logEvent(event: string, data: Data = {}) {
  emit("log", event, data);
}

/** Something failed. Records the error message alongside context. */
export function logError(event: string, error: unknown, data: Data = {}) {
  const message = error instanceof Error ? error.message : String(error);
  emit("error", `${event}.error`, { level: "error", message, ...data });
}
