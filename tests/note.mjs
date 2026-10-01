// The kind word on the dashboard.
//
// The copy and the picking are held by the logic suite. What this covers is the
// three things it can't see: that the note is actually on screen and stays put
// while you look at it, that the switch in settings really turns it off and
// that being off leaves no trace, and — the one that matters most — that none
// of it is a notification.

import { openSettings } from './harness.mjs'
// Read from the config rather than restated here: a keyword guess at "is this
// a cat one?" was wrong the first time, and membership is the real question.
import { NOTES } from '../src/config/notes.js'

const NOTE_KEY = 'home-maintenance-dashboard/notes/v1'
const THEME_KEY = 'home-maintenance-dashboard/theme'

const note = (page) => page.getByRole('button', { name: /Tap for another note/ })
const noteText = async (page) => (await note(page).innerText()).trim()

const toggle = (page) => page.getByRole('switch', { name: /A kind word/ })

export default async function run({ page, check, errors, URL }) {
  await page.goto(URL, { waitUntil: 'networkidle' })

  // ---- it is there, without being asked for ----
  check('a note is on the dashboard', (await note(page).count()) === 1)
  const first = await noteText(page)
  check('and it says something', first.length > 0, first)
  check('nothing was written to turn it on', (await page.evaluate((k) => localStorage.getItem(k), NOTE_KEY)) === null)

  // ---- it holds still ----
  // The dashboard re-renders every sixty seconds, and a note picked at random
  // during render would change itself while being read. This is the check that
  // would fail if anybody swapped the day-seeded pick for Math.random().
  await page.evaluate(() => window.dispatchEvent(new Event('resize')))
  await page.waitForTimeout(600)
  check('it does not change on a re-render', (await noteText(page)) === first, `${first} -> ${await noteText(page)}`)

  await page.reload({ waitUntil: 'networkidle' })
  check('nor across a reload on the same day', (await noteText(page)) === first, await noteText(page))

  // ---- tapping gives another one ----
  await note(page).click()
  await page.waitForTimeout(300)
  const second = await noteText(page)
  check('tapping it gives a different note', second !== first, `${first} -> ${second}`)
  await note(page).click()
  await page.waitForTimeout(300)
  check('and again', (await noteText(page)) !== second, await noteText(page))

  // A tap is not a log: this is the one card on the dashboard that changes
  // when you touch it, and it must not touch the history.
  const logged = await page.evaluate(() => {
    const raw = localStorage.getItem('home-maintenance-dashboard/v1')
    if (!raw) return 0
    return Object.values(JSON.parse(raw).completions).reduce((n, list) => n + list.length, 0)
  })
  check('tapping a note logs nothing', logged === 0, `${logged} completions`)

  // ---- it is not a notification, and cannot quietly become one ----
  //
  // Design rule 1, asserted against the JavaScript that actually ships rather
  // than against behaviour — "it didn't notify me during this test" is not the
  // same claim as "it cannot". Adding a note to the dashboard is the closest
  // this app has ever come to talking first, so the line is worth a wall.
  const html = await (await page.request.get(URL)).text()
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
  check('the page ships at least one script to check', scripts.length > 0)

  const CONTACT = /\bNotification\b|requestPermission|pushManager|showNotification/
  const offenders = []
  // `URL` is the suite's base address, which shadows the global constructor —
  // so these are joined by hand rather than with new URL().
  for (const src of scripts) {
    const href = /^https?:/.test(src) ? src : `${URL}${src.startsWith('/') ? '' : '/'}${src}`
    // eslint-disable-next-line no-await-in-loop
    const body = await (await page.request.get(href)).text()
    if (CONTACT.test(body)) offenders.push(src)
  }
  check('nothing in the bundle can notify anybody', offenders.length === 0, offenders.join(' | '))

  // The service worker is there to make a tag tap work with no signal. It must
  // not have grown a push handler on the way.
  const sw = await page.request.get(`${URL}/sw.js`)
  if (sw.status() === 200) {
    const body = await sw.text()
    check('and neither can the service worker', !/addEventListener\(\s*['"]push['"]|showNotification/.test(body))
  }

  // ---- the switch ----
  await openSettings(page)
  check('settings offers a switch for it', (await toggle(page).count()) === 1)
  check('which reads as on', (await toggle(page).getAttribute('aria-checked')) === 'true')
  check('and says it is never sent to you', (await page.getByText(/Nothing is ever sent to you/).count()) === 1)

  await toggle(page).click()
  await page.waitForTimeout(300)
  check('turning it off flips the switch', (await toggle(page).getAttribute('aria-checked')) === 'false')

  await page.getByRole('button', { name: 'Back' }).first().click()
  await page.waitForTimeout(400)
  check('and the note is gone from the dashboard', (await note(page).count()) === 0)

  await page.reload({ waitUntil: 'networkidle' })
  check('off survives a reload', (await note(page).count()) === 0)
  const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), NOTE_KEY)
  check('because off is what gets written', stored?.on === false, JSON.stringify(stored))

  // ---- and back on again, leaving no key behind ----
  await openSettings(page)
  await toggle(page).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: 'Back' }).first().click()
  await page.waitForTimeout(400)
  check('turning it back on brings the note back', (await note(page).count()) === 1)
  check(
    'and the default leaves no key behind',
    (await page.evaluate((k) => localStorage.getItem(k), NOTE_KEY)) === null,
  )

  // ---- each look has its own voice ----
  const inHome = await noteText(page)
  await page.evaluate(
    ([key]) => localStorage.setItem(key, 'cats'),
    [THEME_KEY],
  )
  await page.reload({ waitUntil: 'networkidle' })
  const inCats = await noteText(page)
  check('switching look changes the voice', inCats !== inHome, `${inHome} -> ${inCats}`)
  check('and it is one from the cats list', NOTES.cats.includes(inCats), inCats)
  check('not one from the plain one', !NOTES.home.includes(inCats), inCats)

  await page.evaluate(([key]) => localStorage.setItem(key, 'home'), [THEME_KEY])
  await page.reload({ waitUntil: 'networkidle' })

  // ---- nothing on this screen scolds, note included ----
  check(
    'the dashboard still calls nothing late',
    (await page.getByText(/\b(late|overdue|missed|failed)\b/i).count()) === 0,
  )

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  check('no sideways scroll', !overflow)
  check('no console or page errors', errors.length === 0, errors.join(' | '))
}
