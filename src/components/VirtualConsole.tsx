// VirtualConsole — on-device Luau test runner output.
// Executes the active script for real with Fengari (Lua 5.3) after a
// Luau->Lua transpile, with a mocked Roblox engine (game, workspace,
// Instance, task, Vector3, ...). require() resolves project modules.

import React, { useState } from 'react';
import { Terminal, Trash2, Play, AlertTriangle, AlertCircle, Info, CheckCircle2, Loader2, Cpu } from 'lucide-react';
import { ScriptFile } from '../types/roblox';
import { runLuauScript, RunLog } from '../utils/luau/runner';

interface Props {
  file: ScriptFile;
  files: ScriptFile[];
}

export const VirtualConsole: React.FC<Props> = ({ file, files }) => {
  const [logs, setLogs] = useState<RunLog[]>([
    {
      id: 'init-1',
      type: 'info',
      message: `BloxCraft on-device Luau runtime ready for ${file.name} (${file.type}). Engine APIs are mocked; pure logic runs for real.`,
      source: 'System',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn'>('all');
  const [isRunning, setIsRunning] = useState(false);

  const runReal = async () => {
    if (isRunning) return;
    setIsRunning(true);
    try {
      const result = await runLuauScript(file, files);
      setLogs((prev) => [...prev, ...result.logs]);
    } catch (e: any) {
      setLogs((prev) => [
        ...prev,
        {
          id: `run-crash-${Date.now()}`,
          type: 'error',
          message: `Runner crashed: ${e?.message ?? e}`,
          source: 'TestRunner',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  const clearLogs = () => setLogs([]);

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
          <span className="font-semibold text-gray-300">Test Run Output</span>
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
            onClick={runReal}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 disabled:opacity-50 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-medium transition-colors"
            title="Execute this script on-device (real run, mocked engine)"
          >
            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-emerald-300" />}
            <span>{isRunning ? 'Running…' : 'Run'}</span>
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
            Output is empty. Click "Run" to execute {file.name} on-device.
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
                  : log.type === 'stub'
                  ? 'text-violet-300/80'
                  : 'text-gray-300'
              }`}
            >
              <span className="text-gray-500 text-[10px] shrink-0">{log.timestamp}</span>

              {log.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />}
              {log.type === 'warn' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />}
              {log.type === 'info' && <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />}
              {log.type === 'stub' && <Cpu className="w-3.5 h-3.5 text-violet-400/70 shrink-0 mt-0.5" />}
              {log.type === 'print' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500/70 shrink-0 mt-0.5" />}

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
