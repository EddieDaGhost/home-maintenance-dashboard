// Who's logging. Optional — with one person the app looks exactly as it did.
//
// Completions store a person id, so "who fed the chickens" survives even after
// someone is removed from the household (their name just becomes "Someone").

const STORAGE_KEY = 'home-maintenance-dashboard/people/v1'

export const DEFAULT_PEOPLE = { people: [{ id: 'me', name: 'Me' }], activeId: 'me' }

function makeId(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `${slug || 'person'}-${Math.random().toString(36).slice(2, 7)}`
}

export function loadPeople() {
  if (typeof window === 'undefined') return DEFAULT_PEOPLE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PEOPLE
    return normalizePeople(JSON.parse(raw))
  } catch {
    return DEFAULT_PEOPLE
  }
}

export function normalizePeople(data) {
  const people = Array.isArray(data?.people)
    ? data.people
        .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
        .map((p) => ({ id: p.id, name: p.name }))
    : []
  if (!people.length) return DEFAULT_PEOPLE
  const activeId = people.some((p) => p.id === data?.activeId) ? data.activeId : people[0].id
  return { people, activeId }
}

export function savePeople(household) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(household))
  } catch {
    // Private browsing — the household just won't persist.
  }
}

export function addPerson(household, name) {
  const trimmed = name.trim()
  if (!trimmed) return household
  const person = { id: makeId(trimmed), name: trimmed }
  return { people: [...household.people, person], activeId: household.activeId }
}

export function renamePerson(household, id, name) {
  const trimmed = name.trim()
  if (!trimmed) return household
  return {
    ...household,
    people: household.people.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
  }
}

/** The last person can't be removed — someone has to be logging. */
export function removePerson(household, id) {
  if (household.people.length <= 1) return household
  const people = household.people.filter((p) => p.id !== id)
  const activeId = household.activeId === id ? people[0].id : household.activeId
  return { people, activeId }
}

export function setActivePerson(household, id) {
  return household.people.some((p) => p.id === id) ? { ...household, activeId: id } : household
}

export function personName(household, id) {
  if (!id) return null
  return household.people.find((p) => p.id === id)?.name ?? 'Someone'
}

/** Initials for the little avatar chip: "Yasmine" -> "Y", "Jo Ann" -> "JA". */
export function initialsOf(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
