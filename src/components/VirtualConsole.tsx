import React, { useState } from 'react';
import { Terminal, Trash2, Play, AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { ScriptType, RobloxIssue } from '../types/roblox';

interface LogEntry {
  id: string;
  type: 'info' | 'warn' | 'error' | 'print';
  message: string;
  source?: string;
  timestamp: string;
}

interface Props {
  code: string;
  scriptType: ScriptType;
  scriptName: string;
  issues: RobloxIssue[];
}

export const VirtualConsole: React.FC<Props> = ({ code, scriptType, scriptName, issues }) => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      type: 'info',
      message: `BloxCraft Luau Runtime Simulator initialized for ${scriptName} (${scriptType}).`,
      source: 'System',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn'>('all');

  const runSimulation = () => {
    const newLogs: LogEntry[] = [];
    const time = new Date().toLocaleTimeString();

    newLogs.push({
      id: `sim-${Date.now()}-start`,
      type: 'info',
      message: `[Studio Runner] Initiating Luau test cycle on ${scriptName}...`,
      source: scriptName,
      timestamp: time,
    });

    // Check syntax and structure
    if (scriptType === 'ModuleScript') {
      const hasReturn = code.split('\n').some((l) => /^\s*return\s+\w+/.test(l));
      if (!hasReturn) {
        newLogs.push({
          id: `sim-${Date.now()}-err-ret`,
          type: 'error',
          message: 'Requested module experienced an error while loading: Module code did not return exactly one value',
          source: 'ReplicatedStorage.' + scriptName,
          timestamp: time,
        });
      } else {
        newLogs.push({
          id: `sim-${Date.now()}-ret-ok`,
          type: 'info',
          message: `Module loaded successfully. Table instance returned.`,
          source: scriptName,
          timestamp: time,
        });
      }
    }

    // Check critical and warning issues
    issues.forEach((issue) => {
      if (issue.severity === 'critical') {
        newLogs.push({
          id: `sim-${Date.now()}-crit-${issue.id}`,
          type: 'error',
          message: `Line ${issue.line}: ${issue.title} - ${issue.description}`,
          source: scriptName,
          timestamp: time,
        });
      } else if (issue.severity === 'warning' || issue.severity === 'security') {
        newLogs.push({
          id: `sim-${Date.now()}-warn-${issue.id}`,
          type: 'warn',
          message: `Line ${issue.line}: [${issue.severity.toUpperCase()}] ${issue.title} - ${issue.robloxGotcha}`,
          source: scriptName,
          timestamp: time,
        });
      }
    });

    // Extract print statements
    const printMatches = code.match(/print\s*\(\s*["']([^"']+)["']\s*\)/g);
    if (printMatches) {
      printMatches.slice(0, 3).forEach((pm, idx) => {
        const text = pm.replace(/print\s*\(\s*["']|["']\s*\)/g, '');
        newLogs.push({
          id: `sim-${Date.now()}-print-${idx}`,
          type: 'print',
          message: text,
          source: scriptName,
          timestamp: time,
        });
      });
    }

    if (issues.filter((i) => i.severity === 'critical').length === 0) {
      newLogs.push({
        id: `sim-${Date.now()}-pass`,
        type: 'info',
        message: `Simulation complete: Zero runtime fatal exceptions detected.`,
        source: 'RunService',
        timestamp: time,
      });
    }

    setLogs((prev) => [...prev, ...newLogs]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'error') return log.type === 'error';
    if (filter === 'warn') return log.type === 'warn';
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#0d0f17] border-t border-[#1e2333]">
      {/* Console Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#121520] border-b border-[#1f2438] text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-300">Roblox Studio Output Console</span>
          <span className="px-1.5 py-0.5 rounded bg-[#1e2338] text-[10px] text-gray-400">
            {logs.length} logs
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Pills */}
          <div className="flex bg-[#0a0c12] rounded-lg p-0.5 border border-[#23283b]">
            <button
              onClick={() => setFilter('all')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filter === 'all' ? 'bg-[#29304a] text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('warn')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filter === 'warn' ? 'bg-amber-950/60 text-amber-300' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Warns
            </button>
            <button
              onClick={() => setFilter('error')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                filter === 'error' ? 'bg-red-950/60 text-red-300' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Errors
            </button>
          </div>

          <button
            onClick={runSimulation}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition-colors"
            title="Simulate script execution in virtual Roblox environment"
          >
            <Play className="w-3 h-3 fill-emerald-300" />
            <span>Simulate Run</span>
          </button>

          <button
            onClick={clearLogs}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-[#202538] rounded-md transition-colors"
            title="Clear Output"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="flex-1 p-3 overflow-y-auto font-mono text-[11px] space-y-1 select-text">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-500 italic py-4 text-center">
            Output is empty. Click "Simulate Run" to test your Luau script.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-2 py-0.5 px-1.5 rounded ${
                log.type === 'error'
                  ? 'bg-red-950/20 text-red-400 border-l-2 border-red-500'
                  : log.type === 'warn'
                  ? 'bg-amber-950/20 text-amber-300 border-l-2 border-amber-500'
                  : log.type === 'print'
                  ? 'text-cyan-300'
                  : 'text-gray-300'
              }`}
            >
              <span className="text-gray-500 text-[10px] shrink-0">{log.timestamp}</span>

              {log.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
              {log.type === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
              {log.type === 'info' && <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />}

              <div className="flex-1 break-words">
                <span className="text-gray-400 font-semibold mr-1">[{log.source || 'Script'}]:</span>
                <span>{log.message}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
