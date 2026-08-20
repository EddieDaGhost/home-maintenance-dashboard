// The drive to work, without an account.
//
// Every routing API that knows about live traffic wants a token and a signup,
// and this app has never had an environment variable. A deep link into the maps
// app the phone already has gets real traffic for free — and the work address
// never leaves the device: it is pasted into a URL that only opens when the
// button is tapped, and only into an app the user would have opened anyway.
//
// The origin is deliberately left out. Both maps apps fall back to the phone's
// current location, which is more accurate than any address we could store and
// is one less thing to keep. It also makes the button right in both directions:
// leaving the house in the morning, or leaving work at six.

/** Apple Maps on Apple hardware, Google everywhere else. */
export function preferredMaps(userAgent = '') {
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent) ? 'apple' : 'google'
}

/**
 * A directions URL for `destination`.
 *
 * Encoding matters more than it looks: an ampersand or a hash in a street
 * address ("Unit 3 & 4", "Apt #2") would otherwise cut the URL in half and send
 * the maps app somewhere else entirely.
 */
export function buildMapsLink(destination, provider = 'google') {
  const to = String(destination ?? '').trim()
  if (!to) return null
  const encoded = encodeURIComponent(to)
  return provider === 'apple'
    ? `https://maps.apple.com/?daddr=${encoded}&dirflg=d`
    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}&travelmode=driving`
}

export const MAPS_NAMES = { apple: 'Apple Maps', google: 'Google Maps' }

export const otherMaps = (provider) => (provider === 'apple' ? 'google' : 'apple')
