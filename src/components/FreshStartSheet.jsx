import { Check, Sunrise } from 'lucide-react'
import { useAway } from '../state/AwayProvider.jsx'
import Sheet from './Sheet.jsx'

/**
 * Drawing a line under the backlog.
 *
 * The honest version of this feature: it does not log anything, so it can't
 * inflate your points, your credits or your streak, and it doesn't delete a
 * single entry. It only stops chores from before the line being described as
 * overdue. Log one and its own clock takes over again.
 */
export default function FreshStartSheet({ open, onClose, now = new Date() }) {
  const { startFresh, clearFreshStart, hasFreshStart, freshStartLabel } = useAway()
  const active = hasFreshStart()

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Start fresh"
      footer={
        <button type="button" onClick={onClose} className="btn-primary h-11 w-full">
          Done
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          If the list has built up into something you don&apos;t want to look at, draw a line under
          it. Everything still on the list stays on the list — it just stops being described as
          late.
        </p>

        <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
          <p className="label mb-2">What this does not do</p>
          <ul className="space-y-1.5 text-xs" style={{ color: 'var(--ink-2)' }}>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--good)' }} />
              Nothing is marked as done — it won&apos;t give you points or credits you didn&apos;t
              earn.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--good)' }} />
              Nothing is deleted. Your whole history, your streak and your balance are untouched.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--good)' }} />
              Log any of it and that chore goes straight back to its normal schedule.
            </li>
          </ul>
        </div>

        {active ? (
          <div
            className="rounded-xl p-3"
            style={{ background: 'var(--good-soft)', border: '1px solid var(--good-line)' }}
          >
            <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              <Sunrise className="h-4 w-4" style={{ color: 'var(--good-ink)' }} />
              Fresh since {freshStartLabel()}
            </p>
            <button
              type="button"
              onClick={() => {
                clearFreshStart()
                onClose()
              }}
              className="btn-secondary mt-2.5 h-9 w-full text-xs"
            >
              Undo it — show me the full picture
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              startFresh(now)
              onClose()
            }}
            className="btn-primary flex h-12 w-full items-center justify-center gap-2"
          >
            <Sunrise className="h-5 w-5" />
            Start fresh from today
          </button>
        )}
      </div>
    </Sheet>
  )
}
