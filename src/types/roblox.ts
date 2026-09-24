export type ScriptType = 'ModuleScript' | 'ServerScript' | 'LocalScript';

export type IssueSeverity = 'critical' | 'warning' | 'security' | 'optimization' | 'style';

export interface RobloxIssue {
  id: string;
  line: number;
  severity: IssueSeverity;
  title: string;
  description: string;
  robloxGotcha: string;
  suggestedFix: string;
}

export interface AnalysisResult {
  summary: string;
  overallHealth: number; // 0-100
  memoryAndPerfRating: string;
  securityRating: string;
  issues: RobloxIssue[];
  quickImprovements: string[];
}

export interface OptimizationItem {
  title: string;
  category: string;
  beforeSnippet?: string;
  afterSnippet?: string;
  explanation: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface OptimizationResult {
  optimizedCode: string;
  summary: string;
  benchmarkEstimatedGain: string;
  optimizations: OptimizationItem[];
}

export interface FixResult {
  fixedCode: string;
  summary: string;
  changes: Array<{
    bug: string;
    fixApplied: string;
    lineApprox?: string;
  }>;
  howToTestInStudio: string;
}

export interface ScriptFile {
  id: string;
  name: string;
  type: ScriptType;
  code: string;
  suggestedPlacement: string;
  folder?: string; // e.g. "src/server", "src/shared", "src/client"
  path?: string;
  modified?: boolean;
}

export type ProjectTemplateId = 'rpg' | 'tycoon' | 'obby' | 'knit' | 'blank';

export interface RobloxProject {
  id: string;
  name: string;
  description: string;
  template: ProjectTemplateId;
  createdAt: number;
  updatedAt: number;
  files: ScriptFile[];
}

export type SidebarTab = 'explorer' | 'search' | 'debugger' | 'optimizer' | 'copilot' | 'projects' | 'settings';

export type MobileTab = 'editor' | 'debugger' | 'optimizer' | 'console' | 'copilot' | 'explorer';

export interface GenerationResult {
  title: string;
  scriptType: ScriptType;
  suggestedPlacement: string;
  code: string;
  overview: string;
  apiReference: Array<{
    name: string;
    description: string;
    params?: string;
    returns?: string;
  }>;
  studioSetupSteps: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
