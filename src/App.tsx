import React, { useState, useEffect, useMemo } from 'react';
import { SquareTerminal } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { VSActivityBar } from './components/VSActivityBar';
import { VSExplorerSidebar } from './components/VSExplorerSidebar';
import { CodeEditor } from './components/CodeEditor';
import { DebuggerPanel } from './components/DebuggerPanel';
import { RobloxStudioGuideModal } from './components/RobloxStudioGuideModal';
import { VirtualConsole } from './components/VirtualConsole';
import { NewProjectModal } from './components/NewProjectModal';
import { NewFileModal } from './components/NewFileModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { WiringDiagram } from './components/WiringDiagram';
import { WelcomeScreen } from './components/WelcomeScreen';
import { CommandPanel, type Command } from './components/CommandPanel';
import { GitHubConnectModal } from './components/GitHubConnectModal';
import {
  loadGitHubConfig,
  saveGitHubConfig,
  clearGitHubConfig,
  pushProjectToGitHub,
  pullProjectFromGitHub,
  type GitHubConfig,
} from './utils/githubSync';
import { runInstantRobloxLint } from './utils/robloxLinter';
import { exportProjectAsZip } from './utils/projectZipExport';
import { importProjectFromZip, guessScriptType, suggestedPlacementFor } from './utils/projectZipImport';
import {
  PROJECT_TEMPLATES,
} from './data/projectTemplates';
import {
  RobloxProject,
  ScriptFile,
  ScriptType,
  RobloxIssue,
  SidebarTab,
  MobileTab,
  ProjectTemplateId,
} from './types/roblox';

const STORAGE_PROJECTS_KEY = 'bloxcraft_ai_projects_v2';
const STORAGE_ACTIVE_PROJECT_KEY = 'bloxcraft_ai_active_project_v2';

export default function App() {
  // 1. Projects State (Loaded from localStorage; starts empty — no seed projects)
  const [projects, setProjects] = useState<RobloxProject[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load projects from storage:', e);
    }
    return [];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_PROJECT_KEY);
      if (saved) return saved;
    } catch (e) {}
    return '';
  });

  // Current active project (may be undefined when the workspace is empty)
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  // Active script file within active project
  const [activeFileId, setActiveFileId] = useState<string>(() => {
    return activeProject?.files[0]?.id || '';
  });

  // Open editor tabs (X on a tab closes the tab — it never deletes the file)
  const [openFileIds, setOpenFileIds] = useState<string[]>(() => {
    const first = activeProject?.files[0]?.id;
    return first ? [first] : [];
  });

  // Open a script: make it active and ensure it has a tab
  const openScript = (id: string) => {
    setActiveFileId(id);
    setOpenFileIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  // Keep activeFileId and open tabs valid if project changes
  useEffect(() => {
    if (!activeProject) {
      setOpenFileIds([]);
      return;
    }
    if (!activeProject.files.some((f) => f.id === activeFileId)) {
      const first = activeProject.files[0]?.id || '';
      setActiveFileId(first);
      setOpenFileIds(first ? [first] : []);
    } else {
      setOpenFileIds((prev) => {
        const valid = prev.filter((id) => activeProject.files.some((f) => f.id === id));
        if (valid.length === 0 && activeFileId) return [activeFileId];
        if (!valid.includes(activeFileId) && activeFileId) valid.push(activeFileId);
        return valid;
      });
    }
  }, [activeProject?.id]);

  // Save projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(projects));
      localStorage.setItem(STORAGE_ACTIVE_PROJECT_KEY, activeProjectId);
    } catch (e) {
      console.error('Failed to persist projects:', e);
    }
  }, [projects, activeProjectId]);

  const activeScript = useMemo(() => {
    if (!activeProject) return undefined;
    return activeProject.files.find((f) => f.id === activeFileId) || activeProject.files[0];
  }, [activeProject?.files, activeFileId]);

  // Files currently open as editor tabs (in tab order)
  const openFiles = useMemo(() => {
    if (!activeProject) return [];
    const byId = new Map(activeProject.files.map((f) => [f.id, f]));
    return openFileIds.map((id) => byId.get(id)).filter(Boolean) as typeof activeProject.files;
  }, [activeProject?.files, openFileIds]);

  // 2. UI Layout State (VS Code + Mobile)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('explorer');
  const [activeView, setActiveView] = useState<'editor' | 'wiring'>('editor');
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor');
  const [editorFontSize, setEditorFontSize] = useState<number>(13);

  // Modals & Panels
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewFileOpen, setIsNewFileOpen] = useState(false);
  const [newFileDefaultFolder, setNewFileDefaultFolder] = useState<string>('src/shared');
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // Command panel + GitHub sync + toast
  const [commandOpen, setCommandOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [githubCfg, setGithubCfg] = useState<GitHubConfig | null>(null);
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'err' } | null>(null);
  const cmdZipRef = React.useRef<HTMLInputElement>(null);
  const cmdLuaRef = React.useRef<HTMLInputElement>(null);

  const showToast = (msg: string, kind: 'ok' | 'err' = 'ok') => {
    setToast({ msg, kind });
    window.setTimeout(() => setToast(null), 4500);
  };

  // Load this project's GitHub link whenever the active project changes
  useEffect(() => {
    setGithubCfg(activeProject ? loadGitHubConfig(activeProject.id) : null);
  }, [activeProject?.id]);

  // Ctrl/Cmd+Shift+P toggles the command panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // 3. Real-Time Roblox Luau Static Linter
  const instantIssues = useMemo(() => {
    if (!activeScript) return [];
    return runInstantRobloxLint(activeScript.code, activeScript.type);
  }, [activeScript?.code, activeScript?.type]);

  // Static linter issues for the active script
  const combinedIssues: RobloxIssue[] = useMemo(() => {
    const issueMap = new Map<string, RobloxIssue>();

    instantIssues.forEach((issue) => {
      issueMap.set(`${issue.line}-${issue.title}`, issue);
    });

    return Array.from(issueMap.values()).sort((a, b) => {
      const order = { critical: 0, security: 1, warning: 2, optimization: 3, style: 4 };
      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
    });
  }, [instantIssues]);

  // 4. Code & Project Modification Handlers
  const handleCodeChange = (newCode: string) => {
    if (!activeScript) return;
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProject.id) return proj;
        return {
          ...proj,
          updatedAt: Date.now(),
          files: proj.files.map((file) =>
            file.id === activeScript.id ? { ...file, code: newCode, modified: true } : file
          ),
        };
      })
    );
  };

  // Close a script TAB (never deletes the file — the file stays in the project)
  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenFileIds((prev) => {
      if (prev.length <= 1) return prev; // keep at least one tab open
      const next = prev.filter((f) => f !== id);
      if (activeFileId === id) {
        const closedIdx = prev.indexOf(id);
        setActiveFileId(next[Math.min(closedIdx, next.length - 1)]);
      }
      return next;
    });
  };

  // Close the current project (back to the welcome screen; project is kept)
  const handleCloseProject = () => {
    setActiveProjectId('');
    setActiveFileId('');
    setOpenFileIds([]);
  };

  // Create new project
  const handleCreateNewProject = (name: string, description: string, templateId: ProjectTemplateId) => {
    const templateMeta = PROJECT_TEMPLATES.find((t) => t.id === templateId) || PROJECT_TEMPLATES[0];
    const newProj: RobloxProject = {
      id: `proj-${Date.now()}`,
      name,
      description,
      template: templateId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: templateMeta.defaultFiles.map((f, i) => ({
        ...f,
        id: `f-${Date.now()}-${i}`,
      })),
    };

    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    const firstId = newProj.files[0]?.id || '';
    setActiveFileId(firstId);
    setOpenFileIds(firstId ? [firstId] : []);
    setActiveSidebarTab('explorer');
    setIsSidebarOpen(true);
  };

  // Delete project (workspace may become empty)
  const handleDeleteProject = (projectId: string) => {
    const nextProjects = projects.filter((p) => p.id !== projectId);
    setProjects(nextProjects);
    if (activeProjectId === projectId) {
      const next = nextProjects[0];
      const firstId = next?.files[0]?.id || '';
      setActiveProjectId(next?.id || '');
      setActiveFileId(firstId);
      setOpenFileIds(firstId ? [firstId] : []);
    }
  };

  // Apply a bundle of files Ustaad sent back (updates matching files, creates new ones)
  const handleApplyUstaadBundle = (bundleFiles: import('./utils/museLink').BundleFile[]) => {
    if (!activeProject) return;
    const now = Date.now();
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProject.id) return proj;
        const files = [...proj.files];
        bundleFiles.forEach((bf, i) => {
          const idx = files.findIndex(
            (f) => (f.folder || 'src') === bf.folder && f.name === bf.name
          );
          const suggestedPlacement =
            bf.type === 'ServerScript'
              ? 'ServerScriptService'
              : bf.type === 'LocalScript'
              ? 'StarterPlayerScripts'
              : 'ReplicatedStorage';
          if (idx >= 0) {
            files[idx] = { ...files[idx], code: bf.code, type: bf.type };
          } else {
            files.push({
              id: `f-ustaad-${now}-${i}`,
              name: bf.name,
              type: bf.type,
              folder: bf.folder,
              code: bf.code,
              suggestedPlacement,
            });
          }
        });
        return { ...proj, files, updatedAt: now };
      })
    );
  };
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImportProjectZip = async (zipFile: File) => {
    setIsImporting(true);
    setImportError(null);
    try {
      const proj = await importProjectFromZip(zipFile);
      setProjects((prev) => [proj, ...prev]);
      setActiveProjectId(proj.id);
      const firstId = proj.files[0]?.id || '';
      setActiveFileId(firstId);
      setOpenFileIds(firstId ? [firstId] : []);
      setActiveSidebarTab('explorer');
      setIsSidebarOpen(true);
    } catch (e: any) {
      setImportError(e?.message || 'Could not import that ZIP file.');
    } finally {
      setIsImporting(false);
    }
  };

  // Export project as Rojo ZIP
  const handleExportProjectZip = async () => {
    try {
      const blob = await exportProjectAsZip(activeProject);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeProject.name.toLowerCase().replace(/\s+/g, '_')}_rojo.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Add file to project
  const handleAddFile = (fileData: { name: string; type: ScriptType; folder: string; code: string }) => {
    const newFile: ScriptFile = {
      id: `file-${Date.now()}`,
      name: fileData.name,
      type: fileData.type,
      folder: fileData.folder,
      path: `${fileData.folder}/${fileData.name}`,
      suggestedPlacement:
        fileData.type === 'ModuleScript'
          ? 'ReplicatedStorage.Modules'
          : fileData.type === 'ServerScript'
          ? 'ServerScriptService'
          : 'StarterPlayer.StarterPlayerScripts',
      code: fileData.code,
      modified: true,
    };

    setProjects((prev) =>
      prev.map((proj) =>
        proj.id === activeProject.id
          ? { ...proj, updatedAt: Date.now(), files: [...proj.files, newFile] }
          : proj
      )
    );
    openScript(newFile.id);
  };

  // Rename file
  const handleRenameFile = (fileId: string, newName: string) => {
    const finalName = newName.endsWith('.luau') ? newName : `${newName}.luau`;
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id !== activeProject.id) return proj;
        return {
          ...proj,
          files: proj.files.map((f) => (f.id === fileId ? { ...f, name: finalName } : f)),
        };
      })
    );
  };

  // Delete file (explicit action only — always confirms; never from the tab X)
  const handleDeleteFile = (fileId: string) => {
    if (activeProject.files.length <= 1) return;
    const file = activeProject.files.find((f) => f.id === fileId);
    if (!window.confirm(`Delete "${file?.name || 'this file'}" from the project? This cannot be undone.`)) {
      return;
    }
    const remaining = activeProject.files.filter((f) => f.id !== fileId);
    setProjects((prev) =>
      prev.map((proj) => (proj.id === activeProject.id ? { ...proj, files: remaining } : proj))
    );
    setOpenFileIds((prev) => prev.filter((f) => f !== fileId));
    if (activeFileId === fileId) {
      const nextId = remaining[0].id;
      setActiveFileId(nextId);
      setOpenFileIds((prev) => (prev.includes(nextId) ? prev : [nextId, ...prev]));
    }
  };

  // Apply a local quick-fix for a linter issue (no AI) — actually rewrites the code
  const handleApplySingleFix = (issue: RobloxIssue) => {
    if (!issue.suggestedFix || !activeScript) return;
    if (issue.fixKind === 'append' || issue.title.includes('Missing "return Module"')) {
      const modName = activeScript.name.replace(/\.lua[u]?$/, '').replace(/[^A-Za-z0-9_]/g, '_') || 'Module';
      handleCodeChange(`${activeScript.code.trimEnd()}\n\nreturn ${modName}\n`);
      showToast('Added the missing return statement.');
      return;
    }
    if (issue.fixKind === 'line-replace' && issue.line > 0) {
      const lines = activeScript.code.split('\n');
      if (issue.line <= lines.length) {
        lines[issue.line - 1] = issue.suggestedFix;
        handleCodeChange(lines.join('\n'));
        showToast(`Fixed: ${issue.title}`);
      }
      return;
    }
    showToast('This one needs a manual edit — see the suggested fix.', 'err');
  };

  // Apply every auto-fixable issue in the active file at once (line swaps don't shift lines)
  const handleApplyAllFixes = () => {
    if (!activeScript) return;
    const lines = activeScript.code.split('\n');
    let count = 0;
    combinedIssues.forEach((issue) => {
      if (issue.fixKind === 'line-replace' && issue.line > 0 && issue.line <= lines.length) {
        lines[issue.line - 1] = issue.suggestedFix;
        count++;
      }
    });
    let code = lines.join('\n');
    const needsReturn = combinedIssues.some((i) => i.fixKind === 'append');
    if (needsReturn) {
      const modName = activeScript.name.replace(/\.lua[u]?$/, '').replace(/[^A-Za-z0-9_]/g, '_') || 'Module';
      code = `${code.trimEnd()}\n\nreturn ${modName}\n`;
      count++;
    }
    if (count > 0) {
      handleCodeChange(code);
      showToast(`Applied ${count} automatic fix${count > 1 ? 'es' : ''}.`);
    }
  };

  // Quick Run simulation: opens output console
  const handleQuickRun = () => {
    setIsConsoleOpen(true);
    setMobileTab('console');
  };

  // Import individual .lua/.luau files from device storage into the CURRENT project
  const handleImportLuaFiles = async (fileList: FileList | File[]) => {
    if (!activeProject) return;
    const picked = Array.from(fileList).filter((f) => /\.lua[u]?$/i.test(f.name));
    if (picked.length === 0) {
      showToast('No .lua or .luau files selected.', 'err');
      return;
    }
    const now = Date.now();
    const newFiles: ScriptFile[] = [];
    for (let i = 0; i < picked.length; i++) {
      const f = picked[i];
      const code = await f.text();
      // webkitRelativePath keeps folder structure when a folder is picked
      const relPath = (f as any).webkitRelativePath || f.name;
      const { type, folder } = guessScriptType(relPath);
      newFiles.push({
        id: `f-lua-${now}-${i}`,
        name: f.name,
        type,
        folder,
        code,
        suggestedPlacement: suggestedPlacementFor(type),
      });
    }
    setProjects((prev) =>
      prev.map((proj) =>
        proj.id === activeProject.id
          ? { ...proj, updatedAt: now, files: [...proj.files, ...newFiles] }
          : proj
      )
    );
    openScript(newFiles[0].id);
    setActiveSidebarTab('explorer');
    showToast(`Imported ${newFiles.length} script${newFiles.length > 1 ? 's' : ''} into ${activeProject.name}.`);
  };

  // ---- Command panel ----
  const commands: Command[] = [
    { id: 'new-project', title: 'New Project', group: 'Project', hint: 'start blank' },
    { id: 'close-project', title: 'Close Project', group: 'Project', hint: 'back to start' },
    { id: 'import-zip', title: 'Import Project from ZIP', group: 'Project', hint: '.zip' },
    { id: 'import-lua', title: 'Import .lua Files from Storage', group: 'Project', hint: 'into this project' },
    { id: 'export-zip', title: 'Export Project as ZIP', group: 'Project', hint: 'rojo' },
    {
      id: 'github-connect',
      title: githubCfg ? `GitHub: Reconnect (${githubCfg.owner}/${githubCfg.repo})` : 'GitHub: Connect Repository',
      group: 'GitHub',
    },
    { id: 'github-push', title: 'GitHub: Push / Sync to GitHub', group: 'GitHub', hint: githubCfg ? `${githubCfg.owner}/${githubCfg.repo}:${githubCfg.branch}` : 'not connected' },
    { id: 'github-pull', title: 'GitHub: Pull from GitHub', group: 'GitHub', hint: githubCfg ? `${githubCfg.owner}/${githubCfg.repo}:${githubCfg.branch}` : 'not connected' },
    { id: 'run', title: 'Run Project', group: 'Run', hint: 'console' },
    { id: 'goto-editor', title: 'Go to: Editor', group: 'Go to' },
    { id: 'goto-wiring', title: 'Go to: Wiring', group: 'Go to' },
    { id: 'goto-files', title: 'Go to: Files', group: 'Go to' },
    { id: 'goto-bugs', title: 'Go to: Bugs', group: 'Go to' },
    { id: 'goto-output', title: 'Go to: Output', group: 'Go to' },
    { id: 'send-ustaad', title: 'Send Project to Ustaad', group: 'Ustaad' },
  ];

  const handleGitHubPush = async () => {
    if (!githubCfg) {
      setGithubModalOpen(true);
      return;
    }
    showToast('Pushing to GitHub…');
    try {
      const sha = await pushProjectToGitHub(activeProject, githubCfg);
      showToast(`Pushed to ${githubCfg.owner}/${githubCfg.repo} (${sha.slice(0, 7)})`);
    } catch (e: any) {
      showToast(e?.message || 'Push failed.', 'err');
    }
  };

  const handleGitHubPull = async () => {
    if (!githubCfg) {
      setGithubModalOpen(true);
      return;
    }
    showToast('Pulling from GitHub…');
    try {
      const pulled = await pullProjectFromGitHub(githubCfg);
      const ok = window.confirm(
        `Replace this project's files with ${pulled.length} script(s) from ${githubCfg.owner}/${githubCfg.repo}? This cannot be undone.`
      );
      if (!ok) return;
      const now = Date.now();
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== activeProject.id) return proj;
          return {
            ...proj,
            updatedAt: now,
            files: pulled.map((pf, i) => {
              const type = /server/i.test(pf.folder) ? 'ServerScript' : /client/i.test(pf.folder) ? 'LocalScript' : 'ModuleScript';
              return {
                id: `f-pull-${now}-${i}`,
                name: pf.name,
                type,
                folder: pf.folder,
                code: pf.code,
                suggestedPlacement:
                  type === 'ServerScript' ? 'ServerScriptService' : type === 'LocalScript' ? 'StarterPlayerScripts' : 'ReplicatedStorage',
              };
            }),
          };
        })
      );
      showToast(`Pulled ${pulled.length} script(s) from GitHub.`);
    } catch (e: any) {
      showToast(e?.message || 'Pull failed.', 'err');
    }
  };

  const runCommand = (id: string) => {
    switch (id) {
      case 'new-project':
        setIsNewProjectOpen(true);
        break;
      case 'close-project':
        handleCloseProject();
        break;
      case 'import-zip':
        cmdZipRef.current?.click();
        break;
      case 'import-lua':
        cmdLuaRef.current?.click();
        break;
      case 'export-zip':
        handleExportProjectZip();
        break;
      case 'github-connect':
        setGithubModalOpen(true);
        break;
      case 'github-push':
        handleGitHubPush();
        break;
      case 'github-pull':
        handleGitHubPull();
        break;
      case 'run':
        handleQuickRun();
        break;
      case 'goto-editor':
        setActiveView('editor');
        setMobileTab('editor');
        break;
      case 'goto-wiring':
        setActiveView('wiring');
        setMobileTab('wiring');
        break;
      case 'goto-files':
        setActiveSidebarTab('explorer');
        setIsSidebarOpen(true);
        setMobileTab('explorer');
        break;
      case 'goto-bugs':
        setActiveView('editor');
        setMobileTab('debugger');
        break;
      case 'goto-output':
        setIsConsoleOpen(true);
        setMobileTab('console');
        break;
      case 'send-ustaad':
        setActiveSidebarTab('settings');
        setIsSidebarOpen(true);
        break;
    }
  };

  // Empty workspace: no seed projects — clean start screen
  if (!activeProject) {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0d12] text-gray-100 font-sans select-none">
        <WelcomeScreen
          onNewProject={() => setIsNewProjectOpen(true)}
          onImportZip={handleImportProjectZip}
          isImporting={isImporting}
          importError={importError}
        />
        <NewProjectModal
          isOpen={isNewProjectOpen}
          onClose={() => setIsNewProjectOpen(false)}
          onCreateProject={handleCreateNewProject}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0d12] text-gray-100 font-sans select-none">
      {/* Top Navbar */}
      <Navbar
        project={activeProject}
        projects={projects}
        onSelectProject={(id) => {
          setActiveProjectId(id);
          const p = projects.find((x) => x.id === id);
          const firstId = p?.files[0]?.id || '';
          if (p && p.files.length > 0) {
            setActiveFileId(firstId);
            setOpenFileIds([firstId]);
          }
        }}
        onCloseProject={handleCloseProject}
        onCreateNewProject={() => setIsNewProjectOpen(true)}
        onExportProjectZip={handleExportProjectZip}
        scripts={openFiles}
        activeScriptId={activeFileId}
        onSelectScript={(id) => {
          openScript(id);
          setMobileTab('editor');
        }}
        onCloseScript={handleCloseTab}
        onOpenGuide={() => setIsGuideOpen(true)}
        onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
        onOpenCommands={() => setCommandOpen(true)}
        isConsoleOpen={isConsoleOpen}
        activeView={activeView}
        onSelectView={setActiveView}
        issueCount={combinedIssues.length}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* Main Studio Body: VS Activity Bar + Explorer Sidebar + Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Leftmost VS Code Activity Bar (Desktop) */}
        <div className="hidden md:flex">
          <VSActivityBar
            activeTab={activeSidebarTab}
            onSelectTab={(tab) => {
              setActiveSidebarTab(tab);
              setIsSidebarOpen(true);
              if (tab === 'debugger') setActiveView('editor');
            }}
            issueCount={combinedIssues.length}
            isOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          />
        </div>

        {/* Collapsible VS Code Explorer / Projects Sidebar */}
        {isSidebarOpen && (
          <div
            className={`fixed inset-y-0 left-0 z-40 md:static md:z-auto transition-transform duration-200 ${
              isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <VSExplorerSidebar
              activeTab={activeSidebarTab}
              project={activeProject}
              projects={projects}
              activeFileId={activeFileId}
              onSelectFile={(id) => {
                openScript(id);
                setMobileTab('editor');
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              onSelectProject={(id) => {
                setActiveProjectId(id);
                const p = projects.find((x) => x.id === id);
                const firstId = p?.files[0]?.id || '';
                if (p && p.files.length > 0) {
                  setActiveFileId(firstId);
                  setOpenFileIds([firstId]);
                }
              }}
              onCreateNewProject={() => setIsNewProjectOpen(true)}
              onDeleteProject={handleDeleteProject}
              onExportProjectZip={handleExportProjectZip}
              onImportProjectZip={handleImportProjectZip}
              onImportLuaFiles={handleImportLuaFiles}
              onApplyAICode={handleCodeChange}
              onApplyBundle={handleApplyUstaadBundle}
              onAddFile={(folder) => {
                setNewFileDefaultFolder(folder || 'src/shared');
                setIsNewFileOpen(true);
              }}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
              onCloseSidebar={() => setIsSidebarOpen(false)}
              fontSize={editorFontSize}
              onChangeFontSize={setEditorFontSize}
              onSelectTab={(tab) => {
                setActiveSidebarTab(tab);
                setIsSidebarOpen(true);
              }}
            />
          </div>
        )}

        {/* Backdrop on mobile when sidebar is open */}
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-xs"
          />
        )}

        {/* Central Workspace Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden p-2 sm:p-3 gap-2">
          {/* Desktop Dual-Pane Layout OR Mobile Tab Switcher */}
          <div className="flex-1 flex min-w-0 h-full overflow-hidden gap-3">
            {/* Editor Pane (Always visible on desktop when activeView is editor; shown on mobile if mobileTab is 'editor') */}
            <div
              className={`flex-1 flex flex-col min-w-0 h-full ${
                mobileTab === 'editor' ? 'flex' : 'hidden md:flex'
              }`}
            >
              {activeScript && (
                <CodeEditor
                  code={activeScript.code}
                  onChange={handleCodeChange}
                  scriptType={activeScript.type}
                  scriptName={activeScript.name}
                  folder={activeScript.folder || 'src'}
                  issues={combinedIssues}
                  fontSize={editorFontSize}
                  onIncreaseFont={() => setEditorFontSize((prev) => Math.min(prev + 1, 22))}
                  onDecreaseFont={() => setEditorFontSize((prev) => Math.max(prev - 1, 10))}
                  onQuickRun={handleQuickRun}
                />
              )}
            </div>

            {/* Debugger Panel (Visible on desktop right side, or on mobile when mobileTab is 'debugger') */}
            {activeView === 'editor' && (
              <div
                className={`w-full md:w-[380px] lg:w-[440px] flex flex-col shrink-0 h-full ${
                  mobileTab === 'debugger' ? 'flex' : 'hidden md:flex'
                }`}
              >
                <DebuggerPanel
                  issues={combinedIssues}
                  onApplySingleFix={handleApplySingleFix}
                  onApplyAllFixes={handleApplyAllFixes}
                  scriptType={activeScript?.type || 'ModuleScript'}
                />
              </div>
            )}

            {/* Script Wiring Diagram View (desktop activeView or mobile tab) */}
            {(activeView === 'wiring' || mobileTab === 'wiring') && (
              <div className="flex-1 flex flex-col min-w-0 h-full">
                <WiringDiagram
                  files={activeProject.files}
                  onSelectFile={(id) => {
                    openScript(id);
                    setActiveView('editor');
                    setMobileTab('editor');
                  }}
                  onClose={() => {
                    setActiveView('editor');
                    if (mobileTab === 'wiring') setMobileTab('editor');
                  }}
                />
              </div>
            )}

            {/* Mobile Output Console Tab */}
            {mobileTab === 'console' && activeScript && (
              <div className="flex-1 flex flex-col min-w-0 h-full md:hidden">
                <VirtualConsole
                  file={activeScript}
                  files={activeProject.files}
                />
              </div>
            )}
          </div>

          {/* Desktop Virtual Roblox Studio Output Console (Bottom Drawer) */}
          {isConsoleOpen && activeScript && (
            <div className="hidden md:block h-52 shrink-0 transition-all">
              <VirtualConsole
                file={activeScript}
                files={activeProject.files}
              />
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation (Phones < 768px) */}
      <MobileBottomNav
        activeTab={mobileTab}
        onSelectTab={(tab) => {
          setMobileTab(tab);
          if (tab === 'explorer') {
            setActiveSidebarTab('explorer');
            setIsSidebarOpen(true);
          } else if (tab === 'wiring') {
            setActiveView('wiring');
          } else if (tab === 'editor' || tab === 'debugger') {
            setActiveView('editor');
          }
        }}
        issueCount={combinedIssues.length}
      />

      {/* Floating command button (mobile only — commands moved out of the bottom nav) */}
      <button
        onClick={() => setCommandOpen(true)}
        title="Commands"
        className="md:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-[#21273b] border border-[#2c334b] text-white shadow-xl flex items-center justify-center active:scale-95 transition-transform"
      >
        <SquareTerminal className="w-5 h-5" />
      </button>

      {/* Modals & Slide-ins */}
      <NewProjectModal
        isOpen={isNewProjectOpen}
        onClose={() => setIsNewProjectOpen(false)}
        onCreateProject={handleCreateNewProject}
      />

      <NewFileModal
        isOpen={isNewFileOpen}
        onClose={() => setIsNewFileOpen(false)}
        defaultFolder={newFileDefaultFolder}
        onAddFile={handleAddFile}
      />

      <RobloxStudioGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        currentScriptType={activeScript?.type || 'ModuleScript'}
        currentScriptName={activeScript?.name || ''}
      />

      {/* Command panel (Ctrl+Shift+P) */}
      <CommandPanel
        isOpen={commandOpen}
        onClose={() => setCommandOpen(false)}
        commands={commands}
        onRun={runCommand}
      />

      {/* GitHub connect */}
      <GitHubConnectModal
        isOpen={githubModalOpen}
        onClose={() => setGithubModalOpen(false)}
        projectName={activeProject.name}
        existing={githubCfg}
        onSave={(cfg) => {
          saveGitHubConfig(activeProject.id, cfg);
          setGithubCfg(cfg);
          showToast(`Connected to ${cfg.owner}/${cfg.repo}:${cfg.branch}`);
        }}
        onDisconnect={() => {
          clearGitHubConfig(activeProject.id);
          setGithubCfg(null);
          showToast('GitHub repo disconnected.');
        }}
      />

      {/* Hidden ZIP picker for the command panel */}
      <input
        ref={cmdZipRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleImportProjectZip(f);
          e.target.value = '';
        }}
      />

      {/* Hidden .lua picker for the command panel */}
      <input
        ref={cmdLuaRef}
        type="file"
        accept=".lua,.luau"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) handleImportLuaFiles(e.target.files);
          e.target.value = '';
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xl border max-w-[90vw] text-center ${
            toast.kind === 'ok'
              ? 'bg-zinc-950/95 border-zinc-500/40 text-zinc-200'
              : 'bg-zinc-950/95 border-zinc-500/40 text-zinc-200'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
