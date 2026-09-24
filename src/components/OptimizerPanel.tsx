import React, { useState } from 'react';
import { Zap, Gauge, ArrowRight, Check, CheckCircle2, Cpu, HardDrive, Network, Sparkles, Layers } from 'lucide-react';
import { OptimizationResult, ScriptType } from '../types/roblox';

interface Props {
  code: string;
  scriptType: ScriptType;
  optimizationResult: OptimizationResult | null;
  isOptimizing: boolean;
  onRunOptimization: (goal: string) => void;
  onApplyOptimizedCode: (newCode: string) => void;
}

export const OptimizerPanel: React.FC<Props> = ({
  code,
  scriptType,
  optimizationResult,
  isOptimizing,
  onRunOptimization,
  onApplyOptimizedCode,
}) => {
  const [selectedGoal, setSelectedGoal] = useState<'all' | 'speed' | 'memory' | 'network' | 'typing'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'diff'>('cards');
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    if (optimizationResult?.optimizedCode) {
      onApplyOptimizedCode(optimizationResult.optimizedCode);
      setApplied(true);
      setTimeout(() => setApplied(false), 2500);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0f17] border border-[#202538] rounded-xl overflow-hidden shadow-xl">
      {/* Top Header */}
      <div className="p-4 bg-[#131622] border-b border-[#202538] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-cyan-600/20 border border-cyan-500/30 rounded-lg text-cyan-400">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Roblox Code Optimizer & Profiler
              </h2>
              <p className="text-[11px] text-gray-400">MicroProfiler tuning, memory leak prevention, strict types</p>
            </div>
          </div>

          <button
            onClick={() => onRunOptimization(selectedGoal)}
            disabled={isOptimizing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-cyan-900/30 disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isOptimizing ? 'animate-spin' : ''}`} />
            <span>{isOptimizing ? 'Profiling & Tuning...' : 'Run Luau Optimizer'}</span>
          </button>
        </div>

        {/* Goal selector pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
          <span className="text-gray-400 text-[10px] uppercase font-bold mr-1 shrink-0">Tuning Goal:</span>
          {[
            { id: 'all', label: 'All Optimizations', icon: Layers },
            { id: 'speed', label: 'Speed & FPS', icon: Cpu },
            { id: 'memory', label: 'Memory & GC', icon: HardDrive },
            { id: 'network', label: 'Network & Net-Replication', icon: Network },
            { id: 'typing', label: 'Type Safety (--!strict)', icon: Sparkles },
          ].map((goal) => {
            const Icon = goal.icon;
            return (
              <button
                key={goal.id}
                onClick={() => setSelectedGoal(goal.id as any)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                  selectedGoal === goal.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-[#181d2c] text-gray-400 hover:text-gray-200 border border-transparent'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{goal.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* If no result yet */}
        {!optimizationResult && !isOptimizing && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-200">Ready to optimize {scriptType}</h3>
            <p className="text-xs text-gray-400 max-w-sm mt-1 mb-4">
              Our AI benchmarks Luau table allocations, Task Scheduler calls, RBXScriptConnections, and replaces legacy
              APIs with optimized code.
            </p>
            <button
              onClick={() => onRunOptimization(selectedGoal)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-cyan-900/30 transition-all"
            >
              Analyze & Optimize Script
            </button>
          </div>
        )}

        {/* Loading state */}
        {isOptimizing && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-semibold text-cyan-300">Profiling Luau AST & Memory Footprint...</p>
            <span className="text-[11px] text-gray-500">Applying table pre-allocations, vector math, and strict types</span>
          </div>
        )}

        {/* Results view */}
        {optimizationResult && !isOptimizing && (
          <>
            {/* Top Overview Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-[#141b2a] to-blue-950/30 border border-cyan-500/40 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-white text-xs">Optimization Overhaul Complete</span>
                </div>
                <button
                  onClick={handleApply}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                    applied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/30'
                  }`}
                >
                  {applied ? <Check className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>{applied ? 'Applied to Editor!' : 'Apply Optimized Code'}</span>
                </button>
              </div>

              <p className="text-gray-300 text-xs leading-relaxed">{optimizationResult.summary}</p>

              <div className="p-2.5 rounded-lg bg-black/40 border border-cyan-500/30 flex items-center justify-between text-xs">
                <span className="text-gray-400 text-[11px]">Estimated Performance Boost:</span>
                <span className="font-bold text-emerald-400 font-mono text-xs">
                  {optimizationResult.benchmarkEstimatedGain}
                </span>
              </div>
            </div>

            {/* Toggle view mode */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-gray-300">
                {optimizationResult.optimizations.length} Performance Optimizations Applied:
              </span>

              <div className="flex bg-[#0b0d13] rounded-lg p-0.5 border border-[#22283a]">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    viewMode === 'cards' ? 'bg-[#252c42] text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Breakdown
                </button>
                <button
                  onClick={() => setViewMode('diff')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    viewMode === 'diff' ? 'bg-[#252c42] text-white' : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  Full Code
                </button>
              </div>
            </div>

            {/* View Mode: Cards */}
            {viewMode === 'cards' ? (
              <div className="space-y-3">
                {optimizationResult.optimizations.map((item, index) => (
                  <div key={index} className="p-3.5 rounded-xl bg-[#131622] border border-[#23293d] space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold text-[10px]">
                          {index + 1}
                        </span>
                        <span className="font-bold text-gray-200">{item.title}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1e2436] text-gray-300 border border-[#2b334c]">
                          {item.category}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            item.impact === 'High'
                              ? 'bg-red-500/20 text-red-300'
                              : item.impact === 'Medium'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {item.impact} Impact
                        </span>
                      </div>
                    </div>

                    <p className="text-gray-300 text-[11px]">{item.explanation}</p>

                    {(item.beforeSnippet || item.afterSnippet) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                        {item.beforeSnippet && (
                          <div className="p-2 rounded-lg bg-red-950/20 border border-red-500/30 overflow-x-auto">
                            <span className="text-[10px] font-sans font-semibold text-red-400 block mb-1">
                              Original (Bottleneck):
                            </span>
                            <pre className="text-red-300 whitespace-pre-wrap">{item.beforeSnippet}</pre>
                          </div>
                        )}
                        {item.afterSnippet && (
                          <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/30 overflow-x-auto">
                            <span className="text-[10px] font-sans font-semibold text-emerald-400 block mb-1">
                              Optimized (Fast Luau):
                            </span>
                            <pre className="text-emerald-300 whitespace-pre-wrap">{item.afterSnippet}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* View Mode: Full Code */
              <div className="space-y-2">
                <div className="p-3 bg-[#0a0c12] border border-[#23293d] rounded-xl font-mono text-xs overflow-x-auto max-h-[480px]">
                  <pre className="text-gray-300 whitespace-pre leading-5">{optimizationResult.optimizedCode}</pre>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
