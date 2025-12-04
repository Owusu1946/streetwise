'use client'

import { Drawer } from 'vaul'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Bus, Clock, MapPin, Navigation, Search, Wallet } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import type { JourneyResult } from '@/utils/troski'

interface TroskiSearchDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userLocation: [number, number] | null
    onSelectJourney: (journey: JourneyResult) => void
    onQueryChange: (query: string) => void
}

interface PlaceResult {
    id: string
    text: string
    place_name: string
    center: [number, number]
}

export function TroskiSearchDrawer({
    open,
    onOpenChange,
    userLocation,
    onSelectJourney,
    onQueryChange,
}: TroskiSearchDrawerProps) {
    const [query, setQuery] = useState('')
    const [places, setPlaces] = useState<PlaceResult[]>([])
    const [selectedDestination, setSelectedDestination] = useState<PlaceResult | null>(null)
    const [journeys, setJourneys] = useState<JourneyResult[]>([])
    const [loading, setLoading] = useState(false)
    const [searchingJourneys, setSearchingJourneys] = useState(false)

    // Search places using Mapbox Geocoding
    const searchPlaces = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 2) {
            setPlaces([])
            return
        }

        setLoading(true)
        try {
            const proximity = userLocation ? `&proximity=${userLocation[0]},${userLocation[1]}` : ''
            const response = await fetch(
                `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&country=gh&limit=5${proximity}`
            )
            const data = await response.json()

            if (data.features) {
                setPlaces(
                    data.features.map((f: any) => ({
                        id: f.id,
                        text: f.text,
                        place_name: f.place_name,
                        center: f.center,
                    }))
                )
            }
        } catch (error) {
            console.error('Error searching places:', error)
        } finally {
            setLoading(false)
        }
    }, [userLocation])

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            searchPlaces(query)
        }, 300)

        return () => clearTimeout(timer)
    }, [query, searchPlaces])

    // Search for journeys when destination is selected
    const searchJourneys = async (destination: PlaceResult) => {
        if (!userLocation) {
            const { toast } = await import('sonner')
            toast.error('Please enable location access to find routes')
            return
        }

        setSearchingJourneys(true)
        setSelectedDestination(destination)
        onQueryChange(destination.text)

        try {
            const response = await fetch('/api/troski/find-journey', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin_lat: userLocation[1],
                    origin_lng: userLocation[0],
                    dest_lat: destination.center[1],
                    dest_lng: destination.center[0],
                    search_radius: 2000,
                }),
            })

            const data = await response.json()

            if (data.journeys) {
                setJourneys(data.journeys)
            } else {
                setJourneys([])
            }
        } catch (error) {
            console.error('Error finding journeys:', error)
            setJourneys([])
        } finally {
            setSearchingJourneys(false)
        }
    }

    // Reset state when drawer closes
    useEffect(() => {
        if (!open) {
            setQuery('')
            setPlaces([])
            setSelectedDestination(null)
            setJourneys([])
        }
    }, [open])

    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[20px] bg-card max-h-[85vh]">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted my-4" />

                    <div className="px-4 pb-6 flex-1 overflow-y-auto">
                        <Drawer.Title className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Bus className="h-5 w-5 text-emerald-500" />
                            Find Troski Route
                        </Drawer.Title>

                        {/* Search input */}
                        <div className="relative mb-4">
                            <Input
                                type="text"
                                placeholder="Where do you want to go?"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full h-12 pl-10 pr-4 text-base"
                                autoFocus
                            />
                            <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
                        </div>

                        {/* Place results */}
                        {!selectedDestination && places.length > 0 && (
                            <div className="space-y-2 mb-4">
                                <p className="text-xs text-muted-foreground uppercase tracking-wide">Destinations</p>
                                {places.map((place) => (
                                    <button
                                        key={place.id}
                                        onClick={() => searchJourneys(place)}
                                        className="w-full p-3 rounded-xl bg-background hover:bg-muted transition-colors text-left flex items-start gap-3"
                                    >
                                        <MapPin className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{place.text}</p>
                                            <p className="text-xs text-muted-foreground truncate">{place.place_name}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Loading state */}
                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                            </div>
                        )}

                        {/* Selected destination and journey results */}
                        {selectedDestination && (
                            <div className="space-y-4">
                                {/* Selected destination header */}
                                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="h-5 w-5 text-emerald-500" />
                                        <div>
                                            <p className="font-medium text-sm">{selectedDestination.text}</p>
                                            <p className="text-xs text-muted-foreground">Destination</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedDestination(null)
                                            setJourneys([])
                                            setQuery('')
                                            onQueryChange('')
                                        }}
                                    >
                                        Change
                                    </Button>
                                </div>

                                {/* Journey results */}
                                {searchingJourneys ? (
                                    <div className="flex flex-col items-center justify-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3" />
                                        <p className="text-sm text-muted-foreground">Finding routes...</p>
                                    </div>
                                ) : journeys.length > 0 ? (
                                    <div className="space-y-3">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                                            {journeys.length} route{journeys.length !== 1 ? 's' : ''} found
                                        </p>
                                        {journeys.map((journey, index) => (
                                            <button
                                                key={journey.route.id}
                                                onClick={() => onSelectJourney(journey)}
                                                className="w-full p-4 rounded-xl bg-background hover:bg-muted transition-colors text-left border border-border"
                                            >
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                            <Bus className="h-4 w-4 text-emerald-500" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-sm">Route {index + 1}</p>
                                                            <p className="text-xs text-muted-foreground">
                                                                {journey.stops.length} stop{journey.stops.length !== 1 ? 's' : ''}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        {journey.route.total_fare && (
                                                            <div className="flex items-center gap-1 text-emerald-600">
                                                                <Wallet className="h-3.5 w-3.5" />
                                                                <span className="text-sm font-medium">GH₵{journey.route.total_fare}</span>
                                                            </div>
                                                        )}
                                                        {journey.route.estimated_duration && (
                                                            <div className="flex items-center gap-1 text-muted-foreground mt-1">
                                                                <Clock className="h-3 w-3" />
                                                                <span className="text-xs">{journey.route.estimated_duration} min</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Route preview */}
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="font-medium text-foreground">{journey.route.origin_name}</span>
                                                    <span>→</span>
                                                    {journey.stops.slice(0, 2).map((stop, i) => (
                                                        <span key={stop.id}>
                                                            {stop.stop_name}
                                                            {i < Math.min(journey.stops.length - 1, 1) && ' → '}
                                                        </span>
                                                    ))}
                                                    {journey.stops.length > 2 && (
                                                        <span>+{journey.stops.length - 2} more</span>
                                                    )}
                                                    <span>→</span>
                                                    <span className="font-medium text-foreground">{journey.route.destination_name}</span>
                                                </div>

                                                {/* Usage indicator */}
                                                {journey.route.usage_count > 1 && (
                                                    <div className="mt-2 flex items-center gap-1.5">
                                                        <Navigation className="h-3 w-3 text-emerald-500" />
                                                        <span className="text-xs text-muted-foreground">
                                                            Used by {journey.route.usage_count} travelers
                                                        </span>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Bus className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                        <p className="text-sm text-muted-foreground">No routes found for this destination</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Be the first to contribute a route!
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Empty state */}
                        {!loading && !selectedDestination && places.length === 0 && query.length === 0 && (
                            <div className="text-center py-8">
                                <Bus className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">
                                    Enter a destination to find troski routes
                                </p>
                            </div>
                        )}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
