// Credits: what logging chores adds up to over months, as opposed to points,
// which measure this week and reset on Monday.
//
// Nothing is stored. A person's earnings are derived from the completions they
// logged, which means credits inherit everything the log already has — they
// merge correctly across phones and they travel in backups, with no second
// ledger to keep in step.

import { ALL_SLOTS, itemById } from '../config/catalog.js'
import { STATUS, getTaskState } from './schedule.js'

/**
 * Completions logged before the household feature existed carry no `by`. They
 * belong to whoever set the app up, which is the first person on the roster —
 * so a long solo history counts as that person's rather than nobody's.
 */
function ownerOf(entry, roster) {
  return entry?.by ?? roster?.[0]?.id ?? null
}

/** Total credits a person has ever earned. */
export function creditsEarned(log, tasks, personId, roster = []) {
  if (!personId) return 0
  const points = Object.fromEntries(tasks.map((task) => [task.id, task.points ?? 1]))
  let total = 0
  for (const [taskId, entries] of Object.entries(log?.completions ?? {})) {
    const worth = points[taskId]
    // A task that no longer exists still earned its credits at the time, but we
    // have no way to price it now. Treat it as one credit rather than zero.
    const value = worth ?? 1
    for (const entry of entries) {
      if (ownerOf(entry, roster) === personId) total += value
    }
  }
  return total
}

export function creditsSpent(estateEntry) {
  const spent = estateEntry?.spent
  return Number.isFinite(spent) && spent > 0 ? spent : 0
}

/** Never negative, even if a sync brings back a purchase we can't account for. */
export function creditsBalance(log, tasks, personId, roster, estateEntry) {
  return Math.max(0, creditsEarned(log, tasks, personId, roster) - creditsSpent(estateEntry))
}

export function canAfford(balance, item) {
  return Boolean(item) && balance >= item.cost
}

/** True when this person already owns a one-off item. */
export function owns(estateEntry, itemId) {
  return (estateEntry?.owned ?? []).includes(itemId)
}

export function equippedItem(estateEntry, slot) {
  const id = estateEntry?.equipped?.[slot]
  return id ? itemById(id) : null
}

/** What the scene should be drawn from: the equipped item per slot. */
export function equippedItems(estateEntry) {
  return Object.fromEntries(ALL_SLOTS.map((slot) => [slot, equippedItem(estateEntry, slot)]))
}

export function boostActive(estateEntry, now = Date.now()) {
  const until = estateEntry?.boostUntil
  return Number.isFinite(until) && until > now
}

// ---------------------------------------------------------------------------
// How the scene feels
// ---------------------------------------------------------------------------

/**
 * Two states, and that is the whole range. Nothing here decays, breaks, or
 * accuses anybody of anything — see design rule #2 in CLAUDE.md. "Quiet" is a
 * dimmer light and a sleeping cat; one log puts it back to lively.
 *
 * "Behind" reuses the app's existing definition (STATUS.OVERDUE) rather than
 * inventing a second one, so the scene and the task list can never disagree.
 */
export const MOOD = { LIVELY: 'lively', QUIET: 'quiet' }

export function sceneMood(log, now, tasks = [], estateEntry = null) {
  const at = now instanceof Date ? now.getTime() : now
  if (boostActive(estateEntry, at)) return MOOD.LIVELY
  for (const task of tasks) {
    const state = getTaskState(task, log?.completions?.[task.id] ?? [], now)
    if (state.status === STATUS.OVERDUE) return MOOD.QUIET
  }
  return MOOD.LIVELY
}
