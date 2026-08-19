/**
 * Getting the chart out of the browser and onto the craft table.
 */

import { useState } from 'react'
import { FileDown, ImageDown, ClipboardCopy, Check } from 'lucide-react'

export default function ExportBar({ onPng, onPdf, onCopy, disabled }) {
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(null)

  const runExport = async (kind, fn) => {
    setBusy(kind)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="panel p-4" aria-label="Download">
      <h2 className="section-title">Take it with you</h2>
      <div className="mt-3 grid gap-2">
        <button
          type="button"
          className="btn-primary w-full"
          aria-label="Download printable chart PDF"
          disabled={disabled || busy === 'pdf'}
          onClick={() => runExport('pdf', onPdf)}
        >
          <FileDown className="h-4 w-4" />
          {busy === 'pdf' ? 'Building…' : 'Printable chart (PDF)'}
        </button>
        <button
          type="button"
          className="btn-secondary w-full"
          aria-label="Download chart image PNG"
          disabled={disabled || busy === 'png'}
          onClick={() => runExport('png', onPng)}
        >
          <ImageDown className="h-4 w-4" />
          {busy === 'png' ? 'Saving…' : 'Chart image (PNG)'}
        </button>
        <button
          type="button"
          className="btn-secondary w-full"
          aria-label="Copy written pattern"
          disabled={disabled}
          onClick={async () => {
            await onCopy()
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
          {copied ? 'Copied' : 'Copy written pattern'}
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--ink-3)' }}>
        The PDF has the chart across as many sheets as it needs, numbered so they tape
        together, plus the colour key and row-by-row instructions.
      </p>
    </section>
  )
}
