// Type for recent search item
export interface RecentSearch {
  name: string
  center: [number, number]
}

const STORAGE_KEY = 'streetwise_recent_searches'
const MAX_RECENT_SEARCHES = 10

// Get recent searches from localStorage
export const getRecentSearches = (): RecentSearch[] => {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Error reading recent searches:', error)
    return []
  }
}

// Add a new search to recent searches
export const addRecentSearch = (search: RecentSearch): void => {
  if (typeof window === 'undefined') return

  try {
    const current = getRecentSearches()

    // Remove duplicate if exists (same name)
    const filtered = current.filter((item) => item.name !== search.name)

    // Add new search at the beginning
    const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES)

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error saving recent search:', error)
  }
}

// Clear all recent searches
export const clearRecentSearches = (): void => {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Error clearing recent searches:', error)
  }
}
