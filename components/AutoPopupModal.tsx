'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useState } from 'react'
import { toast } from 'sonner'

interface AutoPopupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userLocation?: [number, number] | null
}

export function AutoPopupModal({ open, onOpenChange, userLocation }: AutoPopupModalProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email) {
      toast.error('Please enter your email')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/early-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          feedback: 'Auto-popup signup', // Mark as auto-popup signup
          location: userLocation
            ? {
                latitude: userLocation[1],
                longitude: userLocation[0],
              }
            : null,
          timestamp: new Date().toISOString(),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit')
      }

      toast.success('Thank you! 💜', {
        description: "We'll notify you when the app launches",
      })

      // Mark as shown in localStorage
      localStorage.setItem('streetwise_popup_shown', 'true')

      // Reset form and close modal
      setEmail('')
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting:', error)
      toast.error('Failed to submit', {
        description: 'Please try again later',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    // Mark as shown even if they just close it
    localStorage.setItem('streetwise_popup_shown', 'true')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Thanks for trying the prototype!</DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-2">
            Leave your email below if you want to be notified once the app launches. Your support
            means a lot and helps promote safer urban spaces for women. 💜
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isSubmitting}
              className="w-full"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Notify Me When It Launches'}
          </Button>
          <button
            type="button"
            onClick={handleClose}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Maybe later
          </button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
