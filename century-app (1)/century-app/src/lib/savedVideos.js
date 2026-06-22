'use client'

const SAVED_VIDEOS_KEY = 'century-saved-items'

export function getSavedVideoItems() {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SAVED_VIDEOS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    window.localStorage.removeItem(SAVED_VIDEOS_KEY)
    return []
  }
}

export function persistSavedVideoItems(items) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SAVED_VIDEOS_KEY, JSON.stringify(items || []))
}

export function isSavedVideoItem(id) {
  return getSavedVideoItems().some((item) => item.id === id)
}

export function addSavedVideoItem(item) {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem(SAVED_VIDEOS_KEY)
  const current = raw ? JSON.parse(raw) : []
  const exists = current.some((entry) => entry.id === item.id)
  if (exists) return current
  const next = [...current, item]
  window.localStorage.setItem(SAVED_VIDEOS_KEY, JSON.stringify(next))
  return next
}

export function removeSavedVideoItem(id) {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(SAVED_VIDEOS_KEY)
  const current = raw ? JSON.parse(raw) : []
  const next = current.filter((entry) => entry.id !== id)
  window.localStorage.setItem(SAVED_VIDEOS_KEY, JSON.stringify(next))
  return next
}
