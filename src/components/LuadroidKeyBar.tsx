import React from 'react';
import {
  Undo,
  Redo,
  CornerDownLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Play,
  Bug,
  Sparkles,
} from 'lucide-react';

interface Props {
  onInsertText: (text: string, cursorOffset?: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onIndent?: () => void;
  fontSize: number;
  onIncreaseFont: () => void;
  onDecreaseFont: () => void;
  onQuickRun?: () => void;
  onQuickFix?: () => void;
  isFixing?: boolean;
}

export const LuadroidKeyBar: React.FC<Props> = ({
  onInsertText,
  onUndo,
  onRedo,
  onIndent,
  fontSize,
  onIncreaseFont,
  onDecreaseFont,
  onQuickRun,
  onQuickFix,
  isFixing,
}) => {
  // Token buttons styled with Roblox Studio colors:
  // - Keywords in red (#F86D7C)
  // - Globals/Services in cyan (#84D6F7)
  // - Builtins in gold (#FAD000)
  // - Types in teal (#4EC9B0)
  const tokens = [
    { label: 'Tab', action: () => onIndent && onIndent(), color: 'text-gray-300 bg-[#1e2436] font-bold' },
    { label: 'local', insert: 'local ', color: 'text-[#F86D7C] font-bold border-zinc-500/30 bg-zinc-950/20' },
    { label: 'function', insert: 'function ', color: 'text-[#F86D7C] font-bold border-zinc-500/30' },
    { label: 'end', insert: 'end\n', color: 'text-[#F86D7C] font-bold' },
    { label: 'then', insert: 'then\n    ', color: 'text-[#F86D7C] font-bold' },
    { label: 'return', insert: 'return ', color: 'text-[#F86D7C] font-bold' },
    { label: '--!strict', insert: '--!strict\n', color: 'text-[#C678DD] font-semibold border-zinc-500/30' },
    { label: 'task.wait()', insert: 'task.wait()', color: 'text-[#84D6F7] font-semibold border-zinc-500/30' },
    { label: 'pcall', insert: 'local success, err = pcall(function()\n    \nend)', color: 'text-[#FAD000]' },
    { label: '`...`', insert: '`{}`', offset: -2, color: 'text-[#ADDB67] font-bold' },
    { label: ':: type', insert: ' :: any', offset: 0, color: 'text-[#4EC9B0]' },
    { label: 'export type', insert: 'export type ', color: 'text-[#4EC9B0] font-semibold' },
    { label: '+=', insert: ' += ', color: 'text-[#ABB2BF] font-bold' },
    { label: '()', insert: '()', offset: -1, color: 'text-gray-300' },
    { label: '{}', insert: '{}', offset: -1, color: 'text-gray-300' },
    { label: '[]', insert: '[]', offset: -1, color: 'text-gray-300' },
    { label: '""', insert: '""', offset: -1, color: 'text-[#ADDB67]' },
    { label: ':', insert: ':', color: 'text-gray-300' },
    { label: '.', insert: '.', color: 'text-gray-300' },
    { label: '==', insert: ' == ', color: 'text-[#ABB2BF]' },
    { label: '~=', insert: ' ~= ', color: 'text-[#ABB2BF]' },
    { label: '=', insert: ' = ', color: 'text-[#ABB2BF]' },
    { label: '->', insert: ' -> ', color: 'text-[#ABB2BF]' },
    { label: '+', insert: ' + ', color: 'text-gray-300' },
    { label: '-', insert: ' - ', color: 'text-gray-300' },
  ];

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-[#121520] border-t border-[#1f2438] overflow-x-auto select-none shrink-0 text-xs font-mono shadow-inner z-10">
      {/* Quick Actions (Run/Simulate, Auto-Fix) */}
      {onQuickRun && (
        <button
          onClick={onQuickRun}
          className="flex items-center gap-1 px-2.5 py-1 bg-zinc-600/30 hover:bg-zinc-600/40 text-zinc-300 border border-zinc-500/40 rounded-lg text-[11px] font-sans font-bold shrink-0 transition-colors"
          title="Run Simulation"
        >
          <Play className="w-3 h-3 fill-zinc-300" />
          <span>Run</span>
        </button>
      )}

      {onQuickFix && (
        <button
          onClick={onQuickFix}
          disabled={isFixing}
          className="flex items-center gap-1 px-2.5 py-1 bg-zinc-600 hover:bg-zinc-500 text-white rounded-lg text-[11px] font-sans font-bold shrink-0 transition-colors shadow-sm disabled:opacity-50"
          title="AI Fix All Bugs"
        >
          <Sparkles className="w-3 h-3" />
          <span>{isFixing ? 'Fixing...' : 'AI Fix'}</span>
        </button>
      )}

      {/* Font Size Zoom for Mobile */}
      <div className="flex items-center bg-[#0b0d14] rounded-lg p-0.5 border border-[#23293e] shrink-0">
        <button
          onClick={onDecreaseFont}
          disabled={fontSize <= 10}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
          title="Decrease Editor Font Size"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] text-gray-300 px-1 font-sans">{fontSize}px</span>
        <button
          onClick={onIncreaseFont}
          disabled={fontSize >= 24}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
          title="Increase Editor Font Size"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="h-4 w-px bg-[#262c42] shrink-0" />

      {/* Roblox Luau Quick Symbol Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {tokens.map((token, idx) => (
          <button
            key={idx}
            onClick={() => {
              if (token.action) {
                token.action();
              } else if (token.insert) {
                onInsertText(token.insert, token.offset || 0);
              }
            }}
            className={`px-2.5 py-1 bg-[#181d2c] hover:bg-[#252d45] active:bg-[#2d3755] border border-[#273048] rounded-lg text-[11px] transition-colors shrink-0 shadow-xs ${
              token.color || 'text-gray-300'
            }`}
          >
            {token.label}
          </button>
        ))}
      </div>
    </div>
  );
};
