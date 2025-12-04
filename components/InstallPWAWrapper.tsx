import dynamic from 'next/dynamic'

// Dynamic import with SSR disabled to avoid hydration issues
export const InstallPWAButton = dynamic(
  () => import('./InstallPWA').then((mod) => mod.InstallPWA),
  {
    ssr: false, // Disable server-side rendering for this component
    loading: () => null, // Don't show anything while loading
  }
)
