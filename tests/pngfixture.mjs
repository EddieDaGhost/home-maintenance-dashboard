/**
 * A minimal PNG encoder, so browser suites can hand Playwright a real image file
 * without a binary fixture committed to the repo. Uncompressed-friendly and tiny —
 * it only has to produce something a browser will decode.
 */

import { deflateSync } from 'node:zlib'

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const out = Buffer.alloc(data.length + 12)
  out.writeUInt32BE(data.length, 0)
  out.write(type, 4, 'ascii')
  data.copy(out, 8)
  const body = out.subarray(4, 8 + data.length)
  out.writeUInt32BE(crc32(body), 8 + data.length)
  return out
}

/**
 * @param fn (x, y) -> [r, g, b]
 * @returns {Buffer} a valid 8-bit RGB PNG
 */
export function makePng(width, height, fn) {
  const raw = Buffer.alloc(height * (width * 3 + 1))
  let p = 0
  for (let y = 0; y < height; y++) {
    raw[p++] = 0 // filter: none
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fn(x, y)
      raw[p++] = r
      raw[p++] = g
      raw[p++] = b
    }
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** A circle on a plain ground — the shape that shows whether gauge correction works. */
export function circlePng(width, height) {
  return makePng(width, height, (x, y) => {
    const dx = (x + 0.5) / width - 0.5
    const dy = (y + 0.5) / height - 0.5
    return Math.hypot(dx, dy) < 0.34 ? [42, 92, 132] : [242, 232, 213]
  })
}

/**
 * A circle over a two-axis gradient. Stands in for a photograph: enough distinct
 * colours that the colour-limit controls have something to actually do, which a flat
 * two-colour fixture cannot exercise.
 */
export function photoPng(width, height) {
  return makePng(width, height, (x, y) => {
    const u = x / Math.max(1, width - 1)
    const v = y / Math.max(1, height - 1)
    const dx = (x + 0.5) / width - 0.5
    const dy = (y + 0.5) / height - 0.5
    if (Math.hypot(dx, dy) < 0.3) {
      return [Math.round(40 + u * 160), Math.round(90 + v * 120), 150]
    }
    return [Math.round(230 - v * 180), Math.round(120 + u * 110), Math.round(60 + v * 170)]
  })
}

/** Read an IHDR back out, for asserting on a downloaded PNG. */
export function readPngSize(bytes) {
  const buf = Buffer.from(bytes)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

/** Playwright's setInputFiles payload. */
export function asUpload(name, buffer) {
  return { name, mimeType: 'image/png', buffer }
}
