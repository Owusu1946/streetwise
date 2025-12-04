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
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { toast } from 'sonner'

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userLocation?: [number, number] | null
}

export function FeedbackModal({ open, onOpenChange, userLocation }: FeedbackModalProps) {
  const [email, setEmail] = useState('')
  const [feedback, setFeedback] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !feedback) {
      toast.error('Please fill in all fields')
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
          feedback,
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
        throw new Error('Failed to submit feedback')
      }

      toast.success('Thanks for your feedback! 🎉', {
        description: "We'll notify you on the v1.0",
      })

      // Reset form and close modal
      setEmail('')
      setFeedback('')
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      toast.error('Failed to submit feedback', {
        description: 'Please try again later',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Get Early Access</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Be among the first to use Streetwise to enhance your daily commutes.
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
          <div className="space-y-2">
            <Label htmlFor="feedback">What would make you use Streetwise daily?</Label>
            <Textarea
              id="feedback"
              placeholder="Tell us what features matter most to you..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
              disabled={isSubmitting}
              className="min-h-[100px] resize-none"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Get Early Access'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
