import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { VSActivityBar } from './components/VSActivityBar';
import { VSExplorerSidebar } from './components/VSExplorerSidebar';
import { CodeEditor } from './components/CodeEditor';
import { DebuggerPanel } from './components/DebuggerPanel';
import { OptimizerPanel } from './components/OptimizerPanel';
import { GeneratorModal } from './components/GeneratorModal';
import { RobloxStudioGuideModal } from './components/RobloxStudioGuideModal';
import { RobloxCoPilot } from './components/RobloxCoPilot';
import { VirtualConsole } from './components/VirtualConsole';
import { NewProjectModal } from './components/NewProjectModal';
import { NewFileModal } from './components/NewFileModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { WiringDiagram } from './components/WiringDiagram';
import { runInstantRobloxLint } from './utils/robloxLinter';
import { exportProjectAsZip } from './utils/projectZipExport';
import { analyzeCode, fixCode, optimizeCode } from './utils/geminiClient';
import {
  INITIAL_PROJECT,
  PROJECT_TEMPLATES,
} from './data/projectTemplates';
import {
  RobloxProject,
  ScriptFile,
  ScriptType,
  RobloxIssue,
  AnalysisResult,
  OptimizationResult,
  FixResult,
  SidebarTab,
  MobileTab,
  ProjectTemplateId,
} from './types/roblox';

const STORAGE_PROJECTS_KEY = 'bloxcraft_ai_projects_v2';
const STORAGE_ACTIVE_PROJECT_KEY = 'bloxcraft_ai_active_project_v2';

export default function App() {
  // 1. Projects State (Loaded from localStorage or initialized with defaults)
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

    // Default with RPG Combat and Tycoon
    const secondTemplate = PROJECT_TEMPLATES.find((t) => t.id === 'tycoon')!;
    const secondProject: RobloxProject = {
      id: 'proj-tycoon-default',
      name: 'Roblox Tycoon Framework',
      description: secondTemplate.description,
      template: 'tycoon',
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
      files: secondTemplate.defaultFiles,
    };
    return [INITIAL_PROJECT, secondProject];
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_ACTIVE_PROJECT_KEY);
      if (saved) return saved;
    } catch (e) {}
    return INITIAL_PROJECT.id;
  });

  // Current active project
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  // Active script file within active project
  const [activeFileId, setActiveFileId] = useState<string>(() => {
    return activeProject.files[0]?.id || '';
  });

  // Keep activeFileId valid if project changes
  useEffect(() => {
    if (!activeProject.files.some((f) => f.id === activeFileId)) {
      setActiveFileId(activeProject.files[0]?.id || '');
    }
  }, [activeProject, activeFileId]);

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
    return activeProject.files.find((f) => f.id === activeFileId) || activeProject.files[0];
  }, [activeProject.files, activeFileId]);

  // 2. UI Layout State (VS Code + Mobile)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('explorer');
  const [activeView, setActiveView] = useState<'editor' | 'optimizer' | 'wiring'>('editor');
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor');
  const [editorFontSize, setEditorFontSize] = useState<number>(13);

  // Modals & Panels
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewFileOpen, setIsNewFileOpen] = useState(false);
  const [newFileDefaultFolder, setNewFileDefaultFolder] = useState<string>('src/shared');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isCoPilotOpen, setIsCoPilotOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  // Analysis and Optimization states per script
  const [analysisResults, setAnalysisResults] = useState<Record<string, AnalysisResult>>({});
  const [optimizationResults, setOptimizationResults] = useState<Record<string, OptimizationResult>>({});
  const [fixResults, setFixResults] = useState<Record<string, FixResult>>({});

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [debuggerError, setDebuggerError] = useState<string | null>(null);

  // 3. Real-Time Roblox Luau Static Linter
  const instantIssues = useMemo(() => {
    if (!activeScript) return [];
    return runInstantRobloxLint(activeScript.code, activeScript.type);
  }, [activeScript?.code, activeScript?.type]);

  // Combine instant lint issues with deep AI issues
  const combinedIssues: RobloxIssue[] = useMemo(() => {
    const deepIssues = (activeScript && analysisResults[activeScript.id]?.issues) || [];
    const issueMap = new Map<string, RobloxIssue>();

    instantIssues.forEach((issue) => {
      issueMap.set(`${issue.line}-${issue.title}`, issue);
    });

    deepIssues.forEach((issue) => {
      const key = `${issue.line}-${issue.title}`;
      if (!issueMap.has(key)) {
        issueMap.set(key, issue);
      }
    });

    return Array.from(issueMap.values()).sort((a, b) => {
      const order = { critical: 0, security: 1, warning: 2, optimization: 3, style: 4 };
      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
    });
  }, [instantIssues, analysisResults, activeScript?.id]);

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

  // Close script tab
  const handleCloseScript = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeProject.files.length <= 1) return;
    const remaining = activeProject.files.filter((f) => f.id !== id);
    setProjects((prev) =>
      prev.map((proj) => (proj.id === activeProject.id ? { ...proj, files: remaining } : proj))
    );
    if (activeFileId === id) {
      setActiveFileId(remaining[0].id);
    }
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
    setActiveFileId(newProj.files[0]?.id || '');
    setActiveSidebarTab('explorer');
    setIsSidebarOpen(true);
  };

  // Delete project
  const handleDeleteProject = (projectId: string) => {
    if (projects.length <= 1) return;
    const nextProjects = projects.filter((p) => p.id !== projectId);
    setProjects(nextProjects);
    if (activeProjectId === projectId) {
      setActiveProjectId(nextProjects[0].id);
      setActiveFileId(nextProjects[0].files[0]?.id || '');
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
    setActiveFileId(newFile.id);
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

  // Delete file
  const handleDeleteFile = (fileId: string) => {
    if (activeProject.files.length <= 1) return;
    const remaining = activeProject.files.filter((f) => f.id !== fileId);
    setProjects((prev) =>
      prev.map((proj) => (proj.id === activeProject.id ? { ...proj, files: remaining } : proj))
    );
    if (activeFileId === fileId) {
      setActiveFileId(remaining[0].id);
    }
  };

  // Insert generated script
  const handleInsertGenerated = (genData: {
    name: string;
    type: ScriptType;
    code: string;
    suggestedPlacement: string;
  }) => {
    const folder =
      genData.type === 'ServerScript'
        ? 'src/server'
        : genData.type === 'LocalScript'
        ? 'src/client'
        : 'src/shared';

    handleAddFile({
      name: genData.name,
      type: genData.type,
      folder,
      code: genData.code,
    });
  };

  // 5. AI Actions (Analyze, Auto-Fix, Optimize)
  const handleRunDeepAnalysis = async () => {
    if (!activeScript) return;
    setIsAnalyzing(true);
    setDebuggerError(null);

    try {
      const data: AnalysisResult = await analyzeCode(
        activeScript.code,
        activeScript.type,
        `Project: ${activeProject.name}, Placement: ${activeScript.suggestedPlacement}`
      );
      setAnalysisResults((prev) => ({ ...prev, [activeScript.id]: data }));
    } catch (err: any) {
      console.error(err);
      setDebuggerError(err.message || 'Analysis temporarily unavailable. Please retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoFix = async (instruction?: string) => {
    if (!activeScript) return;
    setIsFixing(true);
    setDebuggerError(null);

    try {
      const data: FixResult = await fixCode(
        activeScript.code,
        activeScript.type,
        instruction || 'Fix all detected bugs, deprecations, and potential runtime errors'
      );
      setFixResults((prev) => ({ ...prev, [activeScript.id]: data }));
      handleCodeChange(data.fixedCode);
    } catch (err: any) {
      console.error(err);
      setDebuggerError(err.message || 'Auto-fix request failed. Please retry.');
    } finally {
      setIsFixing(false);
    }
  };

  const handleRunOptimization = async (goal: string) => {
    if (!activeScript) return;
    setIsOptimizing(true);

    try {
      const data: OptimizationResult = await optimizeCode(activeScript.code, activeScript.type, goal);
      setOptimizationResults((prev) => ({ ...prev, [activeScript.id]: data }));
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplySingleFix = (issue: RobloxIssue) => {
    if (!issue.suggestedFix || !activeScript) return;
    if (issue.title.includes('Missing "return Module"')) {
      handleCodeChange(`${activeScript.code.trimEnd()}\n\nreturn ${activeScript.name.replace('.luau', '')}\n`);
      return;
    }
    if (issue.title.includes('--!strict')) {
      handleCodeChange(`--!strict\n${activeScript.code}`);
      return;
    }
    handleAutoFix(`Fix this specific issue: ${issue.title} - ${issue.description}`);
  };

  // Quick Run simulation: opens output console
  const handleQuickRun = () => {
    setIsConsoleOpen(true);
    setMobileTab('console');
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0c0d12] text-gray-100 font-sans select-none">
      {/* Top Navbar */}
      <Navbar
        project={activeProject}
        projects={projects}
        onSelectProject={(id) => {
          setActiveProjectId(id);
          const p = projects.find((x) => x.id === id);
          if (p && p.files.length > 0) setActiveFileId(p.files[0].id);
        }}
        onCreateNewProject={() => setIsNewProjectOpen(true)}
        onExportProjectZip={handleExportProjectZip}
        scripts={activeProject.files}
        activeScriptId={activeFileId}
        onSelectScript={(id) => {
          setActiveFileId(id);
          setMobileTab('editor');
        }}
        onCloseScript={handleCloseScript}
        onOpenGenerator={() => setIsGeneratorOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onToggleCoPilot={() => setIsCoPilotOpen(!isCoPilotOpen)}
        onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
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
              if (tab === 'optimizer') setActiveView('optimizer');
              if (tab === 'copilot') setIsCoPilotOpen(true);
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
                setActiveFileId(id);
                setMobileTab('editor');
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              onSelectProject={(id) => {
                setActiveProjectId(id);
                const p = projects.find((x) => x.id === id);
                if (p && p.files.length > 0) setActiveFileId(p.files[0].id);
              }}
              onCreateNewProject={() => setIsNewProjectOpen(true)}
              onDeleteProject={handleDeleteProject}
              onExportProjectZip={handleExportProjectZip}
              onAddFile={(folder) => {
                setNewFileDefaultFolder(folder || 'src/shared');
                setIsNewFileOpen(true);
              }}
              onDeleteFile={handleDeleteFile}
              onRenameFile={handleRenameFile}
              onCloseSidebar={() => setIsSidebarOpen(false)}
              fontSize={editorFontSize}
              onChangeFontSize={setEditorFontSize}
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
              } ${activeView === 'optimizer' ? 'hidden' : ''}`}
            >
              {activeScript && (
                <CodeEditor
                  code={activeScript.code}
                  onChange={handleCodeChange}
                  scriptType={activeScript.type}
                  scriptName={activeScript.name}
                  folder={activeScript.folder || 'src'}
                  issues={combinedIssues}
                  isAnalyzing={isAnalyzing}
                  fontSize={editorFontSize}
                  onIncreaseFont={() => setEditorFontSize((prev) => Math.min(prev + 1, 22))}
                  onDecreaseFont={() => setEditorFontSize((prev) => Math.max(prev - 1, 10))}
                  onQuickRun={handleQuickRun}
                  onQuickFix={() => handleAutoFix()}
                  isFixing={isFixing}
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
                  analysisResult={analysisResults[activeScript?.id || ''] || null}
                  isAnalyzing={isAnalyzing}
                  isFixing={isFixing}
                  errorMessage={debuggerError}
                  onClearError={() => setDebuggerError(null)}
                  onRunDeepAnalysis={handleRunDeepAnalysis}
                  onAutoFix={handleAutoFix}
                  onApplySingleFix={handleApplySingleFix}
                  lastFixResult={fixResults[activeScript?.id || ''] || null}
                  scriptType={activeScript?.type || 'ModuleScript'}
                />
              </div>
            )}

            {/* Luau Optimizer View (Shown when activeView is 'optimizer' or mobileTab is 'optimizer') */}
            {(activeView === 'optimizer' || mobileTab === 'optimizer') && activeScript && (
              <div className="flex-1 flex flex-col min-w-0 h-full">
                <OptimizerPanel
                  code={activeScript.code}
                  scriptType={activeScript.type}
                  optimizationResult={optimizationResults[activeScript.id] || null}
                  isOptimizing={isOptimizing}
                  onRunOptimization={handleRunOptimization}
                  onApplyOptimizedCode={(newCode) => {
                    handleCodeChange(newCode);
                    setActiveView('editor');
                    setMobileTab('editor');
                  }}
                />
              </div>
            )}

            {/* Script Wiring Diagram View (desktop activeView or mobile tab) */}
            {(activeView === 'wiring' || mobileTab === 'wiring') && (
              <div className="flex-1 flex flex-col min-w-0 h-full">
                <WiringDiagram
                  files={activeProject.files}
                  onSelectFile={(id) => {
                    setActiveFileId(id);
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
                  code={activeScript.code}
                  scriptType={activeScript.type}
                  scriptName={activeScript.name}
                  issues={combinedIssues}
                />
              </div>
            )}
          </div>

          {/* Desktop Virtual Roblox Studio Output Console (Bottom Drawer) */}
          {isConsoleOpen && activeScript && (
            <div className="hidden md:block h-52 shrink-0 transition-all">
              <VirtualConsole
                code={activeScript.code}
                scriptType={activeScript.type}
                scriptName={activeScript.name}
                issues={combinedIssues}
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
          } else if (tab === 'copilot') {
            setIsCoPilotOpen(true);
          } else if (tab === 'optimizer') {
            setActiveView('optimizer');
          } else if (tab === 'wiring') {
            setActiveView('wiring');
          } else if (tab === 'editor' || tab === 'debugger') {
            setActiveView('editor');
          }
        }}
        issueCount={combinedIssues.length}
      />

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

      <GeneratorModal
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onAddScript={handleInsertGenerated}
      />

      <RobloxStudioGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        currentScriptType={activeScript?.type || 'ModuleScript'}
        currentScriptName={activeScript?.name || ''}
      />

      <RobloxCoPilot
        isOpen={isCoPilotOpen}
        onClose={() => setIsCoPilotOpen(false)}
        currentCode={activeScript?.code || ''}
        scriptType={activeScript?.type || 'ModuleScript'}
        scriptName={activeScript?.name || ''}
      />
    </div>
  );
}
