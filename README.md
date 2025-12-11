<div align="center">

# Tension

### Visual IDE for Thinking with AI

**We don't build dialogs. We build maps of thoughts.**

[Quick Start](#-quick-start) · [Features](#-features) · [Use Cases](#-use-cases) · [Roadmap](#-roadmap)

</div>

---

## The Problem

Traditional chat interfaces create **tunnel thinking**:

| Chat Interface | Tension |
|----------------|---------|
| Linear message history | **Graph of thoughts** |
| One thread at a time | **Multi-dimensional branching** |
| "Where was that answer?" | **Spatial memory** (left/right/above) |
| Rewrite the prompt | **A/B branches side by side** |
| History = garbage | **History = experiment map** |

---

## The Solution

**Tension** is a local-first, enterprise-grade visual IDE where dialog = graph, not chat.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    ┌──────┐                                                     │
│    │ Root │──┬──► [Branch A] ──► [Deep 1] ──► [Deep 2]         │
│    │ Node │  │                                                  │
│    └──────┘  ├──► [Branch B] ──► [Deep 1]                      │
│              │                                                  │
│              └──► [Branch C] ──► [Deep 1] ──► [Deep 2] ──► ... │
│                                                                 │
│    Your thinking, visualized. Not lost in scroll.              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Who Is This For?

### Research & R&D Teams
- Explore hypotheses visually
- Compare alternative approaches
- Document experiment trails

### Prompt Engineers & AI Architects  
- A/B test prompt variations
- Track what works and what doesn't
- Build prompt libraries spatially

### Content & Narrative Designers
- Branch storylines
- Explore character responses
- Map dialogue trees

---

## ✨ Features

### 🖼️ Infinite Canvas
- Unlimited workspace
- Zoom 25%–200% (Cmd+Scroll)
- Pan with Hand tool or Space+Drag
- Minimap with viewport indicator

### 🧩 Node System
- **Branching:** 1-4 parallel branches per node
- **Deep Levels:** Recursive generation 1-4 levels deep
- **Collapsible:** Long content auto-collapses
- **Drag & Drop:** Organize your thinking spatially

### 🎨 Enterprise Design
- Light/Dark themes
- 100+ Design Tokens
- Lucide icons
- Full keyboard navigation

### 🔒 Local-First Security
- **Your API key stays on your device**
- **No backend servers**
- **No telemetry**
- **Full JSON export/import**

---

## 📖 Use Cases

### Example: Research Session (45 min)

```
1. Create root node with broad question
   └─ "What are the main approaches to X?"

2. Branch 3-4 prompt variations
   ├─ Formal academic tone
   ├─ Practical examples focus  
   ├─ Contrarian perspective
   └─ ELI5 version

3. Pick best branch, go deep (Level 3)
   └─ "Expand on approach #2..."
      └─ "What are the limitations?"
         └─ "How to overcome them?"

4. Result: Visual map of your exploration
   - Dead ends visible (learn from them)
   - Winning paths highlighted
   - Side ideas preserved

5. Export JSON as research artifact
```

### Example: Prompt Engineering

```
1. Root: Base prompt template

2. Branch variations:
   ├─ Different system prompts
   ├─ Few-shot vs zero-shot
   ├─ Temperature experiments
   └─ Format variations (JSON/MD/plain)

3. Compare outputs side-by-side

4. Winner becomes new root for next iteration
```

---

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/your-username/tension.git
cd tension

# Install
npm install

# Run
npm run dev
```

Open http://localhost:5173 → Settings → Enter your OpenAI API key.

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Cursor tool (select/drag nodes) |
| `H` | Hand tool (pan canvas) |
| `Space` | Temporary hand (while held) |
| `Cmd+K` | Command Palette |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+Scroll` | Zoom at cursor |
| `Home` | Center canvas |

---

## 🚀 Roadmap

### Now: v0.9 (Enterprise Beta) ✅
- Infinite canvas with zoom/pan
- Branching & deep levels
- Light/Dark themes
- Undo/Redo, Export/Import
- Minimap, Command Palette

### Next: v1.0 (Q1 2025)
- Multi-select & group operations
- Smart bezier connections
- Search across nodes
- PDF/PNG export

### Future: Legendary Features 🔮

| Feature | Description |
|---------|-------------|
| **Auto-branching** | AI creates multiple thought branches automatically |
| **Agent Mode** | AI explores a topic and builds initial graph for you |
| **Vector Search** | Semantic search across your entire "thinking database" |
| **Multi-provider** | Anthropic, Google, local models |
| **Real-time Collab** | Yjs-powered team workspaces |

**End goal:** Not a chat client. A **knowledge graph** of your AI interactions.

---

## 🔐 Security

```
┌─────────────────────────────────────────────────────┐
│                  YOUR DEVICE                         │
│                                                      │
│  ┌──────────┐         ┌─────────────┐               │
│  │ Tension  │ ◄─────► │  IndexedDB  │               │
│  │  (React) │         │   (Local)   │               │
│  └────┬─────┘         └─────────────┘               │
│       │                                              │
│       │ HTTPS (Direct, no proxy)                    │
│       ▼                                              │
│  ┌──────────┐                                       │
│  │ OpenAI   │  ← API key never leaves your browser │
│  │   API    │                                       │
│  └──────────┘                                       │
└─────────────────────────────────────────────────────┘
```

- **No backend servers** — we don't see your data
- **No telemetry** — we don't track you
- **MIT License** — audit the code yourself

---

## 🏗️ For Contributors

### Architecture: Feature-Sliced Design

```
src/
├── app/          # Entry point, global styles
├── entities/     # Business entities (Node, Canvas, Chat)
├── features/     # Feature modules
├── pages/        # Page components
├── shared/       # Shared utilities, UI, config
└── widgets/      # Composite widgets (Toolbar, Minimap, etc.)
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript 5 |
| Build | Vite 5 |
| Storage | IndexedDB (Dexie.js) |
| Styling | CSS Variables (Design Tokens) |
| Icons | Lucide React |

### Commands

```bash
npm run dev        # Development server
npm run build      # Production build
npm run typecheck  # TypeScript check
```

---

## 📖 Documentation

- **[Project Roadmap](./Развитие_проекта.md)** — Full status and development plan
- **[Ideology](./IDEOLOGY.md)** — Philosophy and design principles

---

## 📄 License

MIT — Use it, fork it, build on it.

---

<div align="center">

**Tension — where thoughts take shape.**

[⬆ Back to top](#tension)

</div>
