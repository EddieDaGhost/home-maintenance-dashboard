// Everything lives in the browser's localStorage — no account, no server,
// no one else's copy of your data. It stays on the phone or laptop you use.
//
// A completion is an entry: { at: <timestamp>, by: <person id> }.
// Version 1 of this app stored plain timestamps, so anything numeric that
// turns up is quietly upgraded on load and old backups keep working.

const STORAGE_KEY = 'home-maintenance-dashboard/v1'
const MAX_HISTORY_PER_TASK = 400

export const emptyLog = { version: 2, completions: {} }

/** Accepts either shape and returns a timestamp. */
export function timeOf(entry) {
  return typeof entry === 'number' ? entry : entry?.at
}

export function normalizeEntry(entry) {
  if (typeof entry === 'number') return { at: entry }
  if (!entry || typeof entry !== 'object') return null
  if (!Number.isFinite(entry.at)) return null
  return typeof entry.by === 'string' ? { at: entry.at, by: entry.by } : { at: entry.at }
}

/** Clean up a stored map of taskId -> entries, newest first. */
export function normalizeCompletions(raw) {
  const completions = {}
  for (const [taskId, entries] of Object.entries(raw ?? {})) {
    if (!Array.isArray(entries)) continue
    const clean = entries.map(normalizeEntry).filter(Boolean).sort((a, b) => b.at - a.at)
    if (clean.length) completions[taskId] = clean
  }
  return completions
}

export function loadLog() {
  if (typeof window === 'undefined') return emptyLog
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyLog
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || typeof parsed.completions !== 'object') {
      return emptyLog
    }
    return { version: 2, completions: normalizeCompletions(parsed.completions) }
  } catch {
    return emptyLog
  }
}

export function saveLog(log) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    // Private browsing or a full disk. The app keeps working for this session.
  }
}

/** Add a completion for a task, newest first. */
export function logCompletion(log, taskId, { at = Date.now(), by } = {}) {
  const entry = by ? { at, by } : { at }
  const existing = log.completions[taskId] ?? []
  const updated = [entry, ...existing].slice(0, MAX_HISTORY_PER_TASK)
  return { ...log, completions: { ...log.completions, [taskId]: updated } }
}

/** Remove the most recent completion for a task — the undo button. */
export function undoLastCompletion(log, taskId) {
  const existing = log.completions[taskId] ?? []
  if (!existing.length) return log
  return { ...log, completions: { ...log.completions, [taskId]: existing.slice(1) } }
}

/** Drop the history of tasks that no longer exist anywhere. */
export function forgetTask(log, taskId) {
  if (!log.completions[taskId]) return log
  const completions = { ...log.completions }
  delete completions[taskId]
  return { ...log, completions }
}

export function clearAll() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do.
  }
}
