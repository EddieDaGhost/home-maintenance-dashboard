// A stand-in for the two Postgres functions in supabase/schema.sql.
//
// The point is to exercise the real request shapes — real fetch, real CORS
// preflight, real JSON — rather than mocking the client out. If the client
// talks to this correctly it will talk to PostgREST correctly, because this
// implements the same contract.

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'

export function startFakeSupabase() {
  const households = new Map() // id -> key
  const completions = new Map() // id -> Map("task|at" -> {task_id, at, by})
  const state = new Map() // id -> { doc, updated_at }

  const server = createServer((req, res) => {
    const send = (code, body) => {
      res.writeHead(code, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'apikey, authorization, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      })
      res.end(JSON.stringify(body))
    }

    if (req.method === 'OPTIONS') return send(204, null)

    let raw = ''
    req.on('data', (chunk) => (raw += chunk))
    req.on('end', () => {
      let body = {}
      try {
        body = JSON.parse(raw || '{}')
      } catch {
        return send(400, { message: 'bad json' })
      }

      if (req.url.endsWith('/rpc/hm_create_household')) {
        if (!body.p_key || body.p_key.length < 24) {
          return send(400, { message: 'key must be at least 24 characters' })
        }
        const id = randomUUID()
        households.set(id, body.p_key)
        completions.set(id, new Map())
        return send(200, id) // PostgREST returns a bare scalar
      }

      if (req.url.endsWith('/rpc/hm_sync')) {
        const { p_household: id, p_key: key, p_events, p_state, p_state_updated_at } = body
        if (!households.has(id) || households.get(id) !== key) {
          return send(400, { message: 'unknown household' })
        }

        const rows = completions.get(id)
        for (const event of p_events ?? []) {
          if (!event?.task_id || !event?.at) continue
          const at = new Date(event.at).toISOString()
          const natural = `${event.task_id}|${at}` // the composite primary key
          if (!rows.has(natural)) {
            rows.set(natural, { task_id: event.task_id, at, by: event.by || null })
          }
        }

        if (p_state) {
          const incoming = p_state_updated_at ? new Date(p_state_updated_at).getTime() : Date.now()
          const existing = state.get(id)
          if (!existing || existing.updated_at < incoming) {
            state.set(id, { doc: p_state, updated_at: incoming })
          }
        }

        const stored = state.get(id)
        return send(200, {
          completions: [...rows.values()],
          state: stored?.doc ?? {},
          state_updated_at: stored ? new Date(stored.updated_at).toISOString() : null,
        })
      }

      return send(404, { message: 'no such function' })
    })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({
        url: `http://127.0.0.1:${port}`,
        stop: () => new Promise((done) => server.close(done)),
        households,
        completions,
        state,
      })
    })
  })
}
