import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  Plus,
  Trash2,
  Edit2,
  Download,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Check,
  X,
  FilePlus2,
  Settings,
  Sparkles,
  ExternalLink,
  Bot,
} from 'lucide-react';
import { RobloxProject, ScriptFile, ScriptType, SidebarTab } from '../types/roblox';
import { MuseConnect } from './MuseConnect';

interface Props {
  activeTab: SidebarTab;
  project: RobloxProject;
  projects: RobloxProject[];
  activeFileId: string;
  onSelectFile: (fileId: string) => void;
  onSelectProject: (projectId: string) => void;
  onCreateNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
  onExportProjectZip: () => void;
  onAddFile: (folder?: string) => void;
  onDeleteFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onCloseSidebar: () => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  onSelectTab: (tab: SidebarTab) => void;
}

export const VSExplorerSidebar: React.FC<Props> = ({
  activeTab,
  project,
  projects,
  activeFileId,
  onSelectFile,
  onSelectProject,
  onCreateNewProject,
  onDeleteProject,
  onExportProjectZip,
  onAddFile,
  onDeleteFile,
  onRenameFile,
  onCloseSidebar,
  fontSize,
  onChangeFontSize,
  onSelectTab,
}) => {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Group files by folder
  const groupedFiles = React.useMemo(() => {
    const map: Record<string, ScriptFile[]> = {
      'src/server': [],
      'src/shared': [],
      'src/client': [],
      other: [],
    };

    project.files.forEach((file) => {
      const folder = file.folder || 'other';
      if (!map[folder]) {
        map[folder] = [];
      }
      map[folder].push(file);
    });

    return map;
  }, [project.files]);

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const handleStartRename = (file: ScriptFile, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setRenameValue(file.name);
  };

  const handleSaveRename = (fileId: string) => {
    if (renameValue.trim()) {
      onRenameFile(fileId, renameValue.trim());
    }
    setEditingFileId(null);
  };

  return (
    <div className="w-64 bg-[#0d0f17] border-r border-[#1a1f2e] flex flex-col h-full shrink-0 select-none z-10 text-xs">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-[#11141e] border-b border-[#1b2030]">
        <span className="font-bold text-[11px] uppercase tracking-wider text-gray-400">
          {activeTab === 'explorer' && 'Explorer'}
          {activeTab === 'projects' && 'Projects Workspace'}
          {activeTab === 'settings' && 'Studio Settings'}
        </span>

        <div className="flex items-center gap-1">
          {activeTab === 'explorer' && (
            <>
              <button
                onClick={() => onAddFile()}
                className="p-1 text-gray-400 hover:text-white hover:bg-[#1f2538] rounded"
                title="New Luau Script"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onExportProjectZip}
                className="p-1 text-gray-400 hover:text-white hover:bg-[#1f2538] rounded"
                title="Download Project as Rojo ZIP"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {activeTab === 'projects' && (
            <button
              onClick={onCreateNewProject}
              className="p-1 text-gray-400 hover:text-white hover:bg-[#1f2538] rounded flex items-center gap-1"
              title="Create New Project"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={onCloseSidebar}
            className="p-1 text-gray-500 hover:text-gray-300 md:hidden"
            title="Close sidebar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Explorer Content */}
      {activeTab === 'explorer' && (
        <>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Project Title Header */}
          <div className="px-2 py-1 mb-2 rounded-lg bg-[#141824] border border-[#21273a] flex items-center justify-between">
            <div className="flex items-center gap-1.5 truncate">
              <FolderKanban className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="font-bold text-gray-200 truncate">{project.name}</span>
            </div>
            <span className="text-[10px] text-gray-400 font-mono shrink-0">
              {project.files.length} files
            </span>
          </div>

          {/* Folders and Files Tree */}
          {Object.entries(groupedFiles).map(([folderName, files]) => {
            if (files.length === 0 && folderName === 'other') return null;
            const isCollapsed = collapsedFolders[folderName];

            return (
              <div key={folderName} className="space-y-0.5">
                {/* Folder Header */}
                <div
                  onClick={() => toggleFolder(folderName)}
                  className="flex items-center justify-between px-2 py-1 rounded cursor-pointer text-gray-400 hover:text-gray-200 hover:bg-[#151926] font-mono text-[11px]"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3 shrink-0 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-3 h-3 shrink-0 text-gray-500" />
                    )}
                    {isCollapsed ? (
                      <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    ) : (
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="font-semibold">{folderName}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddFile(folderName);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-white p-0.5"
                    title={`Add script to ${folderName}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Folder Files */}
                {!isCollapsed && (
                  <div className="pl-4 space-y-0.5 border-l border-[#1c2233] ml-2.5 my-0.5">
                    {files.map((file) => {
                      const isActive = file.id === activeFileId;
                      const isEditing = editingFileId === file.id;

                      return (
                        <div
                          key={file.id}
                          onClick={() => onSelectFile(file.id)}
                          className={`group flex items-center justify-between px-2 py-1 rounded cursor-pointer transition-colors text-[11px] font-mono ${
                            isActive
                              ? 'bg-[#1b2133] text-white font-semibold'
                              : 'text-gray-300 hover:text-white hover:bg-[#141824]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate flex-1 mr-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                file.type === 'ModuleScript'
                                  ? 'bg-amber-400'
                                  : file.type === 'ServerScript'
                                  ? 'bg-blue-400'
                                  : 'bg-emerald-400'
                              }`}
                            />

                            {isEditing ? (
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(file.id);
                                  if (e.key === 'Escape') setEditingFileId(null);
                                }}
                                onBlur={() => handleSaveRename(file.id)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                className="bg-[#0b0c10] border border-blue-500 rounded px-1 py-0.2 text-[11px] text-white focus:outline-none w-full"
                              />
                            ) : (
                              <span className="truncate">{file.name}</span>
                            )}
                          </div>

                          {!isEditing && (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => handleStartRename(file, e)}
                                className="p-0.5 text-gray-400 hover:text-white"
                                title="Rename"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                              {project.files.length > 1 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteFile(file.id);
                                  }}
                                  className="p-0.5 text-gray-400 hover:text-red-400"
                                  title="Delete"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Mobile shortcut to Studio Settings (Muse connect lives there) */}
        <div className="p-2 border-t border-[#1a1f2e] md:hidden">
          <button
            onClick={() => onSelectTab('settings')}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-violet-600/20 border border-violet-500/40 text-violet-200 text-xs font-bold"
          >
            <Bot className="w-3.5 h-3.5" />
            Connect Muse Assistant
          </button>
        </div>
        </>
      )}

      {/* Projects Manager Content */}
      {activeTab === 'projects' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-300 text-xs">Your Projects ({projects.length})</span>
            <button
              onClick={onCreateNewProject}
              className="flex items-center gap-1 px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3 h-3" />
              <span>New</span>
            </button>
          </div>

          <div className="space-y-2">
            {projects.map((proj) => {
              const isCurrent = proj.id === project.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    isCurrent
                      ? 'bg-[#181d2c] border-red-500/50 shadow-md'
                      : 'bg-[#121520] border-[#222738] hover:border-[#31394f]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-gray-100 text-xs truncate">{proj.name}</span>
                    {isCurrent && (
                      <span className="px-1.5 py-0.2 rounded bg-red-600/30 text-red-300 text-[10px] font-bold border border-red-500/30">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-2 mb-2">{proj.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono pt-1 border-t border-[#1e2333]">
                    <span>{proj.files.length} scripts</span>
                    {projects.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteProject(proj.id);
                        }}
                        className="text-gray-500 hover:text-red-400 font-sans"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Export Project Button */}
          <div className="pt-2">
            <button
              onClick={onExportProjectZip}
              className="w-full flex items-center justify-center gap-1.5 p-2 bg-[#171a26] hover:bg-[#202538] text-gray-200 border border-[#272d42] rounded-xl text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export {project.name} as ZIP</span>
            </button>
          </div>
        </div>
      )}

      {/* Settings Content */}
      {activeTab === 'settings' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2">Editor Font Size:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="10"
                max="22"
                value={fontSize}
                onChange={(e) => onChangeFontSize(Number(e.target.value))}
                className="w-full accent-red-600"
              />
              <span className="font-mono text-gray-300 text-xs w-8">{fontSize}px</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#121520] border border-[#222738] space-y-2">
            <span className="text-xs font-bold text-gray-200 block">Roblox Engine Configuration:</span>
            <div className="text-[11px] text-gray-400 space-y-1">
              <div>• Language: <strong>Luau 0.600+</strong></div>
              <div>• Scheduler: <strong>Task Library (60Hz)</strong></div>
              <div>• Project format: <strong>Rojo compatible</strong></div>
            </div>
          </div>

          <MuseConnect project={project} />
        </div>
      )}
    </div>
  );
};
