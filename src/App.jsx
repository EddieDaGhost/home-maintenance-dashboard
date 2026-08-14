import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AREAS_BY_ID, ALL_TASKS } from './config/areas.js'
import { downloadCalendar } from './lib/calendar.js'
import { loadLog, logCompletion, saveLog, undoLastCompletion } from './lib/storage.js'
import { ThemeProvider, useTheme } from './theme/ThemeProvider.jsx'
import Dashboard from './components/Dashboard.jsx'
import AreaView from './components/AreaView.jsx'
import SpaceBackdrop from './components/SpaceBackdrop.jsx'

const TASKS_BY_ID = Object.fromEntries(ALL_TASKS.map((task) => [task.id, task]))

/** The NFC tags point at "#litter", "#kitchen", etc. Anything else = home. */
function areaIdFromHash() {
  if (typeof window === 'undefined') return null
  const id = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase()
  return AREAS_BY_ID[id] ? id : null
}

function AppShell() {
  const { theme, copy } = useTheme()
  const [log, setLog] = useState(loadLog)
  const [areaId, setAreaId] = useState(areaIdFromHash)
  const [now, setNow] = useState(() => new Date())
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  // Follow the URL hash, which is how an NFC tap lands on a specific area.
  useEffect(() => {
    const onHashChange = () => {
      setAreaId(areaIdFromHash())
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

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = useCallback((message) => {
    setToast({ message, key: Date.now() })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2400)
  }, [])

  const handleLog = useCallback(
    (taskId) => {
      const task = TASKS_BY_ID[taskId]
      setLog((current) => logCompletion(current, taskId))
      setNow(new Date())
      const cheer = copy.cheers[Math.floor(Math.random() * copy.cheers.length)]
      showToast(`${cheer} — +${task?.points ?? 1} ${copy.pointsUnit}`)
    },
    [copy, showToast],
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
    window.scrollTo({ top: 0 })
  }, [])

  const goHome = useCallback(() => {
    // Clear the hash without leaving an empty "#" in the address bar.
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
    setAreaId(null)
    window.scrollTo({ top: 0 })
  }, [])

  const handleExport = useCallback(() => {
    downloadCalendar(log, new Date())
    showToast(copy.exported)
  }, [log, copy, showToast])

  const area = useMemo(() => (areaId ? AREAS_BY_ID[areaId] : null), [areaId])

  return (
    <>
      {theme.flavor === 'space' ? <SpaceBackdrop /> : null}

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-md px-4">
        {area ? (
          <AreaView
            area={area}
            log={log}
            now={now}
            onLog={handleLog}
            onUndo={handleUndo}
            onBack={goHome}
          />
        ) : (
          <Dashboard
            log={log}
            now={now}
            onLog={handleLog}
            onUndo={handleUndo}
            onOpenArea={goToArea}
            onExport={handleExport}
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
      <AppShell />
    </ThemeProvider>
  )
}
