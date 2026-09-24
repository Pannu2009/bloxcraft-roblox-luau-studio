# BloxCraft AI — Roblox Luau Script & Module Studio (v1.1)

[![Version](https://img.shields.io/badge/version-1.1.0-red.svg)](https://github.com/)
[![Luau](https://img.shields.io/badge/Luau-5.1%20Strict-blue.svg)](https://luau.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

An intelligent, full-featured Roblox Luau development IDE inspired by **Luadroid** and **VS Code**, engineered for writing, debugging, optimizing, and architecting production-grade Roblox scripts and ModuleScripts on desktop and mobile.

---

## 🚀 Key Features

### 🎨 Roblox Studio Dark Theme Syntax Highlighting
- **Signature Keyword Color**: `local`, `function`, `end`, `if`, `then`, `else`, `return` in authentic **Roblox Studio Red** (`#F86D7C`).
- **Roblox Globals & Services**: `game`, `workspace`, `script`, `task`, `Vector3`, `CFrame`, `Instance`, `TweenInfo`, `Players`, `DataStoreService`, and `RunService` in **Cyan / Light Blue** (`#84D6F7`).
- **Strings**: Quoted (`"..."`, `'...'`), multiline (`[[...]]`), and modern Luau string interpolation (`` `Player: {player.UserId}` ``) in **Roblox Green** (`#ADDB67`).
- **Luau Type Annotations**: Primitive and custom types (`number`, `string`, `boolean`, `any`, `Player`, `Model`, `RBXScriptConnection`, `:: type`) in **Teal** (`#4EC9B0`).
- **Numbers & Booleans**: Peach-orange numbers (`#FFAB70`) and amber booleans/nil (`#FFB454`).
- **Status Bar Legend & Quick Toggle**: Switch between Roblox Studio colors and standard monospace mode at any time.

### 📱 Luadroid Mobile Keyboard & Companion Bar
- Tailored for mobile and tablet touch coding: quick-tap buttons for `Tab`, `local`, `function`, `end`, `task.wait()`, `pcall`, `` `...` ``, `:: type`, `export type`, and symbols.
- In-editor font zoom controls (`-` / `+`) and gesture-friendly scrolling.
- Instant Run / Simulate and AI Fix shortcuts directly on the mobile bar.

### 🧠 AI Luau Engine & Real-Time Debugger
- **Deep Code Analysis**: Detects silent memory leaks, server-client remote exploits, deprecated `wait()` / `spawn()` calls, nil-indexing hazards, and unbounded loops.
- **One-Click Auto-Fix**: Automatically modernizes deprecated APIs, implements proper `--!strict` typing, adds `task.wait()` throttling, and protects network remotes with rate limiting.
- **Zero-Downtime Fallback Architecture**: Multi-model fallback (`gemini-3.8-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest`) combined with deterministic local Luau AST repair rules for continuous uptime during API surges.

### 📂 VS Code Project Architecture & Multi-File Explorer
- Create, rename, delete, and organize scripts across `src/server`, `src/client`, and `src/shared`.
- Support for `Script` (ServerScript), `LocalScript` (Client), and `ModuleScript` (Shared).
- One-click ZIP download structured for Roblox Studio and Rojo workflows.

### 🛠️ Built-in Starter Templates
- **Roblox RPG & Combat Simulator**: Server-authoritative hitboxes, DataStore profile saves, and OOP Weapon classes.
- **Tycoon & Economy Engine**: Auto-droppers, plot ownership, debounce validation, and ReplicatedStorage remotes.
- **Pet Simulator & Inventory**: Probability egg hatching, network compression, and client UI tweening.
- **DataStore2 / ProfileService Template**: Session locking, anti-duplication, and auto-saving.

---

## 📦 What's New in v1.1

- ✨ **Roblox Studio Dark Theme Highlighting**: Fully matching Roblox Studio's default code editor palette with red `local` keywords.
- ⚡ **Modern Luau Syntax**: Added syntax support for backtick string interpolation (`` `...` ``), compound operators (`+=`, `-=`, `*=`, `/=`, `%=`, `^=`, `..=`), and Luau typecasting (`::`).
- 🛡️ **Multi-Tier API Fallback**: Resilient error handling with automatic model fallback and rule-based repair engine.
- 📱 **Enhanced Luadroid Key Bar**: Color-coded mobile buttons with updated Luau tokens.

---

## 🏃 Quick Start

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### Installation
```bash
# Clone repository
git clone https://github.com/your-username/bloxcraft-roblox-luau-studio.git
cd bloxcraft-roblox-luau-studio

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Add your GEMINI_API_KEY to .env
```

### Run Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build
```bash
npm run build
npm start
```

---

## 📄 License
MIT License © 2026 BloxCraft AI Studio
