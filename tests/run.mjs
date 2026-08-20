#!/usr/bin/env node
// Runs every suite and prints one summary. `npm run check`
//
// Pass a suite name to run just one:   npm run check -- logic
// Point at a deployed copy instead:    TEST_URL=https://homemaintenance.app npm run check

import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BASE_URL, createChecker, launchBrowser, newPhonePage } from './harness.mjs'

const ROOT = fileURLToPath(new URL('..', import.meta.url))

const SUITES = [
  { name: 'logic', file: './logic.mjs', browser: false },
  { name: 'welcome', file: './welcome.mjs', browser: true, virgin: true },
  { name: 'walkthrough', file: './walkthrough.mjs', browser: true },
  { name: 'themes', file: './themes.mjs', browser: true },
  { name: 'naming', file: './naming.mjs', browser: true, clipboard: true },
  { name: 'rooms', file: './rooms.mjs', browser: true },
  { name: 'estate', file: './estate.mjs', browser: true },
  { name: 'today', file: './today.mjs', browser: true, ownContexts: true },
  { name: 'away', file: './away.mjs', browser: true },
  { name: 'fresh-start', file: './fresh-start.mjs', browser: true },
  { name: 'offline', file: './offline.mjs', browser: true },
  { name: 'sync', file: './sync.mjs', browser: true, ownContexts: true },
]

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))))
    child.on('error', reject)
  })
}

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return true
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`Nothing answering at ${url} — is the preview server running?`)
}

async function main() {
  const only = process.argv[2]
  const suites = only ? SUITES.filter((s) => s.name === only) : SUITES
  if (!suites.length) {
    console.error(`Unknown suite "${only}". Try: ${SUITES.map((s) => s.name).join(', ')}`)
    process.exit(1)
  }

  const needsBrowser = suites.some((s) => s.browser)
  const usingOwnServer = Boolean(process.env.TEST_URL)
  let server = null

  if (needsBrowser && !usingOwnServer) {
    if (!existsSync(join(ROOT, 'dist', 'index.html'))) {
      console.log('Building first...\n')
      await run('npm', ['run', 'build'])
    }
    server = spawn('npx', ['vite', 'preview', '--port', '4173', '--host', '127.0.0.1'], {
      cwd: ROOT,
      stdio: 'ignore',
      shell: process.platform === 'win32',
    })
    await waitForServer(BASE_URL)
  }

  const browser = needsBrowser ? await launchBrowser() : null
  const tmp = mkdtempSync(join(tmpdir(), 'home-maintenance-tests-'))
  const summary = []

  try {
    for (const suite of suites) {
      console.log(`\n${suite.name}`)
      const check = createChecker(suite.name)
      const { default: runSuite } = await import(suite.file)

      if (!suite.browser) {
        await runSuite({ check })
      } else {
        const options = {
          ...(suite.clipboard ? { permissions: ['clipboard-read', 'clipboard-write'] } : {}),
          ...(suite.virgin ? { virgin: true } : {}),
        }
        if (suite.ownContexts) {
          await runSuite({ browser, check, URL: BASE_URL, tmp })
        } else {
          const { context, page, errors } = await newPhonePage(browser, options)
          try {
            await runSuite({ browser, context, page, check, errors, URL: BASE_URL, tmp })
          } finally {
            await context.close()
          }
        }
      }

      const failed = check.results.filter((r) => !r.ok)
      summary.push({ name: suite.name, total: check.results.length, failed: failed.length })
    }
  } finally {
    await browser?.close()
    server?.kill()
    rmSync(tmp, { recursive: true, force: true })
  }

  const total = summary.reduce((n, s) => n + s.total, 0)
  const failed = summary.reduce((n, s) => n + s.failed, 0)

  console.log('\n' + '-'.repeat(46))
  for (const suite of summary) {
    const state = suite.failed ? `${suite.failed} FAILED` : 'ok'
    console.log(`  ${suite.name.padEnd(14)} ${String(suite.total).padStart(3)} checks   ${state}`)
  }
  console.log('-'.repeat(46))
  console.log(failed === 0 ? `  All ${total} checks passed.` : `  ${failed} of ${total} checks FAILED.`)

  process.exit(failed === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(`\n${error.message}`)
  process.exit(1)
})
