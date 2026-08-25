import { useState } from 'react'
import {
  ChevronRight,
  CloudSun,
  Coins,
  Flame,
  History,
  Info,
  PartyPopper,
  PlaneTakeoff,
  Plus,
  Settings2,
  Trophy,
} from 'lucide-react'
import { areaStyle, paletteFor } from '../config/areas.js'
import {
  completedToday,
  currentStreak,
  progressFor,
  tasksNeedingAttention,
  weeklyPoints,
  weeklyPointsGoal,
} from '../lib/stats.js'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { useNames } from '../state/NamesProvider.jsx'
import { useAreas } from '../state/AreasProvider.jsx'
import { usePeople } from '../state/PeopleProvider.jsx'
import { useEstate } from '../state/EstateProvider.jsx'
import { useAway } from '../state/AwayProvider.jsx'
import { usePlaces } from '../state/PlacesProvider.jsx'
import { creditsBalance } from '../lib/credits.js'
import { describeCode, formatTemp, isStale, loadReading } from '../lib/forecast.js'
import { openItems } from '../lib/daily.js'
import { mineOf } from '../lib/turns.js'
import ProgressBar from './ProgressBar.jsx'
import TaskCard from './TaskCard.jsx'
import EditAreaSheet from './EditAreaSheet.jsx'
import ThemePicker from './ThemePicker.jsx'
import AboutSheet from './AboutSheet.jsx'
import HistorySheet from './HistorySheet.jsx'
import HouseholdSheet, { PersonAvatar } from './HouseholdSheet.jsx'
import AwaySheet from './AwaySheet.jsx'

function greeting(now) {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function StatTile({ icon: Icon, label, value, tone }) {
  return (
    <div className="panel flex-1 p-3 text-center">
      <Icon className="mx-auto h-4 w-4" strokeWidth={2.4} style={{ color: tone }} />
      <p className="numeral mt-1 text-xl font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
        {value}
      </p>
      <p className="label mt-0.5">{label}</p>
    </div>
  )
}

function AreaCard({ area, log, now, away, themeId, copy, nameFor, subtitleFor, onOpen }) {
  const palette = paletteFor(area, themeId)
  const { percent, open } = progressFor(area.tasks, log, now, away)
  const Icon = area.icon

  return (
    <button
      type="button"
      onClick={() => onOpen(area.id)}
      style={areaStyle(area, themeId)}
      className="panel flex w-full items-center gap-3 p-4 text-left transition active:scale-[0.98]"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: 'var(--area)', boxShadow: `0 0 18px -4px ${palette.glow}` }}
      >
        <Icon className="h-6 w-6" strokeWidth={2.2} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold" style={{ color: 'var(--ink)' }}>
            {nameFor(area)}
          </p>
          <span className="shrink-0 text-xs font-semibold" style={{ color: 'var(--area-ink)' }}>
            {area.tasks.length === 0
              ? 'No tasks yet'
              : open === 0
                ? copy.allClearBadge
                : copy.toDoBadge(open)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--ink-2)' }}>
          {subtitleFor(area)}
        </p>
        <div className="mt-2">
          <ProgressBar
            percent={percent}
            fill="var(--area)"
            track="var(--area-track)"
            glow={palette.glow}
          />
        </div>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0" style={{ color: 'var(--ink-3)' }} />
    </button>
  )
}

/** One row in the setup list at the bottom of the dashboard. */
function SettingsRow({ icon: Icon, label, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition active:scale-[0.99]"
    >
      <Icon className="h-5 w-5 shrink-0" style={{ color: 'var(--ink-2)' }} />
      <span className="min-w-0 flex-1">
        <span className="block font-semibold" style={{ color: 'var(--ink)' }}>
          {label}
        </span>
        {detail ? (
          <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
            {detail}
          </span>
        ) : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
    </button>
  )
}

export default function Dashboard({
  log,
  now,
  onLog,
  onUndo,
  onOpenArea,
  onOpenEstate,
  onOpenToday,
  onOpenSettings,
  sync,
  readOnly = false,
}) {
  const { themeId, theme, copy } = useTheme()
  const { nameFor, subtitleFor } = useNames()
  const { areas, allTasks, custom, restoreStarterRooms } = useAreas()
  const { activePerson, activeId, people, isShared } = usePeople()
  const { entry } = useEstate()
  const { away, isAway, untilLabel, endNow } = useAway()
  const { places, daily } = usePlaces()

  const [addRoomOpen, setAddRoomOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Kept here only for the read-only preview's "What is this?" button; an
  // owner reaches the same sheet from the settings screen.
  const [aboutOpen, setAboutOpen] = useState(false)
  // The look chip in the header is one tap from anywhere, which is the point of
  // it — settings has the same picker for people who go looking there. Same for
  // the avatar: you switch who's logging on the way to logging something.
  const [pickerOpen, setPickerOpen] = useState(false)
  const [householdOpen, setHouseholdOpen] = useState(false)
  const [awayOpen, setAwayOpen] = useState(false)
  const [mineOnly, setMineOnly] = useState(false)

  const streak = currentStreak(log, now, allTasks, away)
  const points = weeklyPoints(log, now, allTasks)
  const goal = weeklyPointsGoal(now, allTasks)
  const today = completedToday(log, now)
  const everything = tasksNeedingAttention(log, now, allTasks, away)
  // "Mine" keeps the chores nobody has claimed as well as your own — an
  // unassigned chore is everybody's to worry about, not nobody's.
  const attention = mineOnly ? mineOf(everything, log, people, activeId) : everything
  const credits = creditsBalance(log, allTasks, activeId, people, entry)
  const ThemeIcon = theme.icon
  const travelling = isAway(now)
  const shortlist = attention.slice(0, 5)
  // Read straight from the cache — the dashboard never fetches. Whatever the
  // Today screen last saw is good enough for a one-line summary, and a card
  // that waits on the network has no business on the first screen.
  // A reading from six hours ago isn't "now", so it falls back to the plain
  // label rather than quietly presenting old weather as current.
  const cached = loadReading(places.home)
  const reading = cached && !isStale(cached, now.getTime()) ? cached : null
  const onThePlate = attention.length + openItems(daily).length

  return (
    <div className="space-y-6 pb-10">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: 'var(--ink-2)' }}>
            {greeting(now)}
          </p>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
            {copy.appTitle}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
            {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* The "who's logging" chip only earns its space once someone else exists. */}
          {isShared ? (
            <button
              type="button"
              onClick={() => setHouseholdOpen(true)}
              aria-label={`Logging as ${activePerson.name}. Change who's logging`}
              className="transition active:scale-95"
            >
              <PersonAvatar name={activePerson.name} active size="h-11 w-11" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            aria-label={copy.themeButtonLabel}
            className="panel flex h-11 w-11 items-center justify-center transition active:scale-95"
            style={{ color: 'var(--ink-2)' }}
          >
            <ThemeIcon className="h-5 w-5" />
          </button>
        </div>
      </header>

      <section className="flex gap-2.5">
        <StatTile icon={Flame} label={copy.streakLabel} value={streak} tone="#f97316" />
        <StatTile icon={Trophy} label={copy.pointsLabel} value={points} tone="#f59e0b" />
        <StatTile icon={PartyPopper} label={copy.todayLabel} value={today} tone="var(--good)" />
      </section>

      <button
        type="button"
        onClick={onOpenToday}
        className="panel flex w-full items-center gap-3 p-3.5 text-left transition active:scale-[0.99]"
      >
        <CloudSun className="h-5 w-5 shrink-0" style={{ color: 'var(--accent)' }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {reading
              ? `${formatTemp(reading.temperature, reading.units)} · ${describeCode(reading.code).label}`
              : copy.todayNav}
          </span>
          <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
            {onThePlate === 0
              ? copy.todayEmpty
              : `${onThePlate} ${onThePlate === 1 ? 'thing' : 'things'} on the plate`}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
      </button>

      {/* Deliberately not a fourth tile — four across a 390px phone is cramped,
          and this should read as an invitation rather than another number. */}
      <button
        type="button"
        onClick={onOpenEstate}
        className="panel flex w-full items-center gap-3 p-3.5 text-left transition active:scale-[0.99]"
      >
        <Coins className="h-5 w-5 shrink-0" style={{ color: '#f59e0b' }} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {credits > 0 ? `${credits} ${copy.creditsUnit} to spend` : copy.estateNav}
          </span>
          <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
            {credits > 0 ? copy.estateNav : 'Log anything to start earning'}
          </span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
      </button>

      <section className="panel p-4">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
            {copy.weekTitle}
          </p>
          <p className="numeral text-xs font-medium tabular-nums" style={{ color: 'var(--ink-2)' }}>
            {points} / {goal} {copy.pointsUnit}
          </p>
        </div>
        <ProgressBar percent={(points / goal) * 100} fill="var(--accent)" glow="var(--accent)" />
        <p className="mt-2 text-xs" style={{ color: 'var(--ink-3)' }}>
          {copy.weekNote}
        </p>
      </section>

      {travelling ? (
        <section
          className="panel flex items-center gap-3 p-4"
          style={{ '--surface': 'var(--good-soft)', '--line': 'var(--good-line)' }}
        >
          <PlaneTakeoff className="h-5 w-5 shrink-0" style={{ color: 'var(--good-ink)' }} />
          <p className="min-w-0 flex-1 text-sm leading-snug" style={{ color: 'var(--ink-2)' }}>
            <strong style={{ color: 'var(--ink)' }}>{untilLabel(now)}.</strong> Nothing&apos;s due,
            and your streak carries over.
          </p>
          {readOnly ? null : (
            <button type="button" onClick={() => endNow(now)} className="btn-secondary h-9 shrink-0 px-3 text-xs">
              We&apos;re back
            </button>
          )}
        </section>
      ) : null}

      <section>
        <h2 className="section-title mb-2.5 flex items-center gap-2 px-1">
          <span>{copy.queueTitle}</span>
          {/* font-sans/tracking-normal opt this count out of the theme's heading styling */}
          {attention.length > shortlist.length ? (
            <span
              className="ml-2 font-sans text-xs font-normal tracking-normal normal-case"
              style={{ color: 'var(--ink-3)' }}
            >
              showing {shortlist.length} of {attention.length}
            </span>
          ) : null}
          {/* Only earns its space once somebody else is in the household. */}
          {isShared ? (
            <button
              type="button"
              onClick={() => setMineOnly((on) => !on)}
              aria-pressed={mineOnly}
              className="ml-auto rounded-full px-2.5 py-1 font-sans text-xs font-semibold tracking-normal normal-case transition active:scale-95"
              style={
                mineOnly
                  ? { background: 'var(--accent)', color: 'var(--accent-ink)', border: '1px solid var(--accent)' }
                  : { background: 'var(--surface)', color: 'var(--ink-2)', border: '1px solid var(--line)' }
              }
            >
              Mine
            </button>
          ) : null}
        </h2>

        {/* With no rooms at all there is nothing to be all-clear about — "the
            house is handled" would be a strange thing to say to somebody who
            hasn't built one yet. The empty-house block below says the useful
            thing instead. */}
        {areas.length === 0 ? null : shortlist.length === 0 ? (
          <div
            className="panel p-5 text-center"
            style={{ '--surface': 'var(--good-soft)', '--line': 'var(--good-line)' }}
          >
            <PartyPopper className="mx-auto h-6 w-6" style={{ color: 'var(--good)' }} />
            <p className="mt-2 font-semibold" style={{ color: 'var(--ink)' }}>
              {copy.allClearTitle}
            </p>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
              {copy.allClearBody}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {shortlist.map(({ task, state }) => (
              <TaskCard
                key={task.id}
                task={task}
                state={state}
                entries={log.completions[task.id] ?? []}
                areaLabel={nameFor(task.area)}
                onLog={onLog}
                onUndo={onUndo}
                readOnly={readOnly}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-2.5 px-1">{copy.areasTitle}</h2>
        <div className="space-y-2.5">
          {areas.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              log={log}
              now={now}
              away={away}
              themeId={themeId}
              copy={copy}
              nameFor={nameFor}
              subtitleFor={subtitleFor}
              onOpen={onOpenArea}
            />
          ))}

          {/* An empty house is somebody's first minute in the app, not an
              error — so it offers the two ways to fill it rather than a lone
              dashed button. */}
          {!readOnly && areas.length === 0 ? (
            <div className="panel space-y-3 p-5 text-center">
              <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                An empty house
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                Build the list however suits you — paste one in all at once, or add a room at a
                time.
              </p>
              <button type="button" onClick={onOpenSettings} className="btn-primary h-12 w-full text-sm">
                Import a list
              </button>
              <button
                type="button"
                onClick={() => setAddRoomOpen(true)}
                className="btn-secondary h-11 w-full text-sm"
              >
                Add a room
              </button>
              {custom.fromScratch ? (
                <button
                  type="button"
                  onClick={restoreStarterRooms}
                  className="text-xs font-semibold underline"
                  style={{ color: 'var(--ink-3)' }}
                >
                  Bring back the starter rooms
                </button>
              ) : null}
            </div>
          ) : readOnly ? null : (
            <button
              type="button"
              onClick={() => setAddRoomOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed p-4 font-semibold transition active:scale-[0.98]"
              style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
            >
              <Plus className="h-5 w-5" />
              Add a room
            </button>
          )}

        </div>
      </section>

      {readOnly ? (
        <section>
          <button
            type="button"
            onClick={() => setAboutOpen(true)}
            className="panel flex w-full items-center justify-center gap-2 p-4 font-semibold transition active:scale-[0.98]"
            style={{ color: 'var(--ink)' }}
          >
            <Info className="h-5 w-5" />
            What is this?
          </button>
        </section>
      ) : (
      <section>
        <h2 className="section-title mb-2.5 px-1">Setup</h2>
        {/* Three rows, not fifteen. Everything you set up once and leave alone
            moved to its own screen — see src/components/SettingsScreen.jsx. */}
        <div className="panel settings-list overflow-hidden">
          <SettingsRow
            icon={History}
            label="History"
            detail="Streaks, heatmap, every entry"
            onClick={() => setHistoryOpen(true)}
          />
          <SettingsRow
            icon={PlaneTakeoff}
            label="Away"
            detail={travelling ? untilLabel(now) : 'Pause everything while you travel'}
            onClick={() => setAwayOpen(true)}
          />
          <SettingsRow
            icon={Settings2}
            label={copy.settingsNav}
            detail="Sharing, looks, backups and more"
            onClick={onOpenSettings}
          />
        </div>
      </section>
      )}

      <ThemePicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      <HouseholdSheet
        open={householdOpen}
        onClose={() => setHouseholdOpen(false)}
        log={log}
        now={now}
      />
      <AboutSheet open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <AwaySheet open={awayOpen} onClose={() => setAwayOpen(false)} now={now} />
      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} log={log} now={now} />
      <EditAreaSheet
        mode="create"
        area={null}
        open={addRoomOpen}
        onClose={() => setAddRoomOpen(false)}
      />
    </div>
  )
}
