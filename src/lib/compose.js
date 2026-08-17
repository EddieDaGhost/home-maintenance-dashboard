// Merging the built-in rooms from src/config/areas.js with whatever the user has
// added, hidden or edited. Pure — no React — so the logic suite can hold it.
//
// Nothing downstream needs to know which rooms shipped with the app and which
// are yours, or that a task's points came from an override rather than config.

import { AREAS as BUILT_IN_AREAS } from '../config/areas.js'
import { iconFor } from '../config/icons.js'

/**
 * Merges the built-in rooms from src/config/areas.js with whatever you've added
 * or hidden from inside the app, and hands the result to the whole app. Nothing
 * else needs to know which rooms are built in and which are yours.
 */
export function composeAreas(custom) {
  const hidden = new Set(custom.hidden)
  const settings = custom.taskSettings ?? {}

  /**
   * Points, schedule and repeat come from an override keyed by task id, applied
   * on top of built-in and custom tasks alike — so a chore you invented and one
   * that shipped with the app behave exactly the same way once you've edited it.
   */
  const dressed = (task, isCustom) => ({ ...task, ...(settings[task.id] ?? {}), isCustom })

  const builtIns = BUILT_IN_AREAS.filter((area) => !hidden.has(area.id)).map((area) => {
    const appearance = custom.appearance[area.id] ?? {}
    return {
      ...area,
      icon: appearance.iconName ? iconFor(appearance.iconName) : area.icon,
      iconName: appearance.iconName ?? area.iconName,
      color: appearance.color ?? area.color,
      isCustom: false,
      tasks: [
        ...area.tasks.filter((task) => !hidden.has(task.id)).map((task) => dressed(task, false)),
        ...(custom.tasks[area.id] ?? []).map((task) => dressed(task, true)),
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
    tasks: (custom.tasks[area.id] ?? []).filter((task) => !hidden.has(task.id)).map((task) => dressed(task, true)),
  }))

  return [...builtIns, ...mine]
}
