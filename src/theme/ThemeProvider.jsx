import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEFAULT_THEME_ID, THEMES, THEME_LIST } from '../config/themes.js'

const STORAGE_KEY = 'home-maintenance-dashboard/theme'

// The color the iPhone paints behind the status bar, per theme.
const STATUS_BAR_COLOR = { home: '#f1f5f9', starship: '#04070f', cats: '#fbf1e3' }

const ThemeContext = createContext(null)

function readStoredTheme() {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored && THEMES[stored] ? stored : DEFAULT_THEME_ID
  } catch {
    return DEFAULT_THEME_ID
  }
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(readStoredTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = themeId
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', STATUS_BAR_COLOR[themeId] ?? STATUS_BAR_COLOR.home)
    try {
      window.localStorage.setItem(STORAGE_KEY, themeId)
    } catch {
      // Private browsing — the theme just won't stick between visits.
    }
  }, [themeId])

  const setTheme = useCallback((id) => {
    if (THEMES[id]) setThemeId(id)
  }, [])

  const value = useMemo(
    () => ({ themeId, theme: THEMES[themeId], copy: THEMES[themeId].copy, themes: THEME_LIST, setTheme }),
    [themeId, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside a ThemeProvider')
  return context
}
