// The visitor buffer: a device nobody has set up gets an explanation rather
// than somebody else's chore list.

export default async function run({ page, check, errors, URL }) {
  // ---- a brand-new device ----
  await page.goto(URL, { waitUntil: 'networkidle' })
  check('a new device gets the welcome screen', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Home Maintenance')
  check('it explains the tap ritual', (await page.getByText('Tap a sticker').count()) === 1)
  check('it promises no nagging', (await page.getByText('Nothing nags you').count()) === 1)
  check('it says whose data this is', (await page.getByText(/Everything stays on the phone that logged it/).count()) === 1)
  check('no dashboard stats are visible', (await page.getByText('Day streak').count()) === 0)
  check('no room list is visible', (await page.getByText('Litter Boxes').count()) === 0)
  check('nothing was written to storage yet', await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1')) === null)

  // ---- tapping a room tag as a visitor ----
  await page.goto(`${URL}/#kitchen`, { waitUntil: 'networkidle' })
  check('a tag tap still lands on the welcome screen', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Home Maintenance')
  check('it names the tag that was tapped', (await page.getByText(/You just tapped the/).count()) === 1)
  check('and names the right room', (await page.getByText('Kitchen', { exact: true }).count()) > 0)
  check('the kitchen task list is not shown', (await page.getByRole('button', { name: 'Log Dishes as done' }).count()) === 0)

  // ---- "just have a look" is read-only ----
  // We arrived on the Kitchen tag, so previewing lands in that room.
  await page.getByRole('button', { name: 'Just have a look' }).click()
  await page.waitForTimeout(400)
  check('preview opens the room that was tapped', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Kitchen')
  check('preview says nothing is saved', (await page.getByText(/Nothing here is saved/).count()) === 1)
  check('preview shows the tasks', (await page.getByText('Dishes').count()) > 0)
  check('preview offers no Log buttons', (await page.getByRole('button', { name: /as done$/ }).count()) === 0)
  check('preview hides the room editor', (await page.getByRole('button', { name: 'Edit room' }).count()) === 0)

  // a visitor can keep tapping tags without leaving preview
  await page.getByRole('button', { name: 'All areas' }).click()
  await page.waitForTimeout(300)
  check('preview shows the room list', (await page.getByText('Litter Boxes').count()) > 0)
  check('preview hides the setup list', (await page.getByRole('button', { name: /Back up my data/ }).count()) === 0)
  check('preview hides Add a room', (await page.getByRole('button', { name: 'Add a room' }).count()) === 0)
  check('preview offers an explanation instead', (await page.getByRole('button', { name: 'What is this?' }).count()) === 1)
  check('preview still says nothing is saved', (await page.getByText(/Nothing here is saved/).count()) === 1)

  // ---- a visitor can see the scene, which is the best part of the pitch ----
  await page.getByRole('button', { name: /Your windowsill/ }).click()
  await page.waitForTimeout(400)
  check('preview reaches the scene', (await page.getByRole('heading', { level: 1 }).innerText()) === 'The windowsill')
  check('with an empty sill of their own', (await page.locator('#credit-balance').innerText()) === '0 cr')
  check('the prices are still on show', (await page.getByText('Boston fern').count()) === 1)
  check('but nothing can be bought', await page.getByRole('button', { name: /Buy Boston fern/ }).isDisabled())

  const touched = await page.evaluate(() =>
    Object.keys(localStorage).filter((k) => k.startsWith('home-maintenance-dashboard/')),
  )
  check('and looking at it writes nothing', touched.length === 0, touched.join(', '))

  await page.getByRole('button', { name: 'All areas' }).click()
  await page.waitForTimeout(300)

  // ---- preview is session-only ----
  // A real tag tap is a fresh page load; changing only the hash is not.
  await page.goto(`${URL}/#chickens`, { waitUntil: 'networkidle' })
  await page.reload({ waitUntil: 'networkidle' })
  check('reloading drops out of preview', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Home Maintenance')
  check('preview was never persisted', await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/device/v1')) === null)

  // ---- claiming the device ----
  await page.getByRole('button', { name: 'Set this device up' }).click()
  await page.waitForTimeout(400)
  check('claiming opens the tapped room', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Chickens')
  check('logging is available again', (await page.getByRole('button', { name: /as done$/ }).count()) > 0)
  const claim = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/device/v1'))
  check('the claim is remembered', /"claimed":true/.test(claim), claim)

  await page.reload({ waitUntil: 'networkidle' })
  check('a claimed device skips the welcome screen', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Chickens')

  await page.goto(URL, { waitUntil: 'networkidle' })
  check('the dashboard is back', (await page.getByText('Day streak').count()) === 1)
  check('setup is available to the owner', (await page.getByRole('button', { name: /Back up my data/ }).count()) === 1)
  check('the owner can re-read the overview', (await page.getByRole('button', { name: /What this app is/ }).count()) === 1)

  await page.getByRole('button', { name: /What this app is/ }).click()
  await page.waitForTimeout(300)
  check('the about sheet shows the visitor copy', (await page.getByRole('dialog', { name: 'What this app is' }).getByText('Tap a sticker').count()) === 1)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)

  // ---- an existing user must never be greeted as a visitor ----
  await page.evaluate(() => {
    localStorage.removeItem('home-maintenance-dashboard/device/v1')
    localStorage.setItem(
      'home-maintenance-dashboard/v1',
      JSON.stringify({ version: 2, completions: { 'kitchen-dishes': [{ at: Date.now() }] } }),
    )
  })
  await page.reload({ waitUntil: 'networkidle' })
  check('a device with history skips the welcome screen', (await page.getByText('Day streak').count()) === 1)
  const reclaimed = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/device/v1'))
  check('and is claimed automatically', /"claimed":true/.test(reclaimed), reclaimed)

  // same for a device that only has custom names
  await page.evaluate(() => {
    localStorage.clear()
    localStorage.setItem(
      'home-maintenance-dashboard/names/v1',
      JSON.stringify({ kitchen: { name: 'The Galley' } }),
    )
  })
  await page.reload({ waitUntil: 'networkidle' })
  check('a device with only renames also skips it', (await page.getByText('The Galley').count()) > 0)

  check('no console or page errors', errors.length === 0, errors.join(' | '))
}
