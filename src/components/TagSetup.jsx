import { useState } from 'react'
import { Check, Copy, TriangleAlert } from 'lucide-react'
import { AREAS } from '../config/areas.js'
import { useNames } from '../state/NamesProvider.jsx'
import Sheet from './Sheet.jsx'

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Older Safari, or a page without clipboard permission.
    try {
      const field = document.createElement('textarea')
      field.value = text
      field.setAttribute('readonly', '')
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      field.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(field)
      return ok
    } catch {
      return false
    }
  }
}

function TagRow({ label, url, hint }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (await copyText(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    }
  }

  return (
    <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug font-semibold" style={{ color: 'var(--ink)' }}>
            {label}
          </p>
          <p className="mt-0.5 font-mono text-xs break-all" style={{ color: 'var(--ink-2)' }}>
            {url}
          </p>
          {hint ? (
            <p className="mt-1 text-xs" style={{ color: 'var(--ink-3)' }}>
              {hint}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy the ${label} tag address`}
          className="btn-secondary flex h-10 shrink-0 items-center gap-1.5 px-3 text-xs"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

/**
 * Shows exactly what to write on each NFC tag, built from the address you're
 * currently using. Add an area to the config and its tag shows up here too —
 * that's the "sync": this list can never drift from the app.
 */
export default function TagSetup({ open, onClose }) {
  const { nameFor } = useNames()
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const onVercelUrl = /\.vercel\.app$/.test(
    typeof window === 'undefined' ? '' : window.location.hostname,
  )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="NFC tag setup"
      footer={
        <button type="button" onClick={onClose} className="btn-primary h-11 w-full">
          Done
        </button>
      }
    >
      <div className="space-y-3">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
          Write one of these addresses to each tag using the free <strong>NFC Tools</strong> app:
          Write → Add a record → URL, paste, then hold the tag to the top of your phone.
        </p>

        {onVercelUrl ? (
          <div
            className="flex items-start gap-2.5 rounded-xl p-3 text-xs"
            style={{ background: 'var(--alert-soft)', color: 'var(--ink-2)' }}
          >
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--alert)' }} />
            <p>
              These addresses use the Vercel URL you&apos;re on right now. If you have your own
              domain set up, open the app there first — then these will be the addresses you
              actually want on your tags.
            </p>
          </div>
        ) : null}

        <TagRow label="Master tag" url={`${origin}/`} hint="Fridge, or by the front door" />

        {AREAS.map((area) => (
          <TagRow key={area.id} label={nameFor(area)} url={`${origin}/#${area.id}`} />
        ))}

        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
          The part after <span className="font-mono">#</span> never changes when you rename a room,
          so a tag written today keeps working forever. Plain stickers don&apos;t read through
          metal — put those on the wall beside the appliance instead.
        </p>
      </div>
    </Sheet>
  )
}
