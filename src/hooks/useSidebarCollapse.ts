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

export interface SidebarCollapseState {
  collapsed: boolean
  toggle: () => void
  setCollapsed: (next: boolean) => void
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed))
    } catch {
      /* swallow — storage may be unavailable in private mode */
    }
  }, [collapsed])

  const toggle = useCallback(() => setCollapsedRaw((c) => !c), [])
  const setCollapsed = useCallback((next: boolean) => setCollapsedRaw(next), [])

  return { collapsed, toggle, setCollapsed }
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
