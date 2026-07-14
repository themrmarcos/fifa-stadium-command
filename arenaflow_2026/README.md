# ArenaFlow 2026: FIFA World Cup Stadium Operations & Fan Companion

ArenaFlow 2026 is a premium, GenAI-enabled stadium operations command center and fan companion application designed for the FIFA World Cup 2026. Built with rich aesthetics, glassmorphic dark mode styling, and dynamic SVG mapping, the application enhances stadium operations and fan experience.

## 🌟 Key Features

### 1. Multilingual GenAI Fan Assistant
- **AI Chatbot**: Simulates standard natural language questions regarding accessibility, gate wait times, local transport, and stadium amenities.
- **Multilingual Support**: Supports 5 languages (English, Spanish, French, Portuguese, German) with real-time dynamic switching.
- **Context Awareness**: Connects directly with active operations states (e.g. alerts fans of train delays or gate congestion and suggests routes).

### 2. Interactive Live Stadium Heatmap
- **Visual Sectors**: Scalable SVG layout showing real-time crowd occupancy rates across sectors (North, South, East, West).
- **Gate Monitor**: Clicking Gates on the map automatically queries the AI chatbot for queue analysis.
- **Amenities Filter**: Toggle overlays for elevators, toilets, medical bays, and concessions.

### 3. GenAI Operations Triage Engine
- **Natural Language Incident Report**: Organizers and staff type alerts in plain text (e.g. "a slip in Sector East").
- **GenAI Classification**: Triages severity (LOW, MEDIUM, HIGH), assigns categories, dispatches nearest volunteer squad, and suggests safety checklist actions.
- **Incidents Queue**: Actively tracks and resolves incidents in real time.

### 4. GenAI Multilingual Broadcast Generator
- **Voiceover Translators**: Translates emergency or informational alerts into English, Spanish, and French based on plain text input.
- **Actual Speech Synthesis**: Connects to the browser's Web Speech API (`speechSynthesis`) to read out generated broadcasts with natural voices (simulating stadium announcements).

### 5. Sustainability Hub
- **Eco Points Tracker**: Rewards fans for sorting recycling, simulating real-world gamification.
- **Carbon Offset Counter**: Calculates carbon savings based on actions.

---

## 🛠️ Technology Stack
- **Structure**: Vanilla HTML5 (Semantic elements, inline SVG maps).
- **Styling**: Vanilla CSS3 (Glassmorphism, custom CSS variables, keyframe animations, Outfit google typography, Font Awesome icons).
- **Logic**: Vanilla ES6+ Javascript (State management, browser Text-to-Speech API, AI triage classifier parser).
- **Zero Dependencies**: Fully self-contained. Runs instantly in any browser without needing `npm install` or node servers.

---

## 🚀 How to Run & Verify

1. **Locate Files**:
   - `index.html` - Base layout skeleton.
   - `style.css` - Custom styling theme.
   - `app.js` - Dynamic JS simulation.
2. **Open in Browser**:
   - Simply double click `index.html` or run a local server:
     ```bash
     npx serve .
     ```
   - Then open `http://localhost:3000` (or the printed port).
3. **Simulate Stadium Bottlenecks**:
   - Switch to **Operations Command** tab in the header.
   - Click **Simulate Gate B Surges (Bottleneck)**. Observe:
     - Map Gate B turns pulsing red.
     - Crowd density KPI spikes to 92%.
     - AI chatbot warns fans and suggests alternatives.
     - A new dispatch incident is triaged automatically.
4. **Try Custom Broadcasts**:
   - Type a prompt in the broadcast section: `"lightning forecast, seek shelter in concourses"`.
   - Click **Generate Multilingual Broadcasts**.
   - Click **Play Announcement** to hear actual browser-synthesized audio read in English, Spanish, or French.
