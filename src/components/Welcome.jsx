import { Eye, Hand, ListChecks, Nfc, ShieldCheck } from 'lucide-react'
import { useAreas } from '../state/AreasProvider.jsx'
import { useNames } from '../state/NamesProvider.jsx'
import { useTheme } from '../theme/ThemeProvider.jsx'

function Step({ icon: Icon, title, children }) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}
      >
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug font-semibold" style={{ color: 'var(--ink)' }}>
          {title}
        </span>
        <span className="block text-sm leading-snug" style={{ color: 'var(--ink-2)' }}>
          {children}
        </span>
      </span>
    </li>
  )
}

/**
 * What a visitor sees. Also reachable from Setup → "What this app is", for
 * when you want to show someone on purpose.
 */
export function WelcomeContent({ tappedArea }) {
  const { nameFor } = useNames()

  return (
    <div className="space-y-5">
      <div>
        <p className="text-4xl">🏠</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
          Home Maintenance
        </h1>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          A shared checklist for a house, with stickers on the walls instead of reminders on your
          phone.
        </p>
      </div>

      {tappedArea ? (
        <div
          className="flex items-start gap-2.5 rounded-xl p-3 text-sm"
          style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}
        >
          <Nfc className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--accent)' }} />
          <p>
            You just tapped the <strong style={{ color: 'var(--ink)' }}>{nameFor(tappedArea)}</strong>{' '}
            tag. On the phone that set this up, that opens straight to what needs doing in there.
          </p>
        </div>
      ) : null}

      <ul className="space-y-3.5">
        <Step icon={Hand} title="Tap a sticker">
          Each room has a small NFC tag. Tapping it opens that room&apos;s list — no app to find, no
          menu to dig through.
        </Step>
        <Step icon={ListChecks} title="Tap Log">
          That&apos;s the whole thing. It records what you did and when, and works out when it&apos;s
          next due.
        </Step>
        <Step icon={Eye} title="Nothing nags you">
          No notifications, ever. Nothing goes red or tells you you&apos;re behind. A quiet day just
          reads as done.
        </Step>
      </ul>

      <div
        className="flex items-start gap-2.5 rounded-xl p-3 text-xs leading-relaxed"
        style={{ background: 'var(--surface-2)', color: 'var(--ink-2)' }}
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--good)' }} />
        <p>
          Everything stays on the phone that logged it. You are not looking at anybody&apos;s
          history right now, and nothing you tap here reaches theirs.
        </p>
      </div>
    </div>
  )
}

export default function Welcome({ tappedArea, onClaim, onPreview }) {
  const { copy } = useTheme()
  const { areas } = useAreas()

  return (
    <div className="flex min-h-screen flex-col justify-center py-10">
      <div className="panel p-5">
        <WelcomeContent tappedArea={tappedArea} />

        <div className="mt-6 space-y-2.5">
          <button type="button" onClick={onClaim} className="btn-primary h-12 w-full">
            Set this device up
          </button>
          <button type="button" onClick={onPreview} className="btn-secondary h-12 w-full">
            Just have a look
          </button>
        </div>

        <p className="mt-3 text-center text-xs" style={{ color: 'var(--ink-3)' }}>
          Setting up starts a fresh {areas.length}-room list on this device. It won&apos;t touch
          anyone else&apos;s. {copy.appTitle === 'Home Base One' ? 'Welcome aboard.' : ''}
        </p>
      </div>
    </div>
  )
}
