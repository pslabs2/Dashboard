const BYTE_UNITS = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"] as const
export function formatBytes(bytes: number | null | undefined, digits = 1) {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return "—"
  }
  let value = Math.abs(bytes)
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const sign = bytes < 0 ? "-" : ""
  return `${sign}${value.toFixed(unit === 0 ? 0 : digits)} ${BYTE_UNITS[unit]}`
}
export function formatCores(cores: number | null | undefined) {
  if (cores === null || cores === undefined || !Number.isFinite(cores)) {
    return "—"
  }
  if (cores < 1) return `${Math.round(cores * 1000)}m`
  return `${cores.toFixed(cores < 10 ? 2 : 1)} cores`
}
export function formatPercent(ratio: number | null | undefined, digits = 0) {
  if (ratio === null || ratio === undefined || !Number.isFinite(ratio)) {
    return "—"
  }
  return `${(ratio * 100).toFixed(digits)}%`
}
/** Safe ratio helper that returns `null` instead of dividing by zero. */
export function ratio(used: number | null | undefined, total: number) {
  if (used === null || used === undefined || total <= 0) return null
  return used / total
}
const DURATION_UNITS: [label: string, seconds: number][] = [
  ["y", 365 * 24 * 3600],
  ["d", 24 * 3600],
  ["h", 3600],
  ["m", 60],
  ["s", 1],
]
/** Compact kubectl-style age, e.g. `3d`, `5h`, `42s`. */
export function formatAge(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return "—"
  const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000))
  if (!Number.isFinite(seconds)) return "—"
  for (const [label, size] of DURATION_UNITS) {
    if (seconds >= size) return `${Math.floor(seconds / size)}${label}`
  }
  return "0s"
}
const relativeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
  style: "short",
})
export function formatRelativeTime(
  iso: string | number | null | undefined,
  now = Date.now()
) {
  if (iso === null || iso === undefined) return "never"
  const timestamp = typeof iso === "number" ? iso : Date.parse(iso)
  if (!Number.isFinite(timestamp)) return "never"
  const diffSeconds = Math.round((timestamp - now) / 1000)
  const abs = Math.abs(diffSeconds)
  if (abs < 60) return relativeFormatter.format(diffSeconds, "second")
  if (abs < 3600)
    return relativeFormatter.format(Math.round(diffSeconds / 60), "minute")
  if (abs < 86400)
    return relativeFormatter.format(Math.round(diffSeconds / 3600), "hour")
  return relativeFormatter.format(Math.round(diffSeconds / 86400), "day")
}
export function shortRevision(revision: string | null | undefined) {
  if (!revision) return "—"
  return /^[0-9a-f]{40}$/i.test(revision) ? revision.slice(0, 7) : revision
}