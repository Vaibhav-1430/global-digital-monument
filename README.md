# Global Digital Monument — Phase 1: Cinematic 3D Earth Website

> **"One Planet. Millions of Stories. Leave Your Light on Earth."**

An immersive, cinematic web application where people across the globe leave a permanent glowing light on a living 3D Earth, creating a collective monument to human connection, individuality, and our shared home.

Built with **Next.js 16**, **React 19**, **Three.js**, **React Three Fiber (`@react-three/fiber`)**, **`@react-three/drei`**, and the user's authentic **`earth.glb`** 3D model, styled according to the **Stitch MCP `Aetheria Nocturne`** design system.

---

## 🚀 Key Features

### 1. Real 3D `earth.glb` Model
- Renders the actual `earth.glb` 3D model with its embedded 8K (8192 × 4096) high-resolution photographic texture.
- Natural continents, lush landmasses, mountain ridges, and cloud swirls.
- Physical directional sunlight illumination and an ethereal Rayleigh atmospheric rim shader (`#7DD3FC`).
- Transparent WebGL canvas: no black rectangles, frames, or image placeholders. The Earth floats seamlessly in deep space.

### 2. Cinematic 5-Scene Opening Sequence
- **Scene A (Darkness)**: Screen starts in deep space void (`#030407`). Distant stars fade in with gentle twinkling.
- **Scene B (Atmosphere)**: Delicate blue atmospheric halo emerges.
- **Scene C (Earth Reveal)**: The 3D Earth model gently scales into view with smooth opacity and lighting transitions.
- **Scene D (Living Planet)**: Earth begins continuous, slow planetary rotation.
- **Scene E (Minimal Interface)**: Editorial brand header, minimal headline, and primary CTA fade in cleanly without obscuring the planet.
- **Interruptible**: Click anywhere or press *"SKIP REVEAL"* to access the interactive experience immediately.

### 3. Interactive 3D Controls
- **Continuous Idle Rotation**: Slow, majestic rotation around Earth's axis.
- **Interactive Drag & Zoom**: Orbit controls with smooth damping. Automatic rotation pauses during manual interaction and resumes with gentle easing when idle.
- **Zoom Clamping**: Prevents clipping into or losing the Earth.
- **Responsive**: Adapts dynamically across desktop, tablet, and mobile (390px) viewports.

### 4. Golden Light Beacons
- Sample contributors rendered as glowing golden beacons attached to exact geographic coordinates on Earth's surface.
- Clicking any beacon smoothly brings the location toward the viewer and opens a compact glassmorphic profile card.

### 5. "Add Your Light" Contribution Flow
- Multi-step modal:
  1. **Amount Selection**: Preset options (**₹10**, **₹25**, **₹35**, **₹55**, **₹100**) or custom amount.
  2. **Location Selection**: Click directly on the 3D Earth, choose a major world city, or request browser geolocation.
  3. **Dedication Story**: Contributor name (or anonymous toggle), personal message, and optional image tribute.
  4. **Review & Clear Demo Notice**: Clearly identifies this as a simulated monument demonstration with no real payment charged.
- **Cinematic Ignition Animation**:
  - Camera swoops to the contributor's location.
  - A golden point blooms into a radiant beacon on Earth.
  - Expanding shockwave energy rings and dispersing radiant particles.
  - Confirmation overlay: *"YOUR LIGHT IS NOW PART OF OUR WORLD — One more light. One shared planet."*
  - The new light is immediately attached to the living 3D Earth and increments the global count.

### 6. Leaderboard & About Overlays
- **Leaderboard** (*THE BRIGHTEST LIGHTS*): Top 3 podium with gold crown, silver, and bronze badges, followed by a ranked list with `₹` currency formatting and direct view-on-globe buttons.
- **About** (*ONE PLANET. MANY STORIES.*): Core monument philosophy and the Three Guiding Principles.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **3D Graphics**: Three.js, React Three Fiber (`@react-three/fiber`), `@react-three/drei`
- **3D Model**: `earth.glb` (8K photographic texture, normalized bounding geometry)
- **Styling**: Tailwind CSS v4 + Vanilla CSS glassmorphism & keyframes
- **Design Reference**: Stitch MCP `Aetheria Nocturne` Design System
- **Icons**: Lucide React

---

## 📦 How to Run

1. Navigate to the project root:
   ```bash
   cd d:/Projects/Something
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

To run a production build:
```bash
npm run build
npm run start
```
*(Verified: TypeScript compiles with 0 errors and Next.js creates an optimized static bundle in 1.4s)*.

---

## 📂 Project Structure

```
├── earth.glb                  # Source 3D Earth model
├── public/
│   ├── earth.glb              # Standard PBR glTF 2.0 model
│   └── earth_diffuse.jpg      # Extracted 8K (8192x4096) photographic Earth texture
├── src/
│   ├── app/
│   │   ├── globals.css        # Space tokens (#030407, #FFC857, #7DD3FC), glassmorphism
│   │   ├── layout.tsx         # Typography (Inter & Outfit), metadata
│   │   └── page.tsx           # Dynamic client entry point (SSR safe)
│   ├── components/
│   │   ├── EarthCanvas.tsx    # Three.js / R3F Canvas loading earth.glb & golden markers
│   │   ├── EarthExperience.tsx# 5-scene opening sequence and experience orchestrator
│   │   ├── SpaceBackground.tsx# HTML5 Canvas starry sky with gentle twinkling
│   │   ├── AtmosphericRim.tsx # Subtle celestial emergence aura
│   │   ├── SiteHeader.tsx     # Minimal editorial header & navigation triggers
│   │   ├── HeroContent.tsx    # Minimal headline, supporting copy, single CTA
│   │   ├── SelectedMarkerCard.tsx # Contributor profile & dedication card (₹ currency)
│   │   ├── AddYourLightFlow.tsx   # 4-step modal (₹10, ₹25, ₹35, ₹55, ₹100, custom)
│   │   ├── LightIgnition.tsx  # Blooming beacon, shockwaves, and confirmation overlay
│   │   ├── LeaderboardOverlay.tsx # "THE BRIGHTEST LIGHTS" podium and ranked list
│   │   └── AboutOverlay.tsx   # "ONE PLANET. MANY STORIES." manifesto
│   ├── data/
│   │   └── demoData.ts        # Sample global contributors and metrics
│   └── types/
│       └── index.ts           # TypeScript interfaces
└── package.json
```
