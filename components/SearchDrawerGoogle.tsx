'use client'

import { useState, useEffect, useRef } from 'react'
import { Drawer } from 'vaul'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, MapPin, Loader2 } from 'lucide-react'
import { getAutocompleteSuggestions, getPlaceDetails, generateSessionToken } from '@/utils/googlemaps'
import { getRecentSearches, addRecentSearch, RecentSearch } from '@/utils/recentSearches'

interface SearchDrawerGoogleProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSelectDestination: (place: any) => void
    currentMapCenter: { lng: number; lat: number }
    onRequestLocation?: () => Promise<[number, number]>
}

export default function SearchDrawerGoogle({
    open,
    onOpenChange,
    onSelectDestination,
    currentMapCenter,
    onRequestLocation,
}: SearchDrawerGoogleProps) {
    const [query, setQuery] = useState('')
    const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
    const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [sessionToken, setSessionToken] = useState('')
    const searchTimeout = useRef<NodeJS.Timeout | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null)
    const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null)
    const placesContainerRef = useRef<HTMLDivElement>(null)

    // Initialize services when drawer opens
    useEffect(() => {
        if (open && typeof google !== 'undefined') {
            setSessionToken(generateSessionToken())
            setRecentSearches(getRecentSearches())
            setQuery('')
            setSuggestions([])

            // Initialize Google Places services
            if (!autocompleteServiceRef.current) {
                autocompleteServiceRef.current = new google.maps.places.AutocompleteService()
            }

            // Create a dummy element for PlacesService (required)
            if (!placesServiceRef.current && placesContainerRef.current) {
                placesServiceRef.current = new google.maps.places.PlacesService(placesContainerRef.current)
            }

            // Request location permission when opening search
            if (onRequestLocation) {
                onRequestLocation().catch((error) => {
                    console.log('Location permission not granted:', error)
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
            if (autocompleteServiceRef.current) {
                const location = new google.maps.LatLng(currentMapCenter.lat, currentMapCenter.lng)
                const results = await getAutocompleteSuggestions(
                    searchQuery,
                    autocompleteServiceRef.current,
                    location
                )
                setSuggestions(results)
            }
            setIsSearching(false)
        }, 500)
    }

    // Handle selecting a suggestion
    const handleSelectSuggestion = async (suggestion: google.maps.places.AutocompletePrediction) => {
        setIsSearching(true)

        try {
            // Ensure PlacesService is initialized
            if (!placesServiceRef.current && placesContainerRef.current) {
                placesServiceRef.current = new google.maps.places.PlacesService(placesContainerRef.current)
            }

            if (!placesServiceRef.current) {
                // Fallback: create a temporary map element for PlacesService
                const tempDiv = document.createElement('div')
                document.body.appendChild(tempDiv)
                placesServiceRef.current = new google.maps.places.PlacesService(tempDiv)
                // Clean up after a short delay
                setTimeout(() => {
                    if (tempDiv.parentNode) {
                        tempDiv.parentNode.removeChild(tempDiv)
                    }
                }, 1000)
            }

            const placeDetails = await getPlaceDetails(suggestion.place_id, placesServiceRef.current)

            if (placeDetails && placeDetails.geometry?.location) {
                const place = {
                    text: placeDetails.name || suggestion.structured_formatting.main_text,
                    place_name: placeDetails.formatted_address || suggestion.description,
                    center: [
                        placeDetails.geometry.location.lng(),
                        placeDetails.geometry.location.lat(),
                    ] as [number, number],
                }

                // Save to recent searches
                addRecentSearch({
                    name: place.text,
                    center: place.center,
                })

                // Pass to parent
                onSelectDestination(place)
                onOpenChange(false)
            } else {
                // Fallback: Use geocoding if place details fail
                console.warn('Place details failed, using fallback coordinates')
                const place = {
                    text: suggestion.structured_formatting.main_text,
                    place_name: suggestion.description,
                    center: [currentMapCenter.lng, currentMapCenter.lat] as [number, number],
                }

                // Try geocoding the address
                const geocoder = new google.maps.Geocoder()
                geocoder.geocode({ address: suggestion.description }, (results, status) => {
                    if (status === 'OK' && results && results[0]?.geometry?.location) {
                        place.center = [
                            results[0].geometry.location.lng(),
                            results[0].geometry.location.lat(),
                        ]
                    }

                    addRecentSearch({
                        name: place.text,
                        center: place.center,
                    })

                    onSelectDestination(place)
                    onOpenChange(false)
                })
            }
        } catch (error) {
            console.error('Error selecting suggestion:', error)
            // Last resort fallback
            const place = {
                text: suggestion.structured_formatting.main_text,
                place_name: suggestion.description,
                center: [currentMapCenter.lng, currentMapCenter.lat] as [number, number],
            }
            onSelectDestination(place)
            onOpenChange(false)
        } finally {
            setIsSearching(false)
        }
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
                    {/* Hidden container for PlacesService */}
                    <div ref={placesContainerRef} style={{ display: 'none' }} />

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
                                            key={suggestion.place_id || index}
                                            className="w-full text-left px-4 py-3 hover:bg-accent bg-card border border-border rounded-xl transition-colors"
                                            onClick={() => handleSelectSuggestion(suggestion)}
                                        >
                                            <div className="flex items-start gap-3">
                                                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                                                <div className="flex-1">
                                                    <p className="text-sm text-foreground font-medium">
                                                        {suggestion.structured_formatting.main_text}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {suggestion.structured_formatting.secondary_text}
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
