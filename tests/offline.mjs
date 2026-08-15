// The coop test. An NFC tag is often tapped somewhere with no signal — outside
// at the coop, in a basement laundry room. Before the service worker existed,
// that tap got a browser error page instead of the task list.

export default async function run({ page, context, check, errors, URL }) {
  // ---- first visit, online: the app installs itself ----
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.evaluate(() => navigator.serviceWorker.ready)
  const registered = await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations()
    return registrations.length
  })
  check('a service worker registers on first visit', registered > 0, `${registered} registration(s)`)

  // give the precache a moment to finish filling
  await page.waitForTimeout(1500)
  const cachedCount = await page.evaluate(async () => {
    const names = await caches.keys()
    let total = 0
    for (const name of names) {
      const cache = await caches.open(name)
      total += (await cache.keys()).length
    }
    return total
  })
  check('the app shell is cached', cachedCount >= 4, `${cachedCount} cached responses`)

  // ---- now walk out to the coop ----
  await context.setOffline(true)

  await page.goto(`${URL}/#chickens`, { waitUntil: 'domcontentloaded' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  check('tapping a tag offline still opens the room', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Chickens')
  check('the tasks are there', (await page.getByText('Flock check-in').count()) > 0)

  // ---- and logging works with no signal ----
  const before = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  await page.getByRole('button', { name: 'Log Flock check-in as done' }).click()
  await page.waitForTimeout(400)
  const after = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  check('logging offline is recorded', before !== after && after.includes('chickens-checkin'))
  check('the toast still fires', (await page.getByRole('status').count()) === 1)

  // a different room, still offline
  await page.goto(`${URL}/#litter`, { waitUntil: 'domcontentloaded' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  check('a second tag works offline too', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Litter Boxes')

  // the dashboard, still offline
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.reload({ waitUntil: 'domcontentloaded' })
  check('the dashboard loads offline', (await page.getByText('Day streak').count()) === 1)
  check('offline work shows in the stats', (await page.getByText('Chickens').count()) > 0)

  // ---- back inside the house ----
  await context.setOffline(false)
  await page.reload({ waitUntil: 'networkidle' })
  check('everything still works back online', (await page.getByText('Day streak').count()) === 1)
  const persisted = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  check('what was logged offline survived', persisted.includes('chickens-checkin'))

  // ---- the manifest is served, so Add to Home Screen looks right ----
  const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href')
  check('a web app manifest is linked', Boolean(manifestHref), manifestHref ?? 'missing')

  check('no console or page errors', errors.length === 0, errors.join(' | '))
}
