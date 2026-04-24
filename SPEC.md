# Terminal OS — Product Specification v1.0

## 1. Concept & Vision

**What it does:** A browser-based terminal emulator powered by xterm.js — no SSH, no backend, just a beautiful functional terminal that runs entirely in the browser using WebAssembly-powered command execution.

**Target user:** Developers who want instant browser-accessible terminal for quick tasks, demos, or systems that don't need SSH persistence.

**Differentiation from webterminal-pro:** webterminal-pro has SSH + remote session. Terminal OS is self-contained, client-side, no-server — everything runs in the browser via WebAssembly (Pyodide for Python, JSFiddle-style command execution).

**Core loop:** User opens page → sees a full-featured terminal → types commands → gets instant output → buys premium for saved sessions/history.

## 2. Design Language

### Color Palette (CSS Variables)
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
--border: #30363d;
```

### Typography
- **Terminal font:** JetBrains Mono (Google Fonts) — fallback: `Consolas, Monaco, monospace`
- **UI font:** Inter — fallback: `-apple-system, BlinkMacSystemFont, sans-serif`
- **Font sizes:** Terminal: 14px, UI: 13-15px

### Motion
- Terminal cursor: blinking block (50% duty cycle, 530ms period)
- Command output: instant, no animation delay
- Tab switches: 150ms fade
- Theme toggle: 200ms CSS transition

## 3. Layout & Structure

```
┌─────────────────────────────────────────────────────┐
│  HEADER: Logo | Tabs: Terminal | Themes | Settings  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  TERMINAL VIEW (xterm.js canvas)                    │
│  - Full viewport height                             │
│  - Green prompt: `➜ ~`                              │
│  - Command input with history (↑↓)                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│  FOOTER: Status | Connection | Buy Button ($9)      │
└─────────────────────────────────────────────────────┘
```

**Tab structure:**
1. **Terminal** — main xterm.js terminal
2. **Themes** — preset color scheme switcher
3. **Settings** — font size, cursor style, scrollback

## 4. Features & Interactions

### Core Features

#### F1: xterm.js Terminal
- Full xterm.js with addon support (fit, search, webgl)
- GPU-accelerated rendering via WebGL addon
- 256-color and truecolor support
- Mouse event support (clickable URLs, selection)
- Custom themes via xterm.js API

#### F2: Built-in Command Execution
Execute these commands client-side in WebAssembly:
- `python`, `python3` — via Pyodide (Python 3.11 WASM)
- `node` — via quickjs or builtin JS runner
- `bc` — arbitrary precision calculator language
- `jq` — JSON processor (via wasm)
- `dc` — RPN calculator
- `factor`, `seq`, `yes` — GNU coreutils (via WASM port)

**Shell commands supported:**
- `ls`, `cd`, `pwd`, `mkdir`, `rmdir`, `cat`, `head`, `tail`
- `grep`, `awk`, `sed` (via WASM)
- `curl` — browser fetch API
- `date`, `cal`, `whoami`
- `clear`, `history`, `help`

**NOT supported (no server):**
- SSH, telnet, any network socket
- Running processes beyond WASM lifetime
- Persistent filesystem

#### F3: Theme Library
Preset themes (selectable):
1. **GitHub Dark** (default) — `#0d1117` bg
2. **Monokai Pro** — `#2D2A2E` bg, `#F8F8F2` text
3. **Dracula** — `#282A36` bg, `#F8F8F2` text
4. **One Dark** — `#282C34` bg, `#ABB2BF` text
5. **Nord** — `#2E3440` bg, `#D8DEE9` text
6. **Solarized Dark** — `#002B36` bg, `#839496` text
7. **Hyper** — `#000000` bg, `#ffffff` text
8. **Adventure** — `#1a1a2e` bg, neon green text

User can also define custom colors via CSS variables.

#### F4: Session Management (Premium)
- Save/restore terminal sessions
- Named session tabs
- Session history persistence
- Export session as transcript

#### F5: Premium Features (checkout gated)
- Session saving (5 sessions free, unlimited premium)
- Custom theme upload
- Command alias management
- Output export (PDF, HTML)
- API access for automation

### User Interactions
| Action | Result |
|---|---|
| Type `python` | Pyodide boots, shows `>>>` REPL |
| Press ↑ | Previous command from history |
| Click URL in terminal | Opens in new tab |
| Select text | OS-native selection |
| Ctrl+C | Interrupt current command |
| Ctrl+L | Clear screen |
| Ctrl+D | EOF / exit shell |
| Theme button click | Instant theme switch, 200ms transition |

### Edge Cases
- **Pyodide load failure:** Show error in terminal, suggest refresh
- **WASM not supported:** Show "Your browser doesn't support WASM" message
- **Command not found:** `bash: command not found: foo` (realistic bash-style error)
- **Long output:** xterm.js scrollback (default 1000 lines, configurable)

## 5. Component Inventory

### Terminal Component
```
States: loading (Pyodide init) | ready | executing | error
- Loading: show "Initializing WebAssembly..." with progress
- Ready: green prompt visible, accepting input
- Executing: prompt shows spinner, input disabled
- Error: red text, error message, prompt returns
```

### Buy Button
```
States: default | hover | loading | purchased
- Default: white bg, purple text, `Get Started — $9`
- Hover: slight lift (translateY -2px), shadow increase
- Loading: spinner icon, "Processing..."
- Purchased: green bg, checkmark, "Active ✓"
```

### Theme Card
```
States: default | hover | active
- Default: color swatch + name, subtle border
- Hover: border brightens, slight scale(1.02)
- Active: blue border, checkmark overlay
```

### Tab Navigation
```
States: default | hover | active
- Default: muted text
- Hover: brightened text
- Active: accent color, bottom border indicator
```

## 6. Technical Approach

### Stack
- **Frontend:** Vanilla HTML/CSS/JS — no framework (keeps it fast)
- **Terminal:** xterm.js v5 (`@xterm/xterm`) via CDN/npm
- **Python execution:** Pyodide (Python 3.11 WASM)
- **Shell/JS runner:** Custom minimal shell implementation
- **Build:** Vercel (static files), no server required for basic operation
- **Payment:** Polar (already configured in product.json)

### Key Libraries
```json
{
  "@xterm/xterm": "^5.5.0",
  "@xterm/addon-fit": "^0.10.0",
  "@xterm/addon-search": "^0.15.0",
  "@xterm/addon-webgl": "^0.18.0"
}
```

### Architecture
```
index.html
├── xterm.js terminal instance
├── Pyodide (loaded on demand)
├── Shell emulator (client-side commands)
└── Theme manager
```

### File Structure
```
products/terminal-os/
├── public/
│   └── index.html          # Single page app
├── api/
│   └── webhook.js        # Polar webhook handler (premium activation)
├── package.json          # (empty deps for now)
├── vercel.json           # Standard static + serverless
└── product.json
```

### Pricing
- **Free:** Basic terminal, Python REPL, 3 themes, 100 line scrollback
- **Premium ($9):** Unlimited sessions, all themes, custom aliases, export, API

## 7. Success Metrics
- Terminal loads in < 3 seconds
- Python REPL usable in < 5 seconds (Pyodide lazy-load)
- All builtin commands execute in < 100ms
- Zero external HTTP calls for core terminal function
