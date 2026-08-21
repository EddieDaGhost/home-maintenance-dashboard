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

  // ---- Today, with a town saved and no way to reach the weather ----
  // The forecast must never gate this screen: what's on the plate is the part
  // that matters at the coop, and yesterday's reading beats an error message.
  await page.evaluate(() => {
    const home = {
      query: 'Kalamazoo',
      label: 'Kalamazoo, Michigan',
      latitude: 42.29,
      longitude: -85.59,
      units: 'fahrenheit',
    }
    localStorage.setItem(
      'home-maintenance-dashboard/places/v1',
      JSON.stringify({ home, work: '100 Main St' }),
    )
    localStorage.setItem(
      'home-maintenance-dashboard/forecast/v1',
      JSON.stringify({
        key: `${home.latitude},${home.longitude},${home.units}`,
        reading: {
          units: 'fahrenheit',
          at: Date.now() - 3 * 60 * 60 * 1000,
          temperature: 58,
          code: 3,
          isDay: true,
          high: 66,
          low: 47,
          rainChance: 20,
        },
      }),
    )
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /on the plate/ }).first().click()
  await page.waitForTimeout(700)

  check('Today opens with no signal', (await page.getByRole('heading', { name: 'Today' }).count()) === 1)
  check('the chores are the part that still works', (await page.getByRole('button', { name: /^Log / }).count()) > 0)
  check('the last reading is shown rather than an error', (await page.getByText('58°F', { exact: true }).count()) === 1)
  check('with the time it was taken', (await page.getByText(/^Last checked /).count()) === 1)
  check('and the drive link needs no network to build', (await page.getByRole('link', { name: /Drive to work/ }).count()) === 1)

  await page.goto(URL, { waitUntil: 'domcontentloaded' })

  // ---- back inside the house ----
  await context.setOffline(false)
  await page.reload({ waitUntil: 'networkidle' })
  check('everything still works back online', (await page.getByText('Day streak').count()) === 1)
  const persisted = await page.evaluate(() => localStorage.getItem('home-maintenance-dashboard/v1'))
  check('what was logged offline survived', persisted.includes('chickens-checkin'))

  // ---- the manifest is served, so Add to Home Screen looks right ----
  const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href')
  check('a web app manifest is linked', Boolean(manifestHref), manifestHref ?? 'missing')

  // Being disconnected is the whole point of this suite, so the browser's own
  // "net::ERR_INTERNET_DISCONNECTED" for a request made while offline is the
  // condition under test rather than a defect — the service worker's
  // network-first fetch for index.html is *supposed* to try and fall back to
  // the cache, and every check above is what proves the app coped. Anything
  // else still fails.
  const unexpected = errors.filter((error) => !/net::ERR_/.test(error))
  check('no console or page errors', unexpected.length === 0, unexpected.join(' | '))
  check(
    'and the only network failures were the deliberate ones',
    errors.every((error) => /net::ERR_INTERNET_DISCONNECTED|net::ERR_NETWORK_CHANGED|net::ERR_FAILED/.test(error)),
    errors.join(' | '),
  )
}
