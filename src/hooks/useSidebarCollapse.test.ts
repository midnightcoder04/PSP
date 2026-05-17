import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSidebarCollapse } from './useSidebarCollapse'

const STORAGE_KEY = 'psp:sidebar:collapsed'

describe('useSidebarCollapse', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('defaults to false when storage is empty', () => {
    const { result } = renderHook(() => useSidebarCollapse())
    expect(result.current.collapsed).toBe(false)
  })

  it('hydrates collapsed=true from localStorage', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true')
    const { result } = renderHook(() => useSidebarCollapse())
    expect(result.current.collapsed).toBe(true)
  })

  it('toggles state and writes back to localStorage', () => {
    const { result } = renderHook(() => useSidebarCollapse())
    expect(result.current.collapsed).toBe(false)
    act(() => result.current.toggle())
    expect(result.current.collapsed).toBe(true)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true')
    act(() => result.current.toggle())
    expect(result.current.collapsed).toBe(false)
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('false')
  })

  it('setCollapsed sets the state directly', () => {
    const { result } = renderHook(() => useSidebarCollapse())
    act(() => result.current.setCollapsed(true))
    expect(result.current.collapsed).toBe(true)
    act(() => result.current.setCollapsed(false))
    expect(result.current.collapsed).toBe(false)
  })

  it('treats corrupted localStorage value as false', () => {
    window.localStorage.setItem(STORAGE_KEY, 'garbage')
    const { result } = renderHook(() => useSidebarCollapse())
    expect(result.current.collapsed).toBe(false)
  })

  it('does not throw when localStorage.getItem throws (private mode)', () => {
    const orig = Storage.prototype.getItem
    Storage.prototype.getItem = vi.fn(() => {
      throw new Error('SecurityError')
    })
    try {
      const { result } = renderHook(() => useSidebarCollapse())
      expect(result.current.collapsed).toBe(false)
    } finally {
      Storage.prototype.getItem = orig
    }
  })
})
