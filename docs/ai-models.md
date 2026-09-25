# Running AI models with BloxCraft

BloxCraft's AI Assistant is **bring-your-own-AI**: the app talks directly to a
provider from your device. No BloxCraft server is involved, and your API key
never leaves your phone.

## Option A — Local model (free, offline, private)

Run a model on your own device with [Ollama](https://ollama.com) in Termux.

### 1. Install & start Ollama (Termux)

```sh
pkg install ollama
pkill ollama
OLLAMA_ORIGINS="*" ollama serve &
```

`OLLAMA_ORIGINS="*"` lets the app's WebView reach the server (fixes CORS).

### 2. Pull a model

Phones can't comfortably run 8B+ models — use a small coder model:

```sh
ollama pull qwen2.5-coder:1.5b
```

Check what's installed:

```sh
ollama list
```

Verify the server is up:

```sh
curl http://localhost:11434/api/tags
```

Free disk space by removing models you don't use:

```sh
ollama rm deepseek-r1:8b
```

**Model picks for phones:**
| Model | Size | Notes |
|---|---|---|
| `qwen2.5-coder:1.5b` | ~1 GB | Best pick for Luau/code |
| `llama3.2:1b` | ~1 GB | Lightest, weaker at code |
| `deepseek-r1:1.5b` | ~1 GB | Reasoning traces, slower |

### 3. Connect in the app

1. Open the **AI Assistant** tab (✨ sparkles icon in the sidebar).
2. Tap the gear → provider **Ollama (localhost — Termux / PC)**.
3. Base URL: `http://localhost:11434/v1` (default).
4. Model: the exact name from `ollama list`, e.g. `qwen2.5-coder:1.5b`.
5. No API key needed.

Keep Termux running in the background while you chat. First reply takes
~30 seconds while the model loads into memory.

## Option B — Cloud API (needs key, needs internet)

Pick any provider in settings: OpenAI, DeepSeek, Anthropic, Gemini,
OpenRouter, or a custom OpenAI-compatible endpoint. Paste your key — it is
stored in the app's localStorage on your device only.

## Chatting & applying code

- **Context selector** above the input:
  - 📄 *current file* — the model sees the open script
  - 📦 *whole project* — the model sees **every file** plus how they connect
    (require wiring, used-by, dependency cycles)
  - 💬 *chat only* — no code context
- Ask for code; the reply shows an **Apply** button under each code block.
- **Apply** asks for confirmation, then replaces the current file's contents.
- Chat history keeps the last **50 messages** (oldest drops off). Trash icon clears it.

## Sharing files with Ustaad

1. **Muse** tab (sidebar) → copy your pairing code, send it to Ustaad once.
2. **Send project to Ustaad** → creates a `.txt` bundle (pairing code + file
   list + wiring + all code) and opens the Android share sheet.
3. Share the file to Ustaad; you get edited files back as a bundle.
4. In the app: **Apply bundle** → paste/attach the returned bundle to apply edits.
