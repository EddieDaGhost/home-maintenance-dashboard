import { useMemo, useState } from 'react'
import { Flame, Trophy } from 'lucide-react'
import { activityGrid, bestStreak, currentStreak, historyByDay, historyTotals } from '../lib/stats.js'
import { DAY_SHORT } from '../lib/date.js'
import { useAreas } from '../state/AreasProvider.jsx'
import { useNames } from '../state/NamesProvider.jsx'
import { usePeople } from '../state/PeopleProvider.jsx'
import Sheet from './Sheet.jsx'

const WEEKS = 12

/**
 * Activity is a magnitude, so the heatmap uses one hue in light→dark steps
 * (--heat-1..4 per theme) with a neutral level for "nothing logged".
 */
function levelFor(count) {
  if (count <= 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>
      <span>Less</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <span
          key={level}
          className="h-3 w-3 rounded-[3px]"
          style={{ background: `var(--heat-${level})` }}
        />
      ))}
      <span>More</span>
    </div>
  )
}

function Heatmap({ columns, selected, onSelect }) {
  // A label is 3 chars wide but a column is 14px, so labels only get drawn when
  // there is room for one — otherwise "May" and "Jun" sit on top of each other.
  const monthLabels = useMemo(() => {
    let lastMonth = null
    let lastLabelAt = -Infinity
    return columns.map((column, i) => {
      const month = column.start.toLocaleDateString([], { month: 'short' })
      const isNewMonth = month !== lastMonth
      lastMonth = month
      if (!isNewMonth || i - lastLabelAt < 3) return ''
      lastLabelAt = i
      return month
    })
  }, [columns])

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        {/* Month labels sit above the week they start in. */}
        <div className="mb-1 flex gap-[3px] pl-7">
          {monthLabels.map((label, i) => (
            <span
              key={i}
              className="w-[14px] shrink-0 overflow-visible text-[10px] whitespace-nowrap"
              style={{ color: 'var(--ink-3)' }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex gap-[3px]">
          {/* Mon / Wed / Fri rails, the usual heatmap shorthand. */}
          <div className="mr-1 flex w-6 shrink-0 flex-col gap-[3px]">
            {[1, 2, 3, 4, 5, 6, 0].map((day, row) => (
              <span
                key={day}
                className="flex h-[14px] items-center text-[10px] leading-none"
                style={{ color: 'var(--ink-3)' }}
              >
                {row % 2 === 0 ? DAY_SHORT[day] : ''}
              </span>
            ))}
          </div>

          {columns.map((column, c) => (
            <div key={c} className="flex flex-col gap-[3px]">
              {column.days.map((day) => {
                if (day.isFuture) {
                  return <span key={day.key} className="h-[14px] w-[14px]" />
                }
                const level = levelFor(day.count)
                const label = `${day.date.toLocaleDateString([], {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}: ${day.count} logged`
                return (
                  <button
                    key={day.key}
                    type="button"
                    title={label}
                    aria-label={label}
                    onClick={() => onSelect(day)}
                    onMouseEnter={() => onSelect(day)}
                    className="h-[14px] w-[14px] rounded-[3px] transition"
                    style={{
                      background: `var(--heat-${level})`,
                      outline:
                        selected?.key === day.key
                          ? '2px solid var(--ink)'
                          : day.isToday
                            ? '1px solid var(--ink-3)'
                            : 'none',
                      outlineOffset: '1px',
                    }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon: Icon, value, label, tone }) {
  return (
    <div className="flex-1 rounded-xl border p-2.5 text-center" style={{ borderColor: 'var(--line)' }}>
      <Icon className="mx-auto h-4 w-4" style={{ color: tone }} />
      <p className="numeral mt-1 text-lg font-bold tabular-nums" style={{ color: 'var(--ink)' }}>
        {value}
      </p>
      <p className="label">{label}</p>
    </div>
  )
}

export default function HistorySheet({ open, onClose, log, now }) {
  const { allTasks } = useAreas()
  const { nameFor } = useNames()
  const { nameOf, isShared } = usePeople()
  const [selected, setSelected] = useState(null)

  const tasksById = useMemo(() => Object.fromEntries(allTasks.map((t) => [t.id, t])), [allTasks])
  const columns = useMemo(() => activityGrid(log, now, WEEKS), [log, now])
  const days = useMemo(() => historyByDay(log), [log])
  const totals = historyTotals(log, now)

  const labelFor = (taskId) => {
    const task = tasksById[taskId]
    return task ? `${nameFor(task.area)}: ${nameFor(task)}` : 'A task you have since removed'
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="History"
      footer={
        <button type="button" onClick={onClose} className="btn-primary h-11 w-full">
          Done
        </button>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <Stat icon={Flame} value={currentStreak(log, now)} label="Streak" tone="#f97316" />
          <Stat icon={Flame} value={bestStreak(log)} label="Best" tone="var(--ink-3)" />
          <Stat icon={Trophy} value={totals.thisMonth} label="This month" tone="#f59e0b" />
        </div>

        <div>
          <p className="section-title mb-2">Last {WEEKS} weeks</p>
          <Heatmap columns={columns} selected={selected} onSelect={setSelected} />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs" style={{ color: 'var(--ink-2)' }}>
              {selected
                ? `${selected.date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} — ${selected.count} logged`
                : `${totals.total} logged on ${totals.activeDays} days`}
            </p>
            <Legend />
          </div>
        </div>

        <div>
          <p className="section-title mb-2">Every entry</p>
          {days.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--ink-2)' }}>
              Nothing logged yet. The first tap of a Log button starts this off.
            </p>
          ) : (
            <div className="space-y-3">
              {days.map((group) => (
                <div key={group.key}>
                  <p className="label mb-1">
                    {group.date.toLocaleDateString([], {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <ul className="space-y-1">
                    {group.entries.map((entry, i) => (
                      <li
                        key={`${entry.taskId}-${entry.at}-${i}`}
                        className="flex justify-between gap-3 text-xs"
                      >
                        <span className="min-w-0 flex-1" style={{ color: 'var(--ink-2)' }}>
                          {labelFor(entry.taskId)}
                        </span>
                        <span className="shrink-0" style={{ color: 'var(--ink-3)' }}>
                          {isShared && entry.by ? `${nameOf(entry.by)} · ` : ''}
                          {new Date(entry.at).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Sheet>
  )
}
