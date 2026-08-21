import { AlertCircle, Check, Circle, Clock, Moon, RotateCw, Undo2, UserRound } from 'lucide-react'
import { STATUS, scheduleLabel } from '../lib/schedule.js'
import { friendlyDate } from '../lib/date.js'
import { useTheme } from '../theme/ThemeProvider.jsx'
import { useNames } from '../state/NamesProvider.jsx'
import { usePeople } from '../state/PeopleProvider.jsx'
import { turnLabel } from '../lib/turns.js'

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
  // Warm amber, not alarm red: the app has no failure state, so nothing about a
  // chore should look like a fire alarm. --alert-* stays for the things that
  // actually take something away from you.
  [STATUS.OVERDUE]: {
    Icon: AlertCircle,
    icon: { background: 'var(--attention-soft)', color: 'var(--attention-ink)' },
    card: { '--surface': 'var(--attention-soft)', '--line': 'var(--attention-line)' },
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

export default function TaskCard({ task, state, areaLabel, entries = [], onLog, onUndo, readOnly = false }) {
  const { copy } = useTheme()
  const { nameFor } = useNames()
  const { people, activeId, isShared, nameOf } = usePeople()
  const name = nameFor(task)
  const style = STATUS_STYLES[state.status] ?? STATUS_STYLES[STATUS.DUE]
  const { Icon } = style
  const isDone = state.status === STATUS.DONE
  // A repeatable task still reads DONE — it shouldn't keep nagging — but the
  // Log button stays available, and every tap counts again.
  const canRepeat = Boolean(task.repeatable)
  // Whose job it is only earns space once somebody else exists to do it. It is
  // a hint and never a lock: the Log button below is identical either way.
  const turn = isShared ? turnLabel(task, entries, people, activeId, nameOf) : null

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
          {name}
          <CountDots done={state.done} target={state.target} />
          {canRepeat && state.done > 1 ? (
            <span className="numeral ml-2 align-middle text-xs font-semibold" style={{ color: 'var(--good-ink)' }}>
              ×{state.done}
            </span>
          ) : null}
        </p>
        {/* Status first — it is the part worth reading at a glance. */}
        <p className="mt-0.5 text-xs leading-snug" style={{ color: 'var(--ink-2)' }}>
          {areaLabel ? <span className="font-medium">{areaLabel} · </span> : null}
          <span
            className={state.status === STATUS.OVERDUE ? 'font-semibold' : undefined}
            style={state.status === STATUS.OVERDUE ? { color: 'var(--attention-ink)' } : undefined}
          >
            {isDone && state.lastDone ? friendlyDate(state.lastDone) : state.detail}
          </span>
          <span style={{ color: 'var(--ink-3)' }}> · {scheduleLabel(task.schedule)}</span>
        </p>
        {turn ? (
          <p className="mt-1 flex items-center gap-1 text-xs" style={{ color: 'var(--ink-3)' }}>
            <UserRound className="h-3 w-3 shrink-0" />
            {turn}
          </p>
        ) : null}
        {task.note && !isDone ? (
          <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--ink-3)' }}>
            {task.note}
          </p>
        ) : null}
      </div>

      {readOnly ? null : isDone ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onUndo(task.id)}
            className="flex h-10 shrink-0 items-center gap-1 rounded-xl px-3 text-xs font-semibold transition active:scale-95"
            style={{ color: 'var(--ink-2)' }}
            aria-label={`Undo ${name}`}
          >
            <Undo2 className="h-4 w-4" />
            Undo
          </button>
          {canRepeat ? (
            <button
              type="button"
              onClick={() => onLog(task.id)}
              className="btn-primary flex h-10 shrink-0 items-center gap-1 px-3 text-xs"
              aria-label={`Log ${name} again`}
            >
              <RotateCw className="h-4 w-4" />
              Again
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onLog(task.id)}
          className="btn-primary h-10 shrink-0 px-4 text-sm"
          aria-label={`Log ${name} as done`}
        >
          {copy.logButton ?? 'Log'}
        </button>
      )}
    </div>
  )
}
