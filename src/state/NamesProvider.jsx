import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { touching } from '../lib/settingsClock.js'
import {
  displayName,
  displaySubtitle,
  hasCustomNames,
  loadNames,
  saveNames,
  withOverride,
  withoutOverrides,
} from '../lib/names.js'

const NamesContext = createContext(null)

export function NamesProvider({ children }) {
  const [names, setNames] = useState(loadNames)

  useEffect(() => {
    saveNames(names)
  }, [names])

  /** Save an area's whole edit form at once. */
  const saveArea = useCallback((area, form) => {
    setNames((current) => {
      let next = withOverride(current, area.id, {
        name: form.name,
        subtitle: form.subtitle,
      })
      for (const task of area.tasks) {
        next = withOverride(next, task.id, { name: form.tasks[task.id] ?? '' })
      }
      return next
    })
  }, [])

  const resetArea = useCallback((area) => {
    setNames((current) => withoutOverrides(current, [area.id, ...area.tasks.map((t) => t.id)]))
  }, [])

  const value = useMemo(
    () => ({
      names,
      setNames,
      nameFor: (entity) => displayName(entity, names),
      subtitleFor: (area) => displaySubtitle(area, names),
      isRenamed: (area) => hasCustomNames(area, names),
      ...touching({ saveArea, resetArea }),
    }),
    [names, saveArea, resetArea],
  )

  return <NamesContext.Provider value={value}>{children}</NamesContext.Provider>
}

export function useNames() {
  const context = useContext(NamesContext)
  if (!context) throw new Error('useNames must be used inside a NamesProvider')
  return context
}
