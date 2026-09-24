import React from 'react';
import { X, Folder, FileCode, CheckCircle2, Copy, ExternalLink, HelpCircle } from 'lucide-react';
import { ScriptType } from '../types/roblox';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentScriptType: ScriptType;
  currentScriptName: string;
}

export const RobloxStudioGuideModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentScriptType,
  currentScriptName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12141c] border border-[#2b3044] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222738] bg-[#161924]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center">
              <span className="font-bold text-red-400 text-lg">R</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Roblox Studio Hierarchy Guide
              </h2>
              <p className="text-xs text-gray-400">Where to place your Luau scripts in Roblox Explorer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#252a3b] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Active Script Highlight */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/30 via-purple-950/20 to-blue-950/20 border border-red-500/30">
            <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-1">
              Active File: {currentScriptName}
            </div>
            <div className="text-sm text-gray-200">
              This is a <span className="font-bold text-white">{currentScriptType}</span>.{' '}
              {currentScriptType === 'ModuleScript' && (
                <span>
                  Place in <code className="text-amber-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">ReplicatedStorage</code> (shared between Client & Server) or{' '}
                  <code className="text-amber-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">ServerScriptService</code> (server-only).
                </span>
              )}
              {currentScriptType === 'ServerScript' && (
                <span>
                  Place in <code className="text-blue-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">ServerScriptService</code> or inside Workspace models. Never on the client!
                </span>
              )}
              {currentScriptType === 'LocalScript' && (
                <span>
                  Place in <code className="text-emerald-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">StarterPlayer &gt; StarterPlayerScripts</code>,{' '}
                  <code className="text-emerald-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">StarterCharacterScripts</code>, or <code className="text-emerald-300 bg-black/40 px-1.5 py-0.5 rounded font-mono">StarterGui</code>.
                </span>
              )}
            </div>
          </div>

          {/* Explorer Tree Visualizer */}
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <Folder className="w-4 h-4 text-amber-400" /> Roblox Studio Explorer Tree
            </h3>

            <div className="bg-[#0b0c10] border border-[#212638] rounded-xl p-4 font-mono text-xs space-y-2">
              <div className="text-gray-400 flex items-center gap-2">
                <span>📁</span> <strong>game (DataModel)</strong>
              </div>

              {/* Workspace */}
              <div className="pl-4 flex items-center gap-2 text-gray-300">
                <span>📁</span> Workspace
                <span className="text-[10px] text-gray-500 font-sans ml-2">(3D World, Parts, Models, NPCs)</span>
              </div>

              {/* ReplicatedStorage */}
              <div className={`pl-4 flex items-center gap-2 py-1 px-2 rounded ${currentScriptType === 'ModuleScript' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300' : 'text-gray-300'}`}>
                <span>📁</span> ReplicatedStorage
                <span className="text-[10px] text-gray-400 font-sans ml-auto">Shared: Client + Server can require()</span>
              </div>
              <div className="pl-8 text-gray-400 flex items-center gap-2">
                <span>📄</span> <em>ModuleScripts (e.g. Knit Controllers, Types, Config, Math)</em>
              </div>
              <div className="pl-8 text-gray-400 flex items-center gap-2">
                <span>⚡</span> <em>RemoteEvents & RemoteFunctions (Networking bridge)</em>
              </div>

              {/* ServerScriptService */}
              <div className={`pl-4 flex items-center gap-2 py-1 px-2 rounded ${currentScriptType === 'ServerScript' ? 'bg-blue-500/10 border border-blue-500/30 text-blue-300' : 'text-gray-300'}`}>
                <span>📁</span> ServerScriptService
                <span className="text-[10px] text-gray-400 font-sans ml-auto">100% Server Authoritative (Anti-Exploit)</span>
              </div>
              <div className="pl-8 text-gray-400 flex items-center gap-2">
                <span>📜</span> <em>Server Scripts (DataStoreManager, CombatHitbox, Leaderstats)</em>
              </div>

              {/* ServerStorage */}
              <div className="pl-4 flex items-center gap-2 text-gray-300">
                <span>📁</span> ServerStorage
                <span className="text-[10px] text-gray-500 font-sans ml-auto">Server-only assets (Weapons, Maps, Private models)</span>
              </div>

              {/* StarterPlayer */}
              <div className={`pl-4 flex items-center gap-2 py-1 px-2 rounded ${currentScriptType === 'LocalScript' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'text-gray-300'}`}>
                <span>📁</span> StarterPlayer
                <span className="text-[10px] text-gray-400 font-sans ml-auto">Client scripts copied to each joining player</span>
              </div>
              <div className="pl-8 text-gray-400 flex items-center gap-2">
                <span>📁</span> StarterPlayerScripts <em>(Runs once when player joins: UI Controller, Camera)</em>
              </div>
              <div className="pl-8 text-gray-400 flex items-center gap-2">
                <span>📁</span> StarterCharacterScripts <em>(Runs each time character spawns: Dash, Ragdoll)</em>
              </div>
            </div>
          </div>

          {/* Quick Steps to Paste */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 bg-[#171a26] border border-[#252b3d] rounded-xl">
              <div className="text-xs font-bold text-red-400 mb-1">Step 1: Copy Code</div>
              <p className="text-xs text-gray-300">
                Click the <strong className="text-white">"Copy Script"</strong> button in BloxCraft AI.
              </p>
            </div>
            <div className="p-3 bg-[#171a26] border border-[#252b3d] rounded-xl">
              <div className="text-xs font-bold text-red-400 mb-1">Step 2: Create in Studio</div>
              <p className="text-xs text-gray-300">
                Hover over the service in Explorer, click <strong className="text-white">+</strong>, choose <strong className="text-white">{currentScriptType}</strong>.
              </p>
            </div>
            <div className="p-3 bg-[#171a26] border border-[#252b3d] rounded-xl">
              <div className="text-xs font-bold text-red-400 mb-1">Step 3: Paste & Rename</div>
              <p className="text-xs text-gray-300">
                Paste the code with <kbd className="bg-black/50 px-1 py-0.5 rounded text-white font-mono">Ctrl+V</kbd> and rename to <code className="text-amber-300 font-mono">{currentScriptName.replace('.luau', '')}</code>.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#222738] bg-[#161924] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-red-900/30"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
};
