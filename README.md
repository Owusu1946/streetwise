# Streetwise 🚶‍♂️🛡️

<div align="center">
  <img src="/public/showcase.png" alt="Streetwise App" width="300" />

  **The Waze for safe walking, built on community reports and public safety data.**

  Make every walk safer with real-time community alerts and intelligent route planning.

  [![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://streetwise.vercel.app)
  [![Next.js](https://img.shields.io/badge/Next.js-15.5-black)](https://nextjs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://typescriptlang.org)
</div>

---

## ✨ What is Streetwise?

Streetwise is a Progressive Web App (PWA) designed to make walking in cities safer. It works like **Waze for pedestrians**, helping users plan routes that avoid risky areas and prioritize safer streets that are well-lit, busy, and have nearby police presence.

---

## 🚀 Key Features

### 🗺️ Smart Navigation
- **Intelligent Route Planning** - Choose between fastest or safest routes with real-time safety scoring
- **Turn-by-Turn Navigation** - Voice-ready step-by-step directions with maneuver icons
- **Live Location Tracking** - Continuous GPS tracking with smooth marker updates
- **Progress Bar & Speed Display** - See journey completion % and current speed (Walking/Jogging/Cycling/Driving)
- **3D Map Mode** - Tilted view for better spatial awareness
- **Satellite View Toggle** - Switch between standard and satellite map views

### 🚨 Safety Features
- **Community Incident Reporting** - Report dangers in real-time to alert others
- **Safety Scoring (1-10)** - Routes scored based on incidents, lighting, and police proximity
- **Danger Zone Avoidance** - Automatic alternative route generation avoiding high-risk areas
- **Police Station Markers** - See nearby police stations on the map
- **Street Lighting Data** - Route scoring includes street light coverage analysis

### 🚌 Troski Mode (Ghana)
- **Public Transport Routes** - Find Trotro/shared minibus routes to your destination
- **Community-Contributed Routes** - Add and share local transport routes
- **Smart Boarding Points** - Find the closest stop to reduce walking distance
- **Fare Estimates** - See expected fares for each journey

### 🆘 Emergency Features
- **SOS Button** - Quick access to emergency actions
- **Navigate to Police** - One-tap routing to nearest police station
- **Fake Call** - Simulate incoming call to escape uncomfortable situations
- **Emergency Contacts** - Quick dial to emergency services

### 🌤️ Additional Features
- **Weather Widget** - Current conditions for your location
- **Dark/Light Mode** - Automatic theme switching
- **Offline-Ready PWA** - Install on your phone for native app experience
- **Recent Searches** - Quick access to frequently visited places

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | TailwindCSS |
| **Maps** | Google Maps JavaScript API |
| **Database** | Supabase (PostgreSQL + PostGIS) |
| **PWA** | next-pwa |
| **UI Components** | ShadCN/ui, Radix UI |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Forms** | react-hook-form + Zod |
| **Package Manager** | pnpm |

---

## 🧮 Safety Algorithm

Our intelligent routing system calculates safety scores based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Incident Reports** | High | Recent community-reported dangers along route |
| **Police Proximity** | Medium | Nearby police stations provide safety bonus |
| **Street Lighting** | Medium | Well-lit routes score higher |
| **Time of Day** | Variable | Night routes weighted more carefully |
| **Historical Data** | Low | Past incident patterns inform scoring |

Routes scoring below **7/10** automatically trigger alternative route generation that avoids identified danger clusters.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- Google Maps API Key (with Places, Directions, Geocoding APIs enabled)
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
```

### Environment Variables

```env
# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_google_maps_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Weather (optional)
NEXT_PUBLIC_OPENWEATHER_API_KEY=your_openweather_key
```

### Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Build for Production

```bash
pnpm build
pnpm start
```

---

## 📱 PWA Installation

Streetwise is a Progressive Web App that can be installed on your device:

1. Visit the app in Chrome/Safari
2. Click "Install" button or use browser menu
3. Add to home screen for native app experience
4. Works offline with cached data

---

## 🗄️ Database Schema

The app uses Supabase with PostGIS extension for geospatial queries:

- `incidents` - Community-reported safety incidents
- `police_stations` - Police station locations
- `street_lights` - Street lighting data (with `count_lights_along_route` function)
- `troski_routes` - Public transport routes
- `troski_stops` - Transport stop locations

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for more information.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 🎯 Mission

Streetwise aims to build the **first pedestrian safety network**, creating a community of users who look out for one another. By crowdsourcing street safety information and combining it with public data, we're making every city walk safer, more transparent, and more connected.

Built by young people for young people, Streetwise is completely **free to use**, with all features accessible to everyone.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p>Built with ❤️ in Ghana 🇬🇭</p>
  <p>
    <a href="https://github.com/Owusu1946">@Owusu1946</a>
  </p>
</div>