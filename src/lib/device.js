// Is this device one of ours, or is someone just tapping a sticker?
//
// This is a buffer, not a lock. Every device already keeps its own data — a
// visitor's phone has never seen your history and can't. What this fixes is
// what a visitor *sees*: without it they get your chore list with nothing
// logged, which reads like a list of jobs waiting for them. With it they get
// an explanation of what they just tapped.

const STORAGE_KEY = 'home-maintenance-dashboard/device/v1'

export function loadDevice() {
  if (typeof window === 'undefined') return { claimed: false }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { claimed: false }
    const parsed = JSON.parse(raw)
    return { claimed: parsed?.claimed === true, claimedAt: parsed?.claimedAt }
  } catch {
    return { claimed: false }
  }
}

export function saveDevice(device) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(device))
  } catch {
    // Private browsing — the welcome screen will show again next visit.
  }
}

export function claimDevice() {
  const device = { claimed: true, claimedAt: Date.now() }
  saveDevice(device)
  return device
}

export function unclaimDevice() {
  const device = { claimed: false }
  saveDevice(device)
  return device
}

/**
 * A device that already has data on it belongs to somebody — anyone using this
 * before the welcome screen existed must not suddenly be greeted like a guest.
 */
export function looksSetUp({ log, names, custom, household }) {
  if (Object.keys(log?.completions ?? {}).length > 0) return true
  if (Object.keys(names ?? {}).length > 0) return true
  if ((custom?.areas ?? []).length > 0) return true
  if ((custom?.hidden ?? []).length > 0) return true
  if (Object.keys(custom?.tasks ?? {}).length > 0) return true
  if ((household?.people ?? []).length > 1) return true
  return false
}
