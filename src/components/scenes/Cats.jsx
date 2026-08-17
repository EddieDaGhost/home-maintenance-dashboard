import { SLOTS } from '../../config/catalog.js'
import { MOOD } from '../../lib/credits.js'
import { Blob, Ground, SceneDefs, Solid, shade, tintUp } from './parts.jsx'

// The Cats scene: a warm room, a patch of sun, and however many cats you have
// talked yourself into.
//
// Same two states as the other scenes. Quiet is everyone asleep in the warm
// patch — which is, after all, what cats do most of the time and no kind of
// failure at all.

const COAT_DEFAULT = '#a08a76'

/**
 * A cat, drawn once and dressed three ways. Everything is built around a head
 * of radius 12 at the origin, with the body below it, so a breed only has to
 * change colours and a couple of extra shapes.
 *
 * `points` is a Siamese: darker ears, muzzle and paws. `ruff` is the Maine
 * Coon's chest floof. `stripes` is a tabby.
 */
const BREEDS = {
  succulent: { stripes: true, scale: 0.72 },
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
      <Ground x={0} y={44} w={52} />
      {/* Tail first, so it sits behind the body. */}
      <path
        d="M15 40 C38 42 42 22 30 14"
        stroke={coat}
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      {/* Body: narrow at the shoulders, wide at the base, and the haunch
          rounding out at the bottom — that curve is what says "sitting". */}
      <Solid
        d="M0 3 C13 5 18 20 19.5 34 C20.5 40 17 43 12 43 L-12 43 C-17 43 -20.5 40 -19.5 34 C-18 20 -13 5 0 3 Z"
        fill={coat}
      />
      {breed.ruff ? <Blob cx={0} cy={16} rx={16.5} ry={9.5} fill={tintUp(coat, 0.12)} outline={false} /> : null}
      {breed.stripes ? (
        <g stroke={mark} strokeWidth="2.2" strokeLinecap="round" opacity="0.55">
          <path d="M-13 22 h8 M-15 30 h9 M-16 37 h9" />
        </g>
      ) : null}
      {/* Front paws, tucked forward under the chest. */}
      <Blob cx={-8} cy={41} rx={6.4} ry={3.6} fill={breed.points ? mark : coat} strokeWidth={0.8} />
      <Blob cx={8} cy={41} rx={6.4} ry={3.6} fill={breed.points ? mark : coat} strokeWidth={0.8} />

      {/* Cheeks, then the skull over them — a circle alone reads as a ball. */}
      <Blob cx={0} cy={3} rx={12.5} ry={9} fill={coat} outline={false} />
      <Blob cx={0} cy={-0.5} rx={11.5} ry={11} fill={coat} />
      <Ears fill={breed.points ? mark : coat} />
      {breed.ruff ? <path d="M-12 4 l-6 6 l7 0 Z M12 4 l6 6 l-7 0 Z" fill={coat} /> : null}
      {breed.points ? <ellipse cx="0" cy="2" rx="6.5" ry="4.5" fill={mark} opacity="0.5" /> : null}
      {breed.stripes ? (
        <g stroke={mark} strokeWidth="1.8" strokeLinecap="round" opacity="0.55">
          <path d="M-5.5 -6.5 v-3 M0 -8 v-3 M5.5 -6.5 v-3" />
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
      <Ground x={2} y={42} w={58} />
      <Blob cx={2} cy={30} rx={26} ry={13} fill={coat} />
      <path d="M24 32 C42 34 40 46 22 42" stroke={coat} strokeWidth="6" fill="none" strokeLinecap="round" />
      {breed.stripes ? (
        <g stroke={mark} strokeWidth="2" strokeLinecap="round" opacity="0.5">
          <path d="M4 20 q2 6 0 12 M14 21 q2 6 0 11" />
        </g>
      ) : null}
      <g transform="translate(-17 24) scale(0.88)">
        <Blob cx={0} cy={0} rx={12} ry={11.5} fill={coat} />
        <Ears fill={breed.points ? mark : coat} />
        {breed.ruff ? <path d="M-12 4 l-6 6 l7 0 Z" fill={coat} /> : null}
        <Face asleep />
      </g>
    </g>
  )
}

function Cat({ x, y, art, coat, mood, scale = 1 }) {
  const breed = BREEDS[art] ?? BREEDS.default
  const mark = shade(coat, breed.points ? 0.45 : 0.28)
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

function WindowPerch({ dim, sky = '#cfe6f2' }) {
  return (
    <g>
      <rect x="196" y="16" width="104" height="96" rx="4" fill={dim ? '#5d5a72' : sky} />
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

function JingleBall({ dim }) {
  return (
    <g opacity={dim ? 0.7 : 1}>
      <circle cx="228" cy="176" r="7" fill="#e8b04a" stroke="#c08f2e" />
      <path d="M223 173 q5 4 10 0 M223 179 q5 -4 10 0" stroke="#c08f2e" strokeWidth="1" fill="none" />
    </g>
  )
}


/**
 * Deterministic scatter. Stepping a counter through a modulo lands points in
 * neat diagonal strings — snow came out looking like beads on a wire — so this
 * hashes the index instead. Same layout every render, like SpaceBackdrop.
 */
function scatter(i, seed) {
  const t = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453
  return t - Math.floor(t)
}

/** Whatever is happening on the other side of the glass — and, in a room with
    no window bought yet, what the light is doing anyway. */
function Weather({ art, dim }) {
  if (art === 'rain') {
    return (
      <g opacity={dim ? 0.5 : 0.7}>
        {Array.from({ length: 22 }, (_, i) => {
          const rx = 200 + scatter(i, 1) * 100
          const ry = 20 + scatter(i, 2) * 86
          return (
            <path key={i} d={`M${rx} ${ry} l-2.5 8`} stroke="#cfe3ef" strokeWidth="1.5" strokeLinecap="round" />
          )
        })}
        <rect y="150" width="320" height="50" fill="#5b6b78" opacity="0.16" />
      </g>
    )
  }
  if (art === 'snow') {
    return (
      <g>
        {Array.from({ length: 24 }, (_, i) => {
          const sx = 198 + scatter(i, 3) * 102
          const sy = 18 + scatter(i, 4) * 90
          return <circle key={i} cx={sx} cy={sy} r={scatter(i, 5) > 0.75 ? 2.4 : 1.5} fill="#ffffff" opacity={dim ? 0.6 : 0.9} />
        })}
      </g>
    )
  }
  if (art === 'glow') {
    return <rect width="320" height="200" fill="url(#cats-golden)" />
  }
  return null
}

export default function Cats({ equipped = {}, companions = [], mood = MOOD.LIVELY }) {
  const dim = mood === MOOD.QUIET
  const coat = equipped[SLOTS.FINISH]?.color ?? COAT_DEFAULT
  const art = equipped[SLOTS.VESSEL]?.art
  const sceneArt = equipped[SLOTS.SCENE]?.art
  const flairArt = equipped[SLOTS.FLAIR]?.art
  const weatherArt = equipped[SLOTS.WEATHER]?.art
  // Same rule as the windowsill: rain has to take the sunbeam with it.
  const overcast = weatherArt === 'rain' || weatherArt === 'snow'

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
        <SceneDefs />
        <linearGradient id="cats-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={dim ? '#3b3040' : '#f6e3c8'} />
          <stop offset="100%" stopColor={dim ? '#2c2530' : '#f1d7b4'} />
        </linearGradient>
        <linearGradient id="cats-beam" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#ffe9a8" stopOpacity={dim ? 0.05 : 0.5} />
          <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="cats-golden" x1="1" y1="0" x2="0.2" y2="1">
          <stop offset="0%" stopColor="#ffb257" stopOpacity={dim ? 0.28 : 0.5} />
          <stop offset="60%" stopColor="#ffd08a" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#ffd08a" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="cats-lamp">
          <stop offset="0%" stopColor="#fde68a" stopOpacity={dim ? 0.8 : 0.55} />
          <stop offset="100%" stopColor="#fde68a" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="320" height="200" fill="url(#cats-wall)" />
      <rect y="150" width="320" height="50" fill={dim ? '#40342c' : '#c9a678'} />
      <rect y="150" width="320" height="50" fill="url(#p-lit-soft)" />
      <rect y="150" width="320" height="3.5" fill={dim ? '#584839' : '#b08c5f'} />

      {sceneArt === 'herbs' ? (
        <WindowPerch
          dim={dim}
          sky={weatherArt === 'rain' ? '#a7b8c2' : weatherArt === 'snow' ? '#d3dfe8' : weatherArt === 'glow' ? '#f7cf9b' : '#cfe6f2'}
        />
      ) : null}

      <Weather art={weatherArt} dim={dim} />

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
      {flairArt === 'chimes' ? <JingleBall dim={dim} /> : null}
    </svg>
  )
}
