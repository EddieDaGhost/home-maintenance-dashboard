// A stand-in for Open-Meteo's two endpoints.
//
// Same reason as tests/fake-supabase.mjs: the point is to exercise the real
// request shapes — real fetch, real CORS, real JSON, the real query strings the
// app builds — rather than mocking `fetch` out. It also means `npm run check`
// never touches open-meteo.com, so the suite passes on a plane and doesn't lean
// on somebody else's uptime.

import { createServer } from 'node:http'

/** One town that resolves, so "not found" can be tested with anything else. */
const KNOWN = {
  kalamazoo: {
    name: 'Kalamazoo',
    admin1: 'Michigan',
    country_code: 'US',
    latitude: 42.29171,
    longitude: -85.58723,
  },
  '49001': {
    name: 'Kalamazoo',
    admin1: 'Michigan',
    country_code: 'US',
    latitude: 42.28,
    longitude: -85.6,
  },
}

export function startFakeForecast() {
  const requests = []

  const server = createServer((req, res) => {
    const send = (code, body) => {
      res.writeHead(code, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      })
      res.end(JSON.stringify(body))
    }

    const url = new URL(req.url, 'http://localhost')
    requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams) })

    if (url.pathname === '/v1/search') {
      const name = (url.searchParams.get('name') ?? '').trim().toLowerCase()
      const hit = KNOWN[name]
      // Open-Meteo omits `results` entirely when nothing matches.
      return send(200, hit ? { results: [hit] } : {})
    }

    if (url.pathname === '/v1/forecast') {
      const celsius = url.searchParams.get('temperature_unit') === 'celsius'
      return send(200, {
        current: {
          temperature_2m: celsius ? 17.8 : 64,
          weather_code: 3,
          is_day: 1,
        },
        daily: {
          weather_code: [61],
          temperature_2m_max: [celsius ? 21.1 : 70],
          temperature_2m_min: [celsius ? 10 : 50],
          precipitation_probability_max: [40],
        },
      })
    }

    return send(404, { reason: 'no such endpoint' })
  })

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      resolve({
        url: `http://127.0.0.1:${port}`,
        stop: () => new Promise((done) => server.close(done)),
        requests,
      })
    })
  })
}
