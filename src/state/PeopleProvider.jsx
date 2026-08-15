import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import * as peopleStore from '../lib/people.js'
import { touching } from '../lib/settingsClock.js'

const PeopleContext = createContext(null)

export function PeopleProvider({ children }) {
  const [household, setHousehold] = useState(peopleStore.loadPeople)

  useEffect(() => {
    peopleStore.savePeople(household)
  }, [household])

  const value = useMemo(
    () => ({
      household,
      setHousehold,
      people: household.people,
      activeId: household.activeId,
      activePerson: household.people.find((p) => p.id === household.activeId) ?? household.people[0],
      /** More than one person is what turns on the "who did it" bits of the UI. */
      isShared: household.people.length > 1,
      nameOf: (id) => peopleStore.personName(household, id),

      ...touching({
        addPerson: (name) => setHousehold((h) => peopleStore.addPerson(h, name)),
        renamePerson: (id, name) => setHousehold((h) => peopleStore.renamePerson(h, id, name)),
        removePerson: (id) => setHousehold((h) => peopleStore.removePerson(h, id)),
        setActivePerson: (id) => setHousehold((h) => peopleStore.setActivePerson(h, id)),
      }),
    }),
    [household],
  )

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>
}

export function usePeople() {
  const context = useContext(PeopleContext)
  if (!context) throw new Error('usePeople must be used inside a PeopleProvider')
  return context
}
