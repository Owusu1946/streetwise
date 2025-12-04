'use client'

import { useState } from 'react'
import Map from '@/components/Map'
import { TroskiMap } from '@/components/TroskiMap'

export default function HomePage() {
    const [mode, setMode] = useState<'safety' | 'troski'>('safety')

    return (
        <div className="h-screen w-screen relative overflow-hidden">
            {mode === 'safety' ? (
                <Map onEnterTroskiMode={() => setMode('troski')} />
            ) : (
                <TroskiMap onExitTroskiMode={() => setMode('safety')} />
            )}
        </div>
    )
}
