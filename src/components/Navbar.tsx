import React, { useState } from 'react';
import {
  FileCode,
  Plus,
  X,
  BookOpen,
  Terminal,
  Command,
  FolderTree,
  ChevronDown,
  Menu,
  Download,
  FolderKanban,
  Check,
  Workflow,
  FolderX,
} from 'lucide-react';
import { ScriptFile, ScriptType, RobloxProject } from '../types/roblox';

interface Props {
  project: RobloxProject;
  projects: RobloxProject[];
  onSelectProject: (id: string) => void;
  onCloseProject: () => void;
  onCreateNewProject: () => void;
  onExportProjectZip: () => void;
  scripts: ScriptFile[];
  activeScriptId: string;
  onSelectScript: (id: string) => void;
  onCloseScript: (id: string, e: React.MouseEvent) => void;
  onOpenGuide: () => void;
  onToggleConsole: () => void;
  onOpenCommands: () => void;
  isConsoleOpen: boolean;
  activeView: 'editor' | 'wiring';
  onSelectView: (view: 'editor' | 'wiring') => void;
  issueCount: number;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<Props> = ({
  project,
  projects,
  onSelectProject,
  onCloseProject,
  onCreateNewProject,
  onExportProjectZip,
  scripts,
  activeScriptId,
  onSelectScript,
  onCloseScript,
  onOpenGuide,
  onToggleConsole,
  onOpenCommands,
  isConsoleOpen,
  activeView,
  onSelectView,
  issueCount,
  onToggleSidebar,
}) => {
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const activeScript = scripts.find((s) => s.id === activeScriptId);

  return (
    <header className="bg-[#12141c] border-b border-[#202538] flex flex-col shrink-0 select-none z-20">
      {/* Top Main Navigation Row */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[#1b1f2e]">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={onToggleSidebar}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#1f2538] rounded-lg md:hidden"
            title="Toggle Explorer"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-zinc-500 to-zinc-700 flex items-center justify-center shadow-lg shadow-zinc-900/30 text-white font-extrabold text-xs sm:text-sm border border-zinc-400/30">
              <span>B</span>
            </div>
            <div className="hidden xs:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xs sm:text-sm text-white tracking-tight">BloxCraft AI</span>
                <span className="px-1 py-0.2 rounded bg-zinc-600/30 text-zinc-400 border border-zinc-500/30 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider">
                  Luau Studio
                </span>
              </div>
            </div>
          </div>

          {/* Project Switcher Dropdown */}
          <div className="relative ml-1 sm:ml-2">
            <button
              onClick={() => setShowProjectDropdown(!showProjectDropdown)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-[#161a27] hover:bg-[#1e2436] text-gray-200 border border-[#272e42] rounded-xl text-xs font-semibold transition-colors"
            >
              <FolderKanban className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="max-w-[110px] sm:max-w-[160px] truncate">{project.name}</span>
              <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            </button>

            {showProjectDropdown && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#141824] border border-[#252c40] rounded-xl shadow-2xl p-2 z-50 animate-in fade-in duration-150">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
                  Switch Roblox Project:
                </div>
                <div className="max-h-56 overflow-y-auto space-y-1 my-1">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectProject(p.id);
                        setShowProjectDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                        p.id === project.id
                          ? 'bg-zinc-600/20 text-zinc-300 font-bold border border-zinc-500/30'
                          : 'text-gray-300 hover:bg-[#1d2334] hover:text-white'
                      }`}
                    >
                      <span className="truncate">{p.name}</span>
                      {p.id === project.id && <Check className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
                    </button>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#222838] flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      onCreateNewProject();
                      setShowProjectDropdown(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-zinc-600 hover:bg-zinc-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>New Project</span>
                  </button>
                  <button
                    onClick={() => {
                      onExportProjectZip();
                      setShowProjectDropdown(false);
                    }}
                    className="p-1.5 text-gray-300 hover:text-white hover:bg-[#20273a] rounded-lg border border-[#272f44]"
                    title="Export Rojo ZIP"
                  >
                    <Download className="w-3.5 h-3.5 text-zinc-400" />
                  </button>
                  <button
                    onClick={() => {
                      onCloseProject();
                      setShowProjectDropdown(false);
                    }}
                    className="p-1.5 text-gray-300 hover:text-white hover:bg-[#20273a] rounded-lg border border-[#272f44]"
                    title="Close project (back to start screen)"
                  >
                    <FolderX className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Mode Switcher */}
          <div className="hidden md:flex items-center bg-[#0a0c12] p-0.5 rounded-xl border border-[#212638] ml-2">
            <button
              onClick={() => onSelectView('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'editor'
                  ? 'bg-[#21273b] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-zinc-400" />
              <span>Editor & Debugger</span>
              {issueCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-500/20 text-zinc-300 font-bold border border-zinc-500/30">
                  {issueCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectView('wiring')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'wiring'
                  ? 'bg-[#21273b] text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Workflow className="w-3.5 h-3.5 text-zinc-400" />
              <span>Wiring</span>
            </button>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Download Entire App Code ZIP for GitHub */}
          <a
            href="/api/download-app-zip"
            download="bloxcraft-roblox-studio-v1.1.zip"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-600/25 hover:bg-zinc-600/40 text-zinc-300 hover:text-white border border-zinc-500/40 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Download full BloxCraft application codebase ZIP (v1.1) to upload to GitHub"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>App v1.1 ZIP</span>
          </a>

          {/* Export Project ZIP */}
          <button
            onClick={onExportProjectZip}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-[#171a26] hover:bg-[#202538] text-gray-300 hover:text-white border border-[#272d42] rounded-xl text-xs font-medium transition-colors"
            title="Download current Roblox project scripts as Rojo ZIP"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden lg:inline">Rojo ZIP</span>
          </button>

          {/* Roblox Studio Explorer Placement Guide */}
          <button
            onClick={onOpenGuide}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-[#171a26] hover:bg-[#202538] text-gray-300 hover:text-white border border-[#272d42] rounded-xl text-xs font-medium transition-colors"
            title="Roblox Studio Explorer placement guide"
          >
            <FolderTree className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden lg:inline">Studio Guide</span>
          </button>

          {/* Command Panel */}
          <button
            onClick={onOpenCommands}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-[#171a26] hover:bg-[#202538] text-gray-300 hover:text-white border border-[#272d42] rounded-xl text-xs font-medium transition-colors"
            title="Command panel (Ctrl+Shift+P)"
          >
            <Command className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden lg:inline">Commands</span>
          </button>

          {/* Toggle Output Console */}
          <button
            onClick={onToggleConsole}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 border rounded-xl text-xs font-medium transition-colors ${
              isConsoleOpen
                ? 'bg-[#23293e] text-white border-zinc-500/40'
                : 'bg-[#171a26] hover:bg-[#202538] text-gray-300 hover:text-white border-[#272d42]'
            }`}
            title="Toggle Output Window"
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden lg:inline">Output</span>
          </button>

        </div>
      </div>

      {/* Script Tabs Bar (Explorer Style) */}
      <div className="flex items-center px-2 bg-[#0d0f17] border-b border-[#1b1f2e] overflow-x-auto text-xs py-1">
        <div className="flex items-center gap-1">
          {scripts.map((script) => {
            const isActive = script.id === activeScriptId;
            return (
              <div
                key={script.id}
                onClick={() => onSelectScript(script.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer border transition-all shrink-0 ${
                  isActive
                    ? 'bg-[#1a1e2e] text-white border-[#2c334b] shadow-sm'
                    : 'bg-[#121520] text-gray-400 hover:text-gray-200 hover:bg-[#161a28] border-transparent'
                }`}
              >
                {/* Script Icon */}
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    script.type === 'ModuleScript'
                      ? 'bg-zinc-400'
                      : script.type === 'ServerScript'
                      ? 'bg-zinc-400'
                      : 'bg-zinc-400'
                  }`}
                />

                <span className="font-mono text-xs truncate max-w-[130px] sm:max-w-[170px]">
                  {script.name}
                </span>

                {scripts.length > 1 && (
                  <button
                    onClick={(e) => onCloseScript(script.id, e)}
                    title="Close tab (file stays in project)"
                    className="p-0.5 rounded text-gray-500 hover:text-white hover:bg-[#262c40] transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};
