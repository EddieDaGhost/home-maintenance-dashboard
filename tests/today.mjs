// The morning screen.
//
// Three things the logic suite can't see: that a town typed into the form
// actually produces a forecast on screen, that the drive-to-work button is a
// real link to a real maps URL, and that a scratch list added here never turns
// into anything the app scolds you about.
//
// The forecast comes from tests/fake-forecast.mjs rather than open-meteo.com,
// so `npm run check` never leaves the machine.

import { startFakeForecast } from './fake-forecast.mjs'
import { newPhonePage } from './harness.mjs'

const ENDPOINT_KEY = 'home-maintenance-dashboard/forecast-endpoint'
const PLACES_KEY = 'home-maintenance-dashboard/places/v1'
const DAILY_KEY = 'home-maintenance-dashboard/today/v1'
const LOG_KEY = 'home-maintenance-dashboard/v1'

const openToday = async (page) => {
  await page.getByRole('button', { name: /things? on the plate|Nothing on the plate/ }).first().click()
  await page.waitForTimeout(300)
}

/** The form, reopened from the forecast block on the Today screen itself. */
const openSetup = async (page) => {
  await page.getByRole('button', { name: 'Change your town' }).click()
  await page.waitForTimeout(300)
}

export default async function run({ browser, check, URL }) {
  const server = await startFakeForecast()
  const { context, page, errors } = await newPhonePage(browser)

  await context.addInitScript(
    ([key, url]) => {
      try {
        window.localStorage.setItem(key, url)
      } catch {
        // nothing to do
      }
    },
    [ENDPOINT_KEY, server.url],
  )

  try {
    // ---- nothing is set up, and nothing has been sent anywhere ----
    await page.goto(URL, { waitUntil: 'networkidle' })
    check('the dashboard offers today', (await page.getByText(/on the plate/).count()) > 0)
    check('nothing was looked up unasked', server.requests.length === 0, `${server.requests.length} requests`)

    await openToday(page)
    check('the screen opens', (await page.getByRole('heading', { name: 'Today' }).count()) === 1)
    check('it asks for a town', (await page.getByText('Add your town for the forecast').count()) === 1)
    check('and says nothing happens until you do', (await page.getByText('Nothing is looked up until you do').count()) === 1)
    check('it asks where you work', (await page.getByText('Add where you work').count()) === 1)
    check('the chores are already here', (await page.getByRole('button', { name: /^Log / }).count()) > 0)
    check('still nothing sent', server.requests.length === 0, `${server.requests.length} requests`)

    // ---- the setup form ----
    await page.getByText('Add your town for the forecast').click()
    await page.waitForTimeout(300)
    const sheet = page.getByRole('dialog', { name: 'Weather and the drive' })
    check('the form says what leaves the phone', (await sheet.getByText(/sends the town you typed to Open-Meteo/).count()) === 1)
    check('and that the work address does not', (await sheet.getByText(/This never goes anywhere/).count()) === 1)
    check('and that it wants a town, not a street', (await sheet.getByText(/not by street address/).count()) === 1)

    // A town nobody has heard of says so, and changes nothing.
    await sheet.locator('#place-town').fill('Nowhereford')
    await sheet.getByRole('button', { name: 'Look it up' }).click()
    await page.waitForTimeout(600)
    check('an unknown town says so plainly', (await sheet.getByText(/No town called "Nowhereford" was found/).count()) === 1)
    check('and nothing was saved', (await page.evaluate((k) => localStorage.getItem(k), PLACES_KEY)) === null)

    // A real one resolves.
    await sheet.locator('#place-town').fill('Kalamazoo')
    await sheet.getByRole('button', { name: /Look it up/ }).click()
    await page.waitForTimeout(700)
    check('a real town resolves to its region', (await sheet.getByText('Kalamazoo, Michigan').count()) === 1)

    const geocode = server.requests.filter((r) => r.path === '/v1/search')
    check('the lookup asked for one result', geocode.at(-1)?.params.count === '1', JSON.stringify(geocode.at(-1)?.params ?? {}))

    await sheet.locator('#place-work').fill('100 Main St, Kalamazoo MI')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await page.waitForTimeout(800)

    // ---- the forecast is on screen ----
    check('the temperature shows', (await page.getByText('64°F', { exact: true }).count()) === 1)
    check('with what it is doing', (await page.getByText('Overcast', { exact: true }).count()) > 0)
    check('and the day either side of it', (await page.getByText(/High 70°F · Low 50°F · 40% chance of rain/).count()) === 1)

    const forecastCalls = server.requests.filter((r) => r.path === '/v1/forecast')
    check('the forecast was asked for the right place', forecastCalls.at(-1)?.params.latitude === '42.29171')
    check('in the right units', forecastCalls.at(-1)?.params.temperature_unit === 'fahrenheit')
    check('for today only', forecastCalls.at(-1)?.params.forecast_days === '1')

    // ---- the drive ----
    const link = page.getByRole('link', { name: /Drive to work/ })
    const href = await link.getAttribute('href')
    check(
      'the maps link carries the encoded address',
      href === 'https://www.google.com/maps/dir/?api=1&destination=100%20Main%20St%2C%20Kalamazoo%20MI&travelmode=driving',
      String(href),
    )
    check('it has no origin, so the phone supplies one', !/origin=|saddr/.test(href ?? ''))
    check('it opens away from the app', (await link.getAttribute('target')) === '_blank')
    check('safely', ((await link.getAttribute('rel')) ?? '').includes('noopener'))
    check('and the other maps app is offered', (await page.getByRole('link', { name: /Use Apple Maps instead/ }).count()) === 1)

    // ---- switching to Celsius refetches rather than converting locally ----
    await openSetup(page)
    await page.getByRole('dialog', { name: 'Weather and the drive' }).getByRole('button', { name: '°C' }).click()
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(900)
    check('Celsius is asked for from the service', server.requests.filter((r) => r.params.temperature_unit === 'celsius').length > 0)
    check('and shown', (await page.getByText('18°C', { exact: true }).count()) === 1)

    // ---- the scratch list ----
    await page.locator('#today-item').fill('Call the vet')
    await page.getByRole('button', { name: 'Add to today' }).click()
    await page.waitForTimeout(300)
    await page.locator('#today-item').fill('Pick up feed')
    await page.getByRole('button', { name: 'Add to today' }).click()
    await page.waitForTimeout(300)
    check('both items are listed', (await page.getByText('Call the vet').count()) === 1)
    check('and the second one too', (await page.getByText('Pick up feed').count()) === 1)
    check('the field empties for the next one', (await page.locator('#today-item').inputValue()) === '')

    await page.getByRole('button', { name: 'Tick off Call the vet' }).click()
    await page.waitForTimeout(300)
    check('ticking moves it to the ticked-off list', (await page.getByText('Ticked off').count()) === 1)
    check('and offers to put it back', (await page.getByRole('button', { name: /Put Call the vet back/ }).count()) === 1)

    // The load-bearing claim: none of that is a completion.
    const logged = await page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      if (!raw) return 0
      return Object.values(JSON.parse(raw).completions).reduce((n, list) => n + list.length, 0)
    }, LOG_KEY)
    check('nothing about the list was logged as a chore', logged === 0, `${logged} completions`)

    // ---- it all survives a reload ----
    await page.reload({ waitUntil: 'networkidle' })
    await openToday(page)
    check('the list is still there', (await page.getByText('Pick up feed').count()) === 1)
    check('so is the town', (await page.getByText('64°F', { exact: true }).count() + await page.getByText('18°C', { exact: true }).count()) === 1)
    check('and the drive', (await page.getByRole('link', { name: /Drive to work/ }).count()) === 1)

    // ---- nothing scolds ----
    check(
      'nothing on the screen calls anything late',
      (await page.getByText(/\b(late|overdue|missed|failed)\b/i).count()) === 0,
    )

    // ---- one tap still logs a chore from here ----
    const firstLog = page.getByRole('button', { name: /^Log / }).first()
    const choreName = await firstLog.getAttribute('aria-label')
    await firstLog.click()
    await page.waitForTimeout(400)
    const after = await page.evaluate((key) => {
      const raw = localStorage.getItem(key)
      if (!raw) return 0
      return Object.values(JSON.parse(raw).completions).reduce((n, list) => n + list.length, 0)
    }, LOG_KEY)
    check(`logging ${choreName} from Today works in one tap`, after === 1, `${after} completions`)

    // ---- removing everything leaves no key behind ----
    await page.getByRole('button', { name: /^Remove / }).first().click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /^Remove / }).first().click()
    await page.waitForTimeout(300)
    const listKey = await page.evaluate((k) => localStorage.getItem(k), DAILY_KEY)
    check('an empty list means no key', listKey === null, String(listKey))

    await openSetup(page)
    const setup = page.getByRole('dialog', { name: 'Weather and the drive' })
    await setup.getByRole('button', { name: 'Forget it' }).click()
    await page.waitForTimeout(200)
    await setup.locator('#place-work').fill('')
    await setup.getByRole('button', { name: 'Done' }).click()
    await page.waitForTimeout(400)
    const placeKey = await page.evaluate((k) => localStorage.getItem(k), PLACES_KEY)
    check('and forgetting both places leaves none either', placeKey === null, String(placeKey))

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    check('no sideways scroll', !overflow)

    check('no console or page errors', errors.length === 0, errors.join(' | '))
  } finally {
    await context.close()
    await server.stop()
  }
}
