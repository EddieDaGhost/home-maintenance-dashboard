import { useState } from 'react'
import { ArrowLeft, History, Pencil } from 'lucide-react'
import { areaStyle, paletteFor } from '../config/areas.js'
import { friendlyDate } from '../lib/date.js'
import { timeOf } from '../lib/storage.js'
import { STATUS, getTaskState, isActionable } from '../lib/schedule.js'
import { progressFor } from '../lib/stats.js'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { useNames } from '../state/NamesProvider.jsx'
import { usePeople } from '../state/PeopleProvider.jsx'
import { useAway } from '../state/AwayProvider.jsx'
import EditAreaSheet from './EditAreaSheet.jsx'
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

function RecentActivity({ area, log, title, nameFor, nameOf, isShared }) {
  const entries = area.tasks
    .flatMap((task) =>
      (log.completions[task.id] ?? []).map((entry) => ({ at: timeOf(entry), by: entry.by, task })),
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, 5)

  if (!entries.length) return null

  return (
    <section className="panel p-4">
      <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
        <History className="h-4 w-4" style={{ color: 'var(--ink-3)' }} />
        {title}
      </p>
      <ul className="space-y-1.5">
        {entries.map(({ at, by, task }) => (
          <li key={`${task.id}-${at}`} className="flex justify-between gap-3 text-xs">
            <span className="truncate" style={{ color: 'var(--ink-2)' }}>
              {nameFor(task)}
            </span>
            <span className="shrink-0" style={{ color: 'var(--ink-3)' }}>
              {isShared && by ? `${nameOf(by)} · ` : ''}
              {friendlyDate(at)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function AreaView({ area, log, now, onLog, onUndo, onBack, readOnly = false }) {
  const { themeId, copy } = useTheme()
  const { nameFor, subtitleFor } = useNames()
  const { nameOf, isShared } = usePeople()
  const { away } = useAway()
  const [editing, setEditing] = useState(false)
  const palette = paletteFor(area, themeId)
  const Icon = area.icon
  const { percent, done, open } = progressFor(area.tasks, log, now, away)

  const tasks = area.tasks
    .map((task) => ({ task, state: getTaskState(task, log.completions[task.id] ?? [], now, away) }))
    .sort((a, b) => SORT_ORDER[a.state.status] - SORT_ORDER[b.state.status])

  const openTasks = tasks.filter(({ state }) => isActionable(state.status))
  const restTasks = tasks.filter(({ state }) => !isActionable(state.status))

  return (
    <div className="space-y-5 pb-10">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 flex items-center gap-1 py-2 text-sm font-medium transition active:scale-95"
        style={{ color: 'var(--ink-2)' }}
      >
        <ArrowLeft className="h-4 w-4" />
        {copy.backLabel}
      </button>

      <header className="panel p-5" style={areaStyle(area, themeId)}>
        <div className="flex items-center gap-3">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
            style={{ background: 'var(--area)', boxShadow: `0 0 22px -4px ${palette.glow}` }}
          >
            <Icon className="h-6 w-6" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
              {nameFor(area)}
            </h1>
            <p className="truncate text-sm" style={{ color: 'var(--ink-2)' }}>
              {subtitleFor(area)}
            </p>
          </div>

          {readOnly ? null : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Edit room"
              className="btn-secondary ml-auto flex h-10 w-10 shrink-0 items-center justify-center"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-4">
          <ProgressBar
            percent={percent}
            fill="var(--area)"
            track="var(--area-track)"
            glow={palette.glow}
            height="0.625rem"
          />
          <p className="mt-2 text-xs font-medium" style={{ color: 'var(--ink-2)' }}>
            {open === 0 ? copy.areaClear : `${done} done · ${open} still to do`}
          </p>
        </div>
      </header>

      {openTasks.length > 0 ? (
        <section>
          <h2 className="section-title mb-2.5 px-1">{copy.todoTitle}</h2>
          <div className="space-y-2.5">
            {openTasks.map(({ task, state }) => (
              <TaskCard key={task.id} task={task} state={state} onLog={onLog} onUndo={onUndo} readOnly={readOnly} />
            ))}
          </div>
        </section>
      ) : null}

      {area.tasks.length === 0 ? (
        <div className="panel p-5 text-center">
          <p className="font-semibold" style={{ color: 'var(--ink)' }}>
            No tasks in here yet
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--ink-2)' }}>
            Tap the pencil above to add the first one.
          </p>
        </div>
      ) : null}

      {restTasks.length > 0 ? (
        <section>
          <h2 className="section-title mb-2.5 px-1">
            {openTasks.length ? copy.restTitle : copy.allTasksTitle}
          </h2>
          <div className="space-y-2.5">
            {restTasks.map(({ task, state }) => (
              <TaskCard key={task.id} task={task} state={state} onLog={onLog} onUndo={onUndo} readOnly={readOnly} />
            ))}
          </div>
        </section>
      ) : null}

      <RecentActivity
        area={area}
        log={log}
        title={copy.recentTitle}
        nameFor={nameFor}
        nameOf={nameOf}
        isShared={isShared}
      />

      <EditAreaSheet
        area={area}
        open={editing}
        onClose={() => setEditing(false)}
        onDeleted={onBack}
      />
    </div>
  )
}
