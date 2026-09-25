// WelcomeScreen — shown when the workspace has no projects yet.
// Clean start: create a project, import a .zip, or link Ustaad.

import React, { useRef } from 'react';
import { FolderPlus, FileArchive, Bot, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  onNewProject: () => void;
  onImportZip: (file: File) => void;
  isImporting: boolean;
  importError: string | null;
}

export const WelcomeScreen: React.FC<Props> = ({ onNewProject, onImportZip, isImporting, importError }) => {
  const zipInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0c0d12] text-center overflow-y-auto">
      <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-900/40 mb-5">
        <span className="text-3xl font-black text-white">B</span>
      </div>
      <h1 className="text-2xl font-black text-white mb-1">BloxCraft Studio</h1>
      <p className="text-sm text-gray-400 mb-8 max-w-xs">
        A clean coding workspace for Roblox Luau. No sample projects — start your own.
      </p>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={onNewProject}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors shadow-md shadow-red-900/30"
        >
          <FolderPlus className="w-4 h-4" />
          Start a new project
        </button>

        <button
          onClick={() => zipInputRef.current?.click()}
          disabled={isImporting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#171b28] hover:bg-[#1f2436] border border-[#2a3049] text-gray-100 font-bold text-sm transition-colors disabled:opacity-50"
        >
          {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4 text-cyan-400" />}
          {isImporting ? 'Unzipping…' : 'Import project (.zip)'}
        </button>
        <input
          ref={zipInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImportZip(f);
            e.target.value = '';
          }}
        />

        {importError && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-left">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-200">{importError}</p>
          </div>
        )}

        <p className="text-[11px] text-gray-500 leading-relaxed pt-1">
          Import unzips your <span className="text-gray-300 font-mono">.zip</span> and turns every{' '}
          <span className="text-gray-300 font-mono">.luau</span> file into an editable script.
        </p>

        <div className="flex items-center gap-2 pt-3 mt-2 border-t border-[#1c2133] text-left">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            <span className="text-gray-200 font-semibold">Ustaad</span> can write code straight into
            your projects — link him from Files → Connect Muse Assistant.
          </p>
        </div>
      </div>
    </div>
  );
};
