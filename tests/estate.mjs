// Credits, the shop and the scene.
//
// Earning 300-odd credits by tapping Log eighty times is not a test, it's a
// punishment, so the history is seeded straight into localStorage — the same
// shape the app writes — and everything after that is driven for real.

const LOG_KEY = 'home-maintenance-dashboard/v1'
const PEOPLE_KEY = 'home-maintenance-dashboard/people/v1'
const ESTATE_KEY = 'home-maintenance-dashboard/estate/v1'
const THEME_KEY = 'home-maintenance-dashboard/theme'

/** `kitchen-dishes` is worth 4 credits a go. */
function dishes(count, by, from = Date.now()) {
  return Array.from({ length: count }, (_, i) => ({ at: from - i * 3600000, by }))
}

/** A clean slate: given history, given roster, nothing bought. */
async function seed(page, URL, completions, people = null) {
  await page.goto(URL, { waitUntil: 'domcontentloaded' })
  await page.evaluate(
    ([logKey, peopleKey, estateKey, log, roster]) => {
      localStorage.setItem(logKey, JSON.stringify({ version: 2, completions: log }))
      localStorage.removeItem(estateKey)
      if (roster) localStorage.setItem(peopleKey, JSON.stringify(roster))
      else localStorage.removeItem(peopleKey)
    },
    [LOG_KEY, PEOPLE_KEY, ESTATE_KEY, completions, people],
  )
  await page.goto(URL, { waitUntil: 'networkidle' })
}

const openEstate = async (page) => {
  await page.getByRole('button', { name: /Your windowsill|Your ship/ }).click()
  await page.waitForTimeout(300)
}

const balance = (page) => page.locator('#credit-balance').innerText()

export default async function run({ page, check, errors, URL }) {
  // ---- the shop opens and shows what's been earned ----
  await seed(page, URL, { 'kitchen-dishes': dishes(30, 'me') })
  check('the dashboard advertises a balance', (await page.getByText('120 cr to spend').count()) === 1)

  await openEstate(page)
  check('the screen opens', (await page.getByRole('heading', { level: 1 }).innerText()) === 'The windowsill')
  check('the scene is drawn', (await page.locator('svg[role="img"]').count()) === 1)
  check('the balance is what was earned', (await balance(page)) === '120 cr', await balance(page))
  check('nothing overdue reads as lively', (await page.getByText(/Full sun/).count()) === 1)
  // Everything is listed whether or not it's affordable — knowing what's coming
  // is half of why you'd want any of it.
  check('the expensive things are listed too', (await page.getByText('Orchid').count()) === 1)

  // ---- buying ----
  await page.getByRole('button', { name: 'Buy Boston fern for 80 credits' }).click()
  await page.waitForTimeout(400)
  check('the balance drops by exactly the cost', (await balance(page)) === '40 cr', await balance(page))
  check('what you bought is in use', (await page.getByRole('button', { name: 'Put Boston fern away' }).count()) === 1)
  check(
    "and what you can't afford any more can't be bought",
    await page.getByRole('button', { name: /Buy Monstera/ }).isDisabled(),
  )

  await page.reload({ waitUntil: 'networkidle' })
  await openEstate(page)
  check(
    'the purchase survives a reload',
    (await page.getByRole('button', { name: 'Put Boston fern away' }).count()) === 1,
  )
  check('and so does the balance', (await balance(page)) === '40 cr', await balance(page))

  // ---- wearing and un-wearing ----
  await page.getByRole('button', { name: 'Put Boston fern away' }).click()
  await page.waitForTimeout(300)
  check('you can take it off', (await page.getByRole('button', { name: 'Use Boston fern' }).count()) === 1)
  check('taking it off refunds nothing and costs nothing', (await balance(page)) === '40 cr')
  await page.getByRole('button', { name: 'Use Boston fern' }).click()
  await page.waitForTimeout(300)
  check(
    'and you can put it back on for free',
    (await page.getByRole('button', { name: 'Put Boston fern away' }).count()) === 1,
  )

  // ---- falling behind, and the way back ----
  await seed(page, URL, {
    'kitchen-dishes': dishes(30, 'me'),
    'chickens-checkin': [Date.now() - 5 * 86400000],
  })
  await openEstate(page)
  check('an overdue task makes the scene quiet', (await page.getByText(/Low evening light/).count()) === 1)
  check(
    'and nothing on the screen calls anybody late',
    (await page.getByText(/\b(late|overdue|missed|failed|neglected)\b/i).count()) === 0,
  )

  const beforeTreat = Number.parseInt(await balance(page), 10)
  await page.getByRole('button', { name: /Buy Plant food/ }).click()
  await page.waitForTimeout(400)
  check('a treat lifts the scene anyway', (await page.getByText(/Full sun/).count()) === 1)
  check(
    'and it cost what it said it would',
    Number.parseInt(await balance(page), 10) === beforeTreat - 25,
    await balance(page),
  )

  // ---- credits belong to a person, not to the phone ----
  await seed(
    page,
    URL,
    { 'kitchen-dishes': [...dishes(20, 'eddie'), ...dishes(3, 'yas', Date.now() - 200 * 3600000)] },
    { people: [{ id: 'eddie', name: 'Eddie' }, { id: 'yas', name: 'Yasmine' }], activeId: 'eddie' },
  )
  await openEstate(page)
  check("the scene is named as one person's", (await page.getByText(/Eddie's, built from/).count()) === 1)
  check('and holds only their credits', (await balance(page)) === '80 cr', await balance(page))

  await page.getByRole('button', { name: 'Buy Terracotta for 60 credits' }).click()
  await page.waitForTimeout(400)
  check('Eddie buys something', (await page.getByRole('button', { name: 'Put Terracotta away' }).count()) === 1)

  // Who's logging is chosen in one place — the household sheet — so the estate
  // screen doesn't grow a second switcher.
  await page.getByRole('button', { name: 'All areas' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Change who's logging/ }).click()
  await page.waitForTimeout(300)
  await page
    .getByRole('dialog', { name: "Who's logging" })
    .getByRole('button', { name: 'Log as Yasmine' })
    .click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await openEstate(page)
  check('switching person switches whose scene it is', (await page.getByText(/Yasmine's, built from/).count()) === 1)
  check('and she has her own credits', (await balance(page)) === '12 cr', await balance(page))
  check(
    "and none of Eddie's purchases came with her",
    (await page.getByRole('button', { name: /Put .* away/ }).count()) === 0,
  )

  // ---- the other look wears the same purchases ----
  await page.evaluate(([key]) => localStorage.setItem(key, 'starship'), [THEME_KEY])
  await page.reload({ waitUntil: 'networkidle' })
  await openEstate(page)
  check('the same screen renames itself', (await page.getByRole('heading', { level: 1 }).innerText()) === 'The ship')
  check('and so does the catalogue', (await page.getByText('Scout hull').count()) === 1)
  check('the scene still draws', (await page.locator('svg[role="img"]').count()) === 1)

  // ---- an estate written by a newer version doesn't break this one ----
  await page.evaluate(
    ([key]) => localStorage.setItem(key, '{"yas":{"owned":["nonsense"],"equipped":{"vessel":"nonsense"}}}'),
    [ESTATE_KEY],
  )
  await page.reload({ waitUntil: 'networkidle' })
  await openEstate(page)
  check('an unknown purchase draws nothing rather than crashing', (await page.locator('svg[role="img"]').count()) === 1)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  check('no sideways scroll on a phone', !overflow)

  check('no console or page errors', errors.length === 0, errors.join(' | '))
}
