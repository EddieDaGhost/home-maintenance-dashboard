import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  Car,
  Check,
  ChevronDown,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  ExternalLink,
  MapPin,
  Plus,
  Sun,
  X,
} from 'lucide-react'
import { tasksNeedingAttention } from '../lib/stats.js'
import {
  describeCode,
  fetchForecast,
  formatTemp,
  isStale,
  loadReading,
  saveReading,
} from '../lib/forecast.js'
import { MAPS_NAMES, buildMapsLink, otherMaps, preferredMaps } from '../lib/maps.js'
import { doneItems, openItems } from '../lib/daily.js'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { useNames } from '../state/NamesProvider.jsx'
import { useAreas } from '../state/AreasProvider.jsx'
import { useAway } from '../state/AwayProvider.jsx'
import { usePlaces } from '../state/PlacesProvider.jsx'
import TaskCard from './TaskCard.jsx'
import PlaceSheet from './PlaceSheet.jsx'

const ICONS = {
  sun: Sun,
  'cloud-sun': CloudSun,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
}

/** The dashboard shows five; this screen is the fuller list, but not a wall. */
const SHORTLIST = 6

const clock = (at) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/**
 * The forecast block.
 *
 * The cached reading is painted first and the refresh happens behind it, so
 * this can never hold up the list underneath. With no signal you get this
 * morning's reading and the time it was taken — which is the useful answer,
 * not an error.
 */
function Forecast({ home, onSetUp }) {
  const [reading, setReading] = useState(() => loadReading(home))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!home) return undefined
    const cached = loadReading(home)
    setReading(cached)
    setFailed(false)
    if (!isStale(cached)) return undefined

    const controller = new AbortController()
    let live = true

    const refresh = () => {
      // When the browser already knows there's no network, don't ask. It saves
      // a pointless request at the coop and keeps the console clean.
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setFailed(true)
        return
      }
      fetchForecast(home, { signal: controller.signal })
        .then((fresh) => {
          if (!live) return
          saveReading(home, fresh)
          setReading(fresh)
          setFailed(false)
        })
        .catch(() => {
          // Offline, or the service is having a day. The cached reading below
          // is still worth showing; nothing here is worth an alarm.
          if (live) setFailed(true)
        })
    }

    refresh()
    window.addEventListener('online', refresh)
    return () => {
      live = false
      controller.abort()
      window.removeEventListener('online', refresh)
    }
  }, [home])

  if (!home) {
    return (
      <button
        type="button"
        onClick={onSetUp}
        className="panel flex w-full items-center gap-3 p-4 text-left transition active:scale-[0.99]"
      >
        <CloudSun className="h-5 w-5 shrink-0" style={{ color: 'var(--ink-2)' }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Add your town for the forecast
          </span>
          <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
            Nothing is looked up until you do
          </span>
        </span>
      </button>
    )
  }

  if (!reading) {
    return (
      <div className="panel flex items-center gap-3 p-4">
        <CloudSun className="h-5 w-5 shrink-0" style={{ color: 'var(--ink-3)' }} />
        <p className="min-w-0 flex-1 text-sm" style={{ color: 'var(--ink-2)' }}>
          {failed ? 'No forecast yet — there was no signal.' : 'Getting the forecast…'}
        </p>
        <button type="button" onClick={onSetUp} className="btn-secondary h-9 shrink-0 px-3 text-xs">
          Change
        </button>
      </div>
    )
  }

  const { label, icon } = describeCode(reading.code)
  const Icon = ICONS[icon] ?? Cloud

  return (
    <section className="panel p-4">
      <div className="flex items-center gap-3.5">
        <Icon className="h-9 w-9 shrink-0" strokeWidth={1.8} style={{ color: 'var(--accent)' }} />
        <div className="min-w-0 flex-1">
          <p className="numeral text-2xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
            {formatTemp(reading.temperature, reading.units)}
          </p>
          <p className="truncate text-sm" style={{ color: 'var(--ink-2)' }}>
            {label}
          </p>
        </div>
        <button
          type="button"
          onClick={onSetUp}
          aria-label="Change your town"
          className="flex shrink-0 items-center gap-1 text-xs"
          style={{ color: 'var(--ink-3)' }}
        >
          <MapPin className="h-3.5 w-3.5" />
          <span className="max-w-[8.5rem] truncate">{home.label}</span>
        </button>
      </div>

      <p className="numeral mt-2.5 text-xs tabular-nums" style={{ color: 'var(--ink-3)' }}>
        High {formatTemp(reading.high, reading.units)} · Low {formatTemp(reading.low, reading.units)}
        {Number.isFinite(reading.rainChance) ? ` · ${reading.rainChance}% chance of rain` : ''}
      </p>

      {failed || isStale(reading) ? (
        <p className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
          Last checked {clock(reading.at)}
        </p>
      ) : null}
    </section>
  )
}

/** One tap into the maps app, which is the only thing that knows about traffic. */
function Commute({ work, onSetUp }) {
  const agent = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const provider = preferredMaps(agent)
  const other = otherMaps(provider)

  if (!work) {
    return (
      <button
        type="button"
        onClick={onSetUp}
        className="panel flex w-full items-center gap-3 p-4 text-left transition active:scale-[0.99]"
      >
        <Car className="h-5 w-5 shrink-0" style={{ color: 'var(--ink-2)' }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            Add where you work
          </span>
          <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
            For a one-tap check on the drive
          </span>
        </span>
      </button>
    )
  }

  return (
    <section className="panel p-4">
      <a
        href={buildMapsLink(work, provider)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary flex h-12 w-full items-center justify-center gap-2 text-sm"
      >
        <Car className="h-4 w-4" />
        Drive to work
        <ExternalLink className="h-3.5 w-3.5 opacity-70" />
      </a>
      <p className="mt-2 truncate text-xs" style={{ color: 'var(--ink-3)' }}>
        {work}
      </p>
      <p className="mt-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>
        Opens {MAPS_NAMES[provider]} with live traffic, starting from wherever you are.{' '}
        <a
          href={buildMapsLink(work, other)}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
          style={{ color: 'var(--ink-2)' }}
        >
          Use {MAPS_NAMES[other]} instead
        </a>
      </p>
    </section>
  )
}

/** A free-text item. No date, no age, no scolding — see src/lib/daily.js. */
function DailyRow({ item, onToggle, onRemove }) {
  const done = Boolean(item.doneAt)
  return (
    <div className="panel flex items-center gap-3 p-3.5">
      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-label={done ? `Put ${item.text} back on the list` : `Tick off ${item.text}`}
        aria-pressed={done}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition active:scale-90"
        style={{
          background: done ? 'var(--good-soft)' : 'transparent',
          border: `1px solid ${done ? 'var(--good-line)' : 'var(--line)'}`,
          color: done ? 'var(--good-ink)' : 'var(--ink-3)',
        }}
      >
        <Check className="h-5 w-5" strokeWidth={done ? 3 : 2} />
      </button>

      <span
        className="min-w-0 flex-1 text-sm"
        style={{
          color: done ? 'var(--ink-3)' : 'var(--ink)',
          textDecoration: done ? 'line-through' : 'none',
        }}
      >
        {item.text}
      </span>

      <button
        type="button"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.text}`}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition active:scale-90"
        style={{ color: 'var(--ink-3)' }}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

/**
 * The morning screen: what it's doing outside, how long the drive is, and
 * everything on the plate — the things you wrote down and the chores the app
 * already knew about, in one list.
 */
export default function TodayScreen({ log, now, onLog, onUndo, onBack, readOnly = false }) {
  const { copy } = useTheme()
  const { nameFor } = useNames()
  const { allTasks } = useAreas()
  const { away } = useAway()
  const { places, daily, addItem, toggleItem, removeItem } = usePlaces()
  const [setupOpen, setSetupOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)

  const chores = tasksNeedingAttention(log, now, allTasks, away)
  const open = openItems(daily)
  const done = doneItems(daily)

  // A list of priorities, not an inventory. Opening a fresh phone to thirteen
  // cards is the wall this app is supposed to avoid — the rest is one tap away
  // and nothing is hidden, it just isn't the first thing you see.
  const shown = expanded ? chores : chores.slice(0, SHORTLIST)

  const submit = (event) => {
    event.preventDefault()
    if (!draft.trim()) return
    addItem(draft)
    setDraft('')
    inputRef.current?.focus()
  }

  return (
    <div className="space-y-4 pb-10">
      <header className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="panel flex h-11 w-11 shrink-0 items-center justify-center transition active:scale-95"
          style={{ color: 'var(--ink-2)' }}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
            {copy.todayTitle}
          </h1>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </header>

      <Forecast home={places.home} onSetUp={() => setSetupOpen(true)} />
      <Commute work={places.work} onSetUp={() => setSetupOpen(true)} />

      <section>
        <h2 className="section-title mb-2.5 px-1">{copy.todayListTitle}</h2>

        {readOnly ? null : (
          <form onSubmit={submit} className="mb-2.5 flex gap-2">
            <input
              ref={inputRef}
              type="text"
              className="field h-12 min-w-0 flex-1"
              id="today-item"
              placeholder="Anything else for today"
              aria-label="Add something to today"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Add to today"
              className="btn-primary flex h-12 w-12 shrink-0 items-center justify-center disabled:opacity-40"
            >
              <Plus className="h-5 w-5" />
            </button>
          </form>
        )}

        <div className="space-y-2.5">
          {open.map((item) => (
            <DailyRow key={item.id} item={item} onToggle={toggleItem} onRemove={removeItem} />
          ))}

          {shown.map(({ task, state }) => (
            <TaskCard
              key={task.id}
              task={task}
              state={state}
              areaLabel={nameFor(task.area)}
              onLog={onLog}
              onUndo={onUndo}
              readOnly={readOnly}
            />
          ))}

          {chores.length > shown.length ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="panel flex w-full items-center justify-center gap-2 p-3.5 text-sm font-semibold transition active:scale-[0.99]"
              style={{ color: 'var(--ink-2)' }}
            >
              <ChevronDown className="h-4 w-4" />
              Show the other {chores.length - shown.length}
            </button>
          ) : null}

          {open.length === 0 && chores.length === 0 ? (
            <div
              className="panel p-5 text-center"
              style={{ '--surface': 'var(--good-soft)', '--line': 'var(--good-line)' }}
            >
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                {copy.todayEmpty}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
                {copy.allClearBody}
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {done.length ? (
        <section>
          <h2 className="section-title mb-2.5 px-1">{copy.todayDoneTitle}</h2>
          <div className="space-y-2.5">
            {done.map((item) => (
              <DailyRow key={item.id} item={item} onToggle={toggleItem} onRemove={removeItem} />
            ))}
          </div>
        </section>
      ) : null}

      <p className="px-1 text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
        Anything you type here is just for you — it earns no points and stays on this device. The
        chores in the list are the same ones as on the front page.
      </p>

      <PlaceSheet open={setupOpen} onClose={() => setSetupOpen(false)} />
    </div>
  )
}
