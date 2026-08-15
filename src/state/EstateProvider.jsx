import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as estateStore from '../lib/estate.js'
import { touching } from '../lib/settingsClock.js'
import { usePeople } from './PeopleProvider.jsx'

const EstateContext = createContext(null)

/**
 * What each person has bought. Sits inside PeopleProvider because "your scene"
 * means the person currently logging, and switching who's logging switches the
 * scene along with it.
 *
 * Every mutator goes through `touching()`. Without it the settings clock never
 * moves, this device never offers its settings to the household, and a purchase
 * quietly disappears the next time the other phone syncs.
 */
export function EstateProvider({ children }) {
  const [estate, setEstate] = useState(estateStore.loadEstate)
  const { activeId } = usePeople()

  useEffect(() => {
    estateStore.saveEstate(estate)
  }, [estate])

  const value = useMemo(
    () => ({
      estate,
      setEstate,
      /** The active person's shelf — what the scene is drawn from. */
      entry: estateStore.entryFor(estate, activeId),
      entryFor: (personId) => estateStore.entryFor(estate, personId),

      ...touching({
        buyItem: (item, balance, personId = activeId) =>
          setEstate((e) => estateStore.buyItem(e, personId, item, balance)),
        equip: (itemId, personId = activeId) => setEstate((e) => estateStore.equip(e, personId, itemId)),
        buyCompanion: (cost, balance, name = '', personId = activeId) =>
          setEstate((e) => estateStore.buyCompanion(e, personId, cost, balance, name)),
        renameCompanion: (companionId, name, personId = activeId) =>
          setEstate((e) => estateStore.renameCompanion(e, personId, companionId, name)),
        buyTreat: (cost, balance, personId = activeId) =>
          setEstate((e) => estateStore.buyTreat(e, personId, cost, balance)),
      }),
    }),
    [estate, activeId],
  )

  return <EstateContext.Provider value={value}>{children}</EstateContext.Provider>
}

export function useEstate() {
  const context = useContext(EstateContext)
  if (!context) throw new Error('useEstate must be used inside an EstateProvider')
  return context
}
