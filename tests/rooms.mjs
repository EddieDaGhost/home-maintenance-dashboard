// Custom rooms and tasks, people, history, and calendar re-export
import { readFileSync, writeFileSync } from 'node:fs'

export default async function run({ browser, page, check, errors, URL, tmp }) {
  await page.goto(URL, { waitUntil: 'networkidle' })

  // ==================== #2  ADD A ROOM ====================
  console.log('\n--- adding a room ---')
  await page.getByRole('button', { name: 'Add a room' }).click()
  await page.waitForTimeout(300)
  const create = page.getByRole('dialog', { name: 'Add a room' })
  check('add-room sheet opens', await create.isVisible())
  await create.locator('#area-name').fill('Garage')
  await create.locator('#area-subtitle').fill('Tools & bins')
  await create.getByRole('button', { name: 'Icon: car' }).click()
  await create.getByRole('button', { name: 'Color: violet' }).click()
  await create.getByRole('button', { name: 'Create room' }).click()
  await page.waitForTimeout(400)

  check('new room appears on the dashboard', (await page.getByText('Garage', { exact: true }).count()) > 0)
  check('new room shows it has no tasks', (await page.getByText('No tasks yet').count()) === 1)

  // it gets a working NFC address immediately
  await page.goto(`${URL}/#garage`, { waitUntil: 'networkidle' })
  check('new room has its own tag URL', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Garage')

  // ==================== ADD A TASK ====================
  console.log('\n--- adding a task ---')
  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  const edit = page.getByRole('dialog', { name: 'Edit room' })
  await edit.getByRole('button', { name: 'Add a task' }).click()
  await page.waitForTimeout(200)
  await edit.getByLabel('New task name').fill('Sweep the floor')
  await edit.getByLabel('New task note').fill('Including under the shelves')
  await edit.locator('#schedule-kind').selectOption('everyNDays')
  await edit.getByLabel('days apart').fill('10')
  await edit.getByLabel('Points').fill('6')
  await edit.getByRole('button', { name: 'Add task' }).click()
  await page.waitForTimeout(300)
  await edit.getByRole('button', { name: 'Save' }).click()
  await page.waitForTimeout(400)

  check('task appears in the room', (await page.getByText('Sweep the floor').count()) > 0)
  check('custom schedule renders', (await page.getByText('Every 10 days').count()) > 0)
  check('note renders', (await page.getByText('Including under the shelves').count()) > 0)

  await page.getByRole('button', { name: 'Log Sweep the floor as done' }).click()
  await page.waitForTimeout(400)
  const toastText = await page.getByRole('status').innerText()
  check('custom task logs with its own points', /\+6 pts/.test(toastText), `("${toastText}")`)

  await page.reload({ waitUntil: 'networkidle' })
  check('custom room survives reload', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Garage')

  // ==================== HIDE / RESTORE A BUILT-IN ROOM ====================
  console.log('\n--- hiding and restoring a built-in room ---')
  await page.goto(`${URL}/#laundry`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  check('built-in room offers Hide, not Delete', (await page.getByRole('button', { name: /Hide this room/ }).count()) === 1)
  await page.getByRole('button', { name: /Hide this room/ }).click()
  await page.waitForTimeout(500)
  check('hiding sends you home', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Home Maintenance')
  check('room is gone from the list', (await page.getByText('Weekend reset').count()) === 0)
  check('hidden room is offered back', (await page.getByRole('button', { name: 'Bring back' }).count()) === 1)
  await page.getByRole('button', { name: 'Bring back' }).click()
  await page.waitForTimeout(400)
  check('room comes back', (await page.getByText('Weekend reset').count()) === 1)

  // deleting a custom room removes it outright
  await page.goto(`${URL}/#garage`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  check('custom room offers Delete', (await page.getByRole('button', { name: /Delete this room/ }).count()) === 1)

  // ==================== #3  CALENDAR RE-EXPORT ====================
  console.log('\n--- calendar re-export ---')
  await page.goto(URL, { waitUntil: 'networkidle' })
  const [first] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export to iPhone Calendar/ }).click(),
  ])
  await first.saveAs(`${tmp}/export1.ics`)
  const ics1 = readFileSync(`${tmp}/export1.ics`, 'utf8')
  check('export includes the custom task', ics1.includes('Sweep the floor'))
  check('every event carries a SEQUENCE', (ics1.match(/SEQUENCE:1/g) || []).length === (ics1.match(/BEGIN:VEVENT/g) || []).length)
  check('custom task got a stable UID', /UID:[a-z0-9-]+@home-maintenance-dashboard/.test(ics1))

  // now delete the room and re-export
  await page.goto(`${URL}/#garage`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Delete this room/ }).click()
  await page.waitForTimeout(500)
  check('custom room is deleted', (await page.getByText('Garage', { exact: true }).count()) === 0)

  const [second] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export to iPhone Calendar/ }).click(),
  ])
  await second.saveAs(`${tmp}/export2.ics`)
  const ics2 = readFileSync(`${tmp}/export2.ics`, 'utf8')
  check('sequence went up on re-export', ics2.includes('SEQUENCE:2') && !ics2.includes('SEQUENCE:1'))
  check('deleted task is cancelled, not just dropped', ics2.includes('STATUS:CANCELLED'))
  check('the cancellation reuses the same UID', (() => {
    // find the UID of the garage task in the first export
    const garageBlock = ics1.split('BEGIN:VEVENT').find((b) => b.includes('Sweep the floor'))
    const uid = garageBlock?.match(/UID:(\S+)/)?.[1]
    const cancelled = ics2.split('BEGIN:VEVENT').find((b) => b.includes('STATUS:CANCELLED'))
    return Boolean(uid && cancelled && cancelled.includes(`UID:${uid}`))
  })())
  check('surviving events keep their UIDs', ics2.includes('UID:kitchen-dishes@home-maintenance-dashboard'))

  // ==================== #4  WHO DID IT ====================
  console.log('\n--- who did it ---')
  await page.getByRole('button', { name: /Who's logging/ }).click()
  await page.waitForTimeout(300)
  const household = page.getByRole('dialog', { name: "Who's logging" })
  check('household sheet opens', await household.isVisible())
  check('starts with one person', (await household.getByRole('button', { name: /^Log as / }).count()) === 1)
  await household.getByLabel("New person's name").fill('Yasmine')
  await household.getByRole('button', { name: 'Add person' }).click()
  await page.waitForTimeout(300)
  check('second person added', (await household.getByRole('button', { name: /^Log as / }).count()) === 2)
  await household.getByRole('button', { name: 'Log as Yasmine' }).click()
  await page.waitForTimeout(300)
  await household.getByRole('button', { name: 'Done' }).click()
  await page.waitForTimeout(300)

  check('avatar chip appears once shared', (await page.getByRole('button', { name: /Logging as Yasmine/ }).count()) === 1)

  await page.goto(`${URL}/#kitchen`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Log Dishes as done' }).click()
  await page.waitForTimeout(400)
  const storedLog = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  check('completion records who did it', /"by":"yasmine-/.test(storedLog), storedLog.slice(0, 120))
  check('recent activity credits the person', (await page.getByText(/Yasmine ·/).count()) > 0)

  // old entries with no person still render
  await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('home-maintenance-dashboard/v1'))
    raw.completions['kitchen-fridge'] = [Date.now() - 86400000]
    localStorage.setItem('home-maintenance-dashboard/v1', JSON.stringify(raw))
  })
  await page.reload({ waitUntil: 'networkidle' })
  check('v1 numeric entries still load', (await page.getByText('Fridge check & organize').count()) > 0)
  check('no crash on entries with no person', errors.length === 0, errors.join(' | '))

  // ==================== #5  HISTORY ====================
  console.log('\n--- history ---')
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /^History/ }).click()
  await page.waitForTimeout(400)
  const history = page.getByRole('dialog', { name: 'History' })
  check('history opens', await history.isVisible())

  const cells = await history.locator('button[aria-label*="logged"]').count()
  check('heatmap covers 12 weeks up to today', cells >= 78 && cells <= 84, `${cells} cells`)
  check('legend present', (await history.getByText('Less').count()) === 1 && (await history.getByText('More').count()) === 1)
  check('streak stat shown', (await history.getByText('Streak').count()) === 1)
  check('best stat shown', (await history.getByText('Best').count()) === 1)
  check('entries are listed', (await history.getByText(/Kitchen: Dishes/).count()) > 0)
  check('history credits people', (await history.getByText(/Yasmine ·/).count()) > 0)

  // a cell reports its own day
  const todayCell = history.locator('button[aria-label*="logged"]').last()
  const cellLabel = await todayCell.getAttribute('aria-label')
  check('cells are labelled for screen readers', /: \d+ logged$/.test(cellLabel), cellLabel)
  await todayCell.click()
  await page.waitForTimeout(300)
  check('tapping a cell shows its day', (await history.getByText(/— \d+ logged/).count()) === 1)

  // heatmap colors come from the theme ramp
  const cellColor = await todayCell.evaluate((el) => getComputedStyle(el).backgroundColor)
  check('active day uses a heat step, not the empty level', cellColor !== 'rgb(226, 232, 240)', cellColor)
  await history.getByRole('button', { name: 'Done' }).click()
  await page.waitForTimeout(300)

  // ==================== BACKUP COVERS EVERYTHING NEW ====================
  console.log('\n--- backup covers the new data ---')
  const [backup] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Back up my data/ }).click(),
  ])
  await backup.saveAs(`${tmp}/backup-v2.json`)
  const data = JSON.parse(readFileSync(`${tmp}/backup-v2.json`, 'utf8'))
  check('backup includes the household', data.household.people.some((p) => p.name === 'Yasmine'))
  check('backup includes custom rooms', Array.isArray(data.custom.areas))
  check('backup keeps who-did-what', JSON.stringify(data.completions).includes('"by"'))

  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('input[type="file"]').setInputFiles(`${tmp}/backup-v2.json`)
  await page.waitForTimeout(700)
  check('restore brings the household back', (await page.getByRole('button', { name: /Logging as/ }).count()) === 1)

  // ==================== BOTH THEMES ====================
  console.log('\n--- both themes ---')
  for (const themeId of ['home', 'starship']) {
    await page.evaluate((id) => localStorage.setItem('home-maintenance-dashboard/theme', id), themeId)
    await page.reload({ waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /^History/ }).click()
    await page.waitForTimeout(400)
    check(`history renders in ${themeId}`, await page.getByRole('dialog', { name: 'History' }).isVisible())
    await page.keyboard.press('Escape')
    await page.waitForTimeout(250)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    check(`no horizontal overflow (${themeId})`, overflow <= 0, `${overflow}px`)
  }

  // ===================== EDITING A TASK AFTER THE FACT =====================
  // Points, schedule and repeat are overrides keyed by task id, so none of this
  // can move an id or orphan a history.
  await page.goto(`${URL}/#kitchen`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  const kitchen = page.getByRole('dialog', { name: 'Edit room' })

  check('task settings start hidden', (await kitchen.getByLabel('Points for Dishes').count()) === 0)
  await kitchen.getByRole('button', { name: 'Settings for Dishes' }).click()
  await page.waitForTimeout(250)
  check('the row opens', (await kitchen.getByLabel('Points for Dishes').count()) === 1)
  check('showing what it ships with', (await kitchen.getByLabel('Points for Dishes').inputValue()) === '4')

  // The points box has to be typeable, which means clearing it has to leave it
  // clear. The obvious controlled-input version puts a 1 straight back and you
  // end up fighting the field to enter anything but a single digit.
  const dishPoints = kitchen.getByLabel('Points for Dishes')
  await dishPoints.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  check('the field can actually be emptied', (await dishPoints.inputValue()) === '', await dishPoints.inputValue())
  await page.keyboard.type('25')
  check('and a two-digit number typed into it', (await dishPoints.inputValue()) === '25', await dishPoints.inputValue())
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  check('Enter commits it', (await dishPoints.inputValue()) === '25', await dishPoints.inputValue())

  // Big jobs are allowed to be big, but not silly.
  await dishPoints.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.type('9999')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(250)
  check('and it caps at 999 rather than refusing', (await dishPoints.inputValue()) === '999', await dishPoints.inputValue())

  // Emptying an existing task's points means "leave it alone", not "worth zero".
  await dishPoints.click()
  await page.keyboard.press('Control+A')
  await page.keyboard.press('Backspace')
  await kitchen.getByRole('button', { name: 'Settings for Dishes' }).click()
  await page.waitForTimeout(250)
  await kitchen.getByRole('button', { name: 'Settings for Dishes' }).click()
  await page.waitForTimeout(250)
  check('clearing it puts the old value back', (await dishPoints.inputValue()) === '999', await dishPoints.inputValue())

  await dishPoints.fill('9')
  await kitchen.getByLabel('Let Dishes be logged more than once').check()
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)

  check('the new value is used', (await page.getByText('Every day').count()) > 0)
  // Dishes may already be logged by this point in the suite, in which case the
  // repeat button is the one on offer — either way the next tap is worth 9.
  const logDishes = async () => {
    const fresh = page.getByRole('button', { name: 'Log Dishes as done' })
    if (await fresh.count()) await fresh.click()
    else await page.getByRole('button', { name: 'Log Dishes again' }).click()
    await page.waitForTimeout(400)
  }
  await logDishes()
  const toast = await page.getByRole('status').innerText()
  check('a log is worth the edited points', /\+9 pts$/.test(toast), toast)

  // ---- repeat: the button stays, and every tap counts again ----
  check('a repeatable task can be logged again', (await page.getByRole('button', { name: 'Log Dishes again' }).count()) === 1)
  const before = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('home-maintenance-dashboard/v1') ?? '{"completions":{}}')
    return (raw.completions['kitchen-dishes'] ?? []).length
  })
  await page.getByRole('button', { name: 'Log Dishes again' }).click()
  await page.waitForTimeout(400)
  check('the repeat is visible on the card', (await page.getByText(/^×\d+$/).count()) === 1)
  const after = await page.evaluate(() => {
    const raw = JSON.parse(localStorage.getItem('home-maintenance-dashboard/v1'))
    return raw.completions['kitchen-dishes'].length
  })
  check('and the extra tap was recorded', after === before + 1, `${before} -> ${after}`)

  await page.reload({ waitUntil: 'networkidle' })
  check('the edit survives a reload', (await page.getByRole('button', { name: 'Log Dishes again' }).count()) === 1)

  // ---- back to the original ----
  await page.goto(`${URL}/#kitchen`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Edit room' }).click()
  await page.waitForTimeout(300)
  await kitchen.getByRole('button', { name: 'Settings for Dishes' }).click()
  await page.waitForTimeout(250)
  await kitchen.getByRole('button', { name: 'Reset Dishes to its original settings' }).click()
  await page.waitForTimeout(300)
  check('resetting restores the shipped points', (await kitchen.getByLabel('Points for Dishes').inputValue()) === '4')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check('and the repeat button goes with it', (await page.getByRole('button', { name: 'Log Dishes again' }).count()) === 0)
  check('while the history it earned is kept', (await page.getByText(/Dishes/).count()) > 0)

  check('no console/page errors', errors.length === 0, errors.join(' | '))

}
