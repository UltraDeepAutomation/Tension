# Tension — Onboarding UX Copy

## In-App Text for First-Time Users

---

## Welcome Modal (First Launch)

### Screen 1: Welcome

**Headline:**
Welcome to Tension

**Body:**
Think in graphs, not threads.
Tension lets you explore AI conversations visually — 
branch ideas, compare alternatives, never lose a thought.

**CTA:** Get Started →

---

### Screen 2: Add API Key

**Headline:**
Connect to AI

**Body:**
Enter your OpenAI API key to start.
Your key stays on your device — we never see it.

**Input Label:** OpenAI API Key
**Input Placeholder:** sk-...

**Help Text:**
[How to get an API key](https://platform.openai.com/api-keys)

**CTA:** Save & Continue →

---

### Screen 3: Quick Tour

**Headline:**
Your first exploration

**Step 1:**
Type a question in the **Root Node**.
This is your starting point.

**Step 2:**
Click **▶ Play** to get an AI response.

**Step 3:**
Set **Branches: 2-4** to explore alternatives.
Each branch = a different path.

**Step 4:**
Set **Deep: 2-4** to go deeper automatically.
AI continues the conversation for you.

**CTA:** Start Exploring →

---

## Empty State (No Nodes)

**Headline:**
Your canvas is empty

**Body:**
Start by typing a question in the root node.
Then branch out and explore.

**Hint:**
💡 Try: "What are the main approaches to [your topic]?"

---

## Tooltips

### Root Node
**Title:** Root Node
**Body:** Your starting point. Type your first question here.

### Play Button
**Title:** Generate Response
**Body:** Click to get an AI response. Shortcut: Enter

### Branches Selector
**Title:** Branches
**Body:** Create 1-4 parallel variations. Compare different approaches side by side.

### Deep Level Selector
**Title:** Deep Level
**Body:** Auto-continue 1-4 levels deep. AI keeps exploring for you.

### Minimap
**Title:** Minimap
**Body:** Overview of your canvas. Click to navigate. Use +/- to zoom.

### Hand Tool
**Title:** Hand Tool (H)
**Body:** Drag to pan the canvas. Or hold Space with any tool.

### Cursor Tool
**Title:** Cursor Tool (V)
**Body:** Select and drag nodes. Default tool.

---

## Keyboard Shortcuts Overlay (Cmd+?)

```
┌─────────────────────────────────────────┐
│           Keyboard Shortcuts            │
├─────────────────────────────────────────┤
│                                         │
│  Navigation                             │
│  ─────────                              │
│  V          Cursor tool                 │
│  H          Hand tool                   │
│  Space      Temporary hand (hold)       │
│  Cmd+K      Command palette             │
│  Home       Center canvas               │
│                                         │
│  Zoom                                   │
│  ────                                   │
│  Cmd+Scroll Zoom at cursor              │
│  +/-        Zoom in/out (minimap)       │
│                                         │
│  Edit                                   │
│  ────                                   │
│  Cmd+Z      Undo                        │
│  Cmd+Shift+Z Redo                       │
│  Enter      Play node (when focused)    │
│                                         │
└─────────────────────────────────────────┘
```

---

## Toast Messages

### Success

**Saved**
Changes saved automatically.

**Exported**
Chat exported to tension-export-[date].json

**Imported**
Chat imported successfully. [X] nodes loaded.

### Error

**API Error**
Could not reach OpenAI. Check your API key and connection.

**Invalid File**
This doesn't look like a Tension export file.

**Rate Limited**
Too many requests. Please wait a moment.

### Info

**Tip: Branching**
Try setting Branches to 3 for A/B/C testing your prompts.

**Tip: Deep Levels**
Set Deep to 2+ to let AI continue exploring automatically.

---

## Settings Panel Labels

### API Key Section
**Label:** OpenAI API Key
**Placeholder:** sk-...
**Help:** Your key is stored locally and never sent to our servers.

### Model Section
**Label:** Model
**Options:**
- gpt-4o (Recommended)
- gpt-4-turbo
- gpt-4
- gpt-3.5-turbo

**Help:** GPT-4o offers the best balance of speed and quality.

### Theme Section
**Label:** Theme
**Options:**
- Light
- Dark
- System

---

## Command Palette Items

| Command | Description |
|---------|-------------|
| New Chat | Create a new empty canvas |
| Export Chat | Download current chat as JSON |
| Import Chat | Load a chat from JSON file |
| Center Canvas | Reset view to center |
| Reset Zoom | Set zoom to 100% |
| Toggle Theme | Switch between light/dark |
| Open Settings | Open settings panel |
| Keyboard Shortcuts | Show all shortcuts |

---

## Error States

### No API Key

**Headline:**
API Key Required

**Body:**
To generate AI responses, you need an OpenAI API key.
Click Settings (⚙️) to add one.

**CTA:** Open Settings

---

### API Error

**Headline:**
Connection Error

**Body:**
Could not reach OpenAI API.

**Checklist:**
- Check your internet connection
- Verify your API key is valid
- Check your OpenAI usage limits

**CTA:** Try Again

---

### Empty Response

**Headline:**
No Response

**Body:**
The AI returned an empty response.
Try rephrasing your prompt.

---

## Confirmation Dialogs

### Delete Chat

**Title:** Delete this chat?

**Body:**
This will permanently delete "[Chat Name]" and all its nodes.
This action cannot be undone.

**Cancel:** Keep Chat
**Confirm:** Delete (destructive)

---

### Clear All Data

**Title:** Clear all data?

**Body:**
This will delete all chats, nodes, and settings.
Your API key will also be removed.

**Cancel:** Cancel
**Confirm:** Clear Everything (destructive)

---

## Accessibility Labels

### Toolbar Buttons
- `aria-label="Cursor tool, shortcut V"`
- `aria-label="Hand tool, shortcut H"`
- `aria-label="Undo, shortcut Command Z"`
- `aria-label="Redo, shortcut Command Shift Z"`
- `aria-label="Center canvas, shortcut Home"`
- `aria-label="Export chat as JSON"`
- `aria-label="Import chat from JSON"`

### Node Elements
- `aria-label="Node: [prompt preview]"`
- `aria-label="Play button, generate AI response"`
- `aria-label="Branches selector, current value [N]"`
- `aria-label="Deep level selector, current value [N]"`

### Minimap
- `aria-label="Minimap, click to navigate"`
- `aria-label="Zoom out"`
- `aria-label="Zoom level [N] percent, click to reset"`
- `aria-label="Zoom in"`
