# FIFA 2026 Seating Pathfinder & Stadium Command Architecture Guide

This document outlines the data-flow patterns, algorithmic coordinate systems, and logical components of the system.

---

## 🎨 1. Vector Canvas Painters (Flutter)

To render maps and stadium seating previews without external SVG overhead, the Flutter application implements custom geometric painters.

### Seating Section Vector Grid
The `StadiumMapPainter` represents the arena as 4 distinct arc segments:
- **North (Sector A)**: Spans \([180^\circ, 270^\circ]\) polar angle.
- **East (Sector B)**: Spans \([270^\circ, 360^\circ]\) polar angle.
- **South (Sector C)**: Spans \([0^\circ, 90^\circ]\) polar angle.
- **West (Sector D)**: Spans \([90^\circ, 180^\circ]\) polar angle.

Gates are painted at discrete entry positions:
- **Gate A (North)**: \((x_c, y_c - r)\)
- **Gate B (East)**: \((x_c + r, y_c)\)
- **Gate C (South)**: \((x_c, y_c + r)\)
- **Gate D (West)**: \((x_c - r, y_c)\)

```text
               Gate A (North)
               
          . - - - - - - - - .
        /                     \
       /   Sector D  Sector A  \
Gate D|     (West)    (North)   | Gate B
(West)|                         | (East)
       \   Sector C  Sector B  /
        \   (South)   (East)  /
          . - - - - - - - - .
          
               Gate C (South)
```

### 3D Field Perspective Projection
The `Pitch3DPainter` generates a 3D isometric representation of the soccer field. It projects 3D spatial points \((X, Y, Z)\) into 2D screen space coordinates \((x', y')\) via perspective scaling:
\[
x' = x_c + X \cdot \text{scale} \cdot \left(1.0 - \frac{Y}{\text{depthFactor}}\right)
\]
\[
y' = y_c + Y \cdot \text{scale} \cdot \text{perspectiveRatio}
\]

This allows the canvas to change field perspective dynamically based on the fan's ticket level:
- **Field Level (Category 1)**: Lower camera altitude ($Z=1.2$, $depthFactor=450$).
- **Club Level (Category 2)**: Medium camera altitude ($Z=3.0$, $depthFactor=600$).
- **Upper Deck (Category 3)**: High camera altitude ($Z=6.5$, $depthFactor=850$).

---

## 🤖 2. Semantic RAG Indexing & Retrieval

The AI chat is powered by a local Retrieval-Augmented Generation (RAG) loop to ensure the agent only outputs verified policies.

```text
Query: "Can I bring a backpack?"
  │
  ├──► [Parser]: Clean query -> Remove stop words -> Tokens: ["bring", "backpack"]
  │
  ├──► [Retriever]: Search stadium_knowledge.json
  │      ├── Keywords Match (e.g., "backpack" in kb-security) -> Score +2.0
  │      └── Content Match (e.g., "bag" in description) -> Score +0.5
  │
  ├──► [Context Synthesizer]: Top-2 chunks formatted as prompt context
  │
  └──► [Gemini 2.5 API]: Generates final answers constrained ONLY to context facts
```

---

## 💻 3. React Operations State Orchestration

The organizer dashboard operates as a Single Page Application (SPA) driven by state hooks:
- **Real-Time Polling**: The page triggers a background poll every 8 seconds querying `/api/matches`, `/api/tickets`, and `/api/admin/incidents`.
- **Speech Synthesis Announcer**: Emergency text is translated using browser Web Speech API (`speechSynthesis`) directly inside the user's browser, preventing server overhead.
