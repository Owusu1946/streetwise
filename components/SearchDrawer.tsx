'use client'

import { useState, useEffect, useRef } from 'react'
import { Drawer } from 'vaul'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, MapPin, Loader2 } from 'lucide-react'
import { getSuggestions, retrieveFeature, generateSessionToken } from '@/utils/mapbox'
import { getRecentSearches, addRecentSearch, RecentSearch } from '@/utils/recentSearches'

interface SearchDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectDestination: (place: any) => void
  currentMapCenter: { lng: number; lat: number }
  onRequestLocation?: () => Promise<[number, number]>
}

export default function SearchDrawer({
  open,
  onOpenChange,
  onSelectDestination,
  currentMapCenter,
  onRequestLocation,
}: SearchDrawerProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [sessionToken, setSessionToken] = useState('')
  const searchTimeout = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize session token and load recent searches when drawer opens
  useEffect(() => {
    if (open) {
      setSessionToken(generateSessionToken())
      setRecentSearches(getRecentSearches())
      setQuery('')
      setSuggestions([])

      // Request location permission when opening search
      if (onRequestLocation) {
        onRequestLocation().catch((error) => {
          console.log('Location permission not granted:', error)
          // Silently fail - user can still search without location
        })
      }

      // Focus the input after drawer animation completes
      setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
    }
  }, [open, onRequestLocation])

  // Debounced search handler
  const handleSearch = async (searchQuery: string) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current)
    }

    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    searchTimeout.current = setTimeout(async () => {
      const results = await getSuggestions(searchQuery, sessionToken, currentMapCenter)
      setSuggestions(results)
      setIsSearching(false)
    }, 500)
  }

  // Handle selecting a suggestion
  const handleSelectSuggestion = async (suggestion: any) => {
    setIsSearching(true)

    // Retrieve full feature details
    const feature = await retrieveFeature(suggestion.mapbox_id, sessionToken)

    if (feature) {
      const place = {
        text: feature.properties.name,
        place_name: feature.properties.full_address || feature.properties.place_formatted,
        center: feature.geometry.coordinates,
      }

      // Save to recent searches
      addRecentSearch({
        name: feature.properties.name,
        center: feature.geometry.coordinates,
      })

      // Pass to parent
      onSelectDestination(place)
      onOpenChange(false)
    }

    setIsSearching(false)
  }

  // Handle selecting a recent search
  const handleSelectRecent = (recent: RecentSearch) => {
    const place = {
      text: recent.name,
      place_name: recent.name,
      center: recent.center,
    }

    onSelectDestination(place)
    onOpenChange(false)
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} modal={true}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 z-50" />
        <Drawer.Content className="fixed inset-0 flex flex-col bg-background z-50">
          {/* Header with safe area padding */}
          <div
            className="flex items-center gap-4 p-4 pt-safe border-b border-border shrink-0"
            style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}
          >
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <Drawer.Title asChild>
              <h2 className="text-lg font-semibold text-foreground flex-1">Plan your route</h2>
            </Drawer.Title>
          </div>

          {/* Content - scrollable area */}
          <div className="flex-1 overflow-y-auto">
            <div
              className="p-4 space-y-4"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
              {/*Starting point
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">From</label>
                <div className="relative">
                  <div className="h-12 flex items-center pl-12 pr-4 bg-muted/50 text-foreground border border-border rounded-xl">
                    <span className="text-base">
                      {userLocation ? 'Your current location' : 'Current map location'}
                    </span>
                  </div>
                  <Navigation className="absolute left-4 top-3.5 h-5 w-5 text-primary" />
                </div>
              </div>*/}

              {/* Destination input */}
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    ref={inputRef}
                    type="text"
                    placeholder="Search for a place..."
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      handleSearch(e.target.value)
                    }}
                    className="h-12 text-base pl-12 pr-4 bg-card text-foreground placeholder-muted-foreground border border-border rounded-xl"
                  />
                  <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                </div>
              </div>

              {/* Loading indicator */}
              {isSearching && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}

              {/* Search results */}
              {!isSearching && query.length >= 3 && suggestions.length > 0 && (
                <div className="space-y-1">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      className="w-full text-left px-4 py-3 hover:bg-accent bg-card border border-border rounded-xl transition-colors"
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm text-foreground font-medium">{suggestion.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {suggestion.place_formatted}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* No results message */}
              {!isSearching && query.length >= 3 && suggestions.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">No results found</p>
                </div>
              )}

              {/* Recent searches - only show when not searching and no query */}
              {!query && recentSearches.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Recent searches</h3>
                  <div className="space-y-1">
                    {recentSearches.map((recent, index) => (
                      <button
                        key={index}
                        className="w-full text-left px-4 py-3 hover:bg-accent bg-card/50 rounded-xl transition-colors"
                        onClick={() => handleSelectRecent(recent)}
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{recent.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
