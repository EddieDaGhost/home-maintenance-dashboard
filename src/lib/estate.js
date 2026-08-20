// What each person has bought, keyed by person id and then by look.
//
// Credits themselves are derived from the log (see credits.js) — this file
// stores only the other half of the sum: what was spent and what it bought.
//
// Keyed by person, not by device, so a scene follows whoever built it: new
// phone, restored backup, or someone borrowing a phone and switching who's
// logging. Removing a person leaves their entry here untouched, the same way a
// removed room keeps its history.
//
// **One wallet, three scenes.** Buying the freighter used to hand you the Maine
// Coon as well, because ownership was a single list and only the drawing
// changed. It isn't: what you own is now per look, so dressing the ship costs
// the same credits that would have dressed the cats and you choose which. What
// stays at the person level is `spent` — there is one pot of credits, earned
// once from your chores — and `boostUntil`, because a treat should light up
// whichever scene you're looking at.
//
// Entries bought before this existed are granted in **all three** looks. Design
// rule 2: nothing you own is ever taken away.

import { ALL_SLOTS, itemById, MAX_COMPANIONS, TREAT_HOURS } from '../config/catalog.js'
import { THEME_LIST } from '../config/themes.js'

const STORAGE_KEY = 'home-maintenance-dashboard/estate/v1'

export const emptyEstate = {}

export const LOOKS = THEME_LIST.map((theme) => theme.id)

export const emptyLook = { owned: [], equipped: {}, companions: [] }

export const emptyEntry = { looks: {}, boostUntil: 0, spent: 0 }

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

function normalizeLook(data) {
  if (!data || typeof data !== 'object') return emptyLook

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

  return { owned, equipped, companions }
}

const isEmptyLook = (look) =>
  look.owned.length === 0 && look.companions.length === 0 && Object.keys(look.equipped).length === 0

function normalizeEntry(data) {
  if (!data || typeof data !== 'object') return emptyEntry

  const boostUntil = Number.isFinite(data.boostUntil) && data.boostUntil > 0 ? data.boostUntil : 0
  const spent = Number.isFinite(data.spent) && data.spent > 0 ? data.spent : 0

  // The old shape kept one flat list of purchases for all three looks. Nobody
  // loses anything they bought: it becomes theirs in every look, and only what
  // they buy from here on is per look.
  if (!data.looks && (data.owned || data.equipped || data.companions)) {
    const legacy = normalizeLook(data)
    const looks = {}
    if (!isEmptyLook(legacy)) for (const id of LOOKS) looks[id] = legacy
    return { looks, boostUntil, spent }
  }

  const looks = {}
  for (const id of LOOKS) {
    const look = normalizeLook(data.looks?.[id])
    if (!isEmptyLook(look)) looks[id] = look
  }
  return { looks, boostUntil, spent }
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
  return Object.keys(entry.looks).length === 0 && !entry.boostUntil && !entry.spent
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

/** What this person owns and is wearing in one particular look. */
export function lookFor(entry, themeId) {
  return entry?.looks?.[themeId] ?? emptyLook
}

function withEntry(estate, personId, entry) {
  return { ...estate, [personId]: entry }
}

function withLook(estate, personId, themeId, look) {
  const entry = entryFor(estate, personId)
  return withEntry(estate, personId, { ...entry, looks: { ...entry.looks, [themeId]: look } })
}

// --- buying -----------------------------------------------------------------
//
// Every mutator takes the balance and refuses rather than going negative. The
// screen disables the button too, but the rule lives here so the logic suite can
// hold it without a browser.

/**
 * Buy a one-off item and wear it immediately — buying it is the point.
 *
 * `themeId` is which look it goes into. The credits come out of the one pot
 * either way, so buying the freighter really is money not spent on the cat.
 */
export function buyItem(estate, personId, themeId, item, balance) {
  if (!item || !personId || !themeId) return estate
  const entry = entryFor(estate, personId)
  const look = lookFor(entry, themeId)
  if (look.owned.includes(item.id)) return estate
  if (balance < item.cost) return estate
  return withEntry(estate, personId, {
    ...entry,
    spent: entry.spent + item.cost,
    looks: {
      ...entry.looks,
      [themeId]: {
        ...look,
        owned: [...look.owned, item.id],
        equipped: { ...look.equipped, [item.slot]: item.id },
      },
    },
  })
}

/** Wear something already owned. Passing the equipped id again takes it off. */
export function equip(estate, personId, themeId, itemId) {
  const item = itemById(itemId)
  if (!item || !personId || !themeId) return estate
  const look = lookFor(entryFor(estate, personId), themeId)
  if (!look.owned.includes(itemId)) return estate
  const equipped = { ...look.equipped }
  if (equipped[item.slot] === itemId) delete equipped[item.slot]
  else equipped[item.slot] = itemId
  return withLook(estate, personId, themeId, { ...look, equipped })
}

export function buyCompanion(estate, personId, themeId, cost, balance, name = '') {
  if (!personId || !themeId) return estate
  const entry = entryFor(estate, personId)
  const look = lookFor(entry, themeId)
  if (look.companions.length >= MAX_COMPANIONS) return estate
  if (balance < cost) return estate
  const companion = { id: `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name }
  return withEntry(estate, personId, {
    ...entry,
    spent: entry.spent + cost,
    looks: { ...entry.looks, [themeId]: { ...look, companions: [...look.companions, companion] } },
  })
}

export function renameCompanion(estate, personId, themeId, companionId, name) {
  const look = lookFor(entryFor(estate, personId), themeId)
  return withLook(estate, personId, themeId, {
    ...look,
    companions: look.companions.map((c) => (c.id === companionId ? { ...c, name: name.trim() } : c)),
  })
}

/**
 * The consumable. Buying it again while one is running extends it rather than
 * replacing it — nobody should lose time by being enthusiastic.
 *
 * Not per look: a treat is a mood, and it should light up whichever scene you
 * happen to be looking at.
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
