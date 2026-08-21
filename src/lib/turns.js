// Whose job is it?
//
// Two answers and a shrug: a chore can belong to one person, it can rotate
// between everybody, or it can belong to nobody in particular — which is what
// every chore did before this file existed and what most of them should stay.
//
// **Nothing here is stored.** A rotation is worked out from the `by` on the
// completions that already exist, which is the same field creditsEarned() reads.
// One record of who did what, one answer about whose turn it is. Storing a
// pointer instead would be a second opinion that drifts the first time somebody
// logs from the other phone while offline.
//
// **This is a hint, never a lock.** Anyone can still tap Log on anything, in one
// tap, whoever's turn it says it is — design rule 4. And it is never a telling
// off: the app says whose turn it is, never that somebody missed theirs.

import { timeOf } from './storage.js'

/** The value stored on a task to say it goes round the household. */
export const ROTATE = 'rotate'

/** Assignment lives in custom.taskSettings, so it can only ever be these. */
export function isValidAssignee(value, roster = []) {
  if (value === ROTATE) return true
  return typeof value === 'string' && roster.some((person) => person.id === value)
}

/** Who logged this most recently, or null. */
export function lastLoggedBy(entries = []) {
  let newest = null
  for (const entry of entries) {
    const at = timeOf(entry)
    if (!Number.isFinite(at)) continue
    if (!newest || at > newest.at) newest = { at, by: entry?.by ?? null }
  }
  return newest?.by ?? null
}

/**
 * Whose turn it is, or null when it's anybody's.
 *
 * A person who has left the household is not somebody's turn any more, so a
 * task assigned to them reads as unassigned rather than as a name nobody
 * recognises — the same shape as a removed room keeping its history without
 * still being on the dashboard.
 */
export function whoseTurn(task, entries = [], roster = []) {
  const assignee = task?.assignee
  if (!assignee || !roster.length) return null

  if (assignee !== ROTATE) {
    return roster.some((person) => person.id === assignee) ? assignee : null
  }

  // Rotating: whoever comes after the last person to do it. Never done, or done
  // by somebody who has since left — start at the top of the roster.
  const last = lastLoggedBy(entries)
  const index = roster.findIndex((person) => person.id === last)
  if (index === -1) return roster[0].id
  return roster[(index + 1) % roster.length].id
}

/** True when this task is one of `personId`'s right now. */
export function isTurnOf(task, entries, roster, personId) {
  if (!personId) return false
  return whoseTurn(task, entries, roster) === personId
}

/**
 * The queue, narrowed to one person. Deliberately keeps tasks that belong to
 * nobody: "mine" means the things that are mine to worry about, and an
 * unassigned chore is everybody's to worry about, not nobody's.
 */
export function mineOf(queue, log, roster, personId) {
  if (!personId) return queue
  return queue.filter(({ task }) => {
    const turn = whoseTurn(task, log?.completions?.[task.id] ?? [], roster)
    return turn === null || turn === personId
  })
}

/** How the assignment reads on screen. Never a scolding — see the note above. */
export function turnLabel(task, entries, roster, personId, nameOf) {
  const turn = whoseTurn(task, entries, roster)
  if (!turn) return null
  if (turn === personId) return task.assignee === ROTATE ? 'Your turn' : 'Yours'
  const name = nameOf(turn)
  return task.assignee === ROTATE ? `${name}'s turn` : name
}
