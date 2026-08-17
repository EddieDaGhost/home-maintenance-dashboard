// The bits every scene draws with.
//
// Flat fills with hard edges are what made the first pass read as paper
// cutouts. Three things fix that, and they're the same three in every scene:
//
//   1. An outline one step darker than the shape's own fill. Never black —
//      a black outline turns everything into clip-art, and it can't follow a
//      colour the user chose from the finish slot.
//   2. A top-lit gradient over the fill, so a round thing looks round.
//   3. A shadow on the surface underneath. Nothing in the first pass cast one,
//      which is most of why things looked pasted on rather than standing there.
//
// Everything here takes its colour from its caller, because the finish slot
// recolours the vessel at runtime. Hardcode a colour in a shape and you break
// the shop.

/** A shade of the same colour, not a blend toward black. */
export function shade(hex, amount = 0.3) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) return hex
  const value = parseInt(hex.slice(1), 16)
  const mix = (channel) => Math.max(0, Math.round(channel * (1 - amount)))
  return `rgb(${mix((value >> 16) & 255)}, ${mix((value >> 8) & 255)}, ${mix(value & 255)})`
}

/** And a lighter one, for highlights and the lit edge of a leaf. */
export function tintUp(hex, amount = 0.3) {
  if (typeof hex !== 'string' || !hex.startsWith('#')) return hex
  const value = parseInt(hex.slice(1), 16)
  const mix = (channel) => Math.min(255, Math.round(channel + (255 - channel) * amount))
  return `rgb(${mix((value >> 16) & 255)}, ${mix((value >> 8) & 255)}, ${mix(value & 255)})`
}

/**
 * The gradients every scene shares. Rendered once per <svg>, inside <defs>.
 * Ids are prefixed so two scenes can never collide if both ever mount.
 */
export function SceneDefs() {
  return (
    <>
      {/* Lit from above: a highlight along the top of any shape, shade beneath. */}
      <linearGradient id="p-lit" x1="0" y1="0" x2="0.15" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
        <stop offset="42%" stopColor="#ffffff" stopOpacity="0.04" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.24" />
      </linearGradient>
      {/* A softer version, for big background shapes that shouldn't pop. */}
      <linearGradient id="p-lit-soft" x1="0" y1="0" x2="0.1" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.12" />
      </linearGradient>
      {/* Contact shadow: dark under the object, gone by the edge. */}
      <radialGradient id="p-ground">
        <stop offset="0%" stopColor="#000000" stopOpacity="0.34" />
        <stop offset="60%" stopColor="#000000" stopOpacity="0.14" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0" />
      </radialGradient>
    </>
  )
}

/**
 * A filled shape with its own outline and top light.
 *
 * @param d      the path
 * @param fill   its colour — usually from the equipped finish
 * @param soft   true for large background shapes that shouldn't be so contrasty
 * @param outline false to skip the stroke (leaves and petals read better without)
 */
export function Solid({ d, fill, soft = false, outline = true, strokeWidth = 1, opacity }) {
  return (
    <g opacity={opacity}>
      <path
        d={d}
        fill={fill}
        stroke={outline ? shade(fill, 0.34) : 'none'}
        strokeWidth={outline ? strokeWidth : 0}
        strokeLinejoin="round"
      />
      <path d={d} fill={`url(#${soft ? 'p-lit-soft' : 'p-lit'})`} />
    </g>
  )
}

/** Same, for the ellipses that make up most of the plants and the cats. */
export function Blob({ cx = 0, cy = 0, rx, ry, fill, rotate, outline = true, strokeWidth = 1 }) {
  const shared = { cx, cy, rx, ry, transform: rotate ? `rotate(${rotate} ${cx} ${cy})` : undefined }
  return (
    <g>
      <ellipse
        {...shared}
        fill={fill}
        stroke={outline ? shade(fill, 0.34) : 'none'}
        strokeWidth={outline ? strokeWidth : 0}
      />
      <ellipse {...shared} fill="url(#p-lit)" />
    </g>
  )
}

/**
 * What an object sitting on a surface puts on that surface. Wide and flat —
 * a shadow the same size as the object reads as a hole rather than a shadow.
 */
export function Ground({ x, y, w, opacity = 1 }) {
  return <ellipse cx={x} cy={y} rx={w / 2} ry={Math.max(2.5, w / 7)} fill="url(#p-ground)" opacity={opacity} />
}
