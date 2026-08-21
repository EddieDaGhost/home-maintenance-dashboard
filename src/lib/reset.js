// Starting over.
//
// Everything else in this app is additive on purpose — hiding a room keeps its
// history, ending a trip early trims it rather than deleting it, a fresh start
// logs nothing and deletes nothing. This is the one thing that actually takes
// something away, so the boundary of what it touches is written down here as
// data rather than left implicit in a component.
//
// What it clears is *what you did*. What it keeps is *what you set up*: the
// rooms and tasks you added, the ones you edited, who's in the household, what
// they're called, your town, your list. You are not rebuilding the app, you are
// putting the scoreboard back to zero.

/**
 * The reset, as a pure function of everything it touches.
 *
 * `custom` is deliberately absent from the return: nothing here may so much as
 * read it, which is the cheapest way to guarantee an edited task survives.
 */
export function hardReset({ away } = {}) {
  return {
    // Points, the streak, credits earned, and every chore back to not-done —
    // all of them derived from this one map, so emptying it is the whole job.
    log: { version: 2, completions: {} },

    // Purchases, what's worn, companions and the spend. Credits are earned
    // minus spent and both sides are now zero.
    estate: {},

    // A fresh start draws a line under a backlog. With no history there is no
    // backlog and nothing for the line to mean, so it goes too. Trips stay:
    // they are a record of where the household was, not of what it achieved.
    away: { ...(away ?? { windows: [], freshStartAt: 0 }), freshStartAt: 0 },
  }
}

/**
 * What a reset will actually cost, for the confirmation to state plainly.
 * Nobody should have to guess at the size of something irreversible.
 */
export function resetSummary(log, estate, personId = null) {
  const completions = Object.values(log?.completions ?? {})
  const logged = completions.reduce((total, entries) => total + entries.length, 0)

  let bought = 0
  let spent = 0
  for (const [id, entry] of Object.entries(estate ?? {})) {
    if (personId && id !== personId) continue
    spent += Number.isFinite(entry?.spent) ? entry.spent : 0
    for (const look of Object.values(entry?.looks ?? {})) {
      bought += (look?.owned?.length ?? 0) + (look?.companions?.length ?? 0)
    }
  }

  return { logged, bought, spent, tasks: completions.length }
}
