// When did somebody last change the settings *on this device*?
//
// Rooms, names and the roster are last-write-wins, so the timestamp attached to
// a push has to be the moment of the edit. Working it out by comparing state
// before and after doesn't survive a round trip through the server — key order
// and normalisation shift, the comparison sees a change that never happened,
// and a device that only *read* the settings ends up stamping them as its own
// and clobbering the other phone.
//
// So the providers say so explicitly instead: every user-facing mutator calls
// markSettingsChanged(). Nothing else does.

const KEY = 'home-maintenance-dashboard/settings-clock/v1'

export function markSettingsChanged(at = Date.now()) {
  if (typeof window === 'undefined') return at
  try {
    window.localStorage.setItem(KEY, String(at))
  } catch {
    // Private browsing — settings just won't win a merge.
  }
  return at
}

export function settingsChangedAt() {
  if (typeof window === 'undefined') return 0
  try {
    const raw = Number(window.localStorage.getItem(KEY))
    return Number.isFinite(raw) ? raw : 0
  } catch {
    return 0
  }
}

/** Wraps a set of mutators so calling any of them stamps the clock. */
export function touching(mutators) {
  const wrapped = {}
  for (const [name, fn] of Object.entries(mutators)) {
    wrapped[name] = (...args) => {
      markSettingsChanged()
      return fn(...args)
    }
  }
  return wrapped
}
