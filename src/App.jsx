import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { downloadCalendar } from './lib/calendar.js'
import { loadLog, logCompletion, saveLog, undoLastCompletion } from './lib/storage.js'
import { ThemeProvider, useTheme } from './theme/ThemeProvider.jsx'
import { NamesProvider, useNames } from './state/NamesProvider.jsx'
import { AreasProvider, useAreas } from './state/AreasProvider.jsx'
import { PeopleProvider, usePeople } from './state/PeopleProvider.jsx'
import { EstateProvider, useEstate } from './state/EstateProvider.jsx'
import { AwayProvider, useAway } from './state/AwayProvider.jsx'
import { PlacesProvider, usePlaces } from './state/PlacesProvider.jsx'
import { downloadBackup, parseBackup } from './lib/backup.js'
import { emptyHouse, hardReset } from './lib/reset.js'
import { claimDevice, loadDevice, looksSetUp } from './lib/device.js'
import { parseJoinHash } from './lib/sync.js'
import { useSync } from './state/useSync.js'
import Welcome from './components/Welcome.jsx'
import Dashboard from './components/Dashboard.jsx'
import AreaView from './components/AreaView.jsx'
import EstateScreen from './components/EstateScreen.jsx'
import SettingsScreen from './components/SettingsScreen.jsx'
import TodayScreen from './components/TodayScreen.jsx'
import WifiScreen from './components/WifiScreen.jsx'
import SpaceBackdrop from './components/SpaceBackdrop.jsx'

/** The NFC tags point at "#litter", "#kitchen", etc. Anything else = home. */
function hashAreaId() {
  if (typeof window === 'undefined') return null
  return window.location.hash.replace(/^#\/?/, '').trim().toLowerCase() || null
}

/**
 * The one hash that isn't a room: the sticker by the door.
 *
 * Reserved rather than looked up in the room list, so somebody who names a room
 * "WiFi" gets their room and this still works — and so it can be answered
 * before the welcome screen, which is the whole point of it.
 */
export const WIFI_HASH = 'wifi'

function AppShell() {
  const { theme, copy } = useTheme()
  const { names, setNames } = useNames()
  const { areas, areasById, allTasks, custom, setCustom } = useAreas()
  const { activeId, household, setHousehold } = usePeople()
  const { estate, setEstate } = useEstate()
  const { away, setAway } = useAway()
  const { places, setPlaces, daily, setDaily } = usePlaces()
  const [log, setLog] = useState(loadLog)
  const [device, setDevice] = useState(loadDevice)
  const sync = useSync({
    log,
    setLog,
    names,
    setNames,
    custom,
    setCustom,
    household,
    setHousehold,
    estate,
    setEstate,
    away,
    setAway,
    places,
    setPlaces,
  })
  const [previewing, setPreviewing] = useState(false)
  // Not a URL hash: hashes are NFC area ids, and #join= is already taken.
  const [estateOpen, setEstateOpen] = useState(false)
  const [todayOpen, setTodayOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [areaId, setAreaId] = useState(hashAreaId)
  const [now, setNow] = useState(() => new Date())
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  // An invite link from the other phone: join, then get out of the URL so the
  // key isn't sitting in the address bar or the back button.
  useEffect(() => {
    const claimJoinLink = () => {
      const invite = parseJoinHash(window.location.hash)
      if (!invite) return false
      sync.joinHousehold(invite.householdId, invite.key)
      setDevice(claimDevice())
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      setAreaId(null)
      showToast('Joined the household')
      return true
    }
    claimJoinLink()
    window.addEventListener('hashchange', claimJoinLink)
    return () => window.removeEventListener('hashchange', claimJoinLink)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync.joinHousehold])

  // Follow the URL hash, which is how an NFC tap lands on a specific area.
  useEffect(() => {
    const onHashChange = () => {
      if (parseJoinHash(window.location.hash)) return
      setAreaId(hashAreaId())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Keep statuses honest as the clock rolls past midnight or into the weekend.
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60 * 1000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        setNow(new Date())
        setLog(loadLog())
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    saveLog(log)
  }, [log])

  // A device with data on it already belongs to someone — never greet them as a
  // visitor just because the welcome screen didn't exist when they set up.
  useEffect(() => {
    if (device.claimed) return
    if (looksSetUp({ log, names, custom, household })) setDevice(claimDevice())
  }, [device.claimed, log, names, custom, household])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = useCallback((message) => {
    setToast({ message, key: Date.now() })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  const handleLog = useCallback(
    (taskId) => {
      const task = allTasks.find((t) => t.id === taskId)
      setLog((current) => logCompletion(current, taskId, { by: activeId }))
      setNow(new Date())
      const cheer = copy.cheers[Math.floor(Math.random() * copy.cheers.length)]
      showToast(`${cheer} — +${task?.points ?? 1} ${copy.pointsUnit}`)
    },
    [allTasks, activeId, copy, showToast],
  )

  const handleUndo = useCallback(
    (taskId) => {
      setLog((current) => undoLastCompletion(current, taskId))
      setNow(new Date())
      showToast(copy.undone)
    },
    [copy, showToast],
  )

  const goToArea = useCallback((id) => {
    window.location.hash = id
    setAreaId(id)
    // Leaving for a room ends the visit to the estate screen, so coming back
    // from that room lands on the dashboard rather than somewhere unexpected.
    setEstateOpen(false)
    setTodayOpen(false)
    setSettingsOpen(false)
    window.scrollTo({ top: 0 })
  }, [])

  const goHome = useCallback(() => {
    // Clear the hash without leaving an empty "#" in the address bar.
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    setAreaId(null)
    window.scrollTo({ top: 0 })
  }, [])

  const handleExport = useCallback(() => {
    downloadCalendar(log, new Date(), names, areas)
    showToast(copy.exported)
  }, [log, names, areas, copy, showToast])

  const handleBackup = useCallback(() => {
    downloadBackup(log, names, household, custom, estate, away, places, daily)
    showToast('Backup saved')
  }, [log, names, household, custom, estate, away, places, daily, showToast])

  const handleRestore = useCallback(
    async (file) => {
      try {
        const restored = parseBackup(await file.text())
        const { log: restoredLog, names: restoredNames, total } = restored
        const ok = window.confirm(
          `Restore ${total} logged ${total === 1 ? 'task' : 'tasks'}?\n\n` +
            'This replaces the history and names on this device.',
        )
        if (!ok) return
        setLog(restoredLog)
        setNames(restoredNames)
        setHousehold(restored.household)
        setCustom(restored.custom)
        setEstate(restored.estate)
        setAway(restored.away)
        setPlaces(restored.places)
        setDaily(restored.daily)
        setNow(new Date())
        showToast('Backup restored')
      } catch (error) {
        showToast(error.message)
      }
    },
    [setNames, setHousehold, setCustom, setEstate, setAway, setPlaces, setDaily, showToast],
  )

  /**
   * Start over. Clears what you did; keeps what you set up.
   *
   * The shared copy goes first. hm_sync merges completions by union, so wiping
   * this phone while the household still holds its history achieves nothing —
   * the next sync hands it all straight back. If the server refuses, nothing
   * local is touched and the sheet says why.
   */
  const handleReset = useCallback(async () => {
    const shared = await sync.resetShared()
    if (!shared.ok) return shared

    const fresh = hardReset({ away })
    setLog(fresh.log)
    setEstate(fresh.estate)
    setAway(fresh.away)
    setNow(new Date())
    showToast('Back to zero')
    return { ok: true }
  }, [sync, away, setEstate, setAway, showToast])

  /**
   * Start from scratch — a genuinely new app, minus the look.
   *
   * Same order as the reset above: the shared copy first, so a refusal costs
   * nothing. Everything after that is one emptied store per provider, and the
   * emptied `custom` travels the ordinary last-write-wins settings path to the
   * other phone.
   */
  const handleScratch = useCallback(async () => {
    const shared = await sync.resetShared()
    if (!shared.ok) return shared

    const fresh = emptyHouse()
    setLog(fresh.log)
    setEstate(fresh.estate)
    setAway(fresh.away)
    setCustom(fresh.custom)
    setHousehold(fresh.household)
    setNames(fresh.names)
    setPlaces(fresh.places)
    setDaily(fresh.daily)
    setNow(new Date())
    showToast('An empty house')
    return { ok: true }
  }, [sync, setEstate, setAway, setCustom, setHousehold, setNames, setPlaces, setDaily, showToast])

  const area = useMemo(() => (areaId ? (areasById[areaId] ?? null) : null), [areaId, areasById])
  const wifi = areaId === WIFI_HASH

  const handleClaim = useCallback(() => {
    setDevice(claimDevice())
    setPreviewing(false)
  }, [])

  /**
   * A guest tapping the sticker by the door is the one visitor who should get
   * something other than the welcome screen — they're not here to set the app
   * up, they want the WiFi. So this is answered before the claim gate, and on
   * a phone that has never seen this app before.
   */
  if (wifi) {
    return (
      <>
        {theme.flavor === 'space' ? <SpaceBackdrop /> : null}
        <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-4">
          <WifiScreen onBack={device.claimed ? goHome : null} />
        </div>
      </>
    )
  }

  // An unclaimed device gets an explanation, not somebody else's chore list.
  if (!device.claimed && !previewing) {
    return (
      <>
        {theme.flavor === 'space' ? <SpaceBackdrop /> : null}
        <div className="relative z-10 mx-auto w-full max-w-md px-4">
          <Welcome
            tappedArea={area}
            onClaim={handleClaim}
            onPreview={() => setPreviewing(true)}
          />
        </div>
      </>
    )
  }

  const readOnly = previewing

  return (
    <>
      {theme.flavor === 'space' ? <SpaceBackdrop /> : null}

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-4">
        {readOnly ? (
          <div
            className="sticky top-0 z-30 -mx-4 mb-3 flex items-center gap-3 px-4 py-2.5"
            style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}
          >
            <p className="min-w-0 flex-1 text-xs leading-snug" style={{ color: 'var(--ink-2)' }}>
              <strong style={{ color: 'var(--ink)' }}>Just looking.</strong> Nothing here is saved,
              and this isn&apos;t anyone&apos;s real history.
            </p>
            <button type="button" onClick={handleClaim} className="btn-primary h-9 shrink-0 px-3 text-xs">
              Set up
            </button>
          </div>
        ) : null}

        {settingsOpen && !area ? (
          <SettingsScreen
            log={log}
            now={now}
            onBack={() => setSettingsOpen(false)}
            onExport={handleExport}
            onBackup={handleBackup}
            onRestore={handleRestore}
            onReset={handleReset}
            onScratch={handleScratch}
            onOpenWifi={() => goToArea(WIFI_HASH)}
            onToast={showToast}
            sync={sync}
          />
        ) : todayOpen && !area ? (
          <TodayScreen
            log={log}
            now={now}
            onLog={handleLog}
            onUndo={handleUndo}
            onBack={() => setTodayOpen(false)}
            readOnly={readOnly}
          />
        ) : estateOpen && !area ? (
          <EstateScreen
            log={log}
            now={now}
            onBack={() => setEstateOpen(false)}
            onToast={showToast}
            readOnly={readOnly}
          />
        ) : area ? (
          <AreaView
            area={area}
            log={log}
            now={now}
            onLog={handleLog}
            onUndo={handleUndo}
            onBack={goHome}
            readOnly={readOnly}
          />
        ) : (
          <Dashboard
            log={log}
            now={now}
            onLog={handleLog}
            onUndo={handleUndo}
            onOpenArea={goToArea}
            onOpenEstate={() => {
              setEstateOpen(true)
              window.scrollTo({ top: 0 })
            }}
            onOpenToday={() => {
              setTodayOpen(true)
              window.scrollTo({ top: 0 })
            }}
            onOpenSettings={() => {
              setSettingsOpen(true)
              window.scrollTo({ top: 0 })
            }}
            sync={sync}
            readOnly={readOnly}
          />
        )}

        {toast ? (
          <div
            key={toast.key}
            role="status"
            className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
          >
            <div
              className="rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg"
              style={{
                background: 'var(--toast-bg)',
                color: 'var(--toast-ink)',
                border: '1px solid var(--line)',
              }}
            >
              {toast.message}
            </div>
          </div>
        ) : null}
      </div>
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <NamesProvider>
        <AreasProvider>
          <PeopleProvider>
            <EstateProvider>
              <AwayProvider>
                <PlacesProvider>
                  <AppShell />
                </PlacesProvider>
              </AwayProvider>
            </EstateProvider>
          </PeopleProvider>
        </AreasProvider>
      </NamesProvider>
    </ThemeProvider>
  )
}
