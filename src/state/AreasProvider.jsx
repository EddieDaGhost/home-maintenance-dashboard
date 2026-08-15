import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AREAS as BUILT_IN_AREAS, BUILT_IN_IDS } from '../config/areas.js'
import { iconFor } from '../config/icons.js'
import * as customStore from '../lib/custom.js'

const AreasContext = createContext(null)

/**
 * Merges the built-in rooms from src/config/areas.js with whatever you've added
 * or hidden from inside the app, and hands the result to the whole app. Nothing
 * else needs to know which rooms are built in and which are yours.
 */
function composeAreas(custom) {
  const hidden = new Set(custom.hidden)

  const builtIns = BUILT_IN_AREAS.filter((area) => !hidden.has(area.id)).map((area) => {
    const appearance = custom.appearance[area.id] ?? {}
    return {
      ...area,
      icon: appearance.iconName ? iconFor(appearance.iconName) : area.icon,
      iconName: appearance.iconName ?? area.iconName,
      color: appearance.color ?? area.color,
      isCustom: false,
      tasks: [
        ...area.tasks.filter((task) => !hidden.has(task.id)).map((task) => ({ ...task, isCustom: false })),
        ...(custom.tasks[area.id] ?? []).map((task) => ({ ...task, isCustom: true })),
      ],
    }
  })

  const mine = custom.areas.map((area) => ({
    id: area.id,
    name: area.name,
    subtitle: area.subtitle ?? '',
    icon: iconFor(area.iconName),
    iconName: area.iconName,
    color: area.color ?? 'sky',
    isCustom: true,
    tasks: (custom.tasks[area.id] ?? [])
      .filter((task) => !hidden.has(task.id))
      .map((task) => ({ ...task, isCustom: true })),
  }))

  return [...builtIns, ...mine]
}

export function AreasProvider({ children }) {
  const [custom, setCustom] = useState(customStore.loadCustom)

  useEffect(() => {
    customStore.saveCustom(custom)
  }, [custom])

  const areas = useMemo(() => composeAreas(custom), [custom])

  const value = useMemo(() => {
    const areasById = Object.fromEntries(areas.map((area) => [area.id, area]))
    const allTasks = areas.flatMap((area) => area.tasks.map((task) => ({ ...task, area })))

    /** Built-in rooms you've put away, so they can be brought back. */
    const hiddenAreas = BUILT_IN_AREAS.filter((area) => custom.hidden.includes(area.id))

    return {
      areas,
      areasById,
      allTasks,
      hiddenAreas,
      custom,
      setCustom,
      hiddenTaskIds: custom.hidden,

      addArea: (draft) => setCustom((c) => customStore.addArea(c, draft, BUILT_IN_IDS)),
      updateArea: (areaId, patch) => setCustom((c) => customStore.updateArea(c, areaId, patch)),
      removeArea: (areaId) => setCustom((c) => customStore.removeArea(c, areaId)),
      restoreArea: (areaId) => setCustom((c) => customStore.restoreArea(c, areaId)),

      addTask: (areaId, task) => setCustom((c) => customStore.addTask(c, areaId, task, BUILT_IN_IDS)),
      removeTask: (areaId, taskId) => setCustom((c) => customStore.removeTask(c, areaId, taskId)),
      restoreTask: (taskId) => setCustom((c) => customStore.restoreTask(c, taskId)),
    }
  }, [areas, custom])

  return <AreasContext.Provider value={value}>{children}</AreasContext.Provider>
}

export function useAreas() {
  const context = useContext(AreasContext)
  if (!context) throw new Error('useAreas must be used inside an AreasProvider')
  return context
}

/** Convenience for components that just need the current room list. */
export function useAreaList() {
  return useAreas().areas
}

export { composeAreas }
