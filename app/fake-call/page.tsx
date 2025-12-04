'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useConversation } from '@elevenlabs/react'
import { PhoneOff, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Orb } from '@/components/ui/orb'
import { cn } from '@/lib/utils'

export default function FakeCallPage() {
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [agentState, setAgentState] = useState<'thinking' | 'listening' | 'talking' | null>(null)
  const callStartTime = useRef<number | null>(null)
  const durationInterval = useRef<NodeJS.Timeout | null>(null)

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs')
      setIsConnected(true)
      callStartTime.current = Date.now()
      startDurationTimer()
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs')
      setIsConnected(false)
      stopDurationTimer()
      router.push('/')
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error)
    },
    onModeChange: ({ mode }) => {
      // Update agent state based on conversation mode
      if (mode === 'speaking') {
        setAgentState('talking')
      } else if (mode === 'listening') {
        setAgentState('listening')
      } else {
        setAgentState(null)
      }
    },
  })

  // Start the conversation when component mounts
  useEffect(() => {
    const startCall = async () => {
      try {
        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true })

        // Start the conversation
        await conversation.startSession({
          agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
          connectionType: 'webrtc',
        })
      } catch (error) {
        console.error('Failed to start call:', error)
        // If error, go back to main page
        router.push('/')
      }
    }

    startCall()

    // Cleanup on unmount
    return () => {
      if (isConnected) {
        conversation.endSession()
      }
      stopDurationTimer()
    }
  }, [])

  const startDurationTimer = () => {
    durationInterval.current = setInterval(() => {
      if (callStartTime.current) {
        const elapsed = Math.floor((Date.now() - callStartTime.current) / 1000)
        setCallDuration(elapsed)
      }
    }, 1000)
  }

  const stopDurationTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current)
      durationInterval.current = null
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleEndCall = async () => {
    await conversation.endSession()
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    // Note: You might need to implement actual mute functionality
    // depending on ElevenLabs SDK capabilities
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-between p-8 overflow-hidden">
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-between h-full w-full max-w-md">
        {/* Top section */}
        <div className="flex flex-col items-center pt-12">
          <p className="text-white/60 text-sm mb-2">calling...</p>
          <h2 className="text-white text-2xl font-semibold mb-1">Kenneth</h2>
          <p className="text-white/60 text-sm">Mobile 0559182794</p>
        </div>

        {/* Middle section - Animated Orb */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-64 h-64">
            <Orb
              agentState={agentState}
              getInputVolume={conversation.getInputVolume}
              getOutputVolume={conversation.getOutputVolume}
              colors={['#635CFF', '#8B7FFF']}
            />
          </div>
        </div>

        {/* Call duration */}
        <div className="mb-8">
          <p className="text-white text-lg font-mono">
            {isConnected ? formatDuration(callDuration) : 'Connecting...'}
          </p>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-center gap-6 pb-12">
          {/* Mute button */}
          <Button
            onClick={toggleMute}
            variant="outline"
            size="icon"
            className={cn(
              'w-14 h-14 rounded-full border-2 transition-all',
              isMuted
                ? 'bg-white/20 border-white/40 text-white hover:bg-white/30'
                : 'bg-transparent border-white/20 text-white/60 hover:bg-white/10'
            )}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {/* End call button */}
          <Button
            onClick={handleEndCall}
            className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-2xl transition-all hover:scale-105"
          >
            <PhoneOff className="h-8 w-8" />
          </Button>

          {/* Placeholder for symmetry */}
          <div className="w-14 h-14" />
        </div>
      </div>

      {/* Status indicator */}
      {!isConnected && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md rounded-full px-6 py-3">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <p className="text-white/80 text-sm">Connecting to your friend...</p>
          </div>
        </div>
      )}
    </div>
  )
}
