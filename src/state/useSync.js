import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildStateDoc,
  createHousehold,
  emptyLink,
  generateKey,
  loadLink,
  mergeCompletions,
  pushAndPull,
  saveLink,
  toEvents,
} from '../lib/sync.js'
import { markSettingsChanged, settingsChangedAt } from '../lib/settingsClock.js'

const AUTO_SYNC_MS = 5 * 60 * 1000

/**
 * Keeps this device in step with the rest of the household.
 *
 * Nothing here is in the path of tapping Log — the app writes locally and this
 * catches up afterwards, on a timer, when the app comes back to the foreground,
 * and shortly after anything is logged.
 */
export function useSync({
  log,
  setLog,
  names,
  setNames,
  custom,
  setCustom,
  household,
  setHousehold,
}) {
  const [link, setLink] = useState(loadLink)
  const [status, setStatus] = useState({ state: 'idle', error: null })
  const inFlight = useRef(false)

  // Settings are last-write-wins, so what matters is when this device last
  // *edited* them — read from the settings clock, which the providers stamp on
  // real user actions. See src/lib/settingsClock.js for why this isn't inferred.
  const remoteStateAt = useRef(null)

  // Everything the sync needs, kept in a ref so the callback below doesn't have
  // to be rebuilt (and re-trigger effects) every time a task is logged.
  const latest = useRef({ log, names, custom, household })
  latest.current = { log, names, custom, household }

  useEffect(() => {
    saveLink(link)
  }, [link])

  const syncNow = useCallback(async () => {
    if (!link.householdId || inFlight.current) return
    inFlight.current = true
    setStatus({ state: 'syncing', error: null })

    try {
      const { log: currentLog, names: currentNames, custom: currentCustom, household: currentHousehold } =
        latest.current

      // Offer settings only when this device edited them more recently than the
      // household's copy. A phone that has only ever read them stays quiet, so
      // it can never overwrite the other one's changes with its own stale copy.
      const editedAt = settingsChangedAt()
      const shouldPush = editedAt > 0 && editedAt > (remoteStateAt.current ?? 0)

      const result = await pushAndPull({
        householdId: link.householdId,
        key: link.key,
        events: toEvents(currentLog),
        state: shouldPush
          ? buildStateDoc({
              names: currentNames,
              custom: currentCustom,
              household: currentHousehold,
            })
          : null,
        stateUpdatedAt: shouldPush ? editedAt : null,
      })

      const merged = mergeCompletions(currentLog.completions, result?.completions)
      setLog((existing) => ({ ...existing, completions: mergeCompletions(existing.completions, result?.completions) }))

      // Settings only come back down when the other device wrote them more
      // recently than this one did — the server decides, we just apply.
      // Take the household's settings when they're newer than this device's
      // last edit. Otherwise ours are already the newest and there's nothing
      // to apply.
      const doc = result?.state
      const remoteAt = result?.state_updated_at ? new Date(result.state_updated_at).getTime() : null
      remoteStateAt.current = remoteAt
      if (doc && typeof doc === 'object' && remoteAt && remoteAt > editedAt) {
        if (doc.names && typeof doc.names === 'object') setNames(doc.names)
        if (doc.custom && typeof doc.custom === 'object') setCustom(doc.custom)
        if (doc.household && Array.isArray(doc.household?.people)) setHousehold(doc.household)
      }

      const at = Date.now()
      setLink((current) => ({ ...current, lastSyncAt: at }))
      setStatus({ state: 'ok', error: null, at, count: Object.keys(merged).length })
    } catch (error) {
      setStatus({ state: 'error', error: error.message })
    } finally {
      inFlight.current = false
    }
  }, [link.householdId, link.key, setLog, setNames, setCustom, setHousehold])

  /** Start sharing: mint a household and put this device in it. */
  const startSharing = useCallback(async () => {
    setStatus({ state: 'syncing', error: null })
    try {
      const key = generateKey()
      const householdId = await createHousehold(key)
      if (!householdId) throw new Error('The server did not return a household id.')
      // The device that starts the household seeds its settings.
      markSettingsChanged()
      setLink({ householdId, key, lastSyncAt: null })
      setStatus({ state: 'idle', error: null })
      return { householdId, key }
    } catch (error) {
      setStatus({ state: 'error', error: error.message })
      return null
    }
  }, [])

  /** Join one from a share link. */
  const joinHousehold = useCallback((householdId, key) => {
    setLink({ householdId, key, lastSyncAt: null })
    setStatus({ state: 'idle', error: null })
  }, [])

  const stopSharing = useCallback(() => {
    setLink(emptyLink)
    setStatus({ state: 'idle', error: null })
  }, [])

  // Logging or editing is worth pushing, but not instantly — a burst of taps
  // should produce one sync, a few seconds after the last one.
  const firstRun = useRef(true)
  useEffect(() => {
    if (!link.householdId) return undefined
    if (firstRun.current) {
      firstRun.current = false
      return undefined
    }
    const timer = setTimeout(syncNow, 2500)
    return () => clearTimeout(timer)
  }, [log, names, custom, household, link.householdId, syncNow])

  // Sync when the app opens or comes back to the front, then on a slow timer.
  useEffect(() => {
    if (!link.householdId) return undefined
    syncNow()

    const onVisible = () => {
      if (document.visibilityState === 'visible') syncNow()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', syncNow)
    const timer = setInterval(syncNow, AUTO_SYNC_MS)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', syncNow)
      clearInterval(timer)
    }
  }, [link.householdId, syncNow])

  return {
    link,
    status,
    isSharing: Boolean(link.householdId),
    syncNow,
    startSharing,
    joinHousehold,
    stopSharing,
  }
}
