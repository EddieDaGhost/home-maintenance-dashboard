import { useState } from 'react'
import { Check, Plus, Trophy, X } from 'lucide-react'
import { initialsOf } from '../lib/people.js'
import { pointsByPerson } from '../lib/stats.js'
import { usePeople } from '../state/PeopleProvider.jsx'
import { useAreas } from '../state/AreasProvider.jsx'
import { useTheme } from '../theme/ThemeProvider.jsx'
import Sheet from './Sheet.jsx'

export function PersonAvatar({ name, active, size = 'h-9 w-9' }) {
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full text-xs font-bold`}
      style={{
        background: active ? 'var(--accent)' : 'var(--surface-2)',
        color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
        border: '1px solid var(--line)',
      }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  )
}

export default function HouseholdSheet({ open, onClose, log, now }) {
  const { people, activeId, setActivePerson, addPerson, renamePerson, removePerson } = usePeople()
  const { allTasks } = useAreas()
  const { copy } = useTheme()
  const [newName, setNewName] = useState('')

  const scores = pointsByPerson(log, people, allTasks, now)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Who's logging"
      footer={
        <button type="button" onClick={onClose} className="btn-primary h-11 w-full">
          Done
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          Whoever is selected gets credit for anything logged next. Add the rest of the household
          and the history starts recording who did what.
        </p>

        <div className="space-y-2">
          {scores.map(({ person, points }) => {
            const active = person.id === activeId
            return (
              <div
                key={person.id}
                className="flex items-center gap-2.5 rounded-xl border p-2.5"
                style={{
                  borderColor: active ? 'var(--accent)' : 'var(--line)',
                  background: active ? 'var(--surface-2)' : 'transparent',
                }}
              >
                <PersonAvatar name={person.name} active={active} />

                {/* Rename and "who's logging" are separate controls on purpose —
                    one tap should never do the other thing by accident. */}
                <div className="min-w-0 flex-1">
                  <input
                    className="w-full bg-transparent text-[15px] font-semibold outline-none"
                    style={{ color: 'var(--ink)' }}
                    aria-label={`Name for ${person.name}`}
                    value={person.name}
                    onChange={(e) => renamePerson(person.id, e.target.value)}
                  />
                  <span
                    className="numeral flex items-center gap-1 text-xs"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    <Trophy className="h-3 w-3" />
                    {points} {copy.pointsUnit} this week
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActivePerson(person.id)}
                  aria-pressed={active}
                  aria-label={`Log as ${person.name}`}
                  disabled={active}
                  className={`flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold ${
                    active ? '' : 'btn-secondary'
                  }`}
                  style={active ? { color: 'var(--accent)' } : undefined}
                >
                  {active ? <Check className="h-4 w-4" strokeWidth={2.6} /> : null}
                  {active ? 'Logging' : 'Switch'}
                </button>

                {people.length > 1 ? (
                  <button
                    type="button"
                    aria-label={`Remove ${person.name}`}
                    onClick={() => {
                      if (window.confirm(`Remove ${person.name}? Past entries stay in the history.`)) {
                        removePerson(person.id)
                      }
                    }}
                    className="btn-secondary flex h-9 w-9 shrink-0 items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>

        <div className="flex gap-2">
          <input
            className="field"
            aria-label="New person's name"
            placeholder="Add someone"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                addPerson(newName)
                setNewName('')
              }
            }}
          />
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={() => {
              addPerson(newName)
              setNewName('')
            }}
            className="btn-primary flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-40"
            aria-label="Add person"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Everyone shares this device's history — this is about credit, not separate accounts.
        </p>
      </div>
    </Sheet>
  )
}
