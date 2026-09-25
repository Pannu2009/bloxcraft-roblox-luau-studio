import React, { useState } from 'react';
import { X, FilePlus2, Check } from 'lucide-react';
import { ScriptType } from '../types/roblox';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultFolder?: string;
  onAddFile: (file: { name: string; type: ScriptType; folder: string; code: string }) => void;
}

export const NewFileModal: React.FC<Props> = ({ isOpen, onClose, defaultFolder, onAddFile }) => {
  const [fileName, setFileName] = useState('');
  const [scriptType, setScriptType] = useState<ScriptType>('ModuleScript');
  const [folder, setFolder] = useState(defaultFolder || 'src/shared');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) {
      setError('File name is required');
      return;
    }

    let finalName = fileName.trim();
    if (!finalName.endsWith('.luau')) {
      finalName = `${finalName}.luau`;
    }

    const defaultCode =
      scriptType === 'ModuleScript'
        ? `--!strict\n-- ${finalName}\nlocal Module = {}\nModule.__index = Module\n\nfunction Module.new()\n    local self = setmetatable({}, Module)\n    return self\nend\n\nreturn Module\n`
        : scriptType === 'ServerScript'
        ? `--!strict\n-- ${finalName} (Server)\nlocal Players = game:GetService("Players")\n\nprint("${finalName} initialized on server")\n`
        : `--!strict\n-- ${finalName} (Client)\nlocal Players = game:GetService("Players")\nlocal player = Players.LocalPlayer\n\nprint("${finalName} initialized on client")\n`;

    onAddFile({
      name: finalName,
      type: scriptType,
      folder,
      code: defaultCode,
    });

    setFileName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12141c] border border-[#2b3044] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#222738] bg-[#161924]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-600/20 border border-zinc-500/30 flex items-center justify-center text-zinc-400">
              <FilePlus2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add New Luau Script</h2>
              <p className="text-[11px] text-gray-400">Create a new script in your project tree</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#252a3b] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Script Name:
            </label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => {
                setFileName(e.target.value);
                setError('');
              }}
              placeholder="e.g. WeaponService or InventoryController"
              className="w-full bg-[#0d0f17] border border-[#262c40] rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-zinc-500/50 font-mono"
              autoFocus
            />
            {error && <p className="text-xs text-zinc-400 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Script Type:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['ModuleScript', 'ServerScript', 'LocalScript'] as ScriptType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setScriptType(type)}
                  className={`p-2 rounded-xl text-xs font-bold transition-all border ${
                    scriptType === type
                      ? type === 'ModuleScript'
                        ? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/50'
                        : type === 'ServerScript'
                        ? 'bg-zinc-500/20 text-zinc-300 border-zinc-500/50'
                        : 'bg-zinc-500/20 text-zinc-300 border-zinc-500/50'
                      : 'bg-[#161a27] text-gray-400 border-[#242a3d]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1">
              Folder Placement (Rojo):
            </label>
            <select
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              className="w-full bg-[#161a27] border border-[#242a3d] rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none"
            >
              <option value="src/server">src/server (ServerScriptService)</option>
              <option value="src/shared">src/shared (ReplicatedStorage)</option>
              <option value="src/client">src/client (StarterPlayerScripts)</option>
            </select>
          </div>

          <div className="pt-3 border-t border-[#222738] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-zinc-600 hover:bg-zinc-500 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
            >
              Create Script
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
