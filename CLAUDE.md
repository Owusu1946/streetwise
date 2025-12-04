<aside>
❓

**The Waze for safe walking, built on community reports and public safety data.**

</aside>

- Context
    
    Streetwise is an pwa designed to make walking in cities safer.
    
    It works like a **“Waze for pedestrians”**, helping users plan routes that avoid risky areas—such as places reported for harassment, pickpocketing, or general feelings of insecurity—and instead prioritises safer streets that are well-lit, busy, and accessible.
    
    With Streetwise, users can:
    
    - **Report incidents in real time** to alert others of potential dangers in their area.
    - **Access intelligent route suggestions** powered by an AI system that constantly updates maps and directions based on recent alerts and real-time movement data.
    
    The mission of Streetwise is to build the **first pedestrian safety network**, creating a community of users who look out for one another.
    
    By crowdsourcing information about street safety and combining it with public data (lighting, accessibility, local authorities, etc.), Streetwise aims to make every city walk safer, more transparent, and more connected.
    
    Built by young people for young people, Streetwise is completely **free to use**, with all features accessible to everyone.
    
    Its goal is simple: **empower citizens to take back control of their safety** through collective awareness, smart technology, and solidarity.
    

- MVP
    
    ## 🧱 Technical requirements
    
    For the MVP, we won’t have a user account system.
    
    We just need one page. Only one.
    
    ### 1. **Frontend**
    
    **Tech stack:** Next.js 15 (App Router), TailwindCSS, Mapbox GL JS, next-pwa
    
    **Tasks:**
    
    - [ ]  Set up Next.js + TailwindCSS + Mapbox (API key)
    - [ ]  Create the interactive map component
    - [ ]  Add user geolocation (`navigator.geolocation`)
    - [ ]  Build the UI:
        - [ ]  Input fields for start/destination
        - [ ]  “Safest route” button
        - [ ]  “Report an incident” button (modal with auto coordinates)
    - [ ]  Enable PWA (`next-pwa`) → installable icon on mobile
    - [ ]  Marker UI (red zones, police stations, etc.)
    
    ---
    
    ### 2. **Backend**
    
    **Tech stack:** Node.js (Next.js API routes), Supabase (PostgreSQL + PostGIS)
    
    **Tasks:**
    
    - [ ]  Create tables:
        - `reports` (id, lat, lng, type, date, user_id)
        - `safe_points` (police stations, lighted areas)
    - [ ]  Endpoint `/api/report` → POST/GET for reports
    - [ ]  Endpoint `/api/safe-route` → compute weighted path (see algorithm below)
    - [ ]  Supabase Auth (optional for MVP, use anonymous user ID at first)
    
    ---
    
    ### 3. **Safe route algorithm**
    
    **Base:** Google Maps Directions API or Mapbox Directions API
    
    **Simplified heuristic:**
    
    - [ ]  Get the raw route
    - [ ]  For each segment, find incidents within 100m radius
    - [ ]  Apply a score:
        
        ```
        score = distance + (danger_reports * 50) - (police_proximity * 20)
        
        ```
        
    - [ ]  Return the “lightest” (lowest-weight) route
    
    ---
    
    ### 4. **Database (Supabase)**
    
    - [ ]  Set up Supabase project + `reports` and `safe_points` tables
    - [ ]  Store geolocation as `geometry(Point, 4326)`
    - [ ]  Add public API to fetch recent reports (<7 days)
    
    ---
    
    ### 5. **Public data**
    
    **Optional but strong UX bonus:**
    
    - [ ]  Import city open data (police stations, streetlights, cameras)
    - [ ]  Example:
        - https://data.gov.gh/ (Ghana Open Data Initiative)
        - https://africaopendata.org/country/ghana
    - [ ]  Parse these into `safe_points` to display on the map
    
    ---
    
    ### 6. **Community reporting**
    
    - [ ]  Simple form (category + optional comment)
    - [ ]  POST to `/api/report`
    - [ ]  Display on the map with red markers
    - [ ]  Allow reporting of multiple types:
        - assault / harassment
        - poorly lit street
        - suspicious group
    
    ---
    
    ### 7. **Deployment**
    
    - [ ]  Deploy frontend + backend on **Vercel**
    - [ ]  Connect Supabase via `.env.local`
    - [ ]  Generate `manifest.json` (PWA)
    - [ ]  Test on mobile Chrome/Safari (installability + GPS)
    
    ---
    
    ### 8. **Optional (if you have time or for your pitch)**
    
    - [ ]  Auto night mode
    - [ ]  Global safety score (heatmap)
    - [ ]  Community badges for frequent reporters
    - [ ]  Push notifications (when danger is reported nearby)
    
    ---
    
    ### ✅ Ultra-short summary of key features
    
    | Feature | Type | Priority |
    | --- | --- | --- |
    | Interactive map (Mapbox) | Core | 🔥 |
    | Route search | Core | 🔥 |
    | Community reporting | Core | 🔥 |
    | Safe route calculation | Core | 🔥 |
    | Installable PWA | Tech | ⚡ |
    | Supabase DB + API | Infra | ⚡ |
    | Police stations + lighting | Bonus | 🌙 |
    | Night mode & heatmap | Bonus | 🌙 |
- Competitor
    
    https://walksafe.io/
    
    https://safestway.co.uk/
    
    https://www.safe-place.fr/
    
