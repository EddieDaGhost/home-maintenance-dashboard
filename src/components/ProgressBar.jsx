export default function ProgressBar({ percent, fillClass = 'bg-slate-900', trackClass = 'bg-slate-200', height = 'h-2' }) {
  const safe = Math.max(0, Math.min(100, Math.round(percent || 0)))
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${trackClass} ${height}`}
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${fillClass}`}
        style={{ width: `${safe}%` }}
      />
    </div>
  )
}
