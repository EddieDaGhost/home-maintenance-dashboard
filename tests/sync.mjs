// Two phones, one household.
//
// Drives two independent browser contexts — Eddie's phone and Yasmine's — against
// a stand-in for the Supabase functions, and checks that what one logs shows up
// on the other, including work done with the network off.

import { startFakeSupabase } from './fake-supabase.mjs'
import { newPhonePage } from './harness.mjs'

const ENDPOINT_KEY = 'home-maintenance-dashboard/sync-endpoint'
const LOG_KEY = 'home-maintenance-dashboard/v1'

async function openPhone(browser, endpoint) {
  const { context, page, errors } = await newPhonePage(browser)
  await context.addInitScript(
    ([key, url]) => {
      try {
        window.localStorage.setItem(key, url)
      } catch {
        // nothing to do
      }
    },
    [ENDPOINT_KEY, endpoint],
  )
  return { context, page, errors }
}

const taskIds = async (page) =>
  page.evaluate((key) => {
    const raw = localStorage.getItem(key)
    return raw ? Object.keys(JSON.parse(raw).completions).sort() : []
  }, LOG_KEY)

export default async function run({ browser, check, URL }) {
  const server = await startFakeSupabase()

  const a = await openPhone(browser, server.url)
  const b = await openPhone(browser, server.url)

  try {
    // ---- phone A logs something before sharing is on ----
    await a.page.goto(`${URL}/#kitchen`, { waitUntil: 'networkidle' })
    await a.page.getByRole('button', { name: 'Log Dishes as done' }).click()
    await a.page.waitForTimeout(300)
    check('phone A has its own history', (await taskIds(a.page)).includes('kitchen-dishes'))

    // ---- A turns sharing on ----
    await a.page.goto(URL, { waitUntil: 'networkidle' })
    await a.page.getByRole('button', { name: /Share with another device/ }).click()
    await a.page.waitForTimeout(300)
    const shareSheet = a.page.getByRole('dialog', { name: 'Share with another device' })
    check('the share sheet explains itself first', (await shareSheet.getByText(/keeps its own history/).count()) === 1)

    await shareSheet.getByRole('button', { name: 'Start sharing' }).click()
    await a.page.waitForTimeout(1200)

    const inviteLink = await shareSheet.locator('p.font-mono').innerText()
    check('an invite link is produced', /#join=[0-9a-f-]{36}\.[0-9a-f]{40}$/.test(inviteLink), inviteLink)
    check('a household was created on the server', server.households.size === 1, `${server.households.size}`)

    // A's existing history is pushed up on the first sync
    await a.page.waitForTimeout(800)
    const uploaded = [...server.completions.values()][0]
    check("phone A's existing history was uploaded", uploaded.size === 1, `${uploaded.size} event(s)`)
    check('nothing was lost locally', (await taskIds(a.page)).includes('kitchen-dishes'))

    // ---- phone B joins from the link ----
    await b.page.goto(inviteLink, { waitUntil: 'networkidle' })
    await b.page.waitForTimeout(1500)
    check('joining skips the welcome screen', (await b.page.getByText('Day streak').count()) === 1)
    check('the key is taken out of the address bar', await b.page.evaluate(() => window.location.hash) === '')
    check("phone B sees phone A's history", (await taskIds(b.page)).includes('kitchen-dishes'))

    // ---- B logs something; A picks it up ----
    await b.page.goto(`${URL}/#chickens`, { waitUntil: 'networkidle' })
    await b.page.getByRole('button', { name: 'Log Flock check-in as done' }).click()
    await b.page.waitForTimeout(3600) // the post-log sync is debounced
    check('phone B pushed its own log', [...server.completions.values()][0].size === 2)

    await a.page.reload({ waitUntil: 'networkidle' })
    await a.page.waitForTimeout(1500)
    const aTasks = await taskIds(a.page)
    check("phone A now sees phone B's log", aTasks.includes('chickens-checkin'), aTasks.join(', '))
    check('and still has its own', aTasks.includes('kitchen-dishes'))

    // ---- both log the same task while offline, then reconnect ----
    await a.context.setOffline(true)
    await b.context.setOffline(true)

    await a.page.goto(`${URL}/#litter`, { waitUntil: 'domcontentloaded' })
    await a.page.getByRole('button', { name: 'Log Scoop all 3 boxes as done' }).click()
    await b.page.goto(`${URL}/#laundry`, { waitUntil: 'domcontentloaded' })
    await b.page.getByRole('button', { name: 'Log Wash & dry as done' }).click()
    await a.page.waitForTimeout(400)
    check('logging offline still works while sharing', (await taskIds(a.page)).includes('litter-scoop'))

    await a.context.setOffline(false)
    await b.context.setOffline(false)
    await a.page.reload({ waitUntil: 'networkidle' })
    await a.page.waitForTimeout(1500)
    await b.page.reload({ waitUntil: 'networkidle' })
    await b.page.waitForTimeout(1500)
    await a.page.reload({ waitUntil: 'networkidle' })
    await a.page.waitForTimeout(1500)

    const finalA = await taskIds(a.page)
    const finalB = await taskIds(b.page)
    check('both offline logs reached the server', [...server.completions.values()][0].size === 4)
    check('phone A converged on all four', finalA.length === 4, finalA.join(', '))
    check('phone B converged too', finalB.includes('litter-scoop') && finalB.includes('laundry-wash'), finalB.join(', '))

    // ---- syncing repeatedly must not duplicate anything ----
    await a.page.goto(URL, { waitUntil: 'networkidle' })
    await a.page.getByRole('button', { name: /Shared with your household/ }).click()
    await a.page.waitForTimeout(300)
    const sheet = a.page.getByRole('dialog', { name: 'Share with another device' })
    await sheet.getByRole('button', { name: 'Sync now' }).click()
    await a.page.waitForTimeout(1000)
    await sheet.getByRole('button', { name: 'Sync now' }).click()
    await a.page.waitForTimeout(1000)
    check('re-syncing adds no duplicates', [...server.completions.values()][0].size === 4)

    const entryCount = await a.page.evaluate((key) => {
      const parsed = JSON.parse(localStorage.getItem(key))
      return Object.values(parsed.completions).reduce((n, list) => n + list.length, 0)
    }, LOG_KEY)
    check('and none locally either', entryCount === 4, `${entryCount} entries`)
    check('the sheet reports a successful sync', (await sheet.getByText(/Last synced/).count()) === 1)

    // ---- a renamed room travels to the other phone ----
    await a.page.keyboard.press('Escape')
    await a.page.goto(`${URL}/#bathroom-1`, { waitUntil: 'networkidle' })
    await a.page.getByRole('button', { name: 'Edit room' }).click()
    await a.page.waitForTimeout(300)
    await a.page.getByRole('dialog', { name: 'Edit room' }).locator('#area-name').fill("Kids' Bathroom")
    await a.page.getByRole('dialog', { name: 'Edit room' }).getByRole('button', { name: 'Save' }).click()
    await a.page.waitForTimeout(600)
    check('phone A shows its own rename', (await a.page.getByRole('heading', { level: 1 }).innerText()) === "Kids' Bathroom")
    await a.page.waitForTimeout(3200)
    const serverDoc = [...server.state.values()][0]
    check(
      'the rename reached the server',
      Boolean(serverDoc?.doc?.names?.['bathroom-1']),
      JSON.stringify(serverDoc?.doc?.names ?? null)?.slice(0, 90),
    )

    // Back to B's dashboard — it was last left in the Laundry room, where a
    // bathroom's name would not appear whether it synced or not.
    await b.page.goto(URL, { waitUntil: 'networkidle' })
    await b.page.waitForTimeout(2500)
    check('a rename on one phone reaches the other', (await b.page.getByText("Kids' Bathroom").count()) > 0)

    // ---- a wrong key is refused ----
    // Probed from the test process, not the page: a deliberate 400 inside the
    // browser would show up as a console error and fail the check below.
    const response = await fetch(`${server.url}/rest/v1/rpc/hm_sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: 'test', Authorization: 'Bearer test' },
      body: JSON.stringify({ p_household: '00000000-0000-0000-0000-000000000000', p_key: 'nope' }),
    })
    const refused = response.status
    check('an unknown household is rejected', refused === 400, `HTTP ${refused}`)

    const allErrors = [...a.errors, ...b.errors]
    check('no console or page errors', allErrors.length === 0, allErrors.join(' | '))
  } finally {
    await a.context.close()
    await b.context.close()
    await server.stop()
  }
}
