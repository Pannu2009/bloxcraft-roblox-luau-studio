import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Wrench,
  Sparkles,
  ArrowRight,
  Info,
  Bug,
  RefreshCw,
} from 'lucide-react';
import { RobloxIssue, AnalysisResult, ScriptType, FixResult } from '../types/roblox';

interface Props {
  issues: RobloxIssue[];
  analysisResult: AnalysisResult | null;
  isAnalyzing: boolean;
  isFixing: boolean;
  errorMessage?: string | null;
  onClearError?: () => void;
  onRunDeepAnalysis: () => void;
  onAutoFix: (instruction?: string) => void;
  onApplySingleFix?: (issue: RobloxIssue) => void;
  lastFixResult: FixResult | null;
  scriptType: ScriptType;
}

export const DebuggerPanel: React.FC<Props> = ({
  issues,
  analysisResult,
  isAnalyzing,
  isFixing,
  errorMessage,
  onClearError,
  onRunDeepAnalysis,
  onAutoFix,
  onApplySingleFix,
  lastFixResult,
  scriptType,
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'security' | 'warning' | 'optimization'>('all');
  const [customFixPrompt, setCustomFixPrompt] = useState('');
  const [showCustomPrompt, setShowCustomPrompt] = useState(false);

  const healthScore = analysisResult
    ? analysisResult.overallHealth
    : Math.max(10, 100 - issues.length * 15);

  const criticalCount = issues.filter((i) => i.severity === 'critical').length;
  const securityCount = issues.filter((i) => i.severity === 'security').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const optCount = issues.filter((i) => i.severity === 'optimization' || i.severity === 'style').length;

  const filteredIssues = issues.filter((issue) => {
    if (filter === 'critical') return issue.severity === 'critical';
    if (filter === 'security') return issue.severity === 'security';
    if (filter === 'warning') return issue.severity === 'warning';
    if (filter === 'optimization') return issue.severity === 'optimization' || issue.severity === 'style';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#0d0f17] border border-[#202538] rounded-xl overflow-hidden shadow-xl">
      {/* Top Header */}
      <div className="p-4 bg-[#131622] border-b border-[#202538] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-600/20 border border-red-500/30 rounded-lg text-red-400">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Roblox Luau Debugger & Bug Finder
              </h2>
              <p className="text-[11px] text-gray-400">Real-time static linter & Gemini deep engine inspector</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRunDeepAnalysis}
              disabled={isAnalyzing || isFixing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Inspecting...' : 'Deep AI Scan'}</span>
            </button>

            <button
              onClick={() => onAutoFix()}
              disabled={isFixing || issues.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-red-900/30 disabled:opacity-40"
            >
              <Wrench className={`w-3.5 h-3.5 ${isFixing ? 'animate-spin' : ''}`} />
              <span>{isFixing ? 'Repairing Code...' : 'Auto-Fix All'}</span>
            </button>
          </div>
        </div>

        {/* Health Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 bg-[#090b10] p-2.5 rounded-xl border border-[#1d2233]">
          {/* Health Score */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-10 h-10 flex items-center justify-center rounded-full bg-[#141824] border-2 border-[#2b334d]">
              <span
                className={`text-xs font-extrabold ${
                  healthScore >= 80
                    ? 'text-emerald-400'
                    : healthScore >= 50
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {healthScore}%
              </span>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Health Rating</div>
              <div className="text-xs font-bold text-gray-200">
                {healthScore >= 90 ? 'Production Ready' : healthScore >= 60 ? 'Needs Attention' : 'Critical Bugs'}
              </div>
            </div>
          </div>

          {/* Memory & Perf */}
          <div className="border-l border-[#1f2538] pl-3">
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> Memory / Perf
            </div>
            <div className="text-xs font-bold text-gray-200 mt-0.5">
              {analysisResult ? analysisResult.memoryAndPerfRating : issues.length === 0 ? 'Optimal' : 'Checking'}
            </div>
          </div>

          {/* Security */}
          <div className="border-l border-[#1f2538] pl-3">
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-purple-400" /> Anti-Exploit
            </div>
            <div className="text-xs font-bold text-gray-200 mt-0.5">
              {analysisResult ? analysisResult.securityRating : securityCount > 0 ? 'Vulnerable' : 'Verified'}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-[#283049] text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All ({issues.length})
            </button>
            <button
              onClick={() => setFilter('critical')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filter === 'critical' ? 'bg-red-950/60 text-red-300' : 'text-gray-400 hover:text-red-300'
              }`}
            >
              Critical ({criticalCount})
            </button>
            <button
              onClick={() => setFilter('security')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filter === 'security' ? 'bg-purple-950/60 text-purple-300' : 'text-gray-400 hover:text-purple-300'
              }`}
            >
              Security ({securityCount})
            </button>
            <button
              onClick={() => setFilter('warning')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filter === 'warning' ? 'bg-amber-950/60 text-amber-300' : 'text-gray-400 hover:text-amber-300'
              }`}
            >
              Warnings ({warningCount})
            </button>
            <button
              onClick={() => setFilter('optimization')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filter === 'optimization' ? 'bg-cyan-950/60 text-cyan-300' : 'text-gray-400 hover:text-cyan-300'
              }`}
            >
              Optimizations ({optCount})
            </button>
          </div>

          <button
            onClick={() => setShowCustomPrompt(!showCustomPrompt)}
            className="text-[11px] text-gray-400 hover:text-white underline underline-offset-2 shrink-0 ml-2"
          >
            {showCustomPrompt ? 'Hide Prompt' : 'Custom Fix Prompt'}
          </button>
        </div>

        {/* Custom Fix Prompt Input */}
        {showCustomPrompt && (
          <div className="flex gap-2 p-2 bg-[#090b10] border border-[#23293d] rounded-xl">
            <input
              type="text"
              placeholder="e.g. Wrap in pcall with 3 retries and add player debounce..."
              value={customFixPrompt}
              onChange={(e) => setCustomFixPrompt(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white placeholder:text-gray-500 focus:outline-none"
            />
            <button
              onClick={() => onAutoFix(customFixPrompt)}
              disabled={isFixing}
              className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg"
            >
              Apply Custom Fix
            </button>
          </div>
        )}
      </div>

      {/* Issues List Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Error Notice Banner if any */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-xs flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-red-300 block mb-0.5">Operation Notice:</span>
                <p className="text-gray-300 text-[11px] leading-relaxed">{errorMessage}</p>
              </div>
            </div>
            {onClearError && (
              <button
                onClick={onClearError}
                className="text-gray-400 hover:text-white text-xs px-1.5 py-0.5 rounded"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Recent Fix Banner */}
        {lastFixResult && (
          <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-300 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>AI Auto-Fix Successfully Applied!</span>
            </div>
            <p className="text-gray-300 text-[11px] mb-2">{lastFixResult.summary}</p>
            {lastFixResult.changes.length > 0 && (
              <ul className="space-y-1 pl-4 list-disc text-[11px] text-emerald-200/90 font-mono">
                {lastFixResult.changes.map((c, i) => (
                  <li key={i}>
                    <strong>{c.bug}:</strong> {c.fixApplied}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-2 text-[10px] text-gray-400 border-t border-emerald-900/40 pt-1.5 font-sans">
              <strong>Studio Verification:</strong> {lastFixResult.howToTestInStudio}
            </div>
          </div>
        )}

        {/* Deep Analysis Summary if Available */}
        {analysisResult && (
          <div className="p-3 rounded-xl bg-[#141824] border border-[#232a3e] text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-blue-300">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Roblox Architecture Diagnosis</span>
            </div>
            <p className="text-gray-300 text-[11px] leading-relaxed">{analysisResult.summary}</p>
            {analysisResult.quickImprovements.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Recommended Upgrades:
                </span>
                <ul className="space-y-1 pl-4 list-disc text-[11px] text-gray-300">
                  {analysisResult.quickImprovements.map((imp, idx) => (
                    <li key={idx}>{imp}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Empty state when no issues */}
        {filteredIssues.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-200">No {filter !== 'all' ? filter : ''} bugs detected</h3>
            <p className="text-xs text-gray-400 max-w-sm mt-1">
              Your Luau script follows modern Roblox standards. Run "Deep AI Scan" for deep architectural reviews.
            </p>
          </div>
        )}

        {/* Issue Cards */}
        {filteredIssues.map((issue) => (
          <div
            key={issue.id}
            className={`p-3.5 rounded-xl border text-xs transition-all ${
              issue.severity === 'critical'
                ? 'bg-red-950/15 border-red-500/30'
                : issue.severity === 'security'
                ? 'bg-purple-950/15 border-purple-500/30'
                : issue.severity === 'warning'
                ? 'bg-amber-950/15 border-amber-500/30'
                : 'bg-cyan-950/15 border-cyan-500/30'
            }`}
          >
            {/* Issue Top row */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                {issue.severity === 'critical' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                {issue.severity === 'security' && <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />}
                {issue.severity === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
                {issue.severity === 'optimization' && <Zap className="w-4 h-4 text-cyan-400 shrink-0" />}
                {issue.severity === 'style' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}

                <span className="font-bold text-gray-100 text-xs">{issue.title}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {issue.line > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-mono text-gray-300 border border-[#2b3044]">
                    Line {issue.line}
                  </span>
                )}
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    issue.severity === 'critical'
                      ? 'bg-red-500/20 text-red-300'
                      : issue.severity === 'security'
                      ? 'bg-purple-500/20 text-purple-300'
                      : issue.severity === 'warning'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                  }`}
                >
                  {issue.severity}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-300 text-[11px] leading-relaxed mb-2">{issue.description}</p>

            {/* Roblox Engine Gotcha / Explanation */}
            {issue.robloxGotcha && (
              <div className="p-2 rounded-lg bg-black/30 border border-[#222738] mb-2 text-[11px]">
                <span className="font-semibold text-gray-400 block mb-0.5 text-[10px] uppercase tracking-wider">
                  Roblox Engine Rule:
                </span>
                <span className="text-gray-300">{issue.robloxGotcha}</span>
              </div>
            )}

            {/* Suggested Fix */}
            {issue.suggestedFix && (
              <div className="mt-2 bg-[#090b10] border border-[#20263b] rounded-lg p-2 font-mono text-[11px]">
                <div className="text-[10px] text-emerald-400 font-sans font-semibold mb-1 flex items-center justify-between">
                  <span>Suggested Fix:</span>
                  {onApplySingleFix && (
                    <button
                      onClick={() => onApplySingleFix(issue)}
                      className="text-[10px] font-sans px-2 py-0.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 rounded border border-emerald-500/30 transition-colors"
                    >
                      Apply Fix
                    </button>
                  )}
                </div>
                <pre className="text-gray-300 overflow-x-auto whitespace-pre-wrap">{issue.suggestedFix}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
