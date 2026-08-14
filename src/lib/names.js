// Custom names for your rooms and chores.
//
// The important rule: renaming NEVER changes an id. Ids are what your NFC tags
// point at and what your completion history is filed under, so "Bathroom 1"
// can become "Kids' Bathroom" without breaking a tag or losing a streak.
// This file only stores what things are *called*.

const STORAGE_KEY = 'home-maintenance-dashboard/names/v1'

export const emptyNames = {}

export function loadNames() {
  if (typeof window === 'undefined') return emptyNames
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyNames
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyNames

    // Keep only the shape we expect, in case the file was hand-edited.
    const clean = {}
    for (const [id, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue
      const entry = {}
      if (typeof value.name === 'string') entry.name = value.name
      if (typeof value.subtitle === 'string') entry.subtitle = value.subtitle
      if (Object.keys(entry).length) clean[id] = entry
    }
    return clean
  } catch {
    return emptyNames
  }
}

export function saveNames(names) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(names))
  } catch {
    // Private browsing or a full disk — names just won't persist.
  }
}

/** Merge a change for one id. Blanking a name falls back to the default. */
export function withOverride(names, id, patch) {
  const entry = { ...(names[id] ?? {}), ...patch }
  if (typeof entry.name === 'string' && entry.name.trim() === '') delete entry.name
  const next = { ...names }
  if (Object.keys(entry).length === 0) delete next[id]
  else next[id] = entry
  return next
}

/** Forget the custom names for these ids, restoring the built-in ones. */
export function withoutOverrides(names, ids) {
  const next = { ...names }
  for (const id of ids) delete next[id]
  return next
}

export function displayName(entity, names) {
  return names?.[entity.id]?.name?.trim() || entity.name
}

/** An empty subtitle is a real choice, so only fall back when unset. */
export function displaySubtitle(area, names) {
  const entry = names?.[area.id]
  return entry && 'subtitle' in entry ? entry.subtitle : area.subtitle
}

export function hasCustomNames(area, names) {
  return [area.id, ...area.tasks.map((task) => task.id)].some((id) => names?.[id])
}
