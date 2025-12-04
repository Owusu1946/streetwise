import { Providers } from '@/components/providers'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#6366f1',
}

export const metadata: Metadata = {
  title: 'Streetwise - Safe Walking Navigation | The Waze for Pedestrians',
  description:
    'Navigate cities safely with Streetwise, the Waze for pedestrians. Get safe walking routes, avoid dangerous areas, report incidents in real-time, and join our pedestrian safety network. Free safe route planner.',
  keywords:
    'safe walking routes, pedestrian safety, walking navigation, street safety app, safe route planner, urban safety, Waze for pedestrians, walking directions, personal safety app, community safety, avoid dangerous areas, safe streets, walking app, pedestrian navigation, city safety',
  authors: [{ name: 'Streetwise' }],
  creator: 'Streetwise',
  publisher: 'Streetwise',
  applicationName: 'Streetwise',
  referrer: 'origin-when-cross-origin',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  alternates: {
    canonical: 'https://street-wise.app',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://street-wise.app',
    title: 'Streetwise - Safe Walking Navigation | The Waze for Pedestrians',
    description:
      'Navigate cities safely with real-time community reports. Get the safest walking routes, avoid dangerous areas, and join the first pedestrian safety network. 100% free.',
    siteName: 'Streetwise',
    images: [
      {
        url: '/showcase.png',
        width: 1200,
        height: 630,
        alt: 'Streetwise - Safe Walking Navigation App',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Streetwise - Safe Walking Navigation',
    description:
      'The Waze for safe walking. Navigate cities safely with real-time community reports and intelligent route planning.',
    images: ['/showcase.png'],
    creator: '@streetwise_app',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Streetwise',
    startupImage: [
      {
        url: '/splash.png',
        media:
          '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/logo-mobile-streetwise.png', type: 'image/png' },
    ],
    shortcut: '/logo-mobile-streetwise.png',
    apple: '/logo-mobile-streetwise.png',
  },
  category: 'navigation',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          defer
          data-website-id="dfid_38SdmQHrjWXnPGAFW4z4i"
          data-domain="street-wise.app"
          src="https://datafa.st/js/script.js"
        ></script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'MobileApplication',
              name: 'Streetwise',
              applicationCategory: 'TravelApplication',
              operatingSystem: 'Any',
              description:
                'Navigate cities safely with Streetwise, the Waze for pedestrians. Get safe walking routes, avoid dangerous areas, report incidents in real-time.',
              url: 'https://street-wise.app',
              image: 'https://street-wise.app/showcase.png',
              screenshot: 'https://street-wise.app/showcase.png',
              author: {
                '@type': 'Organization',
                name: 'Streetwise',
                url: 'https://street-wise.app',
              },
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '2450',
                bestRating: '5',
                worstRating: '1',
              },
              potentialAction: {
                '@type': 'ViewAction',
                target: 'https://street-wise.app',
                name: 'Use Streetwise Web App',
              },
              featureList: [
                'Safe walking routes',
                'Real-time incident reporting',
                'Community safety alerts',
                'Avoid dangerous areas',
                'Police station locations',
                'Well-lit street information',
                'Intelligent route planning',
                'Free to use',
              ],
              keywords:
                'safe walking, pedestrian safety, walking navigation, street safety, urban safety, Waze for pedestrians',
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              url: 'https://street-wise.app',
              name: 'Streetwise',
              description: 'The Waze for safe walking - Navigate cities safely',
              publisher: {
                '@type': 'Organization',
                name: 'Streetwise',
                logo: {
                  '@type': 'ImageObject',
                  url: 'https://street-wise.app/logo-mobile-streetwise.png',
                },
              },
            }),
          }}
        />
      </head>
      <Analytics />
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
