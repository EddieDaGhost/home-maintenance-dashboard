// Where you are, and where you work.
//
// Two strings and a pair of coordinates, and the only part of the app that
// knows anything about the world outside the house. Both are opt-in: until
// somebody fills this in, no request is ever made and no key is ever written.
//
// `home` is a town or a postcode, not a street address — that is what the
// forecast lookup resolves, and it is all a forecast needs. `work` is free
// text of any shape because nothing here ever parses it: it goes into a maps
// link when the button is tapped, and nowhere else. See src/lib/maps.js.
//
// This is settings rather than history, so it rides in the sync document and
// is last-write-wins. That is right for something edited about once a year.

const STORAGE_KEY = 'home-maintenance-dashboard/places/v1'

export const emptyPlaces = { home: null, work: null }

const MAX_LABEL = 80
const MAX_ADDRESS = 160

export const UNITS = { F: 'fahrenheit', C: 'celsius' }

/** Somebody in the US wants Fahrenheit; everybody else almost certainly doesn't. */
export function defaultUnits(locale = typeof navigator === 'undefined' ? 'en' : navigator.language) {
  return /^en-(US|as|gu|mp|pr|um|vi)$/i.test(locale ?? '') ? UNITS.F : UNITS.C
}

const text = (value, max) => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().slice(0, max)
  return trimmed.length ? trimmed : null
}

export function normalizePlaces(data) {
  if (!data || typeof data !== 'object') return emptyPlaces

  let home = null
  const raw = data.home
  if (raw && typeof raw === 'object') {
    const query = text(raw.query, MAX_LABEL)
    // Coordinates are what the forecast is actually fetched with, so a home
    // without them is not usable — better to have the user look it up again
    // than to hold a half-record that quietly never loads.
    if (query && Number.isFinite(raw.latitude) && Number.isFinite(raw.longitude)) {
      home = {
        query,
        label: text(raw.label, MAX_LABEL) ?? query,
        latitude: raw.latitude,
        longitude: raw.longitude,
        units: raw.units === UNITS.C ? UNITS.C : raw.units === UNITS.F ? UNITS.F : defaultUnits(),
      }
    }
  }

  const work = text(data.work, MAX_ADDRESS)

  return { home, work }
}

export function loadPlaces() {
  if (typeof window === 'undefined') return emptyPlaces
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyPlaces
    return normalizePlaces(JSON.parse(raw))
  } catch {
    return emptyPlaces
  }
}

export function savePlaces(places) {
  if (typeof window === 'undefined') return
  try {
    // Nothing set means nothing stored — a visitor who never fills this in
    // leaves no trace, the same as every other store in the app.
    if (!places?.home && !places?.work) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(places))
  } catch {
    // Private browsing — it just won't persist.
  }
}

// --- writing ----------------------------------------------------------------

export function setHome(places, home) {
  return normalizePlaces({ ...(places ?? emptyPlaces), home })
}

export function setUnits(places, units) {
  if (!places?.home) return normalizePlaces(places)
  return normalizePlaces({ ...places, home: { ...places.home, units } })
}

export function setWork(places, address) {
  return normalizePlaces({ ...(places ?? emptyPlaces), work: address })
}

export function clearHome(places) {
  return normalizePlaces({ ...(places ?? emptyPlaces), home: null })
}

export function clearWork(places) {
  return normalizePlaces({ ...(places ?? emptyPlaces), work: null })
}

export const hasPlaces = (places) => Boolean(places?.home || places?.work)
