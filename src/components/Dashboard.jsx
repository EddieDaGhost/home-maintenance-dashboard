import { CalendarPlus, ChevronRight, Flame, Nfc, PartyPopper, Trophy } from 'lucide-react'
import { AREAS, paletteFor } from '../config/areas.js'
import { getTaskState } from '../lib/schedule.js'
import {
  completedToday,
  currentStreak,
  progressFor,
  tasksNeedingAttention,
  weeklyPoints,
  weeklyPointsGoal,
} from '../lib/stats.js'
import ProgressBar from './ProgressBar.jsx'
import TaskCard from './TaskCard.jsx'

function greeting(now) {
  const hour = now.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function StatTile({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm">
      <Icon className={`mx-auto h-4 w-4 ${tone}`} strokeWidth={2.4} />
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  )
}

function AreaCard({ area, log, now, onOpen }) {
  const palette = paletteFor(area)
  const { percent, open } = progressFor(area.tasks, log, now)
  const Icon = area.icon

  return (
    <button
      type="button"
      onClick={() => onOpen(area.id)}
      className={`flex w-full items-center gap-3 rounded-2xl border ${palette.border} ${palette.soft} p-4 text-left shadow-sm transition active:scale-[0.98]`}
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${palette.solid} text-white shadow-sm`}>
        <Icon className="h-6 w-6" strokeWidth={2.2} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-semibold text-slate-900">{area.name}</p>
          <span className={`shrink-0 text-xs font-semibold ${palette.text}`}>
            {open === 0 ? 'All clear' : `${open} to do`}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">{area.subtitle}</p>
        <div className="mt-2">
          <ProgressBar percent={percent} fillClass={palette.solid} trackClass="bg-white/70" />
        </div>
      </div>

      <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
    </button>
  )
}

export default function Dashboard({ log, now, onLog, onUndo, onOpenArea, onExport }) {
  const streak = currentStreak(log, now)
  const points = weeklyPoints(log, now)
  const goal = weeklyPointsGoal(now)
  const today = completedToday(log, now)
  const attention = tasksNeedingAttention(log, now)
  const shortlist = attention.slice(0, 5)

  return (
    <div className="space-y-6 pb-10">
      <header className="pt-2">
        <p className="text-sm font-medium text-slate-500">{greeting(now)}</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Home Maintenance</h1>
        <p className="mt-1 text-sm text-slate-500">
          {now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
        </p>
      </header>

      <section className="flex gap-2.5">
        <StatTile icon={Flame} label="Day streak" value={streak} tone="text-orange-500" />
        <StatTile icon={Trophy} label="Points" value={points} tone="text-amber-500" />
        <StatTile icon={PartyPopper} label="Today" value={today} tone="text-emerald-500" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold text-slate-900">This week</p>
          <p className="text-xs font-medium text-slate-500 tabular-nums">
            {points} / {goal} pts
          </p>
        </div>
        <ProgressBar percent={(points / goal) * 100} fillClass="bg-slate-900" />
        <p className="mt-2 text-xs text-slate-400">
          Every log counts. Partial weeks are still good weeks.
        </p>
      </section>

      <section>
        <h2 className="mb-2.5 px-1 text-sm font-semibold text-slate-900">
          Right now
          {attention.length > shortlist.length ? (
            <span className="ml-2 font-normal text-slate-400">
              showing {shortlist.length} of {attention.length}
            </span>
          ) : null}
        </h2>

        {shortlist.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <PartyPopper className="mx-auto h-6 w-6 text-emerald-600" />
            <p className="mt-2 font-semibold text-emerald-900">Nothing is due right now</p>
            <p className="mt-1 text-sm text-emerald-700">The house is handled. Go do something else.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {shortlist.map(({ task, state }) => (
              <TaskCard
                key={task.id}
                task={task}
                state={state}
                areaLabel={task.area.name}
                onLog={onLog}
                onUndo={onUndo}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2.5 px-1 text-sm font-semibold text-slate-900">Areas</h2>
        <div className="space-y-2.5">
          {AREAS.map((area) => (
            <AreaCard key={area.id} area={area} log={log} now={now} onOpen={onOpenArea} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <button
          type="button"
          onClick={onExport}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white p-4 font-semibold text-slate-700 shadow-sm transition active:scale-[0.98]"
        >
          <CalendarPlus className="h-5 w-5" />
          Export to iPhone Calendar
        </button>

        <div className="flex items-start gap-2.5 rounded-2xl bg-slate-200/60 p-4 text-xs text-slate-600">
          <Nfc className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <p>
            Tap an NFC tag to jump straight to its area. Each tag holds this site&apos;s address plus{' '}
            <span className="font-mono">#litter</span>, <span className="font-mono">#kitchen</span>, and so on.
          </p>
        </div>
      </section>
    </div>
  )
}
