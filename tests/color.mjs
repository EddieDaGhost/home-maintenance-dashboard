/**
 * Colour space maths.
 *
 * The Sharma/Wu/Dalal vectors are the only thing standing between this codebase and the
 * three classic CIEDE2000 bugs: mixing degrees with radians inside the T and RT terms,
 * getting the mean-hue wraparound branches wrong (invisible except on reds straddling
 * zero degrees), and flipping the sign of RT. All three produce a function that looks
 * plausible and matches colours slightly wrongly forever.
 */

import {
  deltaE2000,
  hexToRgb,
  inkOn,
  labToRgb,
  linearToSrgb,
  relativeLuminance,
  rgbToHex,
  rgbToLab,
  srgbToLinear,
} from '../src/lib/color.js'

/** Published CIEDE2000 test data, at the reference weights kL = kC = kH = 1. */
const SHARMA = [
  [[50.0, 2.6772, -79.7751], [50.0, 0.0, -82.7485], 2.0425],
  [[50.0, -1.3802, -84.2814], [50.0, 0.0, -82.7485], 1.0],
  [[50.0, 0.0, 0.0], [50.0, -1.0, 2.0], 2.3669],
  [[50.0, 2.49, -0.001], [50.0, -2.49, 0.0009], 7.1792],
  [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
  [[2.0776, 0.0795, -1.135], [0.9033, -0.0636, -0.5514], 0.9082],
]

export default async function run({ check }) {
  // --- hex round trip
  check.is('hex parses', rgbToHex(hexToRgb('#3E5F82')), '#3E5F82')
  check.is('short hex expands', rgbToHex(hexToRgb('#abc')), '#AABBCC')

  // --- gamma
  check.near('srgbToLinear(0) is 0', srgbToLinear(0), 0, 1e-12)
  check.near('srgbToLinear(255) is 1', srgbToLinear(255), 1, 1e-12)
  let gammaRoundTrips = true
  for (let v = 0; v <= 255; v++) if (linearToSrgb(srgbToLinear(v)) !== v) gammaRoundTrips = false
  check('gamma round trips for all 256 byte values', gammaRoundTrips)

  /**
   * The load-bearing one. Averaging black and white as bytes gives 128; the true middle
   * grey is about 188. If this ever reads 128, something has started averaging in sRGB
   * and every photograph the tool charts is quietly muddy.
   */
  const midGrey = linearToSrgb((srgbToLinear(0) + srgbToLinear(255)) / 2)
  check('linear-light average of black and white is ~188, not 128', Math.abs(midGrey - 188) <= 1, `got ${midGrey}`)

  // --- Lab
  const white = rgbToLab([255, 255, 255])
  check.near('white is L=100', white[0], 100, 0.01)
  check.near('white is a=0', white[1], 0, 0.01)
  check.near('white is b=0', white[2], 0, 0.01)
  check.near('black is L=0', rgbToLab([0, 0, 0])[0], 0, 0.01)

  let labRoundTrips = 0
  let labChecked = 0
  for (let i = 0; i < 200; i++) {
    // Deterministic spread, no Math.random — a flaky test is worse than no test.
    const rgb = [(i * 37) % 256, (i * 91) % 256, (i * 143) % 256]
    const back = labToRgb(rgbToLab(rgb))
    labChecked++
    if (back.every((v, k) => Math.abs(v - rgb[k]) <= 1)) labRoundTrips++
  }
  check.is('Lab round trips within 1/255', labRoundTrips, labChecked)

  // --- CIEDE2000 against the published vectors
  for (const [lab1, lab2, expected] of SHARMA) {
    const actual = deltaE2000(lab1, lab2, 1, 1, 1)
    check.near(`deltaE2000 ${expected}`, actual, expected, 1e-3)
  }

  check.near('deltaE2000 of a colour with itself is 0', deltaE2000([50, 10, -20], [50, 10, -20], 1, 1, 1), 0, 1e-9)

  // Symmetry. Case 3 of the Sharma set exists precisely because a naive implementation
  // gets a different answer depending on argument order.
  const a = [50, 0, 0]
  const b = [50, -1, 2]
  check.near('deltaE2000 is symmetric', deltaE2000(a, b, 1, 1, 1), deltaE2000(b, a, 1, 1, 1), 1e-9)

  // The domain tweak has to be actually wired through, not just documented.
  const lighter = [70, 5, 5]
  const darker = [40, 5, 5]
  check(
    'kL below 1 penalises a lightness gap more than the reference weights do',
    deltaE2000(lighter, darker, 0.75, 1, 1) > deltaE2000(lighter, darker, 1, 1, 1),
  )

  // --- legibility of the in-cell letter
  check.near('luminance of white is 1', relativeLuminance([255, 255, 255]), 1, 1e-9)
  check.near('luminance of black is 0', relativeLuminance([0, 0, 0]), 0, 1e-9)
  check.is('dark yarn takes white ink', inkOn([29, 32, 35]).join(','), '255,255,255')
  check.is('pale yarn takes black ink', inkOn([242, 232, 213]).join(','), '0,0,0')
}
