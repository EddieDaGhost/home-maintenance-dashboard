import { ArrowLeft, History } from 'lucide-react'
import { paletteFor } from '../config/areas.js'
import { friendlyDate } from '../lib/date.js'
import { STATUS, getTaskState, isActionable } from '../lib/schedule.js'
import { progressFor } from '../lib/stats.js'
import ProgressBar from './ProgressBar.jsx'
import TaskCard from './TaskCard.jsx'

/** Due and overdue tasks float to the top; finished ones sink. */
const SORT_ORDER = {
  [STATUS.OVERDUE]: 0,
  [STATUS.DUE]: 1,
  [STATUS.UPCOMING]: 2,
  [STATUS.RESTING]: 3,
  [STATUS.DONE]: 4,
}

function RecentActivity({ area, log }) {
  const entries = area.tasks
    .flatMap((task) => (log.completions[task.id] ?? []).map((at) => ({ at, task })))
    .sort((a, b) => b.at - a.at)
    .slice(0, 5)

  if (!entries.length) return null

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <History className="h-4 w-4 text-slate-400" />
        Recent activity
      </p>
      <ul className="space-y-1.5">
        {entries.map(({ at, task }) => (
          <li key={`${task.id}-${at}`} className="flex justify-between gap-3 text-xs">
            <span className="truncate text-slate-600">{task.name}</span>
            <span className="shrink-0 text-slate-400">{friendlyDate(at)}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function AreaView({ area, log, now, onLog, onUndo, onBack }) {
  const palette = paletteFor(area)
  const Icon = area.icon
  const { percent, done, open } = progressFor(area.tasks, log, now)

  const tasks = area.tasks
    .map((task) => ({ task, state: getTaskState(task, log.completions[task.id] ?? [], now) }))
    .sort((a, b) => SORT_ORDER[a.state.status] - SORT_ORDER[b.state.status])

  const openTasks = tasks.filter(({ state }) => isActionable(state.status))
  const restTasks = tasks.filter(({ state }) => !isActionable(state.status))

  return (
    <div className="space-y-5 pb-10">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 flex items-center gap-1 py-2 text-sm font-medium text-slate-500 transition active:scale-95"
      >
        <ArrowLeft className="h-4 w-4" />
        All areas
      </button>

      <header className={`rounded-3xl border ${palette.border} ${palette.soft} p-5 shadow-sm`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${palette.solid} text-white shadow-sm`}>
            <Icon className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight text-slate-900">{area.name}</h1>
            <p className="truncate text-sm text-slate-500">{area.subtitle}</p>
          </div>
        </div>

        <div className="mt-4">
          <ProgressBar percent={percent} fillClass={palette.solid} trackClass="bg-white/70" height="h-2.5" />
          <p className="mt-2 text-xs font-medium text-slate-600">
            {open === 0
              ? 'Nothing due here right now.'
              : `${done} done · ${open} still to do`}
          </p>
        </div>
      </header>

      {openTasks.length > 0 ? (
        <section>
          <h2 className="mb-2.5 px-1 text-sm font-semibold text-slate-900">To do</h2>
          <div className="space-y-2.5">
            {openTasks.map(({ task, state }) => (
              <TaskCard key={task.id} task={task} state={state} onLog={onLog} onUndo={onUndo} />
            ))}
          </div>
        </section>
      ) : null}

      {restTasks.length > 0 ? (
        <section>
          <h2 className="mb-2.5 px-1 text-sm font-semibold text-slate-900">
            {openTasks.length ? 'Everything else' : 'All tasks'}
          </h2>
          <div className="space-y-2.5">
            {restTasks.map(({ task, state }) => (
              <TaskCard key={task.id} task={task} state={state} onLog={onLog} onUndo={onUndo} />
            ))}
          </div>
        </section>
      ) : null}

      <RecentActivity area={area} log={log} />
    </div>
  )
}
