# Streetwise

<div align="center">
  <img src="/public/showcase.png" alt="Streetwise App" width="300" />

  **The Waze for safe walking, built on community reports and public safety data.**

  Make every walk safer with real-time community alerts and intelligent route planning.
</div>

## What is Streetwise?

Streetwise is a PWA designed to make walking in cities safer. It works like **Waze for pedestrians**, helping users plan routes that avoid risky areas and prioritize safer streets that are well-lit, busy, and accessible.

## Key Features

- **Smart Route Planning** - Choose between fastest or safest routes with real-time safety scoring
- **Community Reporting** - Report incidents in real-time to alert others of potential dangers
- **Safety Scoring** - Routes scored from 1-10 based on recent incidents, lighting, and police proximity
- **Offline-Ready PWA** - Install on your phone and use even with limited connectivity
- **Public Safety Data** - Integrates police stations, street lighting, and public safety infrastructure

## How It Works

1. **Enter Your Destination** - Search for where you want to go
2. **Get Route Options** - See both fastest and safest routes with safety scores
3. **Navigate Safely** - Real-time guidance avoiding reported incidents
4. **Report & Help Others** - Mark unsafe areas to protect your community

## Tech Stack

- **Frontend Framework:** Next.js 15 (App Router)
- **Styling:** TailwindCSS
- **Maps:** Mapbox GL JS
- **PWA:** next-pwa
- **Database:** Supabase (PostgreSQL + PostGIS)
- **UI Components:** ShadCN/ui
- **Icons:** Lucide React
- **Forms:** react-hook-form + Zod validation
- **Animations:** Framer Motion
- **TypeScript:** Full type safety
- **Package Manager:** pnpm

## Mission

Streetwise aims to build the **first pedestrian safety network**, creating a community of users who look out for one another. By crowdsourcing street safety information and combining it with public data, we're making every city walk safer, more transparent, and more connected.

Built by young people for young people, Streetwise is completely **free to use**, with all features accessible to everyone.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Mapbox API key
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/Owusu1946/streetwise.git
cd streetwise

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add your Mapbox and Supabase credentials

# Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Safety Algorithm

Our intelligent routing system calculates safety scores based on:
- Recent incident reports (crowdsourced)
- Proximity to police stations
- Street lighting data
- Time of day
- Historical safety patterns

Routes with safety scores below 7/10 automatically generate alternative waypoints to avoid dangerous areas.
