/**
 * Remembering settings between visits. DOM.
 *
 * Settings only — never the image. A photo would blow the localStorage quota, and
 * re-opening the app to somebody else's half-finished blanket would be worse than
 * re-opening it empty.
 *
 * Every read validates and falls back rather than throwing. A corrupt key should never
 * white-screen the app; the worst it should cost you is your gauge.
 */

import { DEFAULT_SETTINGS, normalizeSettings } from './settings.js'

const KEY = 'stitch-grid/settings/v1'

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    return normalizeSettings(JSON.parse(raw))
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings) {
  try {
    // The source name belongs to one picture, not to the next session.
    const { sourceName, ...rest } = settings
    localStorage.setItem(KEY, JSON.stringify(rest))
  } catch {
    // Private browsing, a full quota — not worth interrupting anybody over.
  }
}
