# 🕵️ Metro Police: AI-Powered Visual Mystery Game

<div align="center">

![Metro Police Banner](https://img.shields.io/badge/BRIA_FIBO-Powered-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)

**An immersive detective game where every visual is dynamically generated using BRIA FIBO's JSON-native structured prompts.**

[🎮 Live Demo](https://metro-police-game.vercel.app) • [📹 Demo Video](#demo-video) • [🚀 Getting Started](#getting-started) • [🔧 FIBO Integration](#bria-fibo-integration) • [💻 GitHub](https://github.com/gnyselcuk/Metro_police_game)

</div>

---

## 🎯 Hackathon Submission

**Category: Best JSON-Native or Agentic Workflow**

This project demonstrates an innovative **agentic workflow** where:
1. An LLM (Game Master AI) interprets player actions in natural language
2. The AI generates **structured FIBO JSON prompts** based on narrative context
3. BRIA FIBO creates **contextually-aware visuals** that match the story
4. Visual consistency is maintained through seed tracking and style persistence

This creates a **fully dynamic visual storytelling experience** where no two playthroughs look the same, yet maintain artistic coherence.

---

## 🌟 Features

### 🎬 Dynamic Visual Generation
Every scene, character portrait, and evidence close-up is generated in real-time using BRIA FIBO's structured prompt API. The system automatically selects:
- **Camera angles** based on player actions (wide shot for exploration, macro for inspection)
- **Lighting conditions** that match the narrative mood
- **Composition** that emphasizes story-relevant elements

### 🤖 Agentic Workflow Architecture
```
Player Input → LLM Analysis → FIBO JSON Generation → Visual Rendering
     ↓              ↓                  ↓                    ↓
"examine the    Determines      Creates structured    16:9 cinematic
 coffee cup"    macro shot      prompt with deep      image with
                is needed       DOF, 100mm lens       shallow focus
```

### 🎮 Rich Gameplay Mechanics
- **Investigation Board**: Connect evidence and suspects with yarn strings
- **Lab Analysis**: Send items for forensic analysis
- **Character Dialogues**: Interrogate suspects with AI-driven conversations
- **Dynamic Locations**: Visit improvised locations not in the original scenario

### 🎨 Film Noir Aesthetic
All visuals maintain a consistent **film noir** style with:
- High contrast lighting
- Dramatic shadows
- Muted color palette with strategic highlights
- Cinematic compositions

---

## 🔧 BRIA FIBO Integration

### Core Implementation

The heart of our FIBO integration is in [`src/app/actions.ts`](src/app/actions.ts):

```typescript
export async function generateFiboImage(
    visuals: Record<string, any>,
    seed?: number,
    aspect_ratio: string = "16:9"
) {
    const requestBody = {
        structured_prompt: JSON.stringify(visuals),
        aspect_ratio: aspect_ratio,
        steps_num: 50,           // Maximum quality
        text_guidance_scale: 7.5 // Strong prompt adherence
    };
    
    const response = await fetch('https://engine.prod.bria-api.com/v2/image/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api_token': process.env.FIBO_API_KEY
        },
        body: JSON.stringify(requestBody)
    });
    // ... polling for async generation
}
```

### Structured Prompt Schema

We leverage FIBO's **complete JSON schema** for precise visual control:

```json
{
  "short_description": "Extreme close-up macro shot of a coffee cup with suspicious residue",
  "context": "Crime scene evidence examination, detective noir atmosphere",
  "objects": [
    {
      "name": "Coffee Cup",
      "description": "White ceramic coffee cup with dark residue at the bottom",
      "relationship": "Primary focus of the forensic examination",
      "location": "center",
      "relative_size": "large within frame",
      "shape_and_color": "White ceramic, circular rim, dark brown residue",
      "texture": "Smooth glazed ceramic with dried liquid stains",
      "appearance_details": "Lipstick mark on rim, suspicious crystalline residue"
    }
  ],
  "background_setting": "Dark mahogany desk surface with scattered papers",
  "lighting": {
    "conditions": "Harsh forensic examination lighting",
    "direction": "Overhead spotlight with side fill",
    "shadows": "Sharp shadows emphasizing texture and depth"
  },
  "aesthetics": {
    "composition": "Extreme close-up, rule of thirds, shallow depth of field",
    "color_scheme": "High contrast, muted browns with white ceramic accent",
    "mood_atmosphere": "Tense, investigative, noir"
  },
  "photographic_characteristics": {
    "depth_of_field": "Very shallow - object razor-sharp, background completely blurred",
    "focus": "Coffee residue and rim details",
    "camera_angle": "Slight high angle, looking down into cup",
    "lens_focal_length": "Macro 100mm"
  },
  "style_medium": "noir photograph",
  "artistic_style": "Film noir, forensic photography"
}
```

### Action-Aware Camera Logic

The LLM automatically adjusts FIBO parameters based on player intent:

| Player Action | Lens | Depth of Field | Composition |
|---------------|------|----------------|-------------|
| "look around", "enter room" | Standard 50mm | Medium | Wide establishing shot |
| "examine X", "inspect X" | Macro 100mm | Very shallow | Extreme close-up |
| "look under X", "check behind" | Wide 24mm | Deep | Low/Dutch angle |
| "talk to X" | Portrait 85mm | Shallow | Medium close-up |

### Visual Consistency System

We maintain visual coherence across the game session:

```typescript
// Track last 10 generated visuals for style reference
const visualHistory = gameState.visualHistory.slice(-10);

// Include in LLM context for consistency
const systemPrompt = `
  RECENT VISUAL CONTEXT (For consistency):
  ${JSON.stringify(visualHistory)}
  
  Maintain the same:
  - artistic_style
  - lighting.conditions  
  - aesthetics.color_scheme
`;
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- BRIA API Key ([Get one here](https://bria.ai))
- OpenRouter API Key (for LLM)

### Installation

```bash
# Clone the repository
git clone https://github.com/gnyselcuk/Metro_police_game.git
cd Metro_police_game

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file:

```env
FIBO_API_KEY=your_bria_api_key_here
OPENROUTER_API_KEY=your_openrouter_key_here
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

### Building for Production

```bash
npm run build
npm start
```

---

## 🎮 How to Play

1. **Login**: Enter your detective name to access the system
2. **Select a Case**: Choose "The Silent Office" from available cases
3. **Investigate**: Type natural language commands like:
   - `"Look around the office"`
   - `"Examine the coffee cup closely"`
   - `"Talk to Marcus Thorne"`
   - `"Go to the break room"`
   - `"Analyze the glass vial in the lab"`
4. **Collect Evidence**: Items are automatically added to your inventory
5. **Build Your Case**: Use the Investigation Board to connect clues
6. **Solve the Mystery**: Accuse the right suspect with proper evidence

---

## 📹 Demo Video

[![Metro Police Demo](https://img.shields.io/badge/YouTube-Watch_Demo-red?style=for-the-badge&logo=youtube)](https://youtu.be/6iqH_nJ2UjI)

> 🎬 **3-minute demo** showing complete gameplay flow, BRIA FIBO integration, and dynamic visual generation.
>
> [▶️ Watch on YouTube](https://youtu.be/6iqH_nJ2UjI)

---

## 🏗️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js 16)                    │
├─────────────────────────────────────────────────────────────────┤
│  MainMenu.tsx  │  GameLayout.tsx  │  SceneDisplay.tsx           │
│  CityMap.tsx   │  InvestigationBoard.tsx  │  LogStream.tsx      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Server Actions (actions.ts)                 │
├─────────────────────────────────────────────────────────────────┤
│  processAction()     │  Generate narrative + FIBO visuals       │
│  processDialogue()   │  Character conversations                 │
│  analyzeEvidence()   │  Lab report generation                   │
│  generateFiboImage() │  BRIA API integration                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
┌──────────────────────────┐  ┌──────────────────────────┐
│   OpenRouter (LLM)       │  │   BRIA FIBO API          │
│   DeepSeek R1            │  │   JSON-Native Gen        │
│   - Story narration      │  │   - Scene generation     │
│   - FIBO JSON creation   │  │   - Character portraits  │
│   - Action interpretation│  │   - Evidence close-ups   │
└──────────────────────────┘  └──────────────────────────┘
```

---

## 📁 Project Structure

```
detective-noir/
├── src/
│   ├── app/
│   │   ├── actions.ts       # Server actions + FIBO integration
│   │   ├── page.tsx         # Main entry point
│   │   └── globals.css      # Global styles
│   ├── components/
│   │   └── game/
│   │       ├── GameLayout.tsx         # Main game interface
│   │       ├── SceneDisplay.tsx       # FIBO-generated visuals
│   │       ├── InvestigationBoard.tsx # Evidence board
│   │       ├── CityMap.tsx            # Location navigation
│   │       └── MainMenu.tsx           # Login & case selection
│   ├── data/
│   │   └── cases/
│   │       └── case_001.json  # Scenario with FIBO visual schemas
│   ├── lib/
│   │   ├── store.ts         # Zustand state management
│   │   ├── fibo.ts          # FIBO utility functions
│   │   └── sound.ts         # Audio manager
│   └── types/
│       └── game.ts          # TypeScript definitions
├── public/
│   └── case_001_img/        # Static assets (maps)
└── README.md
```

---

## 🎯 Why This Project for BRIA FIBO?

### 1. **True JSON-Native Implementation**
We don't just use text prompts - every visual is generated from a complete structured JSON schema that controls:
- Object relationships and positioning
- Precise lighting parameters
- Camera characteristics (focal length, DOF, angle)
- Aesthetic consistency (color scheme, mood)

### 2. **Agentic Workflow**
The LLM acts as an intelligent agent that:
- Interprets player intent
- Determines appropriate visual parameters
- Maintains narrative and visual consistency
- Improvises new content while adhering to story constraints

### 3. **Real Production Use Case**
This demonstrates how FIBO can power:
- Interactive fiction and visual novels
- Game development with dynamic assets
- Educational simulations
- Immersive storytelling experiences

### 4. **Controllability Showcase**
Each action type triggers different FIBO parameters, demonstrating the precision control FIBO offers:
- Macro photography for evidence examination
- Wide-angle for environment exploration
- Portrait settings for character encounters
- Dutch angles for tension moments

---

## 🛠️ Built With

- [Next.js 16](https://nextjs.org/) - React Framework
- [BRIA FIBO](https://bria.ai/) - JSON-Native Image Generation
- [OpenRouter](https://openrouter.ai/) - LLM API Gateway
- [Zustand](https://zustand-demo.pmnd.rs/) - State Management
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [Lucide Icons](https://lucide.dev/) - Icon Library
- [Three.js](https://threejs.org/) - 3D Rendering (City Map)

---

## 🙏 Acknowledgments

- **BRIA AI** for the incredible FIBO model and API
- **Devpost** for hosting the hackathon
- The film noir genre for endless inspiration

---

<div align="center">

**Made with 🖤 for the BRIA FIBO Hackathon**

*"In the shadows, the truth always finds a way to shine."*

</div>
