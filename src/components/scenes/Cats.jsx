import { SLOTS } from '../../config/catalog.js'
import { MOOD } from '../../lib/credits.js'

// The Cats scene: a warm room, a patch of sun, and however many cats you have
// talked yourself into.
//
// Same two states as the other scenes. Quiet is everyone asleep in the warm
// patch — which is, after all, what cats do most of the time and no kind of
// failure at all.

const COAT_DEFAULT = '#a08a76'

/** A shade or two darker than the coat, for stripes, points and shading. */
function darken(hex, amount = 0.35) {
  const value = parseInt(hex.slice(1), 16)
  const mix = (channel) => Math.round(channel * (1 - amount))
  return `rgb(${mix((value >> 16) & 255)}, ${mix((value >> 8) & 255)}, ${mix(value & 255)})`
}

/**
 * A cat, drawn once and dressed three ways. Everything is built around a head
 * of radius 12 at the origin, with the body below it, so a breed only has to
 * change colours and a couple of extra shapes.
 *
 * `points` is a Siamese: darker ears, muzzle and paws. `ruff` is the Maine
 * Coon's chest floof. `stripes` is a tabby.
 */
const BREEDS = {
  fern: { stripes: true, scale: 1 },
  monstera: { ruff: true, scale: 1.16 },
  orchid: { points: true, scale: 0.95 },
  // Companions and the starter cat: a plain small one.
  default: { stripes: true, scale: 0.9 },
}

function Ears({ fill }) {
  return <path d="M-11 -6 L-13 -19 L-2 -12 Z M11 -6 L13 -19 L2 -12 Z" fill={fill} />
}

function Face({ asleep }) {
  if (asleep) {
    return (
      <g stroke="#2c2118" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.75">
        <path d="M-8 -1 q3.5 3 7 0" />
        <path d="M1 -1 q3.5 3 7 0" />
      </g>
    )
  }
  return (
    <g>
      <ellipse cx="-4.5" cy="-2" rx="1.8" ry="2.6" fill="#2c2118" />
      <ellipse cx="4.5" cy="-2" rx="1.8" ry="2.6" fill="#2c2118" />
      <path d="M0 4 l-2.5 -2.5 h5 Z" fill="#c98b8b" />
      <path d="M0 4 v2.5" stroke="#2c2118" strokeWidth="1" opacity="0.5" />
    </g>
  )
}

/** Awake: sitting upright, tail sweeping out to one side. */
function SittingCat({ coat, mark, breed }) {
  return (
    <g>
      {/* Tail first, so it sits behind the body. */}
      <path
        d="M15 40 C38 42 42 22 30 14"
        stroke={coat}
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      {/* Body: narrow at the shoulders, wide at the base — a sitting cat. */}
      <path d="M0 4 C13 6 19 22 19 40 L-19 40 C-19 22 -13 6 0 4 Z" fill={coat} />
      {breed.ruff ? <ellipse cx="0" cy="16" rx="16" ry="9" fill={coat} opacity="0.85" /> : null}
      {breed.stripes ? (
        <g stroke={mark} strokeWidth="2.2" strokeLinecap="round" opacity="0.55">
          <path d="M-13 22 h8 M-15 30 h9 M-16 37 h9" />
        </g>
      ) : null}
      {/* Front paws. */}
      <ellipse cx="-8" cy="40" rx="6" ry="3.4" fill={breed.points ? mark : coat} />
      <ellipse cx="8" cy="40" rx="6" ry="3.4" fill={breed.points ? mark : coat} />

      <circle cx="0" cy="0" r="12" fill={coat} />
      <Ears fill={breed.points ? mark : coat} />
      {breed.ruff ? <path d="M-12 4 l-6 6 l7 0 Z M12 4 l6 6 l-7 0 Z" fill={coat} /> : null}
      {breed.points ? <ellipse cx="0" cy="2" rx="6.5" ry="4.5" fill={mark} opacity="0.5" /> : null}
      {breed.stripes ? (
        <g stroke={mark} strokeWidth="1.8" strokeLinecap="round" opacity="0.55">
          <path d="M-6 -10 v-3 M0 -11.5 v-3 M6 -10 v-3" />
        </g>
      ) : null}
      <Face asleep={false} />
    </g>
  )
}

/** Asleep: a croissant, which is the natural resting state of a cat. */
function CurledCat({ coat, mark, breed }) {
  return (
    <g>
      <ellipse cx="2" cy="30" rx="26" ry="13" fill={coat} />
      <path d="M24 32 C42 34 40 46 22 42" stroke={coat} strokeWidth="6" fill="none" strokeLinecap="round" />
      {breed.stripes ? (
        <g stroke={mark} strokeWidth="2" strokeLinecap="round" opacity="0.5">
          <path d="M4 20 q2 6 0 12 M14 21 q2 6 0 11" />
        </g>
      ) : null}
      <g transform="translate(-17 24) scale(0.88)">
        <circle cx="0" cy="0" r="12" fill={coat} />
        <Ears fill={breed.points ? mark : coat} />
        {breed.ruff ? <path d="M-12 4 l-6 6 l7 0 Z" fill={coat} /> : null}
        <Face asleep />
      </g>
    </g>
  )
}

function Cat({ x, y, art, coat, mood, scale = 1 }) {
  const breed = BREEDS[art] ?? BREEDS.default
  const mark = darken(coat, breed.points ? 0.45 : 0.28)
  const size = scale * breed.scale

  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      {mood === MOOD.QUIET ? (
        <CurledCat coat={coat} mark={mark} breed={breed} />
      ) : (
        <SittingCat coat={coat} mark={mark} breed={breed} />
      )}
    </g>
  )
}

function WindowPerch({ dim }) {
  return (
    <g>
      <rect x="196" y="16" width="104" height="96" rx="4" fill={dim ? '#5d5a72' : '#cfe6f2'} />
      <path d="M196 112 Q234 84 262 98 Q284 82 300 92 L300 112 Z" fill={dim ? '#3f4a49' : '#b8d3a8'} />
      <g fill="none" stroke={dim ? '#7c6a58' : '#e0cdb2'} strokeWidth="6">
        <rect x="196" y="16" width="104" height="96" rx="4" />
        <path d="M248 16 V112" strokeWidth="4" />
      </g>
      <rect x="188" y="112" width="120" height="9" rx="3" fill={dim ? '#7c6a58' : '#e6d5ba'} />
    </g>
  )
}

function SunnyRug({ dim }) {
  return (
    <g opacity={dim ? 0.6 : 1}>
      <ellipse cx="160" cy="170" rx="96" ry="20" fill={dim ? '#8c6f57' : '#e5b876'} />
      <ellipse cx="160" cy="170" rx="72" ry="14" fill={dim ? '#7d6350' : '#efcb96'} />
      <ellipse cx="160" cy="170" rx="44" ry="8" fill={dim ? '#8c6f57' : '#e5b876'} />
    </g>
  )
}

function BellCollar({ dim, x, y, scale }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={dim ? 0.7 : 1}>
      <path d="M-11 11 q11 6 22 0" stroke="#cf6a5a" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="0.5" cy="15" r="3.2" fill="#f3c14b" stroke="#c99a2c" />
    </g>
  )
}

function BowTie({ dim, x, y, scale }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={dim ? 0.7 : 1}>
      <path d="M0 14 l-9 -5 v10 Z M1 14 l9 -5 v10 Z" fill="#8a5fbf" />
      <circle cx="0.5" cy="14" r="2.4" fill="#6d47a0" />
    </g>
  )
}

/** The halo is a gradient, not a flat disc — a flat one on the dark wall reads
    as a brown coin rather than as light. */
function NightLight({ dim }) {
  return (
    <g>
      <circle cx="42" cy="150" r={dim ? 34 : 26} fill="url(#cats-lamp)" />
      <rect x="35" y="144" width="14" height="16" rx="4" fill="#fde68a" stroke="#e0b95c" />
    </g>
  )
}

export default function Cats({ equipped = {}, companions = [], mood = MOOD.LIVELY }) {
  const dim = mood === MOOD.QUIET
  const coat = equipped[SLOTS.FINISH]?.color ?? COAT_DEFAULT
  const art = equipped[SLOTS.VESSEL]?.art
  const sceneArt = equipped[SLOTS.SCENE]?.art
  const flairArt = equipped[SLOTS.FLAIR]?.art

  // Companions fan out either side of the main cat, smaller, so the one you
  // paid the most for stays the one you look at first.
  const spots = [
    [72, 128],
    [246, 128],
    [110, 146],
    [212, 148],
    [40, 118],
    [282, 120],
  ]

  return (
    <svg
      viewBox="0 0 320 200"
      className="block h-auto w-full"
      role="img"
      aria-label={dim ? 'Cats asleep in the last of the sun' : 'Cats awake in a sunlit room'}
    >
      <defs>
        <linearGradient id="cats-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dim ? '#3b3040' : '#f6e3c8'} />
          <stop offset="100%" stopColor={dim ? '#2c2530' : '#f1d7b4'} />
        </linearGradient>
        <linearGradient id="cats-beam" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity={dim ? 0.05 : 0.5} />
          <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="cats-lamp">
          <stop offset="0%" stopColor="#fde68a" stopOpacity={dim ? 0.8 : 0.55} />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="320" height="200" fill="url(#cats-wall)" />
      <rect y="150" width="320" height="50" fill={dim ? '#40342c' : '#c9a678'} />
      <rect y="150" width="320" height="4" fill={dim ? '#584839' : '#b08c5f'} />

      {sceneArt === 'herbs' ? <WindowPerch dim={dim} /> : null}

      {/* The warm patch. Everything in this theme is arranged around it. */}
      <path d="M232 24 L300 24 L300 150 L120 190 Z" fill="url(#cats-beam)" />

      {sceneArt === 'curtain' ? <SunnyRug dim={dim} /> : null}

      {flairArt === 'lantern' ? <NightLight dim={dim} /> : null}

      {companions.slice(0, spots.length).map((companion, i) => (
        <Cat key={companion.id} x={spots[i][0]} y={spots[i][1]} art={null} coat={coat} mood={mood} scale={0.62} />
      ))}

      <Cat x={160} y={112} art={art} coat={coat} mood={mood} />

      {flairArt === 'suncatcher' ? <BellCollar dim={dim} x={160} y={112} scale={1} /> : null}
      {flairArt === 'bunting' ? <BowTie dim={dim} x={160} y={112} scale={1} /> : null}
    </svg>
  )
}
