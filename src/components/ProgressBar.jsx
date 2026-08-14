/**
 * Colors come in as CSS values rather than classes so an area can pass its own
 * accent (via --area) and have it work in every theme.
 */
export default function ProgressBar({
  percent,
  fill = 'var(--accent)',
  track = 'var(--surface-2)',
  glow,
  height = '0.5rem',
}) {
  const safe = Math.max(0, Math.min(100, Math.round(percent || 0)))
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ background: track, height }}
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${safe}%`,
          background: fill,
          boxShadow: glow && safe > 0 ? `0 0 12px -1px ${glow}` : undefined,
        }}
      />
    </div>
  )
}
