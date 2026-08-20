import { useMemo, useState } from 'react'
import { AlertCircle, ArrowRight, Check, Plus } from 'lucide-react'
import { BUILT_IN_IDS } from '../config/areas.js'
import { applyImport, describeParsed, parseImport } from '../lib/importTasks.js'
import { scheduleLabel } from '../lib/schedule.js'
import { useAreas } from '../state/AreasProvider.jsx'
import { useNames } from '../state/NamesProvider.jsx'
import { SCHEDULE_DEFAULTS } from './ScheduleFields.jsx'
import Sheet from './Sheet.jsx'

const EXAMPLE = `Kitchen: Wipe counters, 2x per week, 3
Kitchen: Mop the floor, weekly, 5
Garage: Sweep the floor, every 2 weeks
Sort the recycling, mon · fri, 2`

/**
 * Typing a whole house in at once.
 *
 * The preview is the point, not decoration. A bulk edit you can't see before it
 * happens is how somebody ends up with forty duplicated chores, so nothing is
 * written until the button below the list of exactly what will change.
 */
export default function ImportSheet({ open, onClose, onToast }) {
  const { areas, custom, setCustom } = useAreas()
  const { nameFor } = useNames()
  const [text, setText] = useState('')

  const parsed = useMemo(() => parseImport(text, areas, nameFor), [text, areas, nameFor])
  const nothing = parsed.tasks.length === 0

  const commit = () => {
    setCustom((current) => applyImport(current, parsed, BUILT_IN_IDS, SCHEDULE_DEFAULTS.weekly))
    const bits = []
    if (parsed.added) bits.push(`${parsed.added} added`)
    if (parsed.updated) bits.push(`${parsed.updated} updated`)
    onToast?.(bits.join(', ') || 'Nothing to import')
    setText('')
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Import a list"
      footer={
        <div className="space-y-2">
          <button
            type="button"
            disabled={nothing}
            onClick={commit}
            className="btn-primary h-12 w-full text-sm disabled:opacity-40"
          >
            {nothing
              ? 'Nothing to import yet'
              : `Import ${parsed.added ? `${parsed.added} new` : ''}${parsed.added && parsed.updated ? ', ' : ''}${
                  parsed.updated ? `${parsed.updated} updated` : ''
                }`}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary h-11 w-full text-sm">
            Cancel
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          One chore per line: <strong>Room: Task, how often, points</strong>. The room carries down
          the list until you name another one, and the last two are optional.
        </p>

        <textarea
          className="field min-h-[9rem] font-mono text-sm"
          id="import-text"
          aria-label="Your list"
          placeholder={EXAMPLE}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />

        {text.trim() ? null : (
          <button
            type="button"
            onClick={() => setText(EXAMPLE)}
            className="btn-secondary h-10 w-full text-xs"
          >
            Fill in the example so I can see it work
          </button>
        )}

        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          It understands <em>daily</em>, <em>weekly</em>, <em>weekends</em>, <em>2x per week</em>,{' '}
          <em>every 3 days</em>, <em>every 2 weeks</em>, <em>monthly</em>, <em>every 6 months</em>,{' '}
          <em>mon · wed · fri</em> and <em>every Friday</em> — the same words the app prints. Leave
          it out and a chore is once a week.
        </p>

        {/* Exactly what will happen, before it happens. */}
        {parsed.rooms.length ? (
          <div>
            <p className="label mb-1.5">New rooms</p>
            <div className="flex flex-wrap gap-1.5">
              {parsed.rooms.map((room) => (
                <span
                  key={room}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ background: 'var(--good-soft)', color: 'var(--good-ink)' }}
                >
                  {room}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {parsed.tasks.length ? (
          <div>
            <p className="label mb-1.5">
              {parsed.added} to add{parsed.updated ? `, ${parsed.updated} to update` : ''}
            </p>
            <div className="panel settings-list overflow-hidden">
              {parsed.tasks.map((task) => {
                const detail = describeParsed(task, scheduleLabel)
                return (
                  <div key={`${task.line}-${task.name}`} className="flex items-center gap-2.5 px-3 py-2.5">
                    {task.existingId ? (
                      <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0" style={{ color: 'var(--good)' }} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                        {task.name}
                      </span>
                      <span className="block truncate text-xs" style={{ color: 'var(--ink-3)' }}>
                        {task.room}
                        {detail ? ` · ${detail}` : ' · once a week'}
                        {task.existingId ? ' · already exists, will be updated' : ''}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {parsed.skipped.length ? (
          <div>
            <p className="label mb-1.5">Skipped</p>
            <div
              className="rounded-xl p-3"
              style={{ background: 'var(--attention-soft)', border: '1px solid var(--attention-line)' }}
            >
              <ul className="space-y-1.5">
                {parsed.skipped.map((line) => (
                  <li key={line.line} className="flex gap-2 text-xs" style={{ color: 'var(--ink-2)' }}>
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--attention-ink)' }} />
                    <span className="min-w-0">
                      <span className="numeral font-semibold">Line {line.line}</span> — {line.why}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs" style={{ color: 'var(--ink-3)' }}>
                Everything else still imports. Nothing is lost by leaving these.
              </p>
            </div>
          </div>
        ) : null}

        {parsed.updated ? (
          <p className="flex gap-2 text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--good)' }} />
            A chore you already have keeps its history — only what it&apos;s worth and how often it
            comes round are changed.
          </p>
        ) : null}
      </div>
    </Sheet>
  )
}
