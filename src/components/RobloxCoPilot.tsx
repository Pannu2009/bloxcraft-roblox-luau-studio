import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Sparkles, X, Copy, Check, MessageSquare, BookOpen } from 'lucide-react';
import { ScriptType, ChatMessage } from '../types/roblox';
import { getApiUrl } from '../utils/apiConfig';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  scriptType: ScriptType;
  scriptName: string;
}

export const RobloxCoPilot: React.FC<Props> = ({
  isOpen,
  onClose,
  currentCode,
  scriptType,
  scriptName,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your **Roblox Luau Co-Pilot**. I am currently inspecting **${scriptName}** (${scriptType}).\n\nAsk me anything about Roblox engine mechanics, network replication, MicroProfiler optimization, DataStores, or how to fix complex bugs!`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(getApiUrl('/api/roblox/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          currentCode,
          scriptType,
        }),
      });

      if (!res.ok) {
        throw new Error('AI co-pilot request failed');
      }

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data.reply || 'No response returned from Roblox assistant.',
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Failed to get advice: ${err.message}. Please check your connection.`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const copySnippet = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-[#10131d] border-l border-[#202538] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 bg-[#141824] border-b border-[#202538]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>Roblox Luau Co-Pilot</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-gray-400">Context: {scriptName}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-[#202538] rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Prompts */}
      <div className="p-3 bg-[#0c0e15] border-b border-[#1c2133] overflow-x-auto flex gap-1.5 text-[11px] shrink-0">
        {[
          'How to prevent memory leaks with Maid?',
          'Why avoid Instance.new(x, parent)?',
          'How to secure RemoteEvents?',
          'Explain session locking in DataStores',
        ].map((quick, i) => (
          <button
            key={i}
            onClick={() => handleSend(quick)}
            className="px-2.5 py-1 bg-[#171c2b] hover:bg-[#22293d] text-gray-300 rounded-lg whitespace-nowrap border border-[#273047] transition-colors shrink-0"
          >
            {quick}
          </button>
        ))}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1 px-1">
              {m.role === 'user' ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-red-400" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-cyan-400" />
                  <span className="font-semibold text-cyan-400">Luau Architect</span>
                </>
              )}
            </div>

            <div
              className={`p-3 rounded-2xl max-w-[90%] text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-red-600 text-white rounded-tr-none'
                  : 'bg-[#151926] text-gray-200 border border-[#242b3e] rounded-tl-none font-sans select-text'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans space-y-2">
                {m.content}
              </div>

              {m.role === 'assistant' && (
                <div className="mt-2 pt-2 border-t border-[#222738] flex justify-end">
                  <button
                    onClick={() => copySnippet(m.content, m.id)}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-white"
                  >
                    {copiedId === m.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy answer</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 bg-[#151926] border border-[#242b3e] rounded-2xl rounded-tl-none max-w-[80%] text-gray-400 text-xs">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>Analyzing Luau context & Roblox engine APIs...</span>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-[#141824] border-t border-[#202538]">
        <div className="flex items-center gap-2 bg-[#0c0e15] border border-[#262c40] rounded-xl px-3 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything about Roblox Luau..."
            className="flex-1 bg-transparent text-xs text-white placeholder:text-gray-500 focus:outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
