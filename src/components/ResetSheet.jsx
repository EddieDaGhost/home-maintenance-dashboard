import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Download, X } from 'lucide-react'
import { resetSummary } from '../lib/reset.js'
import Sheet from './Sheet.jsx'
import { useEstate } from '../state/EstateProvider.jsx'

/**
 * Starting over.
 *
 * The only screen in the app that uses `--alert-*`. CLAUDE.md reserves those
 * colours for things that take something away from you, and everywhere else
 * that would be a lie — an overdue chore takes nothing. This does.
 *
 * Two deliberate frictions: the exact cost is stated before the button, and the
 * button doesn't appear until you've said yes once. A backup is offered right
 * there, because "I meant to do that first" is the regret this will cause.
 */
export default function ResetSheet({ open, onClose, log, onReset, onBackup, sharing }) {
  const { estate } = useEstate()
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  // Reopening should never land on a primed button.
  useEffect(() => {
    if (open) return
    setArmed(false)
    setBusy(false)
    setProblem(null)
  }, [open])

  const { logged, bought, spent, tasks } = resetSummary(log, estate)
  const nothingToDo = logged === 0 && bought === 0 && spent === 0

  const go = async () => {
    setBusy(true)
    setProblem(null)
    const result = await onReset()
    setBusy(false)
    if (result?.ok) {
      onClose()
      return
    }
    setProblem(result?.error ?? 'Something went wrong. Nothing was changed.')
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Start over"
      footer={
        <button type="button" onClick={onClose} className="btn-primary h-11 w-full">
          Close
        </button>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          Puts the scoreboard back to zero. Everything you&apos;ve <em>set up</em> stays exactly as
          it is — this only clears what you&apos;ve <em>done</em>.
        </p>

        <div
          className="rounded-xl p-3"
          style={{ background: 'var(--alert-soft)', border: '1px solid var(--alert-line)' }}
        >
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--alert-ink)' }}>
            <AlertTriangle className="h-4 w-4 shrink-0" />
            This cannot be undone
          </p>
          <ul className="space-y-1.5 text-xs" style={{ color: 'var(--ink-2)' }}>
            <li className="flex gap-2">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--alert)' }} />
              <span className="numeral">
                {logged} logged {logged === 1 ? 'completion' : 'completions'}
                {tasks > 0 ? ` across ${tasks} ${tasks === 1 ? 'task' : 'tasks'}` : ''} — every chore
                goes back to not done
              </span>
            </li>
            <li className="flex gap-2">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--alert)' }} />
              <span className="numeral">
                {bought} {bought === 1 ? 'purchase' : 'purchases'} and {spent} credits spent — every
                scene goes back to bare
              </span>
            </li>
            <li className="flex gap-2">
              <X className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--alert)' }} />
              Your streak, your points and your credit balance all go to zero
            </li>
          </ul>
        </div>

        <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
          <p className="label mb-2">What it keeps</p>
          <ul className="space-y-1.5 text-xs" style={{ color: 'var(--ink-2)' }}>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--good)' }} />
              Every room and task you added, exactly as you made them
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--good)' }} />
              Every task you edited — points, schedule, repeat and whose job it is
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--good)' }} />
              Your household, your names, your town, your list and your trips
            </li>
          </ul>
        </div>

        {sharing ? (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            Sharing is on, so this clears the household&apos;s shared copy too — otherwise the other
            phone would simply hand it all back on the next sync. Every device in the household
            starts over.
          </p>
        ) : null}

        <button
          type="button"
          onClick={onBackup}
          className="btn-secondary flex h-11 w-full items-center justify-center gap-2 text-sm"
        >
          <Download className="h-4 w-4" />
          Back up first
        </button>

        {problem ? (
          <p
            className="rounded-xl p-2.5 text-xs leading-relaxed"
            style={{
              background: 'var(--alert-soft)',
              border: '1px solid var(--alert-line)',
              color: 'var(--alert-ink)',
            }}
          >
            {problem}
          </p>
        ) : null}

        {nothingToDo ? (
          <p className="text-center text-sm" style={{ color: 'var(--ink-3)' }}>
            Nothing to clear — you haven&apos;t logged anything yet.
          </p>
        ) : armed ? (
          <div className="space-y-2">
            <button
              type="button"
              disabled={busy}
              onClick={go}
              className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'var(--alert)', color: '#ffffff' }}
            >
              {busy ? 'Clearing…' : `Yes — clear ${logged} ${logged === 1 ? 'entry' : 'entries'}`}
            </button>
            <button type="button" onClick={() => setArmed(false)} className="btn-secondary h-11 w-full text-sm">
              No, keep everything
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setArmed(true)}
            className="btn-secondary h-12 w-full text-sm"
            style={{ color: 'var(--alert-ink)', borderColor: 'var(--alert-line)' }}
          >
            Reset everything
          </button>
        )}
      </div>
    </Sheet>
  )
}
