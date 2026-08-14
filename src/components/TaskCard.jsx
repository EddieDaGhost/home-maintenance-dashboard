import { AlertCircle, Check, Circle, Clock, Moon, Undo2 } from 'lucide-react'
import { STATUS, scheduleLabel } from '../lib/schedule.js'
import { friendlyDate } from '../lib/date.js'

const STATUS_STYLES = {
  [STATUS.DONE]: {
    Icon: Check,
    iconClass: 'bg-emerald-100 text-emerald-700',
    cardClass: 'border-emerald-200 bg-emerald-50/60',
  },
  [STATUS.DUE]: {
    Icon: Circle,
    iconClass: 'bg-slate-100 text-slate-500',
    cardClass: 'border-slate-200 bg-white',
  },
  [STATUS.OVERDUE]: {
    Icon: AlertCircle,
    iconClass: 'bg-rose-100 text-rose-700',
    cardClass: 'border-rose-200 bg-rose-50/60',
  },
  [STATUS.RESTING]: {
    Icon: Moon,
    iconClass: 'bg-slate-100 text-slate-400',
    cardClass: 'border-slate-200 bg-white/60',
  },
  [STATUS.UPCOMING]: {
    Icon: Clock,
    iconClass: 'bg-slate-100 text-slate-400',
    cardClass: 'border-slate-200 bg-white/60',
  },
}

/** Little dots for "2x per week" style tasks so partial progress is visible. */
function CountDots({ done, target }) {
  if (target < 2) return null
  return (
    <span className="ml-2 inline-flex items-center gap-1 align-middle">
      {Array.from({ length: target }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-1.5 rounded-full ${i < done ? 'bg-emerald-500' : 'bg-slate-300'}`}
        />
      ))}
    </span>
  )
}

export default function TaskCard({ task, state, areaLabel, onLog, onUndo }) {
  const style = STATUS_STYLES[state.status] ?? STATUS_STYLES[STATUS.DUE]
  const { Icon } = style
  const isDone = state.status === STATUS.DONE

  return (
    <div className={`flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm ${style.cardClass}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.iconClass}`}>
        <Icon className="h-5 w-5" strokeWidth={2.4} />
      </div>

      <div className="min-w-0 flex-1">
        <p className={`text-[15px] leading-snug font-semibold ${isDone ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
          {task.name}
          <CountDots done={state.done} target={state.target} />
        </p>
        {/* Status first — it is the part worth reading at a glance. */}
        <p className="mt-0.5 text-xs leading-snug text-slate-500">
          {areaLabel ? <span className="font-medium text-slate-600">{areaLabel} · </span> : null}
          <span className={state.status === STATUS.OVERDUE ? 'font-semibold text-rose-700' : undefined}>
            {isDone && state.lastDone ? friendlyDate(state.lastDone) : state.detail}
          </span>
          <span className="text-slate-400"> · {scheduleLabel(task.schedule)}</span>
        </p>
        {task.note && !isDone ? (
          <p className="mt-1 text-xs leading-snug text-slate-400">{task.note}</p>
        ) : null}
      </div>

      {isDone ? (
        <button
          type="button"
          onClick={() => onUndo(task.id)}
          className="flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 active:scale-95"
          aria-label={`Undo ${task.name}`}
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onLog(task.id)}
          className="h-10 shrink-0 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
          aria-label={`Log ${task.name} as done`}
        >
          Log
        </button>
      )}
    </div>
  )
}
