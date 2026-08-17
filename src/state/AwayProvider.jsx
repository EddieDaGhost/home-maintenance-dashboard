import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as awayStore from '../lib/away.js'
import { touching } from '../lib/settingsClock.js'

const AwayContext = createContext(null)

/**
 * Whether the household is away. One switch for the whole house — see the note
 * at the top of src/lib/away.js for why this isn't per person.
 *
 * Mutators go through `touching()` so the settings clock moves; without it the
 * other phone never finds out you're travelling and keeps showing overdue.
 */
export function AwayProvider({ children }) {
  const [away, setAway] = useState(awayStore.loadAway)

  useEffect(() => {
    awayStore.saveAway(away)
  }, [away])

  const value = useMemo(
    () => ({
      away,
      setAway,
      isAway: (now = new Date()) => awayStore.isAway(away, now),
      untilLabel: (now = new Date()) => awayStore.awayUntilLabel(away, now),
      upcoming: (now = new Date()) => awayStore.upcomingWindows(away, now),
      hasFreshStart: () => awayStore.hasFreshStart(away),
      freshStartLabel: () => awayStore.freshStartLabel(away),

      ...touching({
        addWindow: (from, to) => setAway((a) => awayStore.addWindow(a, from, to)),
        endNow: (now = new Date()) => setAway((a) => awayStore.endWindowNow(a, now)),
        removeWindow: (from) => setAway((a) => awayStore.removeWindow(a, from)),
        startFresh: (now = new Date()) => setAway((a) => awayStore.startFresh(a, now)),
        clearFreshStart: () => setAway((a) => awayStore.clearFreshStart(a)),
      }),
    }),
    [away],
  )

  return <AwayContext.Provider value={value}>{children}</AwayContext.Provider>
}

export function useAway() {
  const context = useContext(AwayContext)
  if (!context) throw new Error('useAway must be used inside an AwayProvider')
  return context
}
