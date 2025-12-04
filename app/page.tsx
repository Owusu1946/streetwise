import { Metadata } from 'next'
import HomePage from './HomePage'

export const metadata: Metadata = {
  title: 'Streetwise - Safe Walking Navigation | Navigate Cities Safely',
  description:
    'Plan safe walking routes with Streetwise. Real-time incident reports, community safety alerts, avoid dangerous areas. The Waze for pedestrians - 100% free.',
  openGraph: {
    title: 'Streetwise - Your Safe Walking Companion',
    description:
      'Join thousands using Streetwise to navigate cities safely. Get real-time alerts, find the safest routes, and contribute to community safety.',
    type: 'website',
  },
}

export default function Page() {
  return <HomePage />
}
