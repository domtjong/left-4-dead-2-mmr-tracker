// Structured server-side logging. On Vercel these lines show up in
// Runtime Logs; because each line is JSON with an `event` field you can filter
// by event (e.g. `event:"match.new.created"`) or search the payload.
//
// Server-only. Never log secrets — payloads here are match data (player names,
// maps, scores), which is fine to record.

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
  emit("error", `${event}.error`, {
    level: "error",
    message: error instanceof Error ? error.message : String(error),
    ...data,
  });
}
