import React, { useState } from 'react';
import { X, FolderPlus, Sparkles, Check } from 'lucide-react';
import { ProjectTemplateId } from '../types/roblox';
import { PROJECT_TEMPLATES } from '../data/projectTemplates';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (name: string, description: string, templateId: ProjectTemplateId) => void;
}

export const NewProjectModal: React.FC<Props> = ({ isOpen, onClose, onCreateProject }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ProjectTemplateId>('rpg');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for your project');
      return;
    }

    const templateMeta = PROJECT_TEMPLATES.find((t) => t.id === selectedTemplate);
    const desc = description.trim() || templateMeta?.description || 'Roblox game project';

    onCreateProject(name.trim(), desc, selectedTemplate);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#12141c] border border-[#2b3044] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222738] bg-[#161924]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-600/20 border border-zinc-500/30 flex items-center justify-center text-zinc-400">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Create New Roblox Project</h2>
              <p className="text-xs text-gray-400">Initialize a multi-script Roblox Luau game architecture</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#252a3b] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Project Name:
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g. DungeonCrawler, CyberTycoon, TowerDefense"
              className="w-full bg-[#0d0f17] border border-[#262c40] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-zinc-500/50"
              autoFocus
            />
            {error && <p className="text-xs text-zinc-400 mt-1">{error}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
              Project Description (Optional):
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Multiplayer combat with DataStore saves and customizable weapons"
              className="w-full bg-[#0d0f17] border border-[#262c40] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-zinc-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Select Game Architecture Starter:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PROJECT_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-950/20 border-zinc-500/50 shadow-md ring-1 ring-zinc-500/30'
                        : 'bg-[#151926] border-[#222738] hover:border-[#2f374e]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-white">{tmpl.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-gray-400 font-mono">
                        {tmpl.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2">{tmpl.description}</p>
                    <div className="mt-2 text-[10px] text-gray-500 font-mono">
                      Includes {tmpl.defaultFiles.length} scripts
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-[#222738] flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-zinc-900/30 transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
