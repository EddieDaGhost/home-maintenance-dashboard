// Where the weather comes from.
//
// Open-Meteo, and the choice was made on what it costs rather than what it can
// do: free, no API key, no signup, no account, CORS-friendly, and it resolves
// the place name too — so one service, one plain `fetch`, and no environment
// variable. DEPLOYMENT.md says to be suspicious of anything asking for one, and
// this doesn't.
//
// Plain fetch, no SDK, no script tag. Design rule 6 forbids third-party scripts
// and it still holds: nothing from open-meteo.com runs in this page. The only
// thing that leaves the device is the town the user typed, and only after they
// type it — see src/lib/forecast.js.
//
// Named "forecast" rather than "weather" because `weather` is already a shop
// slot in src/config/catalog.js and in all three scene components.

export const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

/**
 * Lets the test suite point at a local stand-in, so the request shapes are
 * exercised for real rather than mocked — the same trick, for the same reason,
 * as ENDPOINT_OVERRIDE_KEY in src/config/sync.js. Unused in normal running.
 */
export const ENDPOINT_OVERRIDE_KEY = 'home-maintenance-dashboard/forecast-endpoint'

export function forecastEndpoints() {
  if (typeof window !== 'undefined') {
    try {
      const override = window.localStorage.getItem(ENDPOINT_OVERRIDE_KEY)
      if (override) {
        return { geocode: `${override}/v1/search`, forecast: `${override}/v1/forecast` }
      }
    } catch {
      // fall through to the real ones
    }
  }
  return { geocode: GEOCODE_URL, forecast: FORECAST_URL }
}
