import React, { useRef, useState, useMemo } from 'react';
import {
  Copy,
  Download,
  Check,
  Search,
  Sparkles,
  AlertTriangle,
  Play,
  FileCode,
  FolderTree,
  Palette,
} from 'lucide-react';
import { ScriptType, RobloxIssue } from '../types/roblox';
import { LuadroidKeyBar } from './LuadroidKeyBar';
import { highlightLuauCode } from '../utils/robloxSyntaxHighlighter';

interface Props {
  code: string;
  onChange: (newCode: string) => void;
  scriptType: ScriptType;
  scriptName: string;
  folder?: string;
  issues: RobloxIssue[];
  onSelectIssue?: (issue: RobloxIssue) => void;
  isAnalyzing?: boolean;
  fontSize?: number;
  onIncreaseFont?: () => void;
  onDecreaseFont?: () => void;
  onQuickRun?: () => void;
  onQuickFix?: () => void;
  isFixing?: boolean;
}

export const CodeEditor: React.FC<Props> = ({
  code,
  onChange,
  scriptType,
  scriptName,
  folder = 'src',
  issues,
  onSelectIssue,
  isAnalyzing,
  fontSize = 13,
  onIncreaseFont = () => {},
  onDecreaseFont = () => {},
  onQuickRun,
  onQuickFix,
  isFixing,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [highlightEnabled, setHighlightEnabled] = useState(true);

  const lines = code.split('\n');
  const totalLines = lines.length;

  // Roblox Studio Luau real-time syntax coloring HTML
  const highlightedHtml = useMemo(() => {
    if (!highlightEnabled) return '';
    const html = highlightLuauCode(code);
    return code.endsWith('\n') ? html + ' ' : html;
  }, [code, highlightEnabled]);

  // Sync scrolling between textarea, highlighted <pre>, and line numbers
  const handleScroll = () => {
    if (textareaRef.current) {
      const { scrollTop, scrollLeft } = textareaRef.current;
      if (preRef.current) {
        preRef.current.scrollTop = scrollTop;
        preRef.current.scrollLeft = scrollLeft;
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = scrollTop;
      }
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = scriptName.endsWith('.luau') ? scriptName : `${scriptName}.luau`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enable Tab key indentation (4 spaces for Roblox Luau standard)
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '    ';

      const newCode = code.substring(0, start) + spaces + code.substring(end);
      onChange(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  // Track cursor position for VS Code status bar
  const handleSelectOrKeyUp = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const textBefore = code.substring(0, pos);
    const lineList = textBefore.split('\n');
    const currentLine = lineList.length;
    const currentCol = lineList[lineList.length - 1].length + 1;
    setCursorPos({ line: currentLine, col: currentCol });
  };

  // Luadroid insertion at cursor
  const handleInsertText = (text: string, cursorOffset: number = 0) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newCode = code.substring(0, start) + text + code.substring(end);
    onChange(newCode);

    setTimeout(() => {
      textarea.focus();
      const newPos = start + text.length + cursorOffset;
      textarea.selectionStart = textarea.selectionEnd = newPos;
      handleSelectOrKeyUp();
    }, 0);
  };

  const handleIndent = () => {
    handleInsertText('    ');
  };

  // Toggle strict mode at top of script
  const toggleStrictMode = () => {
    if (code.startsWith('--!strict')) {
      onChange(code.replace(/^--!strict\n?/, ''));
    } else {
      onChange(`--!strict\n${code}`);
    }
  };

  const issuesByLine = new Map<number, RobloxIssue[]>();
  issues.forEach((issue) => {
    if (issue.line > 0) {
      const list = issuesByLine.get(issue.line) || [];
      list.push(issue);
      issuesByLine.set(issue.line, list);
    }
  });

  return (
    <div className="flex flex-col h-full bg-[#0d0f17] border border-[#202538] rounded-xl overflow-hidden shadow-xl">
      {/* VS Code Breadcrumb & Action Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#131622] border-b border-[#202538] text-xs">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 overflow-hidden text-[11px] font-mono text-gray-400">
          <span className="text-gray-500 hidden sm:inline">{folder}</span>
          <span className="text-gray-600 hidden sm:inline">/</span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#1c2133] border border-[#282f49] text-gray-200 font-semibold truncate">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                scriptType === 'ModuleScript'
                  ? 'bg-amber-400'
                  : scriptType === 'ServerScript'
                  ? 'bg-blue-400'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="truncate">{scriptName}</span>
          </div>

          <span
            className={`hidden sm:inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
              scriptType === 'ModuleScript'
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                : scriptType === 'ServerScript'
                ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
            }`}
          >
            {scriptType}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Roblox Studio Syntax Color Toggle */}
          <button
            onClick={() => setHighlightEnabled(!highlightEnabled)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
              highlightEnabled
                ? 'bg-red-950/50 text-red-300 border-red-500/40 shadow-xs'
                : 'bg-[#1b2030] text-gray-400 border-[#2a3147] hover:text-gray-200'
            }`}
            title="Toggle Roblox Studio Dark Theme Syntax Highlighting (local in Red, services in Blue, strings in Green)"
          >
            <Palette className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span className="hidden sm:inline">Roblox Colors</span>
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title="local in Red" />
          </button>

          {/* Strict Typing Toggle */}
          <button
            onClick={toggleStrictMode}
            className={`hidden sm:block px-2 py-1 rounded-lg text-[10px] font-mono transition-colors ${
              code.startsWith('--!strict')
                ? 'bg-purple-900/50 text-purple-300 border border-purple-500/40 font-semibold'
                : 'bg-[#1b2030] text-gray-400 hover:text-gray-200 border border-[#2a3147]'
            }`}
            title="Toggle Luau Typechecker Strict Mode"
          >
            {code.startsWith('--!strict') ? '✓ --!strict' : '+ --!strict'}
          </button>

          {showSearch ? (
            <div className="flex items-center bg-[#090b10] border border-[#2d354f] rounded-lg px-2 py-0.5">
              <Search className="w-3 h-3 text-gray-400 mr-1" />
              <input
                type="text"
                placeholder="Find..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-white focus:outline-none w-20 sm:w-28 placeholder:text-gray-500 font-mono"
                autoFocus
              />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="text-gray-500 hover:text-gray-300 text-xs ml-1"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-[#20263b] rounded-lg transition-colors border border-[#2a3147]"
              title="Search"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-gray-300 hover:text-white bg-[#191e2e] hover:bg-[#232a40] border border-[#2a324b] rounded-lg text-xs transition-colors"
            title="Copy entire Luau script"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1 px-2 py-1 text-gray-300 hover:text-white bg-[#191e2e] hover:bg-[#232a40] border border-[#2a324b] rounded-lg text-xs transition-colors"
            title="Download .luau file"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">.luau</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex flex-1 overflow-hidden font-mono bg-[#0a0c12]">
        {/* Line Numbers with Issue Indicators */}
        <div
          ref={lineNumbersRef}
          className="w-10 sm:w-12 py-3 bg-[#0d0f17] border-r border-[#1a1f2e] text-gray-600 select-none overflow-hidden shrink-0 text-right pr-2 font-mono"
          style={{ fontSize: `${fontSize - 1}px`, lineHeight: `${fontSize * 1.6}px` }}
        >
          {Array.from({ length: totalLines }).map((_, i) => {
            const lineNum = i + 1;
            const lineIssues = issuesByLine.get(lineNum);
            const hasCritical = lineIssues?.some((x) => x.severity === 'critical');
            const hasSecurity = lineIssues?.some((x) => x.severity === 'security');
            const hasWarning = lineIssues?.some((x) => x.severity === 'warning');

            return (
              <div
                key={lineNum}
                className="relative flex items-center justify-end group cursor-pointer"
                style={{ height: `${fontSize * 1.6}px` }}
                onClick={() => lineIssues && onSelectIssue && onSelectIssue(lineIssues[0])}
              >
                {lineIssues && lineIssues.length > 0 && (
                  <span
                    className={`absolute left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full cursor-pointer animate-pulse ${
                      hasCritical
                        ? 'bg-red-500 shadow-sm shadow-red-500'
                        : hasSecurity
                        ? 'bg-purple-500 shadow-sm shadow-purple-500'
                        : hasWarning
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                    }`}
                    title={`${lineIssues.length} issue(s) on line ${lineNum}: ${lineIssues[0].title}`}
                  />
                )}
                <span
                  className={`${
                    lineIssues ? 'text-white font-bold' : 'text-gray-600 group-hover:text-gray-400'
                  }`}
                >
                  {lineNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Text Area Code Editor with Roblox Studio Syntax Coloring */}
        <div className="relative flex-1 h-full overflow-hidden bg-[#090b10]">
          {/* Syntax-highlighted background layer */}
          {highlightEnabled && (
            <pre
              ref={preRef}
              aria-hidden="true"
              className="absolute inset-0 p-3 m-0 font-mono pointer-events-none overflow-hidden whitespace-pre tab-size-4 select-none leading-relaxed"
              style={{
                fontSize: `${fontSize}px`,
                lineHeight: `${fontSize * 1.6}px`,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                letterSpacing: '0px',
              }}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          )}

          {/* Interactive editing layer */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onKeyUp={handleSelectOrKeyUp}
            onClick={handleSelectOrKeyUp}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${fontSize * 1.6}px`,
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              letterSpacing: '0px',
              color: highlightEnabled ? 'transparent' : '#e6edf3',
              caretColor: '#ffffff',
            }}
            className="absolute inset-0 w-full h-full p-3 m-0 bg-transparent font-mono resize-none focus:outline-none focus:ring-0 overflow-auto whitespace-pre tab-size-4 selection:bg-red-600/35 selection:text-white"
            placeholder="-- Write or paste your Roblox Luau script here..."
          />
        </div>
      </div>

      {/* Luadroid Mobile Keyboard Accessory Toolbar */}
      <LuadroidKeyBar
        onInsertText={handleInsertText}
        onIndent={handleIndent}
        fontSize={fontSize}
        onIncreaseFont={onIncreaseFont}
        onDecreaseFont={onDecreaseFont}
        onQuickRun={onQuickRun}
        onQuickFix={onQuickFix}
        isFixing={isFixing}
      />

      {/* VS Code & Roblox Studio Style Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#090b10] border-t border-[#1a1f2e] text-[10px] text-gray-400 font-sans select-none">
        <div className="flex items-center gap-2 sm:gap-3">
          <span>
            Ln <strong className="text-gray-200">{cursorPos.line}</strong>, Col{' '}
            <strong className="text-gray-200">{cursorPos.col}</strong>
          </span>
          <span className="hidden sm:inline">
            Lines: <strong className="text-gray-200">{totalLines}</strong>
          </span>
          <span>UTF-8</span>
          <span className="text-cyan-400 font-semibold">
            Luau
          </span>

          {/* Roblox Studio Color Legend */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-[#202538]">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#F86D7C]" />
              <span className="text-[#F86D7C] font-mono">local (red)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#84D6F7]" />
              <span className="text-[#84D6F7] font-mono">game (blue)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ADDB67]" />
              <span className="text-[#ADDB67] font-mono">"string" (green)</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4EC9B0]" />
              <span className="text-[#4EC9B0] font-mono">::type (teal)</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {issues.length > 0 ? (
            <div className="flex items-center gap-1 text-amber-400 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>{issues.length} Issues</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-emerald-400">
              <span>● Clean</span>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center gap-1 text-blue-400 animate-pulse">
              <Sparkles className="w-3 h-3" />
              <span className="hidden sm:inline">Scanning...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
