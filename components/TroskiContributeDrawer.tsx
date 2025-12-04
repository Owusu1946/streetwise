'use client'

import { Drawer } from 'vaul'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Bus, Check, ChevronRight, MapPin, Plus, Trash2, X } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'

interface TroskiContributeDrawerProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    userLocation: [number, number] | null
    onSuccess: () => void
}

interface PlaceResult {
    id: string
    text: string
    place_name: string
    center: [number, number]
}

interface RouteStop {
    id: string
    name: string
    latitude: number
    longitude: number
    type: 'board' | 'alight' | 'transfer'
    description?: string
}

type Step = 'origin' | 'stops' | 'destination' | 'review'

export function TroskiContributeDrawer({
    open,
    onOpenChange,
    userLocation,
    onSuccess,
}: TroskiContributeDrawerProps) {
    const [step, setStep] = useState<Step>('origin')
    const [query, setQuery] = useState('')
    const [places, setPlaces] = useState<PlaceResult[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Route data
    const [origin, setOrigin] = useState<PlaceResult | null>(null)
    const [destination, setDestination] = useState<PlaceResult | null>(null)
    const [stops, setStops] = useState<RouteStop[]>([])
    const [currentStopType, setCurrentStopType] = useState<'board' | 'alight' | 'transfer'>('board')
    const [stopDescription, setStopDescription] = useState('')

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

    // Reset state when drawer closes
    useEffect(() => {
        if (!open) {
            setStep('origin')
            setQuery('')
            setPlaces([])
            setOrigin(null)
            setDestination(null)
            setStops([])
            setCurrentStopType('board')
            setStopDescription('')
        } else if (userLocation && step === 'origin' && !origin) {
            // Automatically set origin to user location when opening
            const setOriginToUserLocation = async () => {
                setLoading(true)
                try {
                    const response = await fetch(
                        `https://api.mapbox.com/geocoding/v5/mapbox.places/${userLocation[0]},${userLocation[1]}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`
                    )
                    const data = await response.json()

                    if (data.features && data.features.length > 0) {
                        const place = data.features[0]
                        const originPlace: PlaceResult = {
                            id: place.id,
                            text: place.text || 'Current Location',
                            place_name: place.place_name || 'Your current location',
                            center: userLocation
                        }
                        setOrigin(originPlace)
                        setStep('stops')
                    }
                } catch (error) {
                    console.error('Error reverse geocoding user location:', error)
                    // Fallback if geocoding fails
                    setOrigin({
                        id: 'current-location',
                        text: 'Current Location',
                        place_name: 'Your current location',
                        center: userLocation
                    })
                    setStep('stops')
                } finally {
                    setLoading(false)
                }
            }

            setOriginToUserLocation()
        }
    }, [open, userLocation, step, origin])

    // Handle place selection based on current step
    const handlePlaceSelect = (place: PlaceResult) => {
        if (step === 'origin') {
            setOrigin(place)
            setStep('stops')
            setQuery('')
            setPlaces([])
        } else if (step === 'stops') {
            // Add as stop
            const newStop: RouteStop = {
                id: `stop-${Date.now()}`,
                name: place.text,
                latitude: place.center[1],
                longitude: place.center[0],
                type: currentStopType,
                description: stopDescription || undefined,
            }
            setStops([...stops, newStop])
            setQuery('')
            setPlaces([])
            setStopDescription('')

            // Cycle through stop types
            if (currentStopType === 'board') {
                setCurrentStopType('alight')
            } else if (currentStopType === 'alight') {
                setCurrentStopType('transfer')
            }
        } else if (step === 'destination') {
            setDestination(place)
            setStep('review')
            setQuery('')
            setPlaces([])
        }
    }

    // Remove a stop
    const removeStop = (stopId: string) => {
        setStops(stops.filter((s) => s.id !== stopId))
    }

    // Submit route
    const submitRoute = async () => {
        if (!origin || !destination || stops.length === 0) {
            const { toast } = await import('sonner')
            toast.error('Please complete all steps')
            return
        }

        setSubmitting(true)

        try {
            const response = await fetch('/api/troski/routes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    origin_name: origin.text,
                    origin_latitude: origin.center[1],
                    origin_longitude: origin.center[0],
                    destination_name: destination.text,
                    destination_latitude: destination.center[1],
                    destination_longitude: destination.center[0],
                    stops: stops.map((s) => ({
                        stop_name: s.name,
                        stop_latitude: s.latitude,
                        stop_longitude: s.longitude,
                        stop_type: s.type,
                        troski_description: s.description,
                    })),
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to submit route')
            }

            onSuccess()
        } catch (error) {
            console.error('Error submitting route:', error)
            const { toast } = await import('sonner')
            toast.error('Failed to submit route. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    // Get step title
    const getStepTitle = () => {
        switch (step) {
            case 'origin':
                return 'Where did you start?'
            case 'stops':
                return 'Add your stops'
            case 'destination':
                return 'Where did you end up?'
            case 'review':
                return 'Review your route'
        }
    }

    // Get step description
    const getStepDescription = () => {
        switch (step) {
            case 'origin':
                return 'Search for your starting point'
            case 'stops':
                return 'Add the troski stops along your journey'
            case 'destination':
                return 'Search for your final destination'
            case 'review':
                return 'Make sure everything looks correct'
        }
    }

    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
                <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[20px] bg-card max-h-[90vh]">
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted my-4" />

                    <div className="px-4 pb-6 flex-1 overflow-y-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <Drawer.Title className="text-xl font-bold flex items-center gap-2">
                                <Bus className="h-5 w-5 text-emerald-500" />
                                Contribute Route
                            </Drawer.Title>

                            {/* Step indicator */}
                            <div className="flex items-center gap-1.5">
                                {['origin', 'stops', 'destination', 'review'].map((s, i) => (
                                    <div
                                        key={s}
                                        className={`w-2 h-2 rounded-full transition-colors ${step === s
                                            ? 'bg-emerald-500'
                                            : ['origin', 'stops', 'destination', 'review'].indexOf(step) > i
                                                ? 'bg-emerald-500/50'
                                                : 'bg-muted'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Step content */}
                        <div className="mb-4">
                            <h3 className="font-semibold text-lg">{getStepTitle()}</h3>
                            <p className="text-sm text-muted-foreground">{getStepDescription()}</p>
                        </div>

                        {/* Origin step */}
                        {step === 'origin' && (
                            <>
                                <div className="relative mb-4">
                                    <Input
                                        type="text"
                                        placeholder="Search for starting point..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="w-full h-12 pl-10 pr-4 text-base"
                                        autoFocus
                                    />
                                    <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-blue-500" />
                                </div>

                                {places.length > 0 && (
                                    <div className="space-y-2">
                                        {places.map((place) => (
                                            <button
                                                key={place.id}
                                                onClick={() => handlePlaceSelect(place)}
                                                className="w-full p-3 rounded-xl bg-background hover:bg-muted transition-colors text-left flex items-start gap-3"
                                            >
                                                <MapPin className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{place.text}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{place.place_name}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Stops step */}
                        {step === 'stops' && (
                            <>
                                {/* Origin display */}
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4">
                                    <MapPin className="h-5 w-5 text-blue-500" />
                                    <div className="flex-1">
                                        <p className="text-xs text-muted-foreground">Starting from</p>
                                        <p className="font-medium text-sm">{origin?.text}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => setStep('origin')}
                                    >
                                        Change
                                    </Button>
                                </div>

                                {/* Added stops */}
                                {stops.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {stops.map((stop, index) => (
                                            <div
                                                key={stop.id}
                                                className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border"
                                            >
                                                <div
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${stop.type === 'board'
                                                        ? 'bg-blue-500'
                                                        : stop.type === 'alight'
                                                            ? 'bg-orange-500'
                                                            : 'bg-purple-500'
                                                        }`}
                                                >
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-sm">{stop.name}</p>
                                                    <p className="text-xs text-muted-foreground capitalize">{stop.type}</p>
                                                </div>
                                                <button
                                                    onClick={() => removeStop(stop.id)}
                                                    className="p-1.5 rounded-full hover:bg-destructive/10 text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Stop type selector */}
                                <div className="flex gap-2 mb-3">
                                    {(['board', 'alight', 'transfer'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setCurrentStopType(type)}
                                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium capitalize transition-colors ${currentStopType === type
                                                ? type === 'board'
                                                    ? 'bg-blue-500 text-white'
                                                    : type === 'alight'
                                                        ? 'bg-orange-500 text-white'
                                                        : 'bg-purple-500 text-white'
                                                : 'bg-muted text-muted-foreground'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>

                                {/* Search for stop */}
                                <div className="relative mb-3">
                                    <Input
                                        type="text"
                                        placeholder={`Add ${currentStopType} stop...`}
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="w-full h-12 pl-10 pr-4 text-base"
                                    />
                                    <Plus className="absolute left-3 top-3.5 h-5 w-5 text-emerald-500" />
                                </div>

                                {/* Optional description */}
                                <Input
                                    type="text"
                                    placeholder="Troski description (e.g., 'Circle-bound troski')"
                                    value={stopDescription}
                                    onChange={(e) => setStopDescription(e.target.value)}
                                    className="w-full h-10 text-sm mb-3"
                                />

                                {places.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        {places.map((place) => (
                                            <button
                                                key={place.id}
                                                onClick={() => handlePlaceSelect(place)}
                                                className="w-full p-3 rounded-xl bg-background hover:bg-muted transition-colors text-left flex items-start gap-3"
                                            >
                                                <Plus className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{place.text}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{place.place_name}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Continue button */}
                                {stops.length > 0 && (
                                    <Button
                                        onClick={() => setStep('destination')}
                                        className="w-full h-12 bg-emerald-500 hover:bg-emerald-600"
                                    >
                                        Continue to Destination
                                        <ChevronRight className="h-4 w-4 ml-2" />
                                    </Button>
                                )}
                            </>
                        )}

                        {/* Destination step */}
                        {step === 'destination' && (
                            <>
                                <div className="relative mb-4">
                                    <Input
                                        type="text"
                                        placeholder="Search for destination..."
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="w-full h-12 pl-10 pr-4 text-base"
                                        autoFocus
                                    />
                                    <MapPin className="absolute left-3 top-3.5 h-5 w-5 text-orange-500" />
                                </div>

                                {places.length > 0 && (
                                    <div className="space-y-2">
                                        {places.map((place) => (
                                            <button
                                                key={place.id}
                                                onClick={() => handlePlaceSelect(place)}
                                                className="w-full p-3 rounded-xl bg-background hover:bg-muted transition-colors text-left flex items-start gap-3"
                                            >
                                                <MapPin className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-sm truncate">{place.text}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{place.place_name}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Back button */}
                                <Button
                                    variant="outline"
                                    onClick={() => setStep('stops')}
                                    className="w-full h-10 mt-4"
                                >
                                    Back to Stops
                                </Button>
                            </>
                        )}

                        {/* Review step */}
                        {step === 'review' && (
                            <>
                                <div className="space-y-3 mb-6">
                                    {/* Origin */}
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                        <MapPin className="h-5 w-5 text-blue-500" />
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">Start</p>
                                            <p className="font-medium text-sm">{origin?.text}</p>
                                        </div>
                                    </div>

                                    {/* Stops */}
                                    {stops.map((stop, index) => (
                                        <div
                                            key={stop.id}
                                            className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border"
                                        >
                                            <div
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${stop.type === 'board'
                                                    ? 'bg-blue-500'
                                                    : stop.type === 'alight'
                                                        ? 'bg-orange-500'
                                                        : 'bg-purple-500'
                                                    }`}
                                            >
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-sm">{stop.name}</p>
                                                <p className="text-xs text-muted-foreground capitalize">
                                                    {stop.type}
                                                    {stop.description && ` • ${stop.description}`}
                                                </p>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Destination */}
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                        <MapPin className="h-5 w-5 text-orange-500" />
                                        <div className="flex-1">
                                            <p className="text-xs text-muted-foreground">End</p>
                                            <p className="font-medium text-sm">{destination?.text}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Submit button */}
                                <Button
                                    onClick={submitRoute}
                                    disabled={submitting}
                                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600"
                                >
                                    {submitting ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                                    ) : (
                                        <>
                                            <Check className="h-5 w-5 mr-2" />
                                            Submit Route
                                        </>
                                    )}
                                </Button>

                                {/* Back button */}
                                <Button
                                    variant="outline"
                                    onClick={() => setStep('destination')}
                                    className="w-full h-10 mt-2"
                                    disabled={submitting}
                                >
                                    Back
                                </Button>
                            </>
                        )}

                        {loading && (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                            </div>
                        )}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    )
}
