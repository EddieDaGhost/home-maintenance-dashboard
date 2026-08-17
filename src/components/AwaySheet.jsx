import { useEffect, useState } from 'react'
import { PlaneTakeoff, X } from 'lucide-react'
import { addDays, startOfDay } from '../lib/date.js'
import { useAway } from '../state/AwayProvider.jsx'
import Sheet from './Sheet.jsx'

/** <input type="date"> speaks YYYY-MM-DD in local time; keep the round trip local. */
const toField = (date) => {
  const d = startOfDay(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const fromField = (value) => {
  const [y, m, d] = (value ?? '').split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d).getTime()
}

const readable = (timestamp) =>
  new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })

/** Two taps for the trips people actually take. */
function presets(now) {
  const today = startOfDay(now)
  const untilSunday = addDays(today, (7 - today.getDay()) % 7 || 7)
  return [
    { label: 'This weekend', from: addDays(untilSunday, -2), to: untilSunday },
    { label: 'A week', from: today, to: addDays(today, 6) },
    { label: 'Long weekend', from: today, to: addDays(today, 3) },
  ]
}

export default function AwaySheet({ open, onClose, now = new Date() }) {
  const { away, addWindow, endNow, removeWindow, isAway, untilLabel, upcoming } = useAway()
  const [from, setFrom] = useState(() => toField(now))
  const [to, setTo] = useState(() => toField(addDays(now, 3)))

  // Reopening the sheet should offer today again, not whatever was typed a
  // fortnight ago.
  useEffect(() => {
    if (!open) return
    setFrom(toField(now))
    setTo(toField(addDays(now, 3)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const fromAt = fromField(from)
  const toAt = fromField(to)
  const valid = Number.isFinite(fromAt) && Number.isFinite(toAt) && toAt >= fromAt
  const currentlyAway = isAway(now)
  const trips = upcoming(now)

  const apply = (start, end) => {
    addWindow(start instanceof Date ? start.getTime() : start, end instanceof Date ? end.getTime() : end)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Away"
      footer={
        <button type="button" onClick={onClose} className="btn-primary h-11 w-full">
          Done
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          Going somewhere? Nothing will be due while you&apos;re gone, your streak carries straight
          over the gap, and you come home to a normal list rather than a pile.
        </p>

        {currentlyAway ? (
          <div
            className="rounded-xl p-3"
            style={{ background: 'var(--good-soft)', border: '1px solid var(--good-line)' }}
          >
            <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              <PlaneTakeoff className="h-4 w-4" style={{ color: 'var(--good-ink)' }} />
              {untilLabel(now)}
            </p>
            <button
              type="button"
              onClick={() => {
                endNow(now)
                onClose()
              }}
              className="btn-secondary mt-2.5 h-9 w-full text-xs"
            >
              We&apos;re back
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {presets(now).map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => apply(preset.from, preset.to)}
                className="btn-secondary h-11 px-3 text-sm"
              >
                {preset.label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label mb-1 block">Leaving</span>
            {/* 16px font, or iOS zooms the page when the picker opens. */}
            <input
              type="date"
              className="field"
              id="away-from"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="block">
            <span className="label mb-1 block">Back on</span>
            <input
              type="date"
              className="field"
              id="away-to"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </div>

        <button
          type="button"
          disabled={!valid}
          onClick={() => apply(fromAt, toAt)}
          className="btn-primary h-12 w-full disabled:opacity-40"
        >
          {valid ? `Away ${readable(fromAt)} – ${readable(toAt)}` : 'Pick two dates'}
        </button>

        {trips.length ? (
          <div>
            <p className="label mb-1.5">Booked in</p>
            <div className="space-y-1.5">
              {trips.map((trip) => (
                <div key={trip.from} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm" style={{ color: 'var(--ink-2)' }}>
                    {readable(trip.from)} – {readable(trip.to)}
                  </span>
                  <button
                    type="button"
                    aria-label={`Cancel the trip on ${readable(trip.from)}`}
                    onClick={() => removeWindow(trip.from)}
                    className="btn-secondary flex h-9 w-9 shrink-0 items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          This is for the whole household, not just you — it means the house is empty. If someone
          stays home, leave it off and let them log as usual. Past trips are kept so your streak
          still reads correctly months later.
          {away.windows.length > 0 ? ' Nothing is ever deleted from your history.' : ''}
        </p>
      </div>
    </Sheet>
  )
}
