# Terminal OS — AI Agent Shell OS
## Product Specification v2.0

## 1. Concept & Vision

**What it does:** A browser-based AI Agent Shell OS powered by xterm.js — a full-featured terminal emulator that doubles as a multi-agent AI orchestration platform. Users spawn AI agents as named processes, chat with them in the terminal, and orchestrate multiple specialized agents simultaneously.

**Target user:** Developers who want instant browser-accessible AI agent shell for rapid prototyping, debugging, pair programming, and multi-agent task orchestration.

**Differentiation from webterminal-pro:** webterminal-pro has SSH + remote session. Terminal OS is self-contained, client-side terminal + AI agent backend — no SSH, just a powerful shell that connects to AI models.

**Core loop:** User opens page → sees AI-powered terminal → spawns agents → chats → gets work done → upgrades to premium for multi-agent mode.

---

## 2. AI Agent Shell Commands

```
/agent spawn <name> "<system_prompt>"   Spawn a new AI agent (PID assigned)
/agent list                             List all active agents
/agent send <name> <message>            Send message to agent, get AI reply
/agent switch <name>                    Switch active (focused) agent
/agent kill <name>                      Terminate an agent
/agent info <name>                      Show agent details + history count
```

### Agent Lifecycle
1. `spawn` → creates in-memory agent with system prompt, gets unique PID
2. `send` → sends user message, AI model responds (Groq free tier)
3. `switch` → changes active agent context
4. `kill` → terminates agent, frees memory

### Backend API (`/api/process`)
- `POST /api/process` — main endpoint
- Routes `/agent spawn|list|send|switch|kill|info`
- Agent sessions: in-memory Map (UUID-keyed)
- AI responses: Groq API (llama-3.1-8b-instant) with fallback simulation
- Sandbox: only safe commands via `/exec`

---

## 3. Design Language

### Color Palette
```css
--bg-primary: #0d1117;        /* GitHub dark */
--bg-secondary: #161b22;
--bg-terminal: #0a0e14;       /* Deep terminal black */
--text-primary: #e6edf3;
--text-muted: #7d8590;
--accent-blue: #58a6ff;
--accent-green: #3fb950;
--accent-yellow: #d29922;
--accent-red: #f85149;
--accent-magenta: #bc8cff;   /* Agent messages */
--border: #30363d;
```

### Typography
- **Terminal font:** JetBrains Mono (Google Fonts)
- **UI font:** Inter

### Motion
- Agent spawn: instant with PID display
- Agent messages: prefix with colored arrows (`→` cyan, `←` green)
- Loading: `⟳` spinner while AI responds
- Error: red text

---

## 4. Layout & Structure

```
┌─────────────────────────────────────────────────────┐
│  HEADER: Terminal OS | Tabs: Terminal | Themes | Settings │
├─────────────────────────────────────────────────────┤
│                                                     │
│  TERMINAL VIEW (xterm.js canvas)                    │
│  Welcome banner with AI Agent Shell OS branding      │
│  $ /agent spawn coder "expert JS dev"              │
│  → Agent `coder` spawned (PID a1b2c3d4)           │
│  $ /agent send coder debug my API route            │
│  → coder: "debug my API route"                     │
│  ⟳ Waiting for coder...                            │
│  ← coder: Here's what I'd check...                 │
│                                                     │
├─────────────────────────────────────────────────────┤
│  STATUS: ● WebAssembly Ready  |  Agents: 1  |  $9  │
└─────────────────────────────────────────────────────┘
```

---

## 5. Tech Stack

- **Frontend:** xterm.js 5.5.0 (CDN), vanilla JS, no build step
- **Backend:** Vercel Serverless API (Node.js)
- **AI:** Groq API (llama-3.1-8b-instant) — free tier
- **Fallback simulation:** Built-in agent response generator
- **Session:** In-memory (ephemeral, per-deployment)

---

## 6. Premium Features

| Feature | Free | Premium ($9) |
|---------|------|-------------|
| Basic shell commands | ✓ | ✓ |
| Python REPL (Pyodide) | ✓ | ✓ |
| Single AI agent | ✓ | ✓ |
| Multiple AI agents | — | ✓ |
| Agent history | — | ✓ |
| Saved sessions | — | ✓ |
| Custom themes | — | ✓ |

---

## 7. Backend API Reference

### `POST /api/process`
```json
{
  "command": "/agent spawn coder \"expert JS developer\"",
  "licenseKey": ""
}
```

#### Responses:
```json
// /agent spawn
{ "ok": true, "agent": { "name": "coder", "id": "a1b2c3d4", "created": "..." }, "message": "..." }

// /agent list
{ "ok": true, "agents": [...], "count": 2 }

// /agent send
{ "ok": true, "agent": "coder", "id": "a1b2c3d4", "reply": "Here's what I'd check..." }

// /agent kill
{ "ok": true, "message": "Agent `coder` terminated." }

// /agent info
{ "ok": true, "agent": {...}, "history": 5 }
```

### Health check
```json
GET /api/process
{ "status": "terminal-os-api-v2", "uptime": 123, "agents": 2, "execHistory": 5 }
```
