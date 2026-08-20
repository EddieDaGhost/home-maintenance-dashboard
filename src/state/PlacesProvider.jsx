import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as placesStore from '../lib/places.js'
import * as dailyStore from '../lib/daily.js'
import { clearReading } from '../lib/forecast.js'
import { touching } from '../lib/settingsClock.js'

const PlacesContext = createContext(null)

/**
 * Where you are, where you work, and what you wrote down for today.
 *
 * Two stores behind one provider because one screen uses both, but they are
 * treated differently on purpose: `places` is settings and syncs, `daily` is a
 * scratch list and stays on this device. See the notes at the top of each.
 *
 * Only the places mutators go through `touching()` — the settings clock is what
 * decides which phone's settings win a merge, and the daily list isn't in that
 * document at all.
 */
export function PlacesProvider({ children }) {
  const [places, setPlaces] = useState(placesStore.loadPlaces)
  const [daily, setDaily] = useState(() => dailyStore.pruneDaily(dailyStore.loadDaily()))

  useEffect(() => {
    placesStore.savePlaces(places)
  }, [places])

  useEffect(() => {
    dailyStore.saveDaily(daily)
  }, [daily])

  const value = useMemo(
    () => ({
      places,
      setPlaces,
      daily,
      setDaily,

      // The list: not synced, not stamped on the settings clock.
      addItem: (text, now = Date.now()) => setDaily((d) => dailyStore.addItem(d, text, now)),
      toggleItem: (id, now = Date.now()) => setDaily((d) => dailyStore.toggleItem(d, id, now)),
      removeItem: (id) => setDaily((d) => dailyStore.removeItem(d, id)),

      ...touching({
        setHome: (home) => {
          // A new place makes the cached reading somebody else's weather.
          clearReading()
          setPlaces((p) => placesStore.setHome(p, home))
        },
        setUnits: (units) => setPlaces((p) => placesStore.setUnits(p, units)),
        setWork: (address) => setPlaces((p) => placesStore.setWork(p, address)),
        clearHome: () => {
          clearReading()
          setPlaces((p) => placesStore.clearHome(p))
        },
        clearWork: () => setPlaces((p) => placesStore.clearWork(p)),
      }),
    }),
    [places, daily],
  )

  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>
}

export function usePlaces() {
  const context = useContext(PlacesContext)
  if (!context) throw new Error('usePlaces must be used inside a PlacesProvider')
  return context
}
