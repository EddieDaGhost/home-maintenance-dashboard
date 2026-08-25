import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Download, X } from 'lucide-react'
import { resetSummary, scratchSummary } from '../lib/reset.js'
import Sheet from './Sheet.jsx'
import { useEstate } from '../state/EstateProvider.jsx'
import { useAreas } from '../state/AreasProvider.jsx'

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
export default function ResetSheet({ open, onClose, log, onReset, onScratch, onBackup, sharing }) {
  const { estate } = useEstate()
  const { areas } = useAreas()
  // null = choosing, 'reset' = clear the scoreboard, 'scratch' = empty the house.
  const [level, setLevel] = useState(null)
  const [armed, setArmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)

  // Reopening should never land on a primed button.
  useEffect(() => {
    if (open) return
    setLevel(null)
    setArmed(false)
    setBusy(false)
    setProblem(null)
  }, [open])

  const { logged, bought, spent, tasks } = resetSummary(log, estate)
  const { rooms, tasks: allTasks } = scratchSummary(areas)
  const nothingToDo = logged === 0 && bought === 0 && spent === 0

  const go = async () => {
    setBusy(true)
    setProblem(null)
    const result = await (level === 'scratch' ? onScratch() : onReset())
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
      title="Start again"
      footer={
        <button type="button" onClick={onClose} className="btn-primary h-11 w-full">
          Close
        </button>
      }
    >
      {/* Two levels, chosen first. A second scary row in the settings list
          would have hidden the relationship between them. */}
      {level === null ? (
        <div className="space-y-2.5">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            Two ways to begin again. Neither can be undone, so both offer you a backup first.
          </p>

          <button
            type="button"
            onClick={() => setLevel('reset')}
            className="panel w-full p-4 text-left transition active:scale-[0.99]"
          >
            <span className="block font-semibold" style={{ color: 'var(--ink)' }}>
              Clear the scoreboard
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              Every log and purchase goes; your streak, points and credits go to zero.{' '}
              <strong>Your rooms and tasks stay exactly as they are.</strong>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setLevel('scratch')}
            className="panel w-full p-4 text-left transition active:scale-[0.99]"
            style={{ '--surface': 'var(--alert-soft)', '--line': 'var(--alert-line)' }}
          >
            <span className="block font-semibold" style={{ color: 'var(--alert-ink)' }}>
              Empty the house
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              All of the above, <strong>and every room and task with it</strong> — the ones the app
              came with and the ones you added. You start on an empty list and build your own.
            </span>
          </button>

          <button type="button" onClick={onBackup} className="btn-secondary flex h-11 w-full items-center justify-center gap-2 text-sm">
            <Download className="h-4 w-4" />
            Back up first
          </button>
        </div>
      ) : (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => {
            setLevel(null)
            setArmed(false)
            setProblem(null)
          }}
          className="text-xs font-semibold"
          style={{ color: 'var(--ink-3)' }}
        >
          ← Both options
        </button>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          {level === 'scratch'
            ? 'Everything goes and you start on an empty list — the same as opening the app for the first time, except you keep the look you chose.'
            : "Puts the scoreboard back to zero. Everything you've set up stays exactly as it is — this only clears what you've done."}
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
            {level === 'scratch' ? (
              <li className="flex gap-2">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--alert)' }} />
                <span className="numeral">
                  {rooms} {rooms === 1 ? 'room' : 'rooms'} and {allTasks}{' '}
                  {allTasks === 1 ? 'task' : 'tasks'} — the whole list, gone
                </span>
              </li>
            ) : null}
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
              {level === 'scratch'
                ? 'Your household, your names, your town and your trips'
                : 'Your streak, your points and your credit balance all go to zero'}
            </li>
          </ul>
        </div>

        <div className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
          <p className="label mb-2">What it keeps</p>
          <ul className="space-y-1.5 text-xs" style={{ color: 'var(--ink-2)' }}>
            {level === 'scratch' ? (
              <>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--good)' }} />
                  The look you chose — that&apos;s a preference, not data
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--good)' }} />
                  Any backup file you&apos;ve saved, which is how you&apos;d undo this
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--good)' }} />
                  The starter rooms can be brought back from Settings if you change your mind
                </li>
              </>
            ) : (
              <>
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
              </>
            )}
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

        {nothingToDo && level === 'reset' ? (
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
              {busy
                ? 'Clearing…'
                : level === 'scratch'
                  ? `Yes — empty the house`
                  : `Yes — clear ${logged} ${logged === 1 ? 'entry' : 'entries'}`}
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
            {level === 'scratch' ? 'Empty the house' : 'Reset everything'}
          </button>
        )}
      </div>
      )}
    </Sheet>
  )
}
