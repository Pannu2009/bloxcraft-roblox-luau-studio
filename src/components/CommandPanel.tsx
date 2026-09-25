// CommandPanel — VS Code style command palette (Ctrl+Shift+P).
// Fuzzy-filters a list of commands; Enter runs, Esc closes.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TerminalSquare } from 'lucide-react';

export interface Command {
  id: string;
  title: string;
  hint?: string;
  group: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
  onRun: (id: string) => void;
}

export const CommandPanel: React.FC<Props> = ({ isOpen, onClose, commands, onRun }) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => setSelected(0), [query]);

  if (!isOpen) return null;

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === 'Enter') {
      const cmd = filtered[selected];
      if (cmd) {
        onClose();
        onRun(cmd.id);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  let lastGroup = '';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] flex justify-center items-start pt-[12vh] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#12141c] border border-[#2b3044] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#222738]">
          <TerminalSquare className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a command… (e.g. github, export, run)"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
          />
          <kbd className="text-[10px] text-gray-500 border border-[#2a3049] rounded px-1.5 py-0.5">esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1.5">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-gray-500">No matching commands.</div>
          )}
          {filtered.map((cmd, i) => {
            const showGroup = cmd.group !== lastGroup;
            lastGroup = cmd.group;
            return (
              <React.Fragment key={cmd.id}>
                {showGroup && (
                  <div className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                    {cmd.group}
                  </div>
                )}
                <button
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => {
                    onClose();
                    onRun(cmd.id);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                    i === selected ? 'bg-[#1e2438] text-white' : 'text-gray-300'
                  }`}
                >
                  <span>{cmd.title}</span>
                  {cmd.hint && (
                    <span className="text-[10px] text-gray-500 font-mono">{cmd.hint}</span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};
