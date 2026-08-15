// What each person has bought, keyed by person id.
//
// Credits themselves are derived from the log (see credits.js) — this file
// stores only the other half of the sum: what was spent and what it bought.
//
// Keyed by person, not by device, so a scene follows whoever built it: new
// phone, restored backup, or someone borrowing a phone and switching who's
// logging. Removing a person leaves their entry here untouched, the same way a
// removed room keeps its history.

import { ALL_SLOTS, itemById, MAX_COMPANIONS, TREAT_HOURS } from '../config/catalog.js'

const STORAGE_KEY = 'home-maintenance-dashboard/estate/v1'

export const emptyEstate = {}

export const emptyEntry = { owned: [], equipped: {}, companions: [], boostUntil: 0, spent: 0 }

export function loadEstate() {
  if (typeof window === 'undefined') return emptyEstate
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyEstate
    return normalizeEstate(JSON.parse(raw))
  } catch {
    return emptyEstate
  }
}

function normalizeEntry(data) {
  if (!data || typeof data !== 'object') return emptyEntry

  // An unknown id means a purchase made by a newer version of the app, or one
  // whose catalogue entry was pulled. Keep it in `owned` so it isn't re-charged
  // if it comes back, but never equip something we can't draw.
  const owned = Array.isArray(data.owned) ? data.owned.filter((id) => typeof id === 'string') : []

  const equipped = {}
  for (const slot of ALL_SLOTS) {
    const id = data.equipped?.[slot]
    const item = typeof id === 'string' ? itemById(id) : null
    if (item && item.slot === slot && owned.includes(id)) equipped[slot] = id
  }

  const companions = Array.isArray(data.companions)
    ? data.companions
        .filter((c) => c && typeof c.id === 'string')
        .slice(0, MAX_COMPANIONS)
        .map((c) => ({ id: c.id, name: typeof c.name === 'string' ? c.name : '' }))
    : []

  const boostUntil = Number.isFinite(data.boostUntil) && data.boostUntil > 0 ? data.boostUntil : 0
  const spent = Number.isFinite(data.spent) && data.spent > 0 ? data.spent : 0

  return { owned, equipped, companions, boostUntil, spent }
}

export function normalizeEstate(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyEstate
  const out = {}
  for (const [personId, entry] of Object.entries(data)) {
    if (typeof personId !== 'string' || !personId) continue
    const clean = normalizeEntry(entry)
    if (!isEmptyEntry(clean)) out[personId] = clean
  }
  return out
}

function isEmptyEntry(entry) {
  return (
    entry.owned.length === 0 &&
    entry.companions.length === 0 &&
    Object.keys(entry.equipped).length === 0 &&
    !entry.boostUntil &&
    !entry.spent
  )
}

export function saveEstate(estate) {
  if (typeof window === 'undefined') return
  try {
    if (Object.keys(estate).length === 0) {
      // Nothing bought yet: leave a visitor's browser exactly as we found it.
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(estate))
  } catch {
    // Private browsing — purchases just won't persist.
  }
}

export function entryFor(estate, personId) {
  return estate?.[personId] ?? emptyEntry
}

function withEntry(estate, personId, entry) {
  return { ...estate, [personId]: entry }
}

// --- buying -----------------------------------------------------------------
//
// Every mutator takes the balance and refuses rather than going negative. The
// screen disables the button too, but the rule lives here so the logic suite can
// hold it without a browser.

/** Buy a one-off item and wear it immediately — buying it is the point. */
export function buyItem(estate, personId, item, balance) {
  if (!item || !personId) return estate
  const entry = entryFor(estate, personId)
  if (entry.owned.includes(item.id)) return estate
  if (balance < item.cost) return estate
  return withEntry(estate, personId, {
    ...entry,
    owned: [...entry.owned, item.id],
    equipped: { ...entry.equipped, [item.slot]: item.id },
    spent: entry.spent + item.cost,
  })
}

/** Wear something already owned. Passing the equipped id again takes it off. */
export function equip(estate, personId, itemId) {
  const item = itemById(itemId)
  if (!item || !personId) return estate
  const entry = entryFor(estate, personId)
  if (!entry.owned.includes(itemId)) return estate
  const equipped = { ...entry.equipped }
  if (equipped[item.slot] === itemId) delete equipped[item.slot]
  else equipped[item.slot] = itemId
  return withEntry(estate, personId, { ...entry, equipped })
}

export function buyCompanion(estate, personId, cost, balance, name = '') {
  if (!personId) return estate
  const entry = entryFor(estate, personId)
  if (entry.companions.length >= MAX_COMPANIONS) return estate
  if (balance < cost) return estate
  const companion = { id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name }
  return withEntry(estate, personId, {
    ...entry,
    companions: [...entry.companions, companion],
    spent: entry.spent + cost,
  })
}

export function renameCompanion(estate, personId, companionId, name) {
  const entry = entryFor(estate, personId)
  return withEntry(estate, personId, {
    ...entry,
    companions: entry.companions.map((c) => (c.id === companionId ? { ...c, name: name.trim() } : c)),
  })
}

/**
 * The consumable. Buying it again while one is running extends it rather than
 * replacing it — nobody should lose time by being enthusiastic.
 */
export function buyTreat(estate, personId, cost, balance, now = Date.now()) {
  if (!personId || balance < cost) return estate
  const entry = entryFor(estate, personId)
  const from = entry.boostUntil > now ? entry.boostUntil : now
  return withEntry(estate, personId, {
    ...entry,
    boostUntil: from + TREAT_HOURS * 60 * 60 * 1000,
    spent: entry.spent + cost,
  })
}
