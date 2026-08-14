// Everything lives in the browser's localStorage — no account, no server,
// no one else's copy of your data. It stays on the phone or laptop you use.

const STORAGE_KEY = 'home-maintenance-dashboard/v1'
const MAX_HISTORY_PER_TASK = 400

export const emptyLog = { version: 1, completions: {} }

export function loadLog() {
  if (typeof window === 'undefined') return emptyLog
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyLog
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || typeof parsed.completions !== 'object') {
      return emptyLog
    }
    // Guard against hand-edited or corrupted data.
    const completions = {}
    for (const [taskId, stamps] of Object.entries(parsed.completions)) {
      if (!Array.isArray(stamps)) continue
      completions[taskId] = stamps
        .filter((t) => typeof t === 'number' && Number.isFinite(t))
        .sort((a, b) => b - a)
    }
    return { version: 1, completions }
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
export function logCompletion(log, taskId, at = Date.now()) {
  const existing = log.completions[taskId] ?? []
  const updated = [at, ...existing].slice(0, MAX_HISTORY_PER_TASK)
  return { ...log, completions: { ...log.completions, [taskId]: updated } }
}

/** Remove the most recent completion for a task — the undo button. */
export function undoLastCompletion(log, taskId) {
  const existing = log.completions[taskId] ?? []
  if (!existing.length) return log
  return { ...log, completions: { ...log.completions, [taskId]: existing.slice(1) } }
}

export function clearAll() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do.
  }
}
