type Level = "debug" | "info" | "warn" | "error"
const isProduction = process.env.NODE_ENV === "production"
function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }
  return { message: String(error) }
}
function write(level: Level, message: string, meta?: Record<string, unknown>) {
  const fields = meta
    ? Object.fromEntries(
        Object.entries(meta).map(([key, value]) => [
          key,
          value instanceof Error ? serializeError(value) : value,
        ])
      )
    : undefined
  // JSON lines in production for log aggregation; readable output locally.
  const line = isProduction
    ? JSON.stringify({ time: new Date().toISOString(), level, message, ...fields })
    : `[${level}] ${message}${fields ? ` ${JSON.stringify(fields)}` : ""}`
  if (level === "error") console.error(line)
  else if (level === "warn") console.warn(line)
  else console.log(line)
}
const lastLogged = new Map<string, number>()
export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    !isProduction && write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) =>
    write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    write("error", message, meta),
  /** Logs at most once per `intervalMs` for a given key (for polling paths). */
  throttled(
    key: string,
    level: Level,
    message: string,
    meta?: Record<string, unknown>,
    intervalMs = 60_000
  ) {
    const now = Date.now()
    if (now - (lastLogged.get(key) ?? 0) < intervalMs) return
    lastLogged.set(key, now)
    write(level, message, meta)
  },
}