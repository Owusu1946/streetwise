'use client'

import { useEffect, useState, useRef } from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'
import { useMapNavigationGoogle } from '@/components/Map/useMapNavigationGoogle'
import { GOOGLE_MAPS_LIBRARIES } from '@/utils/googlemaps'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const containerStyle = {
    width: '100%',
    height: '100%',
}

const defaultCenter = {
    lat: 5.6037,
    lng: -0.1870,
}

export default function TestLocationPage() {
    const [map, setMap] = useState<google.maps.Map | null>(null)
    const [logs, setLogs] = useState<string[]>([])

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
        libraries: GOOGLE_MAPS_LIBRARIES,
    })

    const {
        userLocation,
        getUserLocation
    } = useMapNavigationGoogle(map)

    // Add log entry
    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString()
        setLogs(prev => [`[${time}] ${msg}`, ...prev].slice(0, 20))
    }

    // Log location updates
    useEffect(() => {
        if (userLocation) {
            addLog(`Location updated: ${userLocation[1].toFixed(6)}, ${userLocation[0].toFixed(6)}`)
        }
    }, [userLocation])

    // Initial load
    const onLoad = (mapInstance: google.maps.Map) => {
        setMap(mapInstance)
        addLog('Map loaded')

        // Try to get initial location
        getUserLocation()
            .then(loc => addLog(`Initial location: ${loc[1]}, ${loc[0]}`))
            .catch(err => addLog(`Error getting location: ${err.message}`))
    }

    if (loadError) return <div>Error loading maps</div>
    if (!isLoaded) return <div>Loading...</div>

    return (
        <div className="relative w-full h-screen flex flex-col">
            {/* Header */}
            <div className="absolute top-4 left-4 z-10">
                <Link href="/">
                    <Button variant="secondary" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to App
                    </Button>
                </Link>
            </div>

            {/* Map */}
            <div className="flex-1">
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={defaultCenter}
                    zoom={15}
                    onLoad={onLoad}
                    options={{
                        disableDefaultUI: false,
                        zoomControl: true,
                    }}
                />
            </div>

            {/* Debug Panel */}
            <Card className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 max-h-[40vh] overflow-hidden flex flex-col p-4 bg-background/90 backdrop-blur">
                <h3 className="font-bold mb-2">Location Debugger</h3>

                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                    <div className="bg-muted p-2 rounded">
                        <span className="text-muted-foreground block text-xs">Latitude</span>
                        <span className="font-mono">{userLocation ? userLocation[1].toFixed(6) : '---'}</span>
                    </div>
                    <div className="bg-muted p-2 rounded">
                        <span className="text-muted-foreground block text-xs">Longitude</span>
                        <span className="font-mono">{userLocation ? userLocation[0].toFixed(6) : '---'}</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-black/5 rounded p-2 font-mono text-xs space-y-1">
                    {logs.length === 0 && <span className="text-muted-foreground">Waiting for updates...</span>}
                    {logs.map((log, i) => (
                        <div key={i} className="border-b border-black/5 pb-1 last:border-0">
                            {log}
                        </div>
                    ))}
                </div>

                <Button
                    className="mt-4 w-full"
                    onClick={() => {
                        addLog('Manual location request triggered')
                        getUserLocation()
                    }}
                >
                    Force Refresh Location
                </Button>
            </Card>
        </div>
    )
}
