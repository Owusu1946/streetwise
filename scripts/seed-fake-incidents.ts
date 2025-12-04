/**
 * Script to seed fake incident data for Accra neighborhoods
 * Run with: DOTENV_CONFIG_PATH=.env.local pnpm tsx scripts/seed-fake-incidents.ts
 */

import 'dotenv/config'
import { getIncidentSeverity } from '../config/config'
import { supabaseAdmin } from '../utils/supabase-admin'

// Define Accra (Ghana) risky zones with their approximate coordinates
const RISKY_ZONES = {
  nima: {
    name: 'Nima',
    // Bounding box around Nima neighborhood
    bounds: {
      minLat: 5.588,
      maxLat: 5.598,
      minLng: -0.207,
      maxLng: -0.197,
    },
  },
  jamestown: {
    name: 'Jamestown',
    // Bounding box around Jamestown (old town area)
    bounds: {
      minLat: 5.529,
      maxLat: 5.539,
      minLng: -0.217,
      maxLng: -0.207,
    },
  },
  madina: {
    name: 'Madina',
    // Bounding box around Madina market area
    bounds: {
      minLat: 5.674,
      maxLat: 5.684,
      minLng: -0.173,
      maxLng: -0.163,
    },
  },
  agbogbloshie: {
    name: 'Agbogbloshie',
    // Bounding box around Agbogbloshie market
    bounds: {
      minLat: 5.548,
      maxLat: 5.558,
      minLng: -0.237,
      maxLng: -0.227,
    },
  },
  chorkor: {
    name: 'Chorkor',
    // Bounding box around Chorkor
    bounds: {
      minLat: 5.544,
      maxLat: 5.554,
      minLng: -0.255,
      maxLng: -0.245,
    },
  },
  bukom: {
    name: 'Bukom',
    // Bounding box around Bukom
    bounds: {
      minLat: 5.536,
      maxLat: 5.546,
      minLng: -0.224,
      maxLng: -0.214,
    },
  },
  nungua: {
    name: 'Nungua',
    // Bounding box around Nungua
    bounds: {
      minLat: 5.600,
      maxLat: 5.610,
      minLng: -0.087,
      maxLng: -0.077,
    },
  },
  dansoman: {
    name: 'Dansoman',
    // Bounding box around Dansoman
    bounds: {
      minLat: 5.553,
      maxLat: 5.563,
      minLng: -0.290,
      maxLng: -0.280,
    },
  },
  kotobabi: {
    name: 'Kotobabi',
    // Bounding box around Kotobabi
    bounds: {
      minLat: 5.595,
      maxLat: 5.605,
      minLng: -0.225,
      maxLng: -0.215,
    },
  },
  ashaiman: {
    name: 'Ashaiman',
    // Bounding box around Ashaiman
    bounds: {
      minLat: 5.690,
      maxLat: 5.700,
      minLng: -0.038,
      maxLng: -0.028,
    },
  },
}

// Accra city bounds (approximate)
const CITY_BOUNDS = {
  minLat: 5.520,
  maxLat: 5.720,
  minLng: -0.300,
  maxLng: 0.020,
} // or LIBREVILLE_BOUNDS

// Incident types with their likelihood in these neighborhoods
const INCIDENT_TYPES = [
  { type: 'harassment', weight: 15 },
  { type: 'aggressive', weight: 12 },
  { type: 'pickpocket', weight: 20 },
  { type: 'suspicious', weight: 18 },
  { type: 'vandalism', weight: 10 },
  { type: 'protest', weight: 5 },
  { type: 'insecurity', weight: 10 },
  { type: 'passage', weight: 5 },
  { type: 'poorlight', weight: 5 },
]

// Helper function to generate random coordinate within bounds
function randomCoordinate(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

// Helper function to get random incident type based on weights
function getRandomIncidentType(): string {
  const totalWeight = INCIDENT_TYPES.reduce((sum, item) => sum + item.weight, 0)
  let random = Math.random() * totalWeight

  for (const item of INCIDENT_TYPES) {
    random -= item.weight
    if (random <= 0) {
      return item.type
    }
  }

  return INCIDENT_TYPES[0].type
}

// Helper function to generate random date within last 30 days
function randomDateWithinLast30Days(): Date {
  const now = new Date()
  const daysAgo = Math.random() * 30 // Random number between 0-30 days
  const past = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)
  return past
}

// Generate incidents for a neighborhood
function generateIncidentsForNeighborhood(
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  count: number
) {
  const incidents = []

  for (let i = 0; i < count; i++) {
    const type = getRandomIncidentType()
    const latitude = randomCoordinate(bounds.minLat, bounds.maxLat)
    const longitude = randomCoordinate(bounds.minLng, bounds.maxLng)
    const severity = getIncidentSeverity(type)

    // Generate date within last 30 days
    const createdAt = randomDateWithinLast30Days()

    incidents.push({
      type,
      latitude,
      longitude,
      severity,
      created_at: createdAt.toISOString(),
    })
  }

  return incidents
}

async function seedIncidents() {
  console.log('🌱 Starting to seed fake incident data for Paris...\n')

  const TOTAL_INCIDENTS = 400
  const RISKY_ZONE_PERCENTAGE = 0.4 // 40% in risky zones
  const SPREAD_PERCENTAGE = 0.6 // 60% spread across Paris

  const riskyZoneIncidents = Math.floor(TOTAL_INCIDENTS * RISKY_ZONE_PERCENTAGE) // 80 incidents
  const spreadIncidents = Math.floor(TOTAL_INCIDENTS * SPREAD_PERCENTAGE) // 120 incidents

  const allIncidents = []

  console.log(
    `📊 Distribution: ${riskyZoneIncidents} in risky zones, ${spreadIncidents} spread across Paris\n`
  )

  // Generate incidents for risky zones (5-10 per zone)
  const zones = Object.values(RISKY_ZONES)
  const incidentsPerZone = Math.floor(riskyZoneIncidents / zones.length)

  for (const zone of zones) {
    // Randomize between 5-10 incidents per zone, but ensure we use all allocated incidents
    const zoneIndex = zones.indexOf(zone)
    const isLastZone = zoneIndex === zones.length - 1

    let count
    if (isLastZone) {
      // For the last zone, use all remaining incidents to reach exactly riskyZoneIncidents
      const usedIncidents = zones.slice(0, zoneIndex).reduce((sum, z, i) => {
        return sum + Math.min(10, Math.max(5, incidentsPerZone + Math.floor(Math.random() * 3 - 1)))
      }, 0)
      count = riskyZoneIncidents - allIncidents.filter((i) => !i.isSpread).length
    } else {
      count = Math.min(10, Math.max(5, incidentsPerZone + Math.floor(Math.random() * 3 - 1)))
    }

    console.log(`📍 Generating ${count} incidents for ${zone.name}...`)
    const incidents = generateIncidentsForNeighborhood(zone.bounds, count)
    allIncidents.push(...incidents.map((i) => ({ ...i, isSpread: false })))
  }

  // Generate incidents spread across the entire city
  console.log(`\n🌍 Generating ${spreadIncidents} incidents spread across the city...`)
  const cityWideIncidents = generateIncidentsForNeighborhood(CITY_BOUNDS, spreadIncidents)
  allIncidents.push(...cityWideIncidents.map((i) => ({ ...i, isSpread: true })))

  console.log(`\n✨ Generated ${allIncidents.length} total incidents`)
  console.log('💾 Inserting into database...\n')

  // Insert in batches of 50 to avoid overwhelming the database
  const batchSize = 50
  let insertedCount = 0

  // Remove the isSpread property before inserting
  const incidentsToInsert = allIncidents.map(({ isSpread, ...incident }) => incident)

  for (let i = 0; i < incidentsToInsert.length; i += batchSize) {
    const batch = incidentsToInsert.slice(i, i + batchSize)

    const { error } = await supabaseAdmin.from('incidents').insert(batch)

    if (error) {
      console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error)
      process.exit(1)
    }

    insertedCount += batch.length
    console.log(`✅ Inserted ${insertedCount}/${incidentsToInsert.length} incidents`)
  }

  console.log('\n🎉 Successfully seeded all fake incidents!')
  console.log('\nIncident type distribution:')

  // Show distribution of incident types
  const typeCounts: Record<string, number> = {}
  incidentsToInsert.forEach((incident) => {
    typeCounts[incident.type] = (typeCounts[incident.type] || 0) + 1
  })

  Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })
}

// Run the seed function
seedIncidents()
  .then(() => {
    console.log('\n✨ Seeding completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  })
