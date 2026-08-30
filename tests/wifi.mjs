// The WiFi page, and the quiz standing in front of it.
//
// The marking is held by the logic suite. What this covers is the two things
// it can't see: that a guest whose phone has never opened this app gets the
// quiz rather than the welcome screen, and that the retyping box actually
// refuses a paste.

import { newPhonePage, openSettings } from './harness.mjs'

const ANSWERS = [
  'Abraham Lincoln',
  'NaHCO3',
  'Pacific',
  'Steve Young',
  'Saffron',
  'Cheetah',
  'Shakespeare',
  '293',
  'Abbey Road',
]

const TARGET = ANSWERS.map((a) => a.replace(/\s+/g, '')).join('')
const PASSWORD = 'Icantjustgiveyouthepassword!'

const fillQuiz = async (page, answers) => {
  const boxes = page.locator('input[type="text"]')
  for (let i = 0; i < answers.length; i += 1) await boxes.nth(i).fill(answers[i])
}

export default async function run({ browser, check, URL }) {
  // A guest: a phone that has never seen this app, exactly like somebody
  // tapping the sticker by the door.
  const { context, page, errors } = await newPhonePage(browser, {
    virgin: true,
    permissions: ['clipboard-read', 'clipboard-write'],
  })

  try {
    await page.goto(`${URL}/#wifi`, { waitUntil: 'networkidle' })

    check('the sticker opens the WiFi page, not the welcome screen', (await page.getByRole('heading', { level: 1 }).innerText()) === 'The WiFi')
    check('the network name is on show straight away', (await page.getByText('Home', { exact: true }).count()) > 0)
    check('the password is not', (await page.getByText(PASSWORD).count()) === 0)
    check('it says the rules are open book', (await page.getByText(/open-book/i).count()) === 1)
    check('that helping is frowned upon', (await page.getByText(/frowned upon/i).count()) === 1)
    check('and that there is no score', (await page.getByText(/no score/i).count()) === 1)
    check('all nine questions are asked', (await page.locator('input[type="text"]').count()) === 9)
    check('the formula question says how to type numbers', (await page.getByText(/no subscript needed/i).count()) === 1)

    // A guest must be able to do all this without the app touching their phone.
    const touchedBefore = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('home-maintenance-dashboard/')),
    )
    check('nothing was written to a guest’s browser', touchedBefore.length === 0, touchedBefore.join(', '))

    // ---- getting it wrong ----
    const nearly = [...ANSWERS]
    nearly[4] = 'paprika'
    await fillQuiz(page, nearly)
    await page.getByRole('button', { name: 'Submit' }).click()
    await page.waitForTimeout(400)

    check('a wrong answer is named', (await page.getByText(/Have another look at this one/).count()) === 1)
    check('and counted without a score', (await page.getByText(/One to look at again/).count()) === 1)
    check('the right ones are acknowledged', (await page.getByText(/That's the one/).count()) === 8)
    check('nothing is called a failure', (await page.getByText(/\b(wrong|failed|incorrect)\b/i).count()) === 0)
    check('and the password is still not here', (await page.getByText(PASSWORD).count()) === 0)
    check('nor is the retyping box', (await page.locator('#wifi-retype').count()) === 0)

    // ---- getting it right ----
    await fillQuiz(page, ANSWERS)
    await page.getByRole('button', { name: 'Submit' }).click()
    await page.waitForTimeout(400)

    check('all nine right moves on', (await page.getByText('All nine correct').count()) === 1)
    check('to one last thing', (await page.locator('#wifi-retype').count()) === 1)
    check('which asks for no spaces', (await page.getByText(/run together with no spaces/).count()) === 1)
    check('and lists the answers in order', (await page.getByText('Abbey Road').count()) > 0)
    check('the password is still withheld', (await page.getByText(PASSWORD).count()) === 0)

    const reveal = page.getByRole('button', { name: /Show me the password|to go$/ })
    check('the button is not offering it yet', await reveal.isDisabled())
    check('and says how much is left', /74 to go/.test(await reveal.innerText()), await reveal.innerText())

    // ---- pasting is refused ----
    const box = page.locator('#wifi-retype')
    await page.evaluate((text) => navigator.clipboard.writeText(text), TARGET).catch(() => {})
    await box.click()
    await page.keyboard.press('Control+V')
    await page.waitForTimeout(400)
    check('pasting puts nothing in the box', (await box.inputValue()) === '', await box.inputValue())
    check('and says so', (await page.getByText(/No pasting in this one/).count()) === 1)
    check('the password is still not on screen', (await page.getByText(PASSWORD).count()) === 0)

    // Filling it programmatically in one go is the same jump a paste makes.
    await box.fill(TARGET)
    await page.waitForTimeout(300)
    check('and neither does dropping it in whole', (await box.inputValue()) === '', await box.inputValue())

    // ---- typing it, one character at a time ----
    await box.click()
    await page.keyboard.type(TARGET.slice(0, 20), { delay: 1 })
    await page.waitForTimeout(250)
    check('typing goes in', (await box.inputValue()).length === 20, `${(await box.inputValue()).length}`)
    check('and is counted', (await page.getByText(/^20 of 74$/).count()) === 1)
    check('with no complaint while it still matches', (await page.getByText(/drifted off/).count()) === 0)

    await page.keyboard.type('zzz', { delay: 1 })
    await page.waitForTimeout(250)
    check('a wrong character says so straight away', (await page.getByText(/drifted off/).count()) === 1)
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Backspace')
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(250)
    check('and stops complaining once it is fixed', (await page.getByText(/drifted off/).count()) === 0)

    await page.keyboard.type(TARGET.slice(20), { delay: 1 })
    await page.waitForTimeout(400)
    check('typing the lot enables the button', await page.getByRole('button', { name: 'Show me the password' }).isEnabled())

    // ---- the password ----
    await page.getByRole('button', { name: 'Show me the password' }).click()
    await page.waitForTimeout(400)
    check('the password is finally shown', (await page.getByText(PASSWORD).count()) === 1)
    check('and it is the right one', (await page.getByText(PASSWORD).innerText()).trim() === PASSWORD)
    check('with a way to copy it', (await page.getByRole('button', { name: 'Copy the password' }).count()) === 1)

    const touchedAfter = await page.evaluate(() =>
      Object.keys(localStorage).filter((k) => k.startsWith('home-maintenance-dashboard/')),
    )
    check('and the guest’s browser is still untouched', touchedAfter.length === 0, touchedAfter.join(', '))

    // ---- it does not persist, which is the point on somebody else's phone ----
    await page.reload({ waitUntil: 'networkidle' })
    check('a refresh starts the quiz over', (await page.locator('input[type="text"]').count()) === 9)
    check('with the password hidden again', (await page.getByText(PASSWORD).count()) === 0)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    check('no sideways scroll', !overflow)
    check('no console or page errors', errors.length === 0, errors.join(' | '))
  } finally {
    await context.close()
  }

  // ---- the owner reaches it from Settings, and gets a way back ----
  const owner = await newPhonePage(browser)
  try {
    await owner.page.goto(URL, { waitUntil: 'networkidle' })
    await openSettings(owner.page)
    await owner.page.getByRole('button', { name: /^The WiFi/ }).click()
    await owner.page.waitForTimeout(400)
    check('the owner can open it from settings', (await owner.page.getByRole('heading', { level: 1 }).innerText()) === 'The WiFi')
    check('and has a way back', (await owner.page.getByRole('button', { name: 'Back' }).count()) === 1)
    await owner.page.getByRole('button', { name: 'Back' }).click()
    await owner.page.waitForTimeout(400)
    check('which lands on the dashboard', (await owner.page.getByText('Day streak').count()) === 1)

    await openSettings(owner.page)
    await owner.page.getByRole('button', { name: /NFC tags/ }).click()
    await owner.page.waitForTimeout(400)
    const tags = owner.page.getByRole('dialog', { name: 'NFC tag setup' })
    check('the tag list includes one for the WiFi', (await tags.getByText(/#wifi$/).count()) === 1)

    check('no console or page errors for the owner', owner.errors.length === 0, owner.errors.join(' | '))
  } finally {
    await owner.context.close()
  }
}
