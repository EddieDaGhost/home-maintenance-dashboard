/**
 * The one place a file leaves the browser. DOM.
 *
 * Everything that exports — PNG, PDF, the written pattern — routes through here.
 * Nothing else constructs an <a>.
 */

/**
 * @param blob   what to save
 * @param filename what to call it
 *
 * The one-second delay before revoking is not superstition: Safari hands the file to
 * the download manager asynchronously, and revoking immediately gives the user an
 * empty file. Don't shorten it.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadData(data, filename, type) {
  downloadBlob(new Blob([data], { type }), filename)
}

/** 'beach-holiday.jpg' + 'chart' + 'pdf' -> 'beach-holiday-chart.pdf' */
export function suggestName(sourceName, suffix, ext) {
  const base = (sourceName || 'stitch-grid')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 48)
  return `${base || 'stitch-grid'}-${suffix}.${ext}`
}
