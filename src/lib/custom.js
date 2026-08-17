// Rooms and tasks you add from inside the app, plus the built-in ones you've
// put away.
//
// Built-in rooms are never deleted, only hidden — that way your history is
// still there if you bring the room back, and a backup from before the change
// still makes sense. Rooms you created yourself are deleted outright.

const STORAGE_KEY = 'home-maintenance-dashboard/custom/v1'

export const emptyCustom = { areas: [], tasks: {}, hidden: [], appearance: {}, taskSettings: {} }

/** What you're allowed to change about a task after it exists. */
const SETTABLE = ['points', 'repeatable', 'schedule']

function makeId(prefix, name, taken) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || prefix
  let id = slug
  let n = 2
  while (taken.includes(id)) {
    id = `${slug}-${n}`
    n += 1
  }
  return id
}

export function loadCustom() {
  if (typeof window === 'undefined') return emptyCustom
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyCustom
    return normalizeCustom(JSON.parse(raw))
  } catch {
    return emptyCustom
  }
}

export function normalizeCustom(data) {
  if (!data || typeof data !== 'object') return emptyCustom
  const areas = Array.isArray(data.areas)
    ? data.areas.filter((a) => a && typeof a.id === 'string' && typeof a.name === 'string')
    : []
  const tasks = {}
  for (const [areaId, list] of Object.entries(data.tasks ?? {})) {
    if (!Array.isArray(list)) continue
    const clean = list.filter((t) => t && typeof t.id === 'string' && t.schedule?.kind)
    if (clean.length) tasks[areaId] = clean
  }
  const taskSettings = {}
  for (const [taskId, value] of Object.entries(data.taskSettings ?? {})) {
    if (!value || typeof value !== 'object') continue
    const entry = {}
    if (Number.isFinite(value.points) && value.points >= 1 && value.points <= 99) {
      entry.points = Math.round(value.points)
    }
    if (typeof value.repeatable === 'boolean') entry.repeatable = value.repeatable
    if (value.schedule?.kind) entry.schedule = value.schedule
    if (Object.keys(entry).length) taskSettings[taskId] = entry
  }

  return {
    areas,
    tasks,
    hidden: Array.isArray(data.hidden) ? data.hidden.filter((id) => typeof id === 'string') : [],
    appearance: data.appearance && typeof data.appearance === 'object' ? data.appearance : {},
    taskSettings,
  }
}

function isEmptyCustom(custom) {
  return (
    custom.areas.length === 0 &&
    custom.hidden.length === 0 &&
    Object.keys(custom.tasks).length === 0 &&
    Object.keys(custom.appearance).length === 0 &&
    Object.keys(custom.taskSettings ?? {}).length === 0
  )
}

export function saveCustom(custom) {
  if (typeof window === 'undefined') return
  try {
    if (isEmptyCustom(custom)) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(custom))
  } catch {
    // Private browsing — custom rooms just won't persist.
  }
}

// --- rooms ------------------------------------------------------------------

export function addArea(custom, { name, subtitle = '', iconName = 'home', color = 'sky' }, takenIds = []) {
  const id = makeId('room', name, [...takenIds, ...custom.areas.map((a) => a.id)])
  return {
    ...custom,
    areas: [...custom.areas, { id, name: name.trim(), subtitle: subtitle.trim(), iconName, color }],
  }
}

export function updateArea(custom, areaId, patch) {
  const isCustom = custom.areas.some((a) => a.id === areaId)
  if (isCustom) {
    return {
      ...custom,
      areas: custom.areas.map((a) => (a.id === areaId ? { ...a, ...patch } : a)),
    }
  }
  // Built-in room: appearance changes are stored as an override.
  return {
    ...custom,
    appearance: { ...custom.appearance, [areaId]: { ...(custom.appearance[areaId] ?? {}), ...patch } },
  }
}

/** Custom rooms are removed; built-in rooms are hidden so they can come back. */
export function removeArea(custom, areaId) {
  const isCustom = custom.areas.some((a) => a.id === areaId)
  if (isCustom) {
    const tasks = { ...custom.tasks }
    delete tasks[areaId]
    return { ...custom, areas: custom.areas.filter((a) => a.id !== areaId), tasks }
  }
  if (custom.hidden.includes(areaId)) return custom
  return { ...custom, hidden: [...custom.hidden, areaId] }
}

export function restoreArea(custom, areaId) {
  return { ...custom, hidden: custom.hidden.filter((id) => id !== areaId) }
}

// --- tasks ------------------------------------------------------------------

export function addTask(custom, areaId, task, takenIds = []) {
  const existing = custom.tasks[areaId] ?? []
  const id = makeId('task', `${areaId}-${task.name}`, [...takenIds, ...existing.map((t) => t.id)])
  const entry = {
    id,
    name: task.name.trim(),
    note: task.note?.trim() || undefined,
    schedule: task.schedule,
    points: task.points ?? 3,
  }
  return { ...custom, tasks: { ...custom.tasks, [areaId]: [...existing, entry] } }
}

/** Custom tasks are removed; built-in tasks are hidden. */
export function removeTask(custom, areaId, taskId) {
  const existing = custom.tasks[areaId] ?? []
  if (existing.some((t) => t.id === taskId)) {
    return { ...custom, tasks: { ...custom.tasks, [areaId]: existing.filter((t) => t.id !== taskId) } }
  }
  if (custom.hidden.includes(taskId)) return custom
  return { ...custom, hidden: [...custom.hidden, taskId] }
}

/**
 * Change what a task is worth, how often it happens, or whether it can be
 * logged more than once. Stored as an override keyed by task id — the same
 * shape as names.js — so the id never moves and the history stays filed
 * under it.
 *
 * Unlike updateArea() this has one branch rather than two: a custom area
 * carries its name and icon inline and so has to be mutated in place, but a
 * task doesn't, and a single override map means a built-in task and one you
 * invented behave identically.
 */
export function updateTaskSettings(custom, taskId, patch) {
  const entry = { ...(custom.taskSettings?.[taskId] ?? {}) }
  for (const key of SETTABLE) {
    if (key in patch) entry[key] = patch[key]
  }
  const taskSettings = { ...(custom.taskSettings ?? {}) }
  if (Object.keys(entry).length === 0) delete taskSettings[taskId]
  else taskSettings[taskId] = entry
  return { ...custom, taskSettings }
}

/** Back to whatever the task shipped with. */
export function resetTaskSettings(custom, taskId) {
  const taskSettings = { ...(custom.taskSettings ?? {}) }
  delete taskSettings[taskId]
  return { ...custom, taskSettings }
}

export function hasTaskSettings(custom, taskId) {
  return Boolean(custom.taskSettings?.[taskId])
}

export function restoreTask(custom, taskId) {
  return { ...custom, hidden: custom.hidden.filter((id) => id !== taskId) }
}

export function isHidden(custom, id) {
  return custom.hidden.includes(id)
}
