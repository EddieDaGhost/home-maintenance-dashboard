// Sharing a household between two phones.
//
// Local-first, always: every Log button writes to this device's localStorage
// immediately and syncing happens afterwards. That is what keeps the app usable
// at the chicken coop with no signal — nothing waits on the network.
//
// Completions are append-only events keyed by (task, instant), so merging is a
// union with no conflicts: two phones logging while offline both arrive, and
// pushing the same event twice changes nothing. Settings (rooms, names, the
// roster) are a single document where the newest write wins.

import { syncEndpoint } from '../config/sync.js'
import { timeOf } from './storage.js'

const LINK_KEY = 'home-maintenance-dashboard/sync/v1'

// ---------------------------------------------------------------------------
// The link this device holds
// ---------------------------------------------------------------------------

export const emptyLink = { householdId: null, key: null, lastSyncAt: null }

export function loadLink() {
  if (typeof window === 'undefined') return emptyLink
  try {
    const raw = window.localStorage.getItem(LINK_KEY)
    if (!raw) return emptyLink
    const parsed = JSON.parse(raw)
    if (typeof parsed?.householdId !== 'string' || typeof parsed?.key !== 'string') return emptyLink
    return {
      householdId: parsed.householdId,
      key: parsed.key,
      lastSyncAt: Number.isFinite(parsed.lastSyncAt) ? parsed.lastSyncAt : null,
    }
  } catch {
    return emptyLink
  }
}

export function saveLink(link) {
  if (typeof window === 'undefined') return
  try {
    if (!link?.householdId) window.localStorage.removeItem(LINK_KEY)
    else window.localStorage.setItem(LINK_KEY, JSON.stringify(link))
  } catch {
    // Private browsing — sharing just won't stick.
  }
}

/** 160 bits of randomness, in a form that survives being put in a URL. */
export function generateKey() {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// Talking to Supabase (plain PostgREST, no SDK)
// ---------------------------------------------------------------------------

async function rpc(name, body, { signal } = {}) {
  const { url, anonKey } = syncEndpoint()
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    let detail = ''
    try {
      detail = (await response.json())?.message ?? ''
    } catch {
      // no body, keep the status
    }
    throw new Error(detail || `Sync failed (${response.status})`)
  }
  return response.json()
}

export async function createHousehold(key, options) {
  const id = await rpc('hm_create_household', { p_key: key }, options)
  // PostgREST returns a bare scalar for a scalar-returning function.
  return typeof id === 'string' ? id : id?.hm_create_household
}

export async function pushAndPull({ householdId, key, events, state, stateUpdatedAt }, options) {
  return rpc(
    'hm_sync',
    {
      p_household: householdId,
      p_key: key,
      p_events: events ?? [],
      p_state: state ?? null,
      p_state_updated_at: stateUpdatedAt ? new Date(stateUpdatedAt).toISOString() : null,
    },
    options,
  )
}

// ---------------------------------------------------------------------------
// Turning local data into events and back
// ---------------------------------------------------------------------------

/** Flatten the local completions map into the event shape the server takes. */
export function toEvents(log) {
  const events = []
  for (const [taskId, entries] of Object.entries(log?.completions ?? {})) {
    for (const entry of entries) {
      const at = timeOf(entry)
      if (!Number.isFinite(at)) continue
      events.push({ task_id: taskId, at: new Date(at).toISOString(), by: entry?.by ?? null })
    }
  }
  return events
}

/**
 * Union the server's completions into the local ones. Same task at the same
 * instant is the same event, so nothing duplicates however often this runs.
 */
export function mergeCompletions(localCompletions, remoteEvents) {
  const merged = {}
  for (const [taskId, entries] of Object.entries(localCompletions ?? {})) {
    merged[taskId] = [...entries]
  }

  for (const event of remoteEvents ?? []) {
    const taskId = event?.task_id
    const at = new Date(event?.at).getTime()
    if (!taskId || !Number.isFinite(at)) continue

    const entries = merged[taskId] ?? (merged[taskId] = [])
    if (entries.some((entry) => timeOf(entry) === at)) continue
    merged[taskId] = [...entries, event.by ? { at, by: event.by } : { at }]
  }

  for (const taskId of Object.keys(merged)) {
    merged[taskId].sort((a, b) => timeOf(b) - timeOf(a))
  }
  return merged
}

/** The settings that belong to the household rather than to one phone. */
export function buildStateDoc({ names, custom, household }) {
  return { names: names ?? {}, custom: custom ?? null, household: household ?? null }
}

// ---------------------------------------------------------------------------
// Share links
// ---------------------------------------------------------------------------

export function buildJoinLink(origin, { householdId, key }) {
  return `${origin}/#join=${householdId}.${key}`
}

/** Reads "#join=<uuid>.<key>" off the URL. Returns null when it isn't one. */
export function parseJoinHash(hash) {
  const match = /^#?\/?join=([0-9a-fA-F-]{36})\.([0-9a-f]{32,})$/.exec(hash ?? '')
  if (!match) return null
  return { householdId: match[1], key: match[2] }
}
