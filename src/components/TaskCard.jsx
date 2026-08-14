import { AlertCircle, Check, Circle, Clock, Moon, Undo2 } from 'lucide-react'
import { STATUS, scheduleLabel } from '../lib/schedule.js'
import { friendlyDate } from '../lib/date.js'
import { useTheme } from '../theme/ThemeProvider.jsx'

// Each status recolors the card by overriding the surface and border variables
// that .panel reads — so it lands correctly in whichever theme is active.
const STATUS_STYLES = {
  [STATUS.DONE]: {
    Icon: Check,
    icon: { background: 'var(--good-soft)', color: 'var(--good-ink)' },
    card: { '--surface': 'var(--good-soft)', '--line': 'var(--good-line)' },
  },
  [STATUS.DUE]: {
    Icon: Circle,
    icon: { background: 'var(--surface-2)', color: 'var(--ink-3)' },
    card: {},
  },
  [STATUS.OVERDUE]: {
    Icon: AlertCircle,
    icon: { background: 'var(--alert-soft)', color: 'var(--alert-ink)' },
    card: { '--surface': 'var(--alert-soft)', '--line': 'var(--alert-line)' },
  },
  [STATUS.RESTING]: {
    Icon: Moon,
    icon: { background: 'var(--surface-2)', color: 'var(--ink-3)' },
    card: { opacity: 0.75 },
  },
  [STATUS.UPCOMING]: {
    Icon: Clock,
    icon: { background: 'var(--surface-2)', color: 'var(--ink-3)' },
    card: { opacity: 0.75 },
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
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: i < done ? 'var(--good)' : 'var(--line)' }}
        />
      ))}
    </span>
  )
}

export default function TaskCard({ task, state, areaLabel, onLog, onUndo }) {
  const { copy } = useTheme()
  const style = STATUS_STYLES[state.status] ?? STATUS_STYLES[STATUS.DUE]
  const { Icon } = style
  const isDone = state.status === STATUS.DONE

  return (
    <div className="panel flex items-center gap-3 p-3.5" style={style.card}>
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={style.icon}
      >
        <Icon className="h-5 w-5" strokeWidth={2.4} />
      </div>

      <div className="min-w-0 flex-1">
        <p
          className={`text-[15px] leading-snug font-semibold ${isDone ? 'line-through' : ''}`}
          style={{ color: isDone ? 'var(--ink-2)' : 'var(--ink)' }}
        >
          {task.name}
          <CountDots done={state.done} target={state.target} />
        </p>
        {/* Status first — it is the part worth reading at a glance. */}
        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--ink-2)' }}>
          {areaLabel ? <span className="font-medium">{areaLabel} · </span> : null}
          <span
            className={state.status === STATUS.OVERDUE ? 'font-semibold' : undefined}
            style={state.status === STATUS.OVERDUE ? { color: 'var(--alert-ink)' } : undefined}
          >
            {isDone && state.lastDone ? friendlyDate(state.lastDone) : state.detail}
          </span>
          <span style={{ color: 'var(--ink-3)' }}> · {scheduleLabel(task.schedule)}</span>
        </p>
        {task.note && !isDone ? (
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--ink-3)' }}>
            {task.note}
          </p>
        ) : null}
      </div>

      {isDone ? (
        <button
          type="button"
          onClick={() => onUndo(task.id)}
          className="flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold transition active:scale-95"
          style={{ color: 'var(--ink-2)' }}
          aria-label={`Undo ${task.name}`}
        >
          <Undo2 className="h-4 w-4" />
          Undo
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onLog(task.id)}
          className="btn-primary h-10 shrink-0 px-4 text-sm"
          aria-label={`Log ${task.name} as done`}
        >
          {copy.logButton ?? 'Log'}
        </button>
      )}
    </div>
  )
}
