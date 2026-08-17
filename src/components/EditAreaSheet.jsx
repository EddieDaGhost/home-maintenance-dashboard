import { useEffect, useState } from 'react'
import { ChevronDown, Nfc, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { PALETTES, paletteFor } from '../config/areas.js'
import { ICON_NAMES, iconFor } from '../config/icons.js'
import { useNames } from '../state/NamesProvider.jsx'
import { useAreas } from '../state/AreasProvider.jsx'
import { useTheme } from '../theme/ThemeProvider.jsx'
import ScheduleFields, { SCHEDULE_DEFAULTS } from './ScheduleFields.jsx'
import Sheet from './Sheet.jsx'

const COLOR_NAMES = Object.keys(PALETTES)

function IconPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ICON_NAMES.map((name) => {
        const Icon = iconFor(name)
        const on = name === value
        return (
          <button
            key={name}
            type="button"
            aria-label={`Icon: ${name}`}
            aria-pressed={on}
            onClick={() => onChange(name)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border transition active:scale-90"
            style={{
              borderColor: on ? 'var(--accent)' : 'var(--line)',
              background: on ? 'var(--surface-2)' : 'transparent',
              color: on ? 'var(--accent)' : 'var(--ink-2)',
            }}
          >
            <Icon className="h-5 w-5" />
          </button>
        )
      })}
    </div>
  )
}

function ColorPicker({ value, onChange, themeId }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_NAMES.map((name) => {
        const palette = paletteFor({ color: name }, themeId)
        const on = name === value
        return (
          <button
            key={name}
            type="button"
            aria-label={`Color: ${name}`}
            aria-pressed={on}
            onClick={() => onChange(name)}
            className="h-9 w-9 rounded-full transition active:scale-90"
            style={{
              background: palette.base,
              outline: on ? '2px solid var(--ink)' : 'none',
              outlineOffset: '2px',
            }}
          />
        )
      })}
    </div>
  )
}

function AddTaskForm({ onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [points, setPoints] = useState(3)
  const [schedule, setSchedule] = useState(SCHEDULE_DEFAULTS.weekly)

  return (
    <div className="space-y-3 rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
      <input
        className="field"
        aria-label="New task name"
        placeholder="What needs doing?"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="field"
        aria-label="New task note"
        placeholder="A note to your future self (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <ScheduleFields value={schedule} onChange={setSchedule} />
      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
        <input
          type="number"
          className="field w-20"
          aria-label="Points"
          min={1}
          max={50}
          value={points}
          onChange={(e) => setPoints(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
        />
        points — bigger jobs are worth more
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary h-10 flex-1 text-sm">
          Cancel
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => onAdd({ name, note, schedule, points })}
          className="btn-primary h-10 flex-1 text-sm disabled:opacity-40"
        >
          Add task
        </button>
      </div>
    </div>
  )
}

/**
 * The editable half of a task row, revealed by its disclosure. Points, repeat
 * and schedule are stored as an override keyed by task id, so nothing here can
 * move an id or orphan a history — see updateTaskSettings in src/lib/custom.js.
 *
 * Deliberately inline rather than a second sheet: a dialog on top of a dialog
 * is miserable on a phone.
 */
function TaskSettings({ task, edited, onChange, onReset }) {
  return (
    <div className="mt-2 space-y-3 rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
      <ScheduleFields value={task.schedule} onChange={(schedule) => onChange({ schedule })} />

      <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--ink-2)' }}>
        <input
          type="number"
          className="field w-20"
          aria-label={`Points for ${task.name}`}
          min={1}
          max={99}
          value={task.points ?? 1}
          onChange={(e) => onChange({ points: Math.min(99, Math.max(1, Number(e.target.value) || 1)) })}
        />
        points each time
      </label>

      <label className="flex items-start gap-2.5 text-sm" style={{ color: 'var(--ink-2)' }}>
        <input
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0"
          aria-label={`Let ${task.name} be logged more than once`}
          checked={Boolean(task.repeatable)}
          onChange={(e) => onChange({ repeatable: e.target.checked })}
        />
        <span>
          Can be logged more than once
          <span className="block text-xs" style={{ color: 'var(--ink-3)' }}>
            Every tap counts again, so three trips to the coop are worth three times the points.
          </span>
        </span>
      </label>

      {edited ? (
        <button
          type="button"
          onClick={onReset}
          aria-label={`Reset ${task.name} to its original settings`}
          className="flex w-full items-center justify-center gap-2 py-1.5 text-xs font-semibold transition active:scale-95"
          style={{ color: 'var(--ink-2)' }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Back to the original
        </button>
      ) : null}
    </div>
  )
}

/**
 * One sheet for everything about a room: what it's called, what it looks like,
 * which tasks it holds, and whether it exists at all.
 *
 * `mode="create"` reuses the top half to make a brand-new room.
 */
export default function EditAreaSheet({ area, open, mode = 'edit', onClose, onCreated, onDeleted }) {
  const { themeId } = useTheme()
  const { nameFor, subtitleFor, isRenamed, saveArea, resetArea } = useNames()
  const { addArea, updateArea, removeArea, addTask, removeTask, updateTask, resetTask, isTaskEdited } =
    useAreas()

  const [form, setForm] = useState({ name: '', subtitle: '', iconName: 'home', color: 'sky', tasks: {} })
  const [addingTask, setAddingTask] = useState(false)
  const [openTaskId, setOpenTaskId] = useState(null)

  useEffect(() => {
    if (!open) return
    setAddingTask(false)
    setOpenTaskId(null)
    if (mode === 'create') {
      setForm({ name: '', subtitle: '', iconName: 'home', color: 'sky', tasks: {} })
      return
    }
    setForm({
      name: nameFor(area),
      subtitle: subtitleFor(area),
      iconName: area.iconName ?? 'home',
      color: area.color,
      tasks: Object.fromEntries(area.tasks.map((task) => [task.id, nameFor(task)])),
    })
    // Keyed on the room's id, not the object: editing a task's points rebuilds
    // the area, and depending on identity would re-seed the form and slam the
    // open settings panel shut on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, area?.id, mode])

  const handleSave = () => {
    if (mode === 'create') {
      if (!form.name.trim()) return
      addArea({
        name: form.name,
        subtitle: form.subtitle,
        iconName: form.iconName,
        color: form.color,
      })
      onCreated?.()
      onClose()
      return
    }
    // Names go through the overrides store; only the look is structural.
    saveArea(area, form)
    updateArea(area.id, { iconName: form.iconName, color: form.color })
    onClose()
  }

  const handleDeleteRoom = () => {
    const message = area.isCustom
      ? `Delete ${nameFor(area)}? Its tasks go with it.`
      : `Hide ${nameFor(area)}? You can bring it back from "Add a room", and its history is kept.`
    if (!window.confirm(message)) return
    removeArea(area.id)
    onClose()
    onDeleted?.()
  }

  const isCreate = mode === 'create'

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isCreate ? 'Add a room' : 'Edit room'}
      footer={
        <div className="flex gap-2.5">
          <button type="button" onClick={onClose} className="btn-secondary h-11 flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isCreate && !form.name.trim()}
            className="btn-primary h-11 flex-1 disabled:opacity-40"
          >
            {isCreate ? 'Create room' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {!isCreate ? (
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
        ) : null}

        <div>
          <label className="label mb-1 block" htmlFor="area-name">
            Room name
          </label>
          <input
            id="area-name"
            className="field"
            value={form.name}
            placeholder={isCreate ? 'Garage' : area.name}
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
            placeholder={isCreate ? 'Tools & bins' : area.subtitle}
            onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
          />
        </div>

        <div>
          <p className="label mb-1.5">Icon</p>
          <IconPicker value={form.iconName} onChange={(iconName) => setForm((f) => ({ ...f, iconName }))} />
        </div>

        <div>
          <p className="label mb-1.5">Color</p>
          <ColorPicker
            value={form.color}
            themeId={themeId}
            onChange={(color) => setForm((f) => ({ ...f, color }))}
          />
        </div>

        {!isCreate ? (
          <>
            <div className="space-y-2.5">
              <p className="label">Tasks</p>
              {area.tasks.map((task) => {
                const expanded = openTaskId === task.id
                return (
                  <div key={task.id}>
                    <div className="flex items-center gap-2">
                      <input
                        className="field"
                        aria-label={`Name for ${task.name}`}
                        value={form.tasks[task.id] ?? ''}
                        placeholder={task.name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, tasks: { ...f.tasks, [task.id]: e.target.value } }))
                        }
                      />
                      <button
                        type="button"
                        aria-label={`Settings for ${task.name}`}
                        aria-expanded={expanded}
                        onClick={() => setOpenTaskId(expanded ? null : task.id)}
                        className="btn-secondary flex h-10 w-10 shrink-0 items-center justify-center"
                      >
                        <ChevronDown
                          className="h-4 w-4 transition-transform"
                          style={{ transform: expanded ? 'rotate(180deg)' : undefined }}
                        />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${nameFor(task)}`}
                        onClick={() => {
                          const label = task.isCustom ? 'Delete' : 'Hide'
                          if (!window.confirm(`${label} "${nameFor(task)}"? Your history for it is kept.`)) return
                          removeTask(area.id, task.id)
                          setForm((f) => {
                            const tasks = { ...f.tasks }
                            delete tasks[task.id]
                            return { ...f, tasks }
                          })
                        }}
                        className="btn-secondary flex h-10 w-10 shrink-0 items-center justify-center"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {expanded ? (
                      <TaskSettings
                        task={task}
                        edited={isTaskEdited(task.id)}
                        onChange={(patch) => updateTask(task.id, patch)}
                        onReset={() => resetTask(task.id)}
                      />
                    ) : null}
                  </div>
                )
              })}

              {addingTask ? (
                <AddTaskForm
                  onCancel={() => setAddingTask(false)}
                  onAdd={(task) => {
                    addTask(area.id, task)
                    setAddingTask(false)
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingTask(true)}
                  className="btn-secondary flex h-11 w-full items-center justify-center gap-2 text-sm"
                >
                  <Plus className="h-4 w-4" />
                  Add a task
                </button>
              )}
            </div>

            <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
              Leave a name empty to go back to its original.
            </p>

            {isRenamed(area) ? (
              <button
                type="button"
                onClick={() => {
                  resetArea(area)
                  onClose()
                }}
                className="flex w-full items-center justify-center gap-2 py-2 text-xs font-semibold transition active:scale-95"
                style={{ color: 'var(--ink-2)' }}
              >
                <RotateCcw className="h-4 w-4" />
                Reset this room to its original names
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleDeleteRoom}
              className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition active:scale-95"
              style={{ borderColor: 'var(--alert-line)', color: 'var(--alert-ink)' }}
            >
              <Trash2 className="h-4 w-4" />
              {area.isCustom ? 'Delete this room' : 'Hide this room'}
            </button>
          </>
        ) : (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            You'll add tasks once the room exists. It gets its own NFC address straight away — check
            <strong> NFC tag setup</strong> for it.
          </p>
        )}
      </div>
    </Sheet>
  )
}
