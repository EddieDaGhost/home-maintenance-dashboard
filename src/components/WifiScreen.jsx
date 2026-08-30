import { useRef, useState } from 'react'
import { ArrowLeft, Check, Copy, Info, KeyRound, Lock, Wifi } from 'lucide-react'
import { NETWORK, QUESTIONS, RULES } from '../config/wifi.js'
import {
  isCorrect,
  looksPasted,
  markQuiz,
  retypeMatches,
  retypeProgress,
  retypeTarget,
} from '../lib/wifi.js'

/** quiz → retype → the password. One at a time, in that order. */
const STAGE = { QUIZ: 'quiz', RETYPE: 'retype', DONE: 'done' }

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        } catch {
          // Clipboard blocked — the text is on screen to be read either way.
        }
      }}
      className="btn-secondary flex h-9 shrink-0 items-center gap-1.5 px-3 text-xs"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

/**
 * The WiFi password, with a quiz in front of it.
 *
 * Reachable at `#wifi`, which is what the sticker by the door points at — and
 * deliberately reachable *before* the welcome screen, because the whole point
 * is a guest opening it on a phone that has never seen this app.
 *
 * Nothing here writes to their browser. Progress is component state and is
 * lost on a refresh, which is the right way round for somebody else's device.
 */
export default function WifiScreen({ onBack }) {
  const [stage, setStage] = useState(STAGE.QUIZ)
  const [answers, setAnswers] = useState({})
  const [wrong, setWrong] = useState([])
  const [checked, setChecked] = useState(false)
  const [typed, setTyped] = useState('')
  const [pasteBlocked, setPasteBlocked] = useState(false)
  const retypeRef = useRef(null)

  const target = retypeTarget()
  const progress = retypeProgress(typed)

  const submit = () => {
    const marked = markQuiz(answers)
    setChecked(true)
    setWrong(marked.wrong)
    if (marked.allCorrect) {
      setStage(STAGE.RETYPE)
      setTimeout(() => retypeRef.current?.focus(), 100)
    }
  }

  /** One place to refuse a paste, whichever way it arrived. */
  const refusePaste = (event) => {
    event.preventDefault()
    setPasteBlocked(true)
    setTimeout(() => setPasteBlocked(false), 2600)
  }

  return (
    <div className="space-y-4 pb-10">
      <header className="flex items-center gap-3 pt-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="panel flex h-11 w-11 shrink-0 items-center justify-center transition active:scale-95"
            style={{ color: 'var(--ink-2)' }}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight" style={{ color: 'var(--ink)' }}>
            The WiFi
          </h1>
          <p className="text-xs" style={{ color: 'var(--ink-3)' }}>
            {stage === STAGE.DONE ? "You've earned it" : 'There is a small catch'}
          </p>
        </div>
      </header>

      <section className="panel flex items-center gap-3 p-4">
        <Wifi className="h-6 w-6 shrink-0" style={{ color: 'var(--accent)' }} />
        <span className="min-w-0 flex-1">
          <span className="label block">Network</span>
          <span className="block truncate text-lg font-bold" style={{ color: 'var(--ink)' }}>
            {NETWORK.ssid}
          </span>
        </span>
        <CopyButton value={NETWORK.ssid} label="Copy the network name" />
      </section>

      {/* ---------------------------------------------------------------- */}
      {stage === STAGE.DONE ? (
        <>
          <section
            className="panel p-4"
            style={{ '--surface': 'var(--good-soft)', '--line': 'var(--good-line)' }}
          >
            <div className="flex items-center gap-3">
              <KeyRound className="h-6 w-6 shrink-0" style={{ color: 'var(--good-ink)' }} />
              <span className="min-w-0 flex-1">
                <span className="label block">Password</span>
                <span
                  className="block font-mono text-lg font-bold break-all"
                  style={{ color: 'var(--ink)' }}
                >
                  {NETWORK.password}
                </span>
              </span>
              <CopyButton value={NETWORK.password} label="Copy the password" />
            </div>
            {NETWORK.note ? (
              <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                {NETWORK.note}
              </p>
            ) : null}
          </section>

          <p className="px-1 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            Yes, that&apos;s really it. Thank you for playing along.
          </p>
        </>
      ) : (
        <section className="panel flex items-start gap-3 p-4">
          <Lock className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--ink-3)' }} />
          <p className="min-w-0 flex-1 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
            The password is behind a short quiz. Nine questions, and then one last thing.
          </p>
        </section>
      )}

      {/* ---------------------------------------------------------------- */}
      {stage === STAGE.QUIZ ? (
        <>
          <section className="panel p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              <Info className="h-4 w-4 shrink-0" style={{ color: 'var(--ink-3)' }} />
              Quick notes
            </p>
            <ul className="space-y-1.5">
              {RULES.map((rule) => (
                <li key={rule} className="text-xs leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                  {rule}
                </li>
              ))}
            </ul>
          </section>

          <div className="space-y-2.5">
            {QUESTIONS.map((question, index) => {
              // Only ever after a submit, and only on the ones still wrong —
              // nothing turns red while somebody is still typing.
              const missed = checked && wrong.includes(question.id)
              const right = checked && isCorrect(question, answers[question.id])
              return (
                <div
                  key={question.id}
                  className="panel p-4"
                  style={
                    missed
                      ? { '--surface': 'var(--attention-soft)', '--line': 'var(--attention-line)' }
                      : undefined
                  }
                >
                  <label className="block">
                    <span className="block text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      <span className="numeral" style={{ color: 'var(--ink-3)' }}>
                        {index + 1}.{' '}
                      </span>
                      {question.question}
                    </span>
                    {question.note ? (
                      <span className="mt-1 block text-xs italic" style={{ color: 'var(--ink-3)' }}>
                        {question.note}
                      </span>
                    ) : null}
                    <input
                      type="text"
                      className="field mt-2"
                      aria-label={question.question}
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      value={answers[question.id] ?? ''}
                      onChange={(event) =>
                        setAnswers((current) => ({ ...current, [question.id]: event.target.value }))
                      }
                    />
                  </label>
                  {right ? (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--good-ink)' }}>
                      <Check className="h-3.5 w-3.5" />
                      That&apos;s the one
                    </p>
                  ) : missed ? (
                    <p className="mt-1.5 text-xs font-semibold" style={{ color: 'var(--attention-ink)' }}>
                      Have another look at this one.
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>

          {checked && wrong.length > 0 ? (
            <p
              className="rounded-xl p-3 text-sm leading-relaxed"
              style={{
                background: 'var(--attention-soft)',
                border: '1px solid var(--attention-line)',
                color: 'var(--attention-ink)',
              }}
            >
              {wrong.length === 1
                ? 'One to look at again. Everything else is right.'
                : `${wrong.length} to look at again. Everything else is right.`}
            </p>
          ) : null}

          <button type="button" onClick={submit} className="btn-primary h-12 w-full text-sm">
            Submit
          </button>
        </>
      ) : null}

      {/* ---------------------------------------------------------------- */}
      {stage === STAGE.RETYPE ? (
        <>
          <section
            className="panel p-4"
            style={{ '--surface': 'var(--good-soft)', '--line': 'var(--good-line)' }}
          >
            <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--ink)' }}>
              <Check className="h-4 w-4" style={{ color: 'var(--good-ink)' }} />
              All nine correct
            </p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--ink-2)' }}>
              One last thing. Type every answer again, in order, run together with no spaces.
            </p>
          </section>

          <section className="panel p-4">
            <p className="label mb-2">In this order</p>
            <ol className="numeral space-y-1 text-sm" style={{ color: 'var(--ink-2)' }}>
              {QUESTIONS.map((question, index) => (
                <li key={question.id}>
                  <span style={{ color: 'var(--ink-3)' }}>{index + 1}. </span>
                  <span className="font-semibold" style={{ color: 'var(--ink)' }}>
                    {question.answer}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <div className="panel p-4">
            <label className="block">
              <span className="label mb-1.5 block">All of it, no spaces</span>
              <textarea
                ref={retypeRef}
                id="wifi-retype"
                aria-label="Retype every answer with no spaces"
                className="field min-h-[6rem] font-mono text-sm"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={typed}
                onPaste={refusePaste}
                onDrop={refusePaste}
                onChange={(event) => {
                  // The backstop for anything that isn't a paste event —
                  // autofill, a keyboard swapping in a whole word.
                  if (looksPasted(typed, event.target.value)) {
                    setPasteBlocked(true)
                    setTimeout(() => setPasteBlocked(false), 2600)
                    return
                  }
                  setTyped(event.target.value)
                }}
              />
            </label>

            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="numeral text-xs tabular-nums" style={{ color: 'var(--ink-3)' }}>
                {progress.typed} of {progress.total}
              </p>
              {progress.strayed ? (
                <p className="text-xs font-semibold" style={{ color: 'var(--attention-ink)' }}>
                  That&apos;s drifted off — check the last few characters.
                </p>
              ) : null}
            </div>

            {pasteBlocked ? (
              <p
                className="mt-2 rounded-xl p-2.5 text-xs leading-relaxed"
                style={{
                  background: 'var(--attention-soft)',
                  border: '1px solid var(--attention-line)',
                  color: 'var(--attention-ink)',
                }}
              >
                No pasting in this one. It has to be typed.
              </p>
            ) : null}
          </div>

          <button
            type="button"
            disabled={!retypeMatches(typed)}
            onClick={() => setStage(STAGE.DONE)}
            className="btn-primary h-12 w-full text-sm disabled:opacity-40"
          >
            {retypeMatches(typed) ? 'Show me the password' : `${target.length - progress.typed} to go`}
          </button>
        </>
      ) : null}
    </div>
  )
}
