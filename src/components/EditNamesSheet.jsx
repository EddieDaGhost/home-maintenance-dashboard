import { useEffect, useState } from 'react'
import { Nfc, RotateCcw } from 'lucide-react'
import { useNames } from '../state/NamesProvider.jsx'
import Sheet from './Sheet.jsx'

/** Rename one area and its tasks. Ids — and therefore NFC tags — never change. */
export default function EditNamesSheet({ area, open, onClose, onSaved }) {
  const { nameFor, subtitleFor, isRenamed, saveArea, resetArea } = useNames()
  const [form, setForm] = useState(() => blankForm())

  function blankForm() {
    return { name: '', subtitle: '', tasks: {} }
  }

  // Load the current names each time the sheet opens.
  useEffect(() => {
    if (!open) return
    setForm({
      name: nameFor(area),
      subtitle: subtitleFor(area),
      tasks: Object.fromEntries(area.tasks.map((task) => [task.id, nameFor(task)])),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, area])

  const handleSave = () => {
    saveArea(area, form)
    onSaved?.()
    onClose()
  }

  const handleReset = () => {
    resetArea(area)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit names"
      footer={
        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className="btn-secondary h-11 flex-1">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="btn-primary h-11 flex-1">
            Save
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          className="flex items-start gap-2.5 rounded-xl p-3 text-xs"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}
        >
          <Nfc className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
          <p>
            Your NFC tag keeps working. Tags point at the room itself, not its name, so you can
            rename this as often as you like without rewriting a sticker.
          </p>
        </div>

        <div>
          <label className="label mb-1 block" htmlFor="area-name">
            Room name
          </label>
          <input
            id="area-name"
            className="field"
            value={form.name}
            placeholder={area.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>

        <div>
          <label className="label mb-1 block" htmlFor="area-subtitle">
            Subtitle
          </label>
          <input
            id="area-subtitle"
            className="field"
            value={form.subtitle}
            placeholder={area.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
          />
        </div>

        <div className="space-y-2.5">
          <p className="label">Tasks</p>
          {area.tasks.map((task) => (
            <input
              key={task.id}
              className="field"
              aria-label={`Name for ${task.name}`}
              value={form.tasks[task.id] ?? ''}
              placeholder={task.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, tasks: { ...f.tasks, [task.id]: e.target.value } }))
              }
            />
          ))}
        </div>

        <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
          Leave a field empty to go back to its original name.
        </p>

        {isRenamed(area) ? (
          <button
            type="button"
            onClick={handleReset}
            className="flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold transition active:scale-95"
            style={{ color: 'var(--ink-2)' }}
          >
            <RotateCcw className="h-4 w-4" />
            Reset this room to its original names
          </button>
        ) : null}
      </div>
    </Sheet>
  )
}
