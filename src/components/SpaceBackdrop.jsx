import { useMemo } from 'react'

// A seeded random number generator, so the sky is the same every time the app
// opens instead of reshuffling on each render.
function seededRandom(seed) {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const STAR_TINTS = ['#ffffff', '#ffffff', '#ffffff', '#cfe8ff', '#ffe9c4', '#d7ccff']

/**
 * Stars are laid out across the top half of a double-height layer, then
 * repeated 50% lower. Scrolling the layer up by half its height lands exactly
 * on the copy, so the drift loops forever without a visible seam.
 */
function useStarLayer(seed, count, sizeRange, opacityRange) {
  return useMemo(() => {
    const random = seededRandom(seed)
    return Array.from({ length: count }, () => {
      const [minSize, maxSize] = sizeRange
      const [minOpacity, maxOpacity] = opacityRange
      return {
        left: random() * 100,
        top: random() * 50,
        size: minSize + random() * (maxSize - minSize),
        opacity: minOpacity + random() * (maxOpacity - minOpacity),
        tint: STAR_TINTS[Math.floor(random() * STAR_TINTS.length)],
        twinkle: random() < 0.18,
        twinkleDuration: 2.5 + random() * 5,
        twinkleDelay: random() * 6,
      }
    })
  }, [seed, count, sizeRange, opacityRange])
}

function StarLayer({ stars, duration }) {
  return (
    <div className="star-layer" style={{ animationDuration: `${duration}s` }}>
      {stars.map((star, index) =>
        [0, 50].map((offset) => (
          <span
            key={`${index}-${offset}`}
            className={star.twinkle ? 'star star-twinkle' : 'star'}
            style={{
              left: `${star.left}%`,
              top: `${star.top + offset}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              background: star.tint,
              animationDuration: star.twinkle ? `${star.twinkleDuration}s` : undefined,
              animationDelay: star.twinkle ? `${star.twinkleDelay}s` : undefined,
            }}
          />
        )),
      )}
    </div>
  )
}

// Sizes and opacities are module constants so the layers memoize properly.
const FAR = [0.9, 1.6]
const MID = [1.2, 2.1]
const NEAR = [1.8, 3]
const DIM = [0.25, 0.55]
const MEDIUM = [0.4, 0.8]
const BRIGHT = [0.6, 1]

export default function SpaceBackdrop() {
  const farStars = useStarLayer(1337, 90, FAR, DIM)
  const midStars = useStarLayer(4242, 45, MID, MEDIUM)
  const nearStars = useStarLayer(8888, 18, NEAR, BRIGHT)

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Deep space, lit slightly from above. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 70% at 50% -10%, #10203f 0%, #070d1c 45%, #04070f 100%)',
        }}
      />

      {/* Distant nebulae. */}
      <div
        className="nebula"
        style={{
          top: '-12%',
          left: '-18%',
          width: '75vw',
          height: '75vw',
          background: 'radial-gradient(circle, rgba(56,189,248,0.28) 0%, transparent 70%)',
          animationDuration: '24s',
        }}
      />
      <div
        className="nebula"
        style={{
          top: '32%',
          right: '-25%',
          width: '80vw',
          height: '80vw',
          background: 'radial-gradient(circle, rgba(168,85,247,0.22) 0%, transparent 70%)',
          animationDuration: '31s',
          animationDelay: '-8s',
        }}
      />

      {/* Three layers of stars, each drifting at its own pace for depth. */}
      <StarLayer stars={farStars} duration={320} />
      <StarLayer stars={midStars} duration={210} />
      <StarLayer stars={nearStars} duration={140} />

      {/* The planet you're orbiting — only its lit upper edge clears the fold. */}
      <div
        className="absolute left-1/2 w-[190%] -translate-x-1/2 rounded-[50%]"
        style={{
          bottom: '-46vh',
          height: '62vh',
          background: 'linear-gradient(to top, #071427 55%, #123a5c 88%, #2b7fa8 100%)',
          boxShadow: '0 -22px 60px -10px rgba(56, 189, 248, 0.35)',
          opacity: 0.85,
        }}
      />
    </div>
  )
}
