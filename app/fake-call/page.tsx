'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useConversation } from '@elevenlabs/react'
import { PhoneOff, Mic, MicOff, Phone, Video, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Orb } from '@/components/ui/orb'
import { cn } from '@/lib/utils'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

export default function FakeCallPage() {
  const router = useRouter()
  const [callStatus, setCallStatus] = useState<'incoming' | 'connected' | 'ended'>('incoming')
  const [isMuted, setIsMuted] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [agentState, setAgentState] = useState<'thinking' | 'listening' | 'talking' | null>(null)
  const callStartTime = useRef<number | null>(null)
  const durationInterval = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Slide to answer logic
  const dragX = useMotionValue(0)
  const slideOpacity = useTransform(dragX, [0, 200], [1, 0])
  const slideTextOpacity = useTransform(dragX, [0, 150], [1, 0])
  const slideBackgroundOpacity = useTransform(dragX, [0, 200], [0.2, 0])

  const conversation = useConversation({
    onConnect: () => {
      console.log('Connected to ElevenLabs')
      callStartTime.current = Date.now()
      startDurationTimer()
    },
    onDisconnect: () => {
      console.log('Disconnected from ElevenLabs')
      setCallStatus('ended')
      stopDurationTimer()
      router.push('/')
    },
    onError: (error) => {
      console.error('ElevenLabs error:', error)
    },
    onModeChange: ({ mode }) => {
      if (mode === 'speaking') {
        setAgentState('talking')
      } else if (mode === 'listening') {
        setAgentState('listening')
      } else {
        setAgentState(null)
      }
    },
  })

  // Handle ringtone
  useEffect(() => {
    if (callStatus === 'incoming') {
      // Create audio element for ringtone
      audioRef.current = new Audio('/ringtones/default ios.mp3')
      audioRef.current.loop = true
      audioRef.current.play().catch(e => console.log('Audio play failed (user interaction needed):', e))
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [callStatus])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callStatus === 'connected') {
        conversation.endSession()
      }
      stopDurationTimer()
    }
  }, [callStatus])

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

  const handleAnswer = async () => {
    setCallStatus('connected')
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true })
      await conversation.startSession({
        agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
        connectionType: 'webrtc',
      })
    } catch (error) {
      console.error('Failed to start call:', error)
      router.push('/')
    }
  }

  const handleEndCall = async () => {
    if (callStatus === 'connected') {
      await conversation.endSession()
    }
    setCallStatus('ended')
    router.push('/')
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const handleDragEnd = () => {
    if (dragX.get() > 200) {
      handleAnswer()
    } else {
      animate(dragX, 0)
    }
  }

  return (
    <div className="fixed inset-0 bg-black overflow-hidden font-sans">
      {/* Background Image/Blur */}
      <div
        className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-50 blur-xl scale-110"
      />

      {/* Content Container */}
      <div className="relative z-10 h-full flex flex-col px-6 py-12">

        {/* Top Section: Caller Info */}
        <div className="flex flex-col items-center mt-12 space-y-2">
          {callStatus === 'incoming' && (
            <div className="flex items-center gap-2 text-gray-200 mb-2">
              <Phone className="w-4 h-4 fill-current" />
              <span className="text-sm font-medium">Streetwise Audio...</span>
            </div>
          )}
          <h1 className="text-4xl font-semibold text-white tracking-tight">Kenneth</h1>
          {callStatus === 'incoming' ? (
            <p className="text-xl text-white/80">Mobile</p>
          ) : (
            <p className="text-xl text-white/80">{formatDuration(callDuration)}</p>
          )}
        </div>

        {/* Middle Section */}
        <div className="flex-1 flex items-center justify-center">
          {callStatus === 'connected' && (
            <div className="w-72 h-72 relative">
              <Orb
                agentState={agentState}
                getInputVolume={conversation.getInputVolume}
                getOutputVolume={conversation.getOutputVolume}
                colors={['#34C759', '#32ADE6']}
              />
            </div>
          )}
        </div>

        {/* Bottom Section: Controls */}
        <div className="mb-8">
          {callStatus === 'incoming' ? (
            <div className="space-y-20">
              {/* Action Buttons (Remind Me / Message) */}
              <div className="flex justify-between px-4">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs">Message</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <Phone className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs">Remind Me</span>
                </div>
              </div>

              {/* Slide to Answer */}
              <div className="relative w-full max-w-xs mx-auto">
                {/* Slider Track */}
                <div className="relative h-20 rounded-full bg-white/20 backdrop-blur-md overflow-hidden flex items-center px-2">
                  <motion.div
                    style={{ opacity: slideTextOpacity }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <span className="text-white font-medium text-lg shimmer-text">slide to answer</span>
                  </motion.div>

                  {/* Slider Knob */}
                  <motion.div
                    drag="x"
                    dragConstraints={{ left: 0, right: 220 }}
                    dragElastic={0.1}
                    onDragEnd={handleDragEnd}
                    style={{ x: dragX }}
                    className="relative z-10 w-16 h-16 rounded-full bg-white shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
                  >
                    <Phone className="w-8 h-8 text-green-600 fill-current" />
                  </motion.div>
                </div>

                {/* Decline Button (Bottom) */}
                <div className="mt-8 flex justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={() => router.push('/')}
                      className="w-16 h-16 rounded-full bg-red-500/20 backdrop-blur-md flex items-center justify-center hover:bg-red-500/30 transition-colors"
                    >
                      <PhoneOff className="w-8 h-8 text-red-500 fill-current" />
                    </button>
                    <span className="text-white text-xs">Decline</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* In-Call Controls */
            <div className="grid grid-cols-3 gap-x-8 gap-y-8 max-w-sm mx-auto px-4">
              <div className="flex flex-col items-center gap-2">
                <Button variant="ghost" size="icon" onClick={toggleMute} className={cn("w-16 h-16 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 border-0", isMuted && "bg-white text-black hover:bg-white/90")}>
                  {isMuted ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8 text-white" />}
                </Button>
                <span className="text-white text-xs">mute</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button variant="ghost" size="icon" className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 border-0">
                  <div className="grid grid-cols-3 gap-1 w-6 h-6">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className="bg-white rounded-full" />
                    ))}
                  </div>
                </Button>
                <span className="text-white text-xs">keypad</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button variant="ghost" size="icon" className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 border-0">
                  <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center">
                    <div className="w-4 h-2 border-t-2 border-white" />
                  </div>
                </Button>
                <span className="text-white text-xs">audio</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button variant="ghost" size="icon" className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 border-0">
                  <PlusIcon className="w-8 h-8 text-white" />
                </Button>
                <span className="text-white text-xs">add call</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button variant="ghost" size="icon" className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 border-0">
                  <Video className="w-8 h-8 text-white" />
                </Button>
                <span className="text-white text-xs">FaceTime</span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Button variant="ghost" size="icon" className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/30 border-0">
                  <UserIcon className="w-8 h-8 text-white" />
                </Button>
                <span className="text-white text-xs">contacts</span>
              </div>

              {/* End Call Button (Centered in bottom row) */}
              <div className="col-span-3 flex justify-center mt-4">
                <Button
                  onClick={handleEndCall}
                  className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg transition-transform hover:scale-105"
                >
                  <PhoneOff className="w-10 h-10 fill-current" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 1; }
          100% { opacity: 0.5; }
        }
        .shimmer-text {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  )
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
