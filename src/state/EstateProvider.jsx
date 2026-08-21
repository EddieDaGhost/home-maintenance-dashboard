import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as estateStore from '../lib/estate.js'
import { touching } from '../lib/settingsClock.js'
import { usePeople } from './PeopleProvider.jsx'
import { useTheme } from '../theme/ThemeProvider.jsx'

const EstateContext = createContext(null)

/**
 * What each person has bought. Sits inside PeopleProvider because "your scene"
 * means the person currently logging, and switching who's logging switches the
 * scene along with it. It reads the theme for the same reason: what you own is
 * per look, so switching look switches the shelf — one wallet, three scenes.
 *
 * Every mutator goes through `touching()`. Without it the settings clock never
 * moves, this device never offers its settings to the household, and a purchase
 * quietly disappears the next time the other phone syncs.
 */
export function EstateProvider({ children }) {
  const [estate, setEstate] = useState(estateStore.loadEstate)
  const { activeId } = usePeople()
  const { themeId } = useTheme()

  useEffect(() => {
    estateStore.saveEstate(estate)
  }, [estate])

  const value = useMemo(
    () => ({
      estate,
      setEstate,
      /** The active person's wallet and treat — shared across every look. */
      entry: estateStore.entryFor(estate, activeId),
      entryFor: (personId) => estateStore.entryFor(estate, personId),
      /** What they own and are wearing in the look they're currently in. */
      look: estateStore.lookFor(estateStore.entryFor(estate, activeId), themeId),

      ...touching({
        buyItem: (item, balance, personId = activeId) =>
          setEstate((e) => estateStore.buyItem(e, personId, themeId, item, balance)),
        equip: (itemId, personId = activeId) =>
          setEstate((e) => estateStore.equip(e, personId, themeId, itemId)),
        buyCompanion: (cost, balance, name = '', personId = activeId) =>
          setEstate((e) => estateStore.buyCompanion(e, personId, themeId, cost, balance, name)),
        renameCompanion: (companionId, name, personId = activeId) =>
          setEstate((e) => estateStore.renameCompanion(e, personId, themeId, companionId, name)),
        buyTreat: (cost, balance, personId = activeId) =>
          setEstate((e) => estateStore.buyTreat(e, personId, cost, balance)),
      }),
    }),
    [estate, activeId, themeId],
  )

  return <EstateContext.Provider value={value}>{children}</EstateContext.Provider>
}

export function useEstate() {
  const context = useContext(EstateContext)
  if (!context) throw new Error('useEstate must be used inside an EstateProvider')
  return context
}
