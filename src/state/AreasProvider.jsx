import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AREAS as BUILT_IN_AREAS, BUILT_IN_IDS } from '../config/areas.js'
import * as customStore from '../lib/custom.js'
import { composeAreas } from '../lib/compose.js'
import { touching } from '../lib/settingsClock.js'

const AreasContext = createContext(null)

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
      isTaskEdited: (taskId) => customStore.hasTaskSettings(custom, taskId),

      ...touching({
        addArea: (draft) => setCustom((c) => customStore.addArea(c, draft, BUILT_IN_IDS)),
        updateArea: (areaId, patch) => setCustom((c) => customStore.updateArea(c, areaId, patch)),
        removeArea: (areaId) => setCustom((c) => customStore.removeArea(c, areaId)),
        restoreArea: (areaId) => setCustom((c) => customStore.restoreArea(c, areaId)),

        addTask: (areaId, task) => setCustom((c) => customStore.addTask(c, areaId, task, BUILT_IN_IDS)),
        updateTask: (taskId, patch) => setCustom((c) => customStore.updateTaskSettings(c, taskId, patch)),
        resetTask: (taskId) => setCustom((c) => customStore.resetTaskSettings(c, taskId)),
        removeTask: (areaId, taskId) => setCustom((c) => customStore.removeTask(c, areaId, taskId)),
        restoreTask: (taskId) => setCustom((c) => customStore.restoreTask(c, taskId)),
      }),
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
