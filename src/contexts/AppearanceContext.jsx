import { createContext, useContext, useState, useEffect } from 'react'

const AppearanceContext = createContext(null)

const DEFAULTS = {
  theme: 'light',         // 'light' | 'dark'
  fontSize: 'md',         // 'sm' | 'md' | 'lg'
  density: 'normal',      // 'compact' | 'normal' | 'comfortable'
  accentColor: '#1a5c82',
  logoUrl: null,           // base64 or null
  platformName: 'TimeBlast',
}

const FONT_SCALE = { sm: '13px', md: '15px', lg: '17px' }
const DENSITY_SCALE = { compact: '0.3rem', normal: '0.45rem', comfortable: '0.7rem' }

function load() {
  try {
    const s = localStorage.getItem('tb_appearance')
    return s ? { ...DEFAULTS, ...JSON.parse(s) } : DEFAULTS
  } catch { return DEFAULTS }
}

function applyToDOM(settings) {
  const root = document.documentElement
  root.setAttribute('data-theme', settings.theme)
  root.style.setProperty('--base-font-size', FONT_SCALE[settings.fontSize] || '15px')
  root.style.setProperty('--primary', settings.accentColor || '#1a5c82')
  root.style.setProperty('--row-py', DENSITY_SCALE[settings.density] || '0.45rem')
  // Derive hover/light from accent
  const hex = settings.accentColor || '#1a5c82'
  root.style.setProperty('--primary-hover', hex)
  root.style.setProperty('--primary-light', hex + '18')
}

export function AppearanceProvider({ children }) {
  const [settings, setSettings] = useState(load)

  useEffect(() => {
    applyToDOM(settings)
    try { localStorage.setItem('tb_appearance', JSON.stringify(settings)) } catch {}
  }, [settings])

  function update(patch) { setSettings(s => ({ ...s, ...patch })) }
  function reset() { setSettings(DEFAULTS) }

  return (
    <AppearanceContext.Provider value={{ settings, update, reset }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance() { return useContext(AppearanceContext) }
