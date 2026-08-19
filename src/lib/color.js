/**
 * Colour space maths. Pure, no imports, no DOM.
 *
 * Kept in its own module because it's the only code here with published external test
 * vectors (Sharma, Wu & Dalal's CIEDE2000 set), and `tests/color.mjs` should be able to
 * import it without dragging in a palette.
 *
 * Why any of this instead of plain RGB distance: a yarn palette is dense in near
 * neutrals (Cream, Ecru, Oatmeal, Linen, Fog, Silver) and sparse in saturated hues.
 * RGB distance systematically confuses those neutrals with one another while treating
 * two obviously different blues as nearly the same — so sand comes out stippled with
 * four random beiges and the sky collapses to one flat colour. Exactly backwards.
 */

const D65 = { Xn: 0.95047, Yn: 1.0, Zn: 1.08883 }
const DEG = Math.PI / 180

export function hexToRgb(hex) {
  const s = hex.replace('#', '')
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

export function rgbToHex([r, g, b]) {
  const hex = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase()
}

/**
 * sRGB 0..255 -> linear 0..1.
 *
 * Everything that averages pixels must do it here, not in sRGB. Averaging black and
 * white as bytes gives 128; the true mid grey is about 188. Skipping this is the single
 * most common pixelator bug and it visibly muddies every photograph.
 */
export function srgbToLinear(c8) {
  const s = c8 / 255
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
}

/** linear 0..1 -> sRGB 0..255, rounded. */
export function linearToSrgb(v) {
  const c = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
  return Math.max(0, Math.min(255, Math.round(c * 255)))
}

export function rgbToXyz([r, g, b]) {
  const R = srgbToLinear(r)
  const G = srgbToLinear(g)
  const B = srgbToLinear(b)
  return [
    0.4124564 * R + 0.3575761 * G + 0.1804375 * B,
    0.2126729 * R + 0.7151522 * G + 0.072175 * B,
    0.0193339 * R + 0.119192 * G + 0.9503041 * B,
  ]
}

const DELTA = 6 / 29

function fLab(t) {
  return t > DELTA ** 3 ? Math.cbrt(t) : t / (3 * DELTA * DELTA) + 4 / 29
}

function fLabInv(t) {
  return t > DELTA ? t ** 3 : 3 * DELTA * DELTA * (t - 4 / 29)
}

/** sRGB 0..255 -> CIELAB, D65. */
export function rgbToLab(rgb) {
  const [X, Y, Z] = rgbToXyz(rgb)
  const fx = fLab(X / D65.Xn)
  const fy = fLab(Y / D65.Yn)
  const fz = fLab(Z / D65.Zn)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

/** CIELAB -> sRGB 0..255. */
export function labToRgb([L, a, b]) {
  const fy = (L + 16) / 116
  const fx = fy + a / 500
  const fz = fy - b / 200
  const X = D65.Xn * fLabInv(fx)
  const Y = D65.Yn * fLabInv(fy)
  const Z = D65.Zn * fLabInv(fz)
  return [
    linearToSrgb(3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z),
    linearToSrgb(-0.969266 * X + 1.8760108 * Y + 0.041556 * Z),
    linearToSrgb(0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z),
  ]
}

/** Cheap squared Lab distance. Used to shortlist candidates before the real thing. */
export function labDistanceSq(a, b) {
  const dL = a[0] - b[0]
  const da = a[1] - b[1]
  const db = a[2] - b[2]
  return dL * dL + da * da + db * db
}

function mod360(deg) {
  const m = deg % 360
  return m < 0 ? m + 360 : m
}

/**
 * CIEDE2000.
 *
 * Three bugs are easy to introduce here and all three are caught by the Sharma vectors
 * in tests/color.mjs: mixing degrees and radians inside the T and RT terms, getting the
 * mean-hue wraparound branches wrong (only visible on reds straddling 0 degrees), and
 * flipping the sign of RT.
 *
 * kL defaults to 0.75 rather than 1. At blanket scale a picture reads by VALUE — squint
 * at any finished graphgan and it's a greyscale image — so weighting lightness error
 * more heavily keeps the tonal structure of the photo even where hue has to compromise.
 */
export function deltaE2000(lab1, lab2, kL = 0.75, kC = 1, kH = 1) {
  const [L1, a1, b1] = lab1
  const [L2, a2, b2] = lab2

  const C1 = Math.hypot(a1, b1)
  const C2 = Math.hypot(a2, b2)
  const Cbar = (C1 + C2) / 2
  const Cbar7 = Cbar ** 7
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)))

  const a1p = (1 + G) * a1
  const a2p = (1 + G) * a2
  const C1p = Math.hypot(a1p, b1)
  const C2p = Math.hypot(a2p, b2)

  const h1p = C1p === 0 ? 0 : mod360(Math.atan2(b1, a1p) / DEG)
  const h2p = C2p === 0 ? 0 : mod360(Math.atan2(b2, a2p) / DEG)

  const dLp = L2 - L1
  const dCp = C2p - C1p

  let dhp
  if (C1p * C2p === 0) dhp = 0
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360
  else if (h2p - h1p < -180) dhp = h2p - h1p + 360
  else dhp = h2p - h1p
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * DEG)

  const Lbp = (L1 + L2) / 2
  const Cbp = (C1p + C2p) / 2

  let hbp
  if (C1p * C2p === 0) hbp = h1p + h2p
  else if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2
  else if (h1p + h2p < 360) hbp = (h1p + h2p + 360) / 2
  else hbp = (h1p + h2p - 360) / 2

  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * DEG) +
    0.24 * Math.cos(2 * hbp * DEG) +
    0.32 * Math.cos((3 * hbp + 6) * DEG) -
    0.2 * Math.cos((4 * hbp - 63) * DEG)

  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2))
  const Cbp7 = Cbp ** 7
  const RC = 2 * Math.sqrt(Cbp7 / (Cbp7 + 25 ** 7))
  const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2)
  const SC = 1 + 0.045 * Cbp
  const SH = 1 + 0.015 * Cbp * T
  const RT = -Math.sin(2 * dTheta * DEG) * RC

  const tL = dLp / (kL * SL)
  const tC = dCp / (kC * SC)
  const tH = dHp / (kH * SH)

  return Math.sqrt(tL * tL + tC * tC + tH * tH + RT * tC * tH)
}

/** WCAG relative luminance. Decides whether a cell's letter is inked black or white. */
export function relativeLuminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

/** Black or white, whichever stays readable on top of `rgb`. */
export function inkOn(rgb) {
  return relativeLuminance(rgb) > 0.42 ? [0, 0, 0] : [255, 255, 255]
}
