import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AppearanceContext = createContext(null)

const DEFAULTS = {
  theme: 'light',         // 'light' | 'dark'
  fontSize: 'md',         // 'sm' | 'md' | 'lg'
  density: 'normal',      // 'compact' | 'normal' | 'comfortable'
  // ── 5 couleurs personnalisables ──
  menuColor: '#195C82',       // Menu / Sidebar / Boutons primaires
  accentColor: '#1D9BF0',     // Mise en avant (montants, liens, highlights)
  titleColor: '#0D1B24',      // Gros titres
  surfaceColor: '#FFFFFF',    // Fond des vignettes / cartes
  bgColor: '#F0F0F0',         // Fond derrière les vignettes
  // ──
  logoUrl: null,
  platformName: 'TimeBlast.ai',
}

// Labels pour affichage UI
export const COLOR_FIELDS = [
  { key: 'menuColor',    label: 'Menu & Navigation',    desc: 'Sidebar, boutons primaires' },
  { key: 'accentColor',  label: 'Mise en avant',        desc: 'Montants, liens, highlights' },
  { key: 'titleColor',   label: 'Titres principaux',    desc: 'Gros titres, texte important' },
  { key: 'surfaceColor', label: 'Fond des vignettes',   desc: 'Cartes, panneaux, modales' },
  { key: 'bgColor',      label: 'Fond de page',         desc: 'Arrière-plan général' },
]

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
  root.style.setProperty('--row-py', DENSITY_SCALE[settings.density] || '0.45rem')

  // ── Appliquer les 5 couleurs personnalisables ──
  const menu    = settings.menuColor    || DEFAULTS.menuColor
  const accent  = settings.accentColor  || DEFAULTS.accentColor
  const title   = settings.titleColor   || DEFAULTS.titleColor
  const surface = settings.surfaceColor || DEFAULTS.surfaceColor
  const bg      = settings.bgColor      || DEFAULTS.bgColor

  root.style.setProperty('--primary', menu)
  root.style.setProperty('--primary-hover', menu)
  root.style.setProperty('--primary-light', menu + '18')
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-hover', accent)
  root.style.setProperty('--accent-light', accent + '18')
  root.style.setProperty('--text', title)
  root.style.setProperty('--surface', surface)
  root.style.setProperty('--bg', bg)
}

export function AppearanceProvider({ children }) {
  const [settings, setSettings] = useState(load)
  const [userId, setUserId] = useState(null)

  // Detect logged-in user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        setUserId(data.user.id)
        // Load appearance from DB
        supabase.from('profiles')
          .select('appearance_settings')
          .eq('id', data.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.appearance_settings) {
              const dbSettings = { ...DEFAULTS, ...profile.appearance_settings }
              setSettings(dbSettings)
              try { localStorage.setItem('tb_appearance', JSON.stringify(dbSettings)) } catch {}
            }
          })
      }
    })
  }, [])

  // Apply to DOM + save locally whenever settings change
  useEffect(() => {
    applyToDOM(settings)
    try { localStorage.setItem('tb_appearance', JSON.stringify(settings)) } catch {}
  }, [settings])

  function update(patch) { setSettings(s => ({ ...s, ...patch })) }

  // Save to database (async, non-blocking)
  async function saveToDatabase(newSettings) {
    if (!userId) return
    try {
      await supabase.from('profiles')
        .update({ appearance_settings: newSettings || settings })
        .eq('id', userId)
    } catch (err) {
      console.error('Error saving appearance to DB:', err)
    }
  }

  // Update + persist to DB
  function updateAndSave(patch) {
    setSettings(s => {
      const next = { ...s, ...patch }
      saveToDatabase(next)
      return next
    })
  }

  function reset() {
    setSettings(DEFAULTS)
    saveToDatabase(DEFAULTS)
  }

  return (
    <AppearanceContext.Provider value={{ settings, update, updateAndSave, reset, COLOR_FIELDS }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance() { return useContext(AppearanceContext) }
