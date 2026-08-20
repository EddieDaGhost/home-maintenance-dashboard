// Today's weather, for a town the user typed in.
//
// The rule that shapes this file is design rule 7: nothing waits on the
// network. The last reading is cached on the device and painted the instant the
// screen opens; the refresh happens afterwards and is allowed to fail. With no
// signal you get this morning's reading and the time it was taken, which is
// honest and useful, rather than a spinner and an error.
//
// The cache is derived data, so it is device-local: not in the sync document,
// not in backups. Losing it costs one request.

import { forecastEndpoints } from '../config/forecast.js'
import { UNITS } from './places.js'

const CACHE_KEY = 'home-maintenance-dashboard/forecast/v1'

/** Long enough that reopening the app all morning is one request. */
export const STALE_MS = 30 * 60 * 1000

/** Slow beats hanging, but not by much — this sits in front of the day's list. */
const TIMEOUT_MS = 8000

// ---------------------------------------------------------------------------
// WMO weather codes
// ---------------------------------------------------------------------------

// The full set the forecast endpoint can return. `icon` is a key rather than a
// component so this file stays importable from Node for the logic suite.
const CODES = {
  0: { label: 'Clear', icon: 'sun' },
  1: { label: 'Mostly clear', icon: 'sun' },
  2: { label: 'Partly cloudy', icon: 'cloud-sun' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Fog', icon: 'fog' },
  48: { label: 'Freezing fog', icon: 'fog' },
  51: { label: 'Light drizzle', icon: 'drizzle' },
  53: { label: 'Drizzle', icon: 'drizzle' },
  55: { label: 'Heavy drizzle', icon: 'drizzle' },
  56: { label: 'Freezing drizzle', icon: 'drizzle' },
  57: { label: 'Freezing drizzle', icon: 'drizzle' },
  61: { label: 'Light rain', icon: 'rain' },
  63: { label: 'Rain', icon: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain' },
  66: { label: 'Freezing rain', icon: 'rain' },
  67: { label: 'Freezing rain', icon: 'rain' },
  71: { label: 'Light snow', icon: 'snow' },
  73: { label: 'Snow', icon: 'snow' },
  75: { label: 'Heavy snow', icon: 'snow' },
  77: { label: 'Snow grains', icon: 'snow' },
  80: { label: 'Showers', icon: 'rain' },
  81: { label: 'Showers', icon: 'rain' },
  82: { label: 'Heavy showers', icon: 'rain' },
  85: { label: 'Snow showers', icon: 'snow' },
  86: { label: 'Heavy snow showers', icon: 'snow' },
  95: { label: 'Thunderstorm', icon: 'storm' },
  96: { label: 'Thunderstorm with hail', icon: 'storm' },
  99: { label: 'Thunderstorm with hail', icon: 'storm' },
}

/** Never returns undefined — an unknown code is still weather. */
export function describeCode(code) {
  return CODES[code] ?? { label: 'Weather', icon: 'cloud' }
}

export const ALL_CODES = Object.keys(CODES).map(Number)

export const unitSymbol = (units) => (units === UNITS.C ? '°C' : '°F')

/** Rounded, with its degree sign. Missing readings show a dash, never NaN. */
export function formatTemp(value, units) {
  if (!Number.isFinite(value)) return '—'
  return `${Math.round(value)}${unitSymbol(units)}`
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function getJson(url, { signal } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const onOuterAbort = () => controller.abort()
  signal?.addEventListener('abort', onOuterAbort)
  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) throw new Error(`Weather lookup failed (${response.status})`)
    return await response.json()
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onOuterAbort)
  }
}

/** "Kalamazoo, Michigan" — enough to tell two same-named towns apart. */
export function placeLabel(result) {
  return [result?.name, result?.admin1, result?.country_code]
    .filter((part) => typeof part === 'string' && part.trim())
    .slice(0, 2)
    .join(', ')
}

/**
 * Turn a town or postcode into somewhere the forecast can be asked about.
 * Throws with a plain-English message, because that message goes on screen.
 */
export async function lookupPlace(query, options) {
  const clean = String(query ?? '').trim()
  if (!clean) throw new Error('Type a town or a postcode first.')

  const { geocode } = forecastEndpoints()
  const url = `${geocode}?name=${encodeURIComponent(clean)}&count=1&language=en&format=json`

  let data
  try {
    data = await getJson(url, options)
  } catch {
    throw new Error("Couldn't reach the weather service. Try again in a minute.")
  }

  const result = data?.results?.[0]
  if (!result || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude)) {
    throw new Error(`No town called "${clean}" was found. A town or a postcode works best.`)
  }

  return {
    query: clean,
    label: placeLabel(result) || clean,
    latitude: result.latitude,
    longitude: result.longitude,
  }
}

/** Today's numbers for a place. Never throws a raw network error at the UI. */
export async function fetchForecast(home, options) {
  const { forecast } = forecastEndpoints()
  const units = home?.units === UNITS.C ? UNITS.C : UNITS.F
  const url =
    `${forecast}?latitude=${home.latitude}&longitude=${home.longitude}` +
    '&current=temperature_2m,weather_code,is_day' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
    `&timezone=auto&temperature_unit=${units}&wind_speed_unit=${units === UNITS.C ? 'kmh' : 'mph'}` +
    '&forecast_days=1'

  let data
  try {
    data = await getJson(url, options)
  } catch {
    throw new Error("Couldn't reach the weather service.")
  }

  return readingFrom(data, units)
}

/** The shape the screen draws, pulled out so the logic suite can check it. */
export function readingFrom(data, units) {
  const now = data?.current ?? {}
  const day = data?.daily ?? {}
  const first = (list) => (Array.isArray(list) ? list[0] : undefined)

  return {
    units,
    at: Date.now(),
    temperature: Number.isFinite(now.temperature_2m) ? now.temperature_2m : null,
    code: Number.isFinite(now.weather_code) ? now.weather_code : first(day.weather_code) ?? null,
    isDay: now.is_day !== 0,
    high: first(day.temperature_2m_max) ?? null,
    low: first(day.temperature_2m_min) ?? null,
    rainChance: first(day.precipitation_probability_max) ?? null,
  }
}

// ---------------------------------------------------------------------------
// The cache
// ---------------------------------------------------------------------------

/** A reading belongs to one place in one unit; changing either invalidates it. */
export function cacheKey(home) {
  if (!home) return null
  return `${home.latitude},${home.longitude},${home.units}`
}

export function isStale(cached, now = Date.now()) {
  if (!cached?.at) return true
  return now - cached.at >= STALE_MS
}

export function loadReading(home) {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.key !== cacheKey(home)) return null
    return Number.isFinite(parsed.reading?.at) ? parsed.reading : null
  } catch {
    return null
  }
}

export function saveReading(home, reading) {
  if (typeof window === 'undefined') return
  try {
    if (!home || !reading) {
      window.localStorage.removeItem(CACHE_KEY)
      return
    }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ key: cacheKey(home), reading }))
  } catch {
    // Private browsing — every open is a fresh request.
  }
}

export function clearReading() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CACHE_KEY)
  } catch {
    // Nothing to do.
  }
}
