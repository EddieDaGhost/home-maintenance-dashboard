// Backup and restore.
//
// Everything lives in this browser, which means one "Clear History and Website
// Data" tap wipes your streak with no warning and no undo. A backup file is
// the only safety net, and it's also how you move to a new phone.

import { normalizeCompletions } from './storage.js'
import { normalizePeople, DEFAULT_PEOPLE } from './people.js'
import { normalizeCustom, emptyCustom } from './custom.js'
import { normalizeEstate, emptyEstate } from './estate.js'
import { normalizeAway, emptyAway } from './away.js'
import { normalizePlaces, emptyPlaces } from './places.js'
import { normalizeDaily, emptyDaily } from './daily.js'

const APP_ID = 'home-maintenance-dashboard'

export function buildBackup(log, names, household, custom, estate, away, places, daily) {
  return {
    app: APP_ID,
    version: 5,
    exportedAt: new Date().toISOString(),
    completions: log?.completions ?? {},
    names: names ?? {},
    household: household ?? DEFAULT_PEOPLE,
    custom: custom ?? emptyCustom,
    estate: estate ?? emptyEstate,
    away: away ?? emptyAway,
    places: places ?? emptyPlaces,
    // Today's scratch list doesn't sync, so a backup is the only way it moves.
    daily: daily ?? emptyDaily,
  }
}

export function downloadBackup(
  log,
  names,
  household,
  custom,
  estate,
  away,
  places,
  daily,
  now = new Date(),
) {
  const json = JSON.stringify(
    buildBackup(log, names, household, custom, estate, away, places, daily),
    null,
    2,
  )
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const date = now.toISOString().slice(0, 10)
  const link = document.createElement('a')
  link.href = url
  link.download = `home-maintenance-backup-${date}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Reads a backup file back into app data.
 * Throws with a plain-English message if the file isn't one of ours.
 */
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't readable. Pick the .json file you saved from this app.")
  }

  if (!data || typeof data !== 'object' || data.app !== APP_ID) {
    throw new Error("That doesn't look like a Home Maintenance backup.")
  }

  // Version 1 backups hold plain timestamps; normalizeCompletions upgrades them.
  const completions = normalizeCompletions(data.completions)

  const names = {}
  for (const [id, value] of Object.entries(data.names ?? {})) {
    if (!value || typeof value !== 'object') continue
    const entry = {}
    if (typeof value.name === 'string') entry.name = value.name
    if (typeof value.subtitle === 'string') entry.subtitle = value.subtitle
    if (Object.keys(entry).length) names[id] = entry
  }

  const total = Object.values(completions).reduce((sum, list) => sum + list.length, 0)
  return {
    log: { version: 2, completions },
    names,
    household: data.household ? normalizePeople(data.household) : DEFAULT_PEOPLE,
    custom: data.custom ? normalizeCustom(data.custom) : emptyCustom,
    // Version 1 and 2 files predate the estate, 3 predates away windows and 4
    // predates the today screen; an empty one is the right answer either way.
    estate: data.estate ? normalizeEstate(data.estate) : emptyEstate,
    away: data.away ? normalizeAway(data.away) : emptyAway,
    places: data.places ? normalizePlaces(data.places) : emptyPlaces,
    daily: data.daily ? normalizeDaily(data.daily) : emptyDaily,
    total,
  }
}
