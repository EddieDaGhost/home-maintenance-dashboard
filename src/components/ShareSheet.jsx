import { useState } from 'react'
import { Check, Copy, Link2, RefreshCw, TriangleAlert, Unlink } from 'lucide-react'
import { buildJoinLink } from '../lib/sync.js'
import { friendlyDate } from '../lib/date.js'
import Sheet from './Sheet.jsx'

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
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

function StatusLine({ status, lastSyncAt }) {
  if (status.state === 'syncing') {
    return (
      <span className="flex items-center gap-1.5" style={{ color: 'var(--ink-2)' }}>
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        Syncing…
      </span>
    )
  }
  if (status.state === 'error') {
    return (
      <span className="flex items-center gap-1.5" style={{ color: 'var(--alert-ink)' }}>
        <TriangleAlert className="h-3.5 w-3.5" />
        {status.error}
      </span>
    )
  }
  return (
    <span style={{ color: 'var(--ink-2)' }}>
      {lastSyncAt ? `Last synced ${friendlyDate(lastSyncAt).toLowerCase()}` : 'Not synced yet'}
    </span>
  )
}

export default function ShareSheet({ open, onClose, sync }) {
  const { link, status, isSharing, syncNow, startSharing, stopSharing } = sync
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const joinLink = isSharing ? buildJoinLink(origin, link) : ''

  const handleCopy = async () => {
    if (await copyText(joinLink)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Share with another device"
      footer={
        <button type="button" onClick={onClose} className="btn-primary h-11 w-full">
          Done
        </button>
      }
    >
      {isSharing ? (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            This device is sharing a household. Send the link below to anyone who should see the
            same lists and history — opening it on their phone joins them.
          </p>

          <div>
            <p className="label mb-1.5">Invite link</p>
            <div className="flex items-center gap-2">
              <p
                className="min-w-0 flex-1 rounded-xl border p-3 font-mono text-xs break-all"
                style={{ borderColor: 'var(--line)', color: 'var(--ink-2)' }}
              >
                {joinLink}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                aria-label="Copy the invite link"
                className="btn-secondary flex h-11 shrink-0 items-center gap-1.5 px-3 text-xs"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-1.5 text-xs" style={{ color: 'var(--ink-3)' }}>
              Anyone with this link can read and add to your logs — text it to the people who live
              here, not to a group chat.
            </p>
          </div>

          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs">
                <StatusLine status={status} lastSyncAt={link.lastSyncAt} />
              </p>
              <button
                type="button"
                onClick={syncNow}
                disabled={status.state === 'syncing'}
                className="btn-secondary flex h-9 shrink-0 items-center gap-1.5 px-2.5 text-xs disabled:opacity-40"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync now
              </button>
            </div>
          </div>

          <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            Logging still works with no signal — this device saves straight away and catches up when
            it can. Completions from every phone are merged, so nothing is lost when two of you log
            at once.
          </p>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Stop sharing on this device? Your history stays on this phone.')) {
                stopSharing()
              }
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition active:scale-95"
            style={{ borderColor: 'var(--alert-line)', color: 'var(--alert-ink)' }}
          >
            <Unlink className="h-4 w-4" />
            Stop sharing on this device
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            Right now this phone keeps its own history. Turn on sharing and you get one household —
            everyone sees the same rooms, the same history, and can log from their own phone.
          </p>

          <ul className="space-y-2 text-sm" style={{ color: 'var(--ink-2)' }}>
            <li>· Your existing history comes with you, nothing is lost.</li>
            <li>· Logging still works offline and catches up later.</li>
            <li>· No accounts, no passwords — you share a private link.</li>
          </ul>

          {status.state === 'error' ? (
            <p
              className="flex items-start gap-2 rounded-xl p-3 text-xs"
              style={{ background: 'var(--alert-soft)', color: 'var(--ink-2)' }}
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--alert)' }} />
              {status.error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={busy || status.state === 'syncing'}
            onClick={async () => {
              setBusy(true)
              await startSharing()
              setBusy(false)
            }}
            className="btn-primary flex h-12 w-full items-center justify-center gap-2 disabled:opacity-40"
          >
            <Link2 className="h-5 w-5" />
            {busy ? 'Setting up…' : 'Start sharing'}
          </button>

          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
            Joining someone else&apos;s household? Just open the link they send you.
          </p>
        </div>
      )}
    </Sheet>
  )
}
