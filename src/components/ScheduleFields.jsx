import { DAY_NAMES, DAY_SHORT } from '../lib/date.js'

// The schedule kinds you can build from inside the app. `rotatingWeek` (the
// bathroom rotation) is deliberately left to the config file — it needs an
// offset per room and is easy to get wrong in a form.
const KINDS = [
  { kind: 'daily', label: 'Every day' },
  { kind: 'weekdays', label: 'Certain weekdays' },
  { kind: 'timesPerWeek', label: 'A few times a week' },
  { kind: 'weekly', label: 'Once a week, any day' },
  { kind: 'weeklyOn', label: 'Every specific weekday' },
  { kind: 'weekend', label: 'Weekends' },
  { kind: 'everyNDays', label: 'Every N days' },
  { kind: 'everyNMonths', label: 'Every N months' },
]

const DEFAULTS = {
  daily: { kind: 'daily' },
  weekdays: { kind: 'weekdays', days: [1, 3, 5] },
  timesPerWeek: { kind: 'timesPerWeek', times: 2 },
  weekly: { kind: 'weekly' },
  weeklyOn: { kind: 'weeklyOn', day: 5 },
  weekend: { kind: 'weekend' },
  everyNDays: { kind: 'everyNDays', days: 14 },
  everyNMonths: { kind: 'everyNMonths', months: 3 },
}

function NumberField({ label, value, min, max, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
      <input
        type="number"
        className="field w-20"
        value={value}
        min={min}
        max={max}
        aria-label={label}
        onChange={(e) => {
          const next = Number(e.target.value)
          if (Number.isFinite(next)) onChange(Math.min(max, Math.max(min, next)))
        }}
      />
      {label}
    </label>
  )
}

export default function ScheduleFields({ value, onChange }) {
  const schedule = value ?? DEFAULTS.weekly

  return (
    <div className="space-y-2">
      <label className="label block" htmlFor="schedule-kind">
        How often
      </label>
      <select
        id="schedule-kind"
        className="field"
        value={schedule.kind}
        onChange={(e) => onChange(DEFAULTS[e.target.value])}
      >
        {KINDS.map((option) => (
          <option key={option.kind} value={option.kind}>
            {option.label}
          </option>
        ))}
      </select>

      {schedule.kind === 'weekdays' ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {DAY_SHORT.map((short, day) => {
            const on = schedule.days.includes(day)
            return (
              <button
                key={day}
                type="button"
                aria-pressed={on}
                aria-label={DAY_NAMES[day]}
                onClick={() => {
                  const days = on
                    ? schedule.days.filter((d) => d !== day)
                    : [...schedule.days, day].sort((a, b) => a - b)
                  // Never leave it with no days at all.
                  onChange({ ...schedule, days: days.length ? days : schedule.days })
                }}
                className="h-9 w-11 rounded-lg border text-xs font-semibold transition active:scale-95"
                style={{
                  borderColor: on ? 'var(--accent)' : 'var(--line)',
                  background: on ? 'var(--accent)' : 'transparent',
                  color: on ? 'var(--accent-ink)' : 'var(--ink-2)',
                }}
              >
                {short}
              </button>
            )
          })}
        </div>
      ) : null}

      {schedule.kind === 'timesPerWeek' ? (
        <NumberField
          label="times a week"
          value={schedule.times}
          min={1}
          max={7}
          onChange={(times) => onChange({ ...schedule, times })}
        />
      ) : null}

      {schedule.kind === 'weeklyOn' ? (
        <select
          className="field"
          aria-label="Day of the week"
          value={schedule.day}
          onChange={(e) => onChange({ ...schedule, day: Number(e.target.value) })}
        >
          {DAY_NAMES.map((name, day) => (
            <option key={day} value={day}>
              {name}
            </option>
          ))}
        </select>
      ) : null}

      {schedule.kind === 'everyNDays' ? (
        <NumberField
          label="days apart"
          value={schedule.days}
          min={1}
          max={365}
          onChange={(days) => onChange({ ...schedule, days })}
        />
      ) : null}

      {schedule.kind === 'everyNMonths' ? (
        <NumberField
          label="months apart"
          value={schedule.months}
          min={1}
          max={24}
          onChange={(months) => onChange({ ...schedule, months })}
        />
      ) : null}
    </div>
  )
}

export { DEFAULTS as SCHEDULE_DEFAULTS }
