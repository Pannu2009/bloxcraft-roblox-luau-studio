// AIAssistantPanel — bring-your-own-AI chat. The user pastes their own API key
// (OpenAI, DeepSeek, OpenRouter, Claude, Gemini, or any OpenAI-compatible endpoint).
// The key is stored in localStorage on the device only; requests go straight
// from the device to the provider.

import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Settings2,
  Send,
  Loader2,
  ExternalLink,
  ShieldCheck,
  FileCode,
  ClipboardPaste,
  Trash2,
  X,
} from 'lucide-react';
import type { ScriptFile } from '../types/roblox';
import { buildDependencyGraph } from '../utils/dependencyGraph';
import {
  AI_PROVIDERS,
  getProvider,
  loadAISettings,
  saveAISettings,
  effectiveModel,
  chatWithAI,
  extractCodeBlock,
  type AISettings,
  type ChatMessage,
} from '../utils/aiProviders';

interface Props {
  activeFile?: ScriptFile;
  projectFiles?: ScriptFile[];
  onApplyCode: (code: string) => void;
}

type ContextMode = 'current' | 'project' | 'none';

function buildProjectContext(files: ScriptFile[]): string {
  const graph = buildDependencyGraph(files);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  let out = `Project files (${files.length}):\n`;
  for (const f of files) {
    const node = byId.get(f.id);
    const wires = node && node.requires.length
      ? ` | requires: ${node.requires.join(', ')}`
      : '';
    const usedBy = node && node.requiredBy.length
      ? ` | used by: ${node.requiredBy.map((id) => byId.get(id)?.name || id).join(', ')}`
      : '';
    const code = f.code.length > 6000 ? f.code.slice(0, 6000) + '\n-- …(truncated)' : f.code;
    out += `\n--- ${f.name} [${f.type}]${f.folder ? ` (${f.folder})` : ''}${wires}${usedBy}\n\`\`\`luau\n${code}\n\`\`\`\n`;
  }
  if (graph.cycles.length) {
    out += `\nDependency cycles detected: ${graph.cycles.map((c) => c.join(' → ')).join('; ')}\n`;
  }
  return out;
}

const SYSTEM_PROMPT =
  'You are a Roblox Luau coding assistant inside the BloxCraft mobile studio. ' +
  'Answer concisely. When you write code, put the complete file in ONE fenced ```luau block. ' +
  'Prefer task.wait/task.spawn/task.delay over legacy wait/spawn/delay, add WaitForChild timeouts, ' +
  'and keep server/client boundaries correct.';

const CHAT_HISTORY_KEY = 'bloxcraft_ai_chat_history';
const MAX_HISTORY = 50;

function loadChatHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.slice(-MAX_HISTORY);
    }
  } catch {}
  return [];
}

function saveChatHistory(msgs: ChatMessage[]) {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY)));
  } catch {}
}

export const AIAssistantPanel: React.FC<Props> = ({ activeFile, projectFiles, onApplyCode }) => {
  const [settings, setSettings] = useState<AISettings>(loadAISettings);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadChatHistory);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [contextMode, setContextMode] = useState<ContextMode>('current');
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const provider = getProvider(settings.providerId);
  const needsKey = provider.id !== 'ollama';
  const hasKey = !needsKey || settings.apiKey.trim().length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const updateSettings = (patch: Partial<AISettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveAISettings(next);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    const history: ChatMessage[] = [...messages, { role: 'user', text }];
    // Prepend context as a leading user message so every provider shape works.
    const withContext: ChatMessage[] = [{ role: 'user', text: SYSTEM_PROMPT }];
    if (contextMode === 'current' && activeFile) {
      withContext.push({
        role: 'user',
        text:
          `Current file: ${activeFile.name} [${activeFile.type}]\n` +
          '```luau\n' +
          activeFile.code +
          '\n```',
      });
    } else if (contextMode === 'project' && projectFiles && projectFiles.length) {
      withContext.push({
        role: 'user',
        text: buildProjectContext(projectFiles),
      });
    }
    // Small local models drown in long histories: send only the recent slice
    // to the model (full history is still kept in the UI/storage).
    const recentHistory = history.slice(-10);
    const outgoing = [...withContext, ...recentHistory];
    const nextMessages = [...history];
    setMessages(nextMessages);
    saveChatHistory(nextMessages);
    setInput('');
    setSending(true);
    try {
      const reply = await chatWithAI(settings, outgoing);
      setMessages((prev) => {
        const updated: ChatMessage[] = [...prev, { role: 'assistant', text: reply }];
        saveChatHistory(updated);
        return updated;
      });
    } catch (e: any) {
      setError(e?.message || 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  const applyCode = (text: string) => {
    const code = extractCodeBlock(text);
    if (!code) return;
    if (!window.confirm(`Replace the entire contents of "${activeFile?.name || 'the current file'}" with this code?`)) {
      return;
    }
    onApplyCode(code);
  };

  const renderMessage = (m: ChatMessage, i: number) => {
    const isUser = m.role === 'user';
    const code = !isUser ? extractCodeBlock(m.text) : null;
    // Split text around fenced blocks for display
    const parts = m.text.split(/```(?:luau|lua)?\s*\n?([\s\S]*?)```/g);
    return (
      <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
            isUser ? 'bg-[#2a3350] text-gray-100' : 'bg-[#141824] border border-[#23283b] text-gray-200'
          }`}
        >
          {parts.map((part, pi) =>
            pi % 2 === 1 ? (
              <pre
                key={pi}
                className="my-1.5 p-2 rounded-lg bg-black/50 border border-[#23283b] overflow-x-auto font-mono text-[11px] text-gray-300 whitespace-pre-wrap"
              >
                {part.trim()}
              </pre>
            ) : (
              <p key={pi} className="whitespace-pre-wrap">
                {part.trim()}
              </p>
            )
          )}
          {!isUser && code && activeFile && (
            <button
              onClick={() => applyCode(m.text)}
              className="mt-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-600/20 hover:bg-zinc-600/35 border border-zinc-500/30 text-zinc-300 text-[11px] font-bold transition-colors"
            >
              <ClipboardPaste className="w-3 h-3" />
              Apply to {activeFile.name}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-1 pb-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-zinc-600 to-zinc-500 flex items-center justify-center shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-bold text-white">AI Assistant</div>
          <div className="text-[10px] text-gray-500 truncate">
            {hasKey ? `${provider.name} · ${effectiveModel(settings)}` : 'Add your own API key to begin'}
          </div>
        </div>
        <button
          onClick={() => setShowSettings((v) => !v)}
          className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-[#2a3350] text-white' : 'text-gray-400 hover:text-white hover:bg-[#1f2538]'}`}
          title="AI settings"
        >
          <Settings2 className="w-4 h-4" />
        </button>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); saveChatHistory([]); }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1f2538] transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Settings */}
      {showSettings && (
        <div className="mb-2 p-3 rounded-xl bg-[#0a0c12] border border-[#23283b] space-y-2.5">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Provider</label>
            <select
              value={settings.providerId}
              onChange={(e) => updateSettings({ providerId: e.target.value, model: '', baseUrl: '' })}
              className="w-full px-2.5 py-2 rounded-lg bg-[#141824] border border-[#2a3350] text-xs text-gray-100 focus:outline-none"
            >
              {AI_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          {needsKey ? (
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">API key</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => updateSettings({ apiKey: e.target.value })}
              placeholder={provider.keyPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="w-full px-2.5 py-2 rounded-lg bg-[#141824] border border-[#2a3350] text-xs font-mono text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-zinc-500/60"
            />
            {provider.keyUrl && (
              <a
                href={provider.keyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-zinc-300 hover:text-zinc-200 mt-1"
              >
                Get a {provider.name} key <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          ) : (
          <div className="rounded-lg bg-[#141824] border border-[#2a3350] p-2.5 text-[11px] text-gray-300 leading-relaxed">
            <p className="font-bold text-zinc-200 mb-1">Run AI on your own device — no key needed.</p>
            <p className="text-gray-400">In Termux:</p>
            <code className="block mt-1 px-2 py-1.5 rounded bg-black/50 font-mono text-[10px] text-zinc-300 whitespace-pre-wrap">pkg install ollama{'\n'}ollama serve &amp;{'\n'}ollama pull deepseek-r1:8b</code>
            <p className="text-gray-400 mt-1.5">Keep the base URL as <span className="font-mono text-zinc-300">http://localhost:11434/v1</span> and set the model name to whatever you pulled.</p>
          </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
              Model <span className="text-gray-600 font-normal">(blank = {provider.defaultModel || 'provider default'})</span>
            </label>
            <input
              type="text"
              value={settings.model}
              onChange={(e) => updateSettings({ model: e.target.value })}
              placeholder={provider.defaultModel}
              autoComplete="off"
              spellCheck={false}
              className="w-full px-2.5 py-2 rounded-lg bg-[#141824] border border-[#2a3350] text-xs font-mono text-gray-100 placeholder:text-gray-600 focus:outline-none"
            />
          </div>
          {provider.needsBaseUrl && (
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                Base URL (OpenAI-compatible)
              </label>
              <input
                type="text"
                value={settings.baseUrl}
                onChange={(e) => updateSettings({ baseUrl: e.target.value })}
                placeholder="https://your-host/v1"
                autoComplete="off"
                spellCheck={false}
                className="w-full px-2.5 py-2 rounded-lg bg-[#141824] border border-[#2a3350] text-xs font-mono text-gray-100 placeholder:text-gray-600 focus:outline-none"
              />
            </div>
          )}
          <p className="text-[10px] text-gray-500 leading-relaxed flex items-start gap-1">
            <ShieldCheck className="w-3 h-3 shrink-0 mt-0.5" />
            Your key stays on this device. Chats go straight from your phone to {provider.name} — BloxCraft never sees them.
          </p>
          <button
            onClick={() => setShowSettings(false)}
            className="w-full py-1.5 rounded-lg bg-[#1a2033] hover:bg-[#242c44] text-gray-200 text-xs font-bold flex items-center justify-center gap-1"
          >
            <X className="w-3.5 h-3.5" /> Done
          </button>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {messages.length === 0 && !showSettings && (
          <div className="text-center py-8 px-4">
            <Sparkles className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-400 leading-relaxed">
              {hasKey
                ? 'Ask anything about your Luau code. Toggle the file chip below to include the current file as context.'
                : 'Tap the gear icon and paste your own API key to unlock the assistant.'}
            </p>
          </div>
        )}
        {messages.map(renderMessage)}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-xl px-3 py-2 bg-[#141824] border border-[#23283b] flex items-center gap-2 text-xs text-gray-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-[11px] text-zinc-300 bg-zinc-950/30 border border-zinc-500/30 rounded-lg px-2.5 py-1.5 mt-2">
          {error}
        </p>
      )}

      {/* Context selector */}
      <div className="mt-2 flex items-center gap-1.5 self-start">
        {(['current', 'project', 'none'] as ContextMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setContextMode(m)}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
              contextMode === m
                ? 'bg-zinc-600/20 border-zinc-500/40 text-zinc-200'
                : 'bg-[#141824] border-[#23283b] text-gray-500'
            }`}
            title={
              m === 'current' ? 'Include the current file as context'
              : m === 'project' ? 'Include ALL project files + how they connect (wiring)'
              : 'No file context'
            }
          >
            {m === 'current' ? `📄 ${activeFile?.name || 'file'}` : m === 'project' ? `📦 whole project (${projectFiles?.length || 0})` : '💬 chat only'}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-1.5 mt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          placeholder={hasKey ? 'Ask about your code…' : 'Add an API key first (gear icon)'}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#0a0c12] border border-[#23283b] text-xs text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-zinc-500/60"
        />
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          className="p-2 rounded-xl bg-zinc-600 hover:bg-zinc-500 text-white disabled:opacity-40 transition-colors shrink-0"
          title="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
