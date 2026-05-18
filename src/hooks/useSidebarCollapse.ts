import { useState, useEffect, useCallback, createContext, useContext } from 'react'

/**
 * 005-iter5-ux-fixes / US1: sidebar collapse state with localStorage persistence.
 *
 * Single source of truth for the icon-rail vs. expanded sidebar mode.
 * Consumed by both `Sidebar` (renders the toggle + collapsed-rail markup) and
 * `PageShell` (animates `main`'s `margin-left`). The shared instance is plumbed
 * via `SidebarCollapseContext`.
 *
 * Contract: specs/005-iter5-ux-fixes/contracts/sidebar-collapse.md
 */

const STORAGE_KEY = 'psp:sidebar:collapsed'
const MOBILE_BREAKPOINT = 768

export interface SidebarCollapseState {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (next: boolean) => void
  mobileOpen: boolean
  openMobile: () => void
  closeMobile: () => void
}

function readInitial(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function useSidebarCollapse(): SidebarCollapseState {
  const [collapsed, setCollapsedRaw] = useState<boolean>(readInitial)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      /* swallow — storage may be unavailable in private mode */
    }
  }, [collapsed])

  // Auto-close the mobile drawer when the viewport widens past the breakpoint
  useEffect(() => {
    if (typeof window === 'undefined') return
    function onResize() {
      if (window.innerWidth > MOBILE_BREAKPOINT) setMobileOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const toggle = useCallback(() => setCollapsedRaw((c) => !c), [])
  const setCollapsed = useCallback((next: boolean) => setCollapsedRaw(next), [])
  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])

  return { collapsed, toggle, setCollapsed, mobileOpen, openMobile, closeMobile }
}

export const SidebarCollapseContext = createContext<SidebarCollapseState | null>(null)

export function useSidebarCollapseContext(): SidebarCollapseState {
  const ctx = useContext(SidebarCollapseContext)
  if (!ctx) {
    // Fallback for tests or stand-alone Sidebar mounts — own a private instance.
    // Production paths always have the Provider mounted inside PageShell.
    throw new Error('useSidebarCollapseContext must be used within a SidebarCollapseContext.Provider')
  }
  return ctx
}
