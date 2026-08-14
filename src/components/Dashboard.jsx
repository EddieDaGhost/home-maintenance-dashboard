import { useRef, useState } from 'react'
import {
  CalendarPlus,
  ChevronRight,
  Download,
  Flame,
  Nfc,
  PartyPopper,
  Trophy,
  Upload,
} from 'lucide-react'
import { AREAS, areaStyle, paletteFor } from '../config/areas.js'
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
import ProgressBar from './ProgressBar.jsx'
import TaskCard from './TaskCard.jsx'
import ThemePicker from './ThemePicker.jsx'
import TagSetup from './TagSetup.jsx'

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

function AreaCard({ area, log, now, themeId, copy, nameFor, subtitleFor, onOpen }) {
  const palette = paletteFor(area, themeId)
  const { percent, open } = progressFor(area.tasks, log, now)
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
            {open === 0 ? copy.allClearBadge : copy.toDoBadge(open)}
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
  onExport,
  onBackup,
  onRestore,
}) {
  const { themeId, theme, copy } = useTheme()
  const { nameFor, subtitleFor } = useNames()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tagsOpen, setTagsOpen] = useState(false)
  const fileInput = useRef(null)

  const streak = currentStreak(log, now)
  const points = weeklyPoints(log, now)
  const goal = weeklyPointsGoal(now)
  const today = completedToday(log, now)
  const attention = tasksNeedingAttention(log, now)
  const shortlist = attention.slice(0, 5)
  const ThemeIcon = theme.icon

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

        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label={copy.themeButtonLabel}
          className="panel flex h-11 w-11 shrink-0 items-center justify-center transition active:scale-95"
          style={{ color: 'var(--ink-2)' }}
        >
          <ThemeIcon className="h-5 w-5" />
        </button>
      </header>

      <section className="flex gap-2.5">
        <StatTile icon={Flame} label={copy.streakLabel} value={streak} tone="#f97316" />
        <StatTile icon={Trophy} label={copy.pointsLabel} value={points} tone="#f59e0b" />
        <StatTile icon={PartyPopper} label={copy.todayLabel} value={today} tone="var(--good)" />
      </section>

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

      <section>
        <h2 className="section-title mb-2.5 px-1">
          {copy.queueTitle}
          {/* font-sans/tracking-normal opt this count out of the theme's heading styling */}
          {attention.length > shortlist.length ? (
            <span
              className="ml-2 font-sans text-xs font-normal tracking-normal normal-case"
              style={{ color: 'var(--ink-3)' }}
            >
              showing {shortlist.length} of {attention.length}
            </span>
          ) : null}
        </h2>

        {shortlist.length === 0 ? (
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
                areaLabel={nameFor(task.area)}
                onLog={onLog}
                onUndo={onUndo}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-2.5 px-1">{copy.areasTitle}</h2>
        <div className="space-y-2.5">
          {AREAS.map((area) => (
            <AreaCard
              key={area.id}
              area={area}
              log={log}
              now={now}
              themeId={themeId}
              copy={copy}
              nameFor={nameFor}
              subtitleFor={subtitleFor}
              onOpen={onOpenArea}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title mb-2.5 px-1">Setup</h2>
        <div className="panel settings-list overflow-hidden">
          <SettingsRow
            icon={Nfc}
            label="NFC tag setup"
            detail="What to write on each tag"
            onClick={() => setTagsOpen(true)}
          />
          <SettingsRow
            icon={CalendarPlus}
            label={copy.exportLabel}
            detail="Repeating events, no alerts"
            onClick={onExport}
          />
          <SettingsRow
            icon={ThemeIcon}
            label={`Look: ${theme.name}`}
            detail={theme.tagline}
            onClick={() => setPickerOpen(true)}
          />
          <SettingsRow
            icon={Download}
            label="Back up my data"
            detail="Saves a file you can restore from"
            onClick={onBackup}
          />
          <SettingsRow
            icon={Upload}
            label="Restore from a backup"
            detail="Replaces what's on this device"
            onClick={() => fileInput.current?.click()}
          />
        </div>

        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Choose a backup file"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onRestore(file)
            // Clear it so choosing the same file twice still fires.
            event.target.value = ''
          }}
        />

        <p className="mt-3 px-1 text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          Your history lives only in this browser. Backing up now and then is the only way to
          survive clearing your Safari data or moving to a new phone.
        </p>
      </section>

      <ThemePicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
      <TagSetup open={tagsOpen} onClose={() => setTagsOpen(false)} />
    </div>
  )
}
