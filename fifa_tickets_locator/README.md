# FIFA 2026 Ticket Booking & Seating Pathfinder

FIFA 2026 Ticket Booking & Seating Pathfinder is an interactive, premium single-page web application designed to help fans browse upcoming World Cup matches, book tickets, manage virtual ticket wallets, scan entrance codes, and locate their exact seats via an animated stadium route map and 3D pitch view preview.

## 🌟 Core Features

### 1. Interactive Ticket Booking
- Browse matches (USA vs. Germany, Mexico vs. Argentina, Canada vs. France, and World Cup Finals).
- Live pricing checkout calculation based on ticket quantities and Categories (Category 1, 2, or 3).
- Generates high-fidelity ticket stub passes upon purchase.

### 2. Digital Wallet & AI Scanner
- Store multiple digital ticket passes.
- High-fidelity ticket stub UI showing flags, dates, names, unique barcodes, and seating sectors.
- **AI Entrance Scanner Simulator**: Toggles a scanner overlay that runs verification checks and speaks entry instructions out loud using the browser's Text-to-Speech API (`speechSynthesis`).

### 3. SVG Route Pathfinder
- Dynamic map path drawing connecting selected Entry Gates (A, B, C, D) to Seating Sectors (North, East, South, West).
- Highlights entry gates and seating sections on map hover and click events.
- Dynamic route dash-array path tracing.

### 4. 3D Seating Angle Preview
- Multi-perspective Canvas rendering engine that draws custom stadium pitch views based on ticket categories:
  - **Category 1 (Field Level)**: Deep perspective, close-up grass gradients, low elevation field-side angle.
  - **Category 2 (Club Level)**: Elevated, balanced view of the pitch outline.
  - **Category 3 (Upper Deck)**: High horizon elevation, zoomed-out bird's-eye pitch display.
- Telemetry readouts showing line-of-sight status, elevation angles, and distance to the pitch in meters.

### 5. Seating Assistant Chatbot
- Multi-keyword chat helper resolving questions about accessible restrooms, concession stands, and elevator checkpoints near the target seating zone.

---

## 🛠️ Technology Stack
- **Structure**: Semantic HTML5, Vector SVGs.
- **Styles**: Vanilla CSS3 (HSL variables, glassmorphic filters, responsive layout grid, dash-array animations).
- **Client Logic**: Vanilla Javascript (State engine, HTML5 Canvas 2D render loops, Web Speech API voices).
- **Zero dependencies**: Double-click `index.html` to run.

---

## 🚀 How to Run & Verify

1. **Locate Files**:
   - `index.html` - Structural layout.
   - `style.css` - Custom styles and animations.
   - `app.js` - Application logic.
2. **Launch App**:
   - Double-click `index.html` in your file explorer to open it directly in your browser.
3. **Verify booking flow**:
   - Select a match (e.g. *Mexico vs. Argentina*).
   - Input a name (e.g. *"Lionel Messi"*), select a Category, and click **Complete Booking**.
   - The app will automatically redirect you to the **My Tickets** tab displaying your newly minted ticket pass.
4. **Verify AI Scanner**:
   - In the **My Tickets** tab, click **Scan & Verify at Stadium Gate**.
   - Watch the laser lines scan.
   - Listen to your computer welcome you and announce entrance directions via Gate C or B!
5. **Verify Pathfinder & 3D view**:
   - In the **Seat Pathfinder** tab, select a ticket and click **Trace Navigation Path**.
   - Watch the SVG draw a neon routing path from your gate to your seating sector.
   - Look at the **3D Seating Angle Preview** canvas: observe how the pitch perspective transforms between Category 1, 2, and 3 views!
