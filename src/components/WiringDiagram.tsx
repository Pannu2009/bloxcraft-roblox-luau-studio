// WiringDiagram — interactive dependency graph of project Luau scripts.
// Nodes = scripts, wires = require() relationships. Pan/zoom, drag nodes,
// tap a node to inspect, open it in the editor.

import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  Maximize,
  FileCode,
  Server,
  MonitorSmartphone,
  Boxes,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import type { ScriptFile, ScriptType } from '../types/roblox';
import { buildDependencyGraph, type GraphNode } from '../utils/dependencyGraph';

const NODE_W = 180;
const NODE_H = 56;

const TYPE_STYLE: Record<ScriptType, { border: string; glow: string; label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  ModuleScript: { border: '#8b5cf6', glow: 'rgba(139,92,246,0.25)', label: 'Module', Icon: Boxes },
  ServerScript: { border: '#f43f5e', glow: 'rgba(244,63,94,0.25)', label: 'Server', Icon: Server },
  LocalScript: { border: '#38bdf8', glow: 'rgba(56,189,248,0.25)', label: 'Client', Icon: MonitorSmartphone },
};

interface Props {
  files: ScriptFile[];
  onSelectFile: (id: string) => void;
  onClose: () => void;
}

export const WiringDiagram: React.FC<Props> = ({ files, onSelectFile, onClose }) => {
  const graph = useMemo(() => buildDependencyGraph(files), [files]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 40, k: 1 });
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<null | {
    mode: 'pan' | 'pinch' | 'drag-node';
    nodeId?: string;
    startX: number;
    startY: number;
    origView: { x: number; y: number; k: number };
    origOffset?: { dx: number; dy: number };
    pinchDist?: number;
    moved: boolean;
  }>(null);

  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const selected: GraphNode | null = selectedId ? nodeById.get(selectedId) ?? null : null;

  const pos = useCallback(
    (n: GraphNode) => {
      const o = offsets[n.id];
      return { x: n.x + (o?.dx ?? 0), y: n.y + (o?.dy ?? 0) };
    },
    [offsets]
  );

  const fitView = useCallback(() => {
    const el = containerRef.current;
    if (!el || graph.nodes.length === 0) return;
    const rect = el.getBoundingClientRect();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of graph.nodes) {
      const p = pos(n);
      minX = Math.min(minX, p.x - NODE_W / 2);
      maxX = Math.max(maxX, p.x + NODE_W / 2);
      minY = Math.min(minY, p.y - NODE_H / 2);
      maxY = Math.max(maxY, p.y + NODE_H / 2);
    }
    const pad = 60;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const k = Math.min(rect.width / w, rect.height / h, 1.25);
    setView({
      k,
      x: rect.width / 2 - ((minX + maxX) / 2) * k,
      y: 20 - minY * k + pad * k,
    });
  }, [graph, pos]);

  useEffect(() => {
    fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files.length]);

  const zoomBy = (factor: number) => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const cx = (rect?.width ?? 300) / 2;
    const cy = (rect?.height ?? 200) / 2;
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.25, v.k * factor));
      return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k };
    });
  };

  // ---- pointer interaction ----
  const onPointerDown = (e: React.PointerEvent, nodeId?: string) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        mode: 'pinch',
        startX: 0, startY: 0,
        origView: { ...view },
        pinchDist: Math.hypot(a.x - b.x, a.y - b.y),
        moved: true,
      };
      return;
    }
    if (nodeId) {
      const o = offsets[nodeId] ?? { dx: 0, dy: 0 };
      gesture.current = {
        mode: 'drag-node', nodeId,
        startX: e.clientX, startY: e.clientY,
        origView: { ...view }, origOffset: { ...o },
        moved: false,
      };
    } else {
      gesture.current = {
        mode: 'pan',
        startX: e.clientX, startY: e.clientY,
        origView: { ...view },
        moved: false,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (g.mode === 'pinch' && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.pinchDist && dist > 0) {
        const k = Math.min(2.5, Math.max(0.25, g.origView.k * (dist / g.pinchDist)));
        const el = containerRef.current;
        const rect = el?.getBoundingClientRect();
        const cx = ((a.x + b.x) / 2 - (rect?.left ?? 0));
        const cy = ((a.y + b.y) / 2 - (rect?.top ?? 0));
        setView({ k, x: cx - ((cx - g.origView.x) / g.origView.k) * k, y: cy - ((cy - g.origView.y) / g.origView.k) * k });
      }
      return;
    }

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) g.moved = true;

    if (g.mode === 'pan') {
      setView({ ...g.origView, x: g.origView.x + dx, y: g.origView.y + dy });
    } else if (g.mode === 'drag-node' && g.nodeId && g.origOffset) {
      const sdx = dx / view.k;
      const sdy = dy / view.k;
      setOffsets((prev) => ({
        ...prev,
        [g.nodeId!]: { dx: g.origOffset!.dx + sdx, dy: g.origOffset!.dy + sdy },
      }));
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g && !g.moved && g.mode === 'drag-node' && g.nodeId) {
      setSelectedId((prev) => (prev === g.nodeId ? null : g.nodeId!));
    } else if (g && !g.moved && g.mode === 'pan') {
      setSelectedId(null);
    }
    if (pointers.current.size < 2) gesture.current = null;
  };

  const onWheel = (e: React.WheelEvent) => {
    const el = containerRef.current;
    const rect = el?.getBoundingClientRect();
    const cx = e.clientX - (rect?.left ?? 0);
    const cy = e.clientY - (rect?.top ?? 0);
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.25, v.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      return { k, x: cx - ((cx - v.x) / v.k) * k, y: cy - ((cy - v.y) / v.k) * k };
    });
  };

  const edgePath = (from: GraphNode, to: GraphNode) => {
    const a = pos(from);
    const b = pos(to);
    const x1 = a.x, y1 = a.y + NODE_H / 2;
    const x2 = b.x, y2 = b.y - NODE_H / 2;
    const bend = Math.max(40, Math.abs(y2 - y1) * 0.5);
    return `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-[#07090e] overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a1f2e] bg-[#0a0c12] shrink-0 flex-wrap">
        <div className="flex items-center gap-2 mr-auto">
          <Boxes className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-bold text-white">Script Wiring</span>
          <span className="text-[11px] text-gray-400">
            {graph.stats.files} scripts · {graph.stats.wires} wires
            {graph.stats.externals > 0 && ` · ${graph.stats.externals} external`}
          </span>
          {graph.stats.cycles > 0 && (
            <span className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-300 font-semibold">
              <AlertTriangle className="w-3 h-3" /> {graph.stats.cycles} circular
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => zoomBy(1.25)} className="p-1.5 rounded-lg hover:bg-[#1a2033] text-gray-300" title="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={() => zoomBy(1 / 1.25)} className="p-1.5 rounded-lg hover:bg-[#1a2033] text-gray-300" title="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <button onClick={fitView} className="p-1.5 rounded-lg hover:bg-[#1a2033] text-gray-300" title="Fit to view">
            <Maximize className="w-4 h-4" />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#1a2033] text-gray-300" title="Close wiring">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden touch-none select-none"
        style={{ backgroundImage: 'radial-gradient(circle, #161b2a 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        onPointerDown={(e) => onPointerDown(e)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <svg className="absolute inset-0 w-full h-full">
          <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
            {/* wires */}
            {graph.edges.map((e, i) => {
              const from = nodeById.get(e.from);
              const to = nodeById.get(e.to);
              if (!from || !to) return null;
              const isSel = selectedId === e.from || selectedId === e.to;
              const stroke = e.inCycle ? '#f43f5e' : to.isExternal ? '#52525b' : isSel ? '#22d3ee' : '#3b4a6b';
              return (
                <g key={i}>
                  <path
                    d={edgePath(from, to)}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={e.inCycle || isSel ? 2.5 : 1.5}
                    strokeDasharray={to.isExternal ? '5 4' : e.inCycle ? '7 3' : undefined}
                    opacity={selectedId && !isSel ? 0.25 : 0.9}
                  />
                </g>
              );
            })}
            {/* nodes */}
            {graph.nodes.map((n) => {
              const p = pos(n);
              const st = TYPE_STYLE[n.type];
              const Icon = n.isExternal ? FileCode : st.Icon;
              const isSel = selectedId === n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x - NODE_W / 2},${p.y - NODE_H / 2})`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    onPointerDown(e, n.id);
                  }}
                  style={{ cursor: 'grab', opacity: selectedId && !isSel ? 0.45 : 1 }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx={12}
                    fill={n.isExternal ? '#101014' : '#0d1119'}
                    stroke={n.isExternal ? '#52525b' : isSel ? '#22d3ee' : st.border}
                    strokeWidth={isSel ? 2.5 : 1.5}
                    strokeDasharray={n.isExternal ? '5 4' : undefined}
                    style={{ filter: `drop-shadow(0 0 10px ${n.isExternal ? 'transparent' : st.glow})` }}
                  />
                  <rect width={4} height={NODE_H} rx={2} fill={n.isExternal ? '#52525b' : st.border} />
                  <foreignObject x={12} y={6} width={NODE_W - 24} height={NODE_H - 12}>
                    <div className="flex items-center gap-2 h-full" style={{ fontFamily: 'inherit' }}>
                      <Icon className="w-4 h-4 shrink-0" color={n.isExternal ? '#71717a' : st.border} />
                      <div className="min-w-0">
                        <div className="text-[12px] font-bold text-white truncate leading-tight">{n.name}</div>
                        <div className="text-[10px] text-gray-400 truncate leading-tight">
                          {n.isExternal ? 'external' : `${st.label}${n.folder ? ` · ${n.folder.split('/').pop()}` : ''}`}
                        </div>
                      </div>
                      {!n.isExternal && (n.requires.length > 0 || n.requiredBy.length > 0) && (
                        <div className="ml-auto shrink-0 text-[9px] px-1.5 py-0.5 rounded-full bg-[#1a2033] text-cyan-300 font-bold">
                          {n.requires.length}→{n.requiredBy.length}
                        </div>
                      )}
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </g>
        </svg>

        {/* legend */}
        <div className="absolute bottom-2 left-2 flex items-center gap-3 px-2.5 py-1.5 rounded-xl bg-[#0a0c12]/90 border border-[#1e2336] text-[10px] text-gray-300 pointer-events-none">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#8b5cf6' }} /> Module</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#f43f5e' }} /> Server</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#38bdf8' }} /> Client</span>
          <span className="flex items-center gap-1"><span className="w-6 border-t-2 border-dashed border-red-500" /> circular</span>
        </div>
      </div>

      {/* detail card */}
      {selected && (
        <div className="absolute bottom-12 left-2 right-2 sm:left-auto sm:right-3 sm:bottom-3 sm:w-72 rounded-2xl bg-[#0d1017]/95 border border-[#2a3350] p-3 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-bold text-white truncate">{selected.name}</span>
            <button onClick={() => setSelectedId(null)} className="p-1 rounded-lg hover:bg-[#1a2033] text-gray-400">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {selected.isExternal ? (
            <p className="text-[11px] text-gray-400">
              Required but not found in this project — probably a Roblox instance, asset id, or missing file.
            </p>
          ) : (
            <>
              <div className="text-[11px] text-gray-300 mb-1 font-semibold">Wires out ({selected.requires.length})</div>
              {selected.requires.length === 0 && <div className="text-[11px] text-gray-500 mb-2">Requires nothing</div>}
              <div className="flex flex-col gap-1 max-h-28 overflow-y-auto mb-2">
                {selected.requires.map((r) => {
                  const target = graph.edges.find((e) => e.from === selected.id && e.via === r);
                  const tNode = target ? nodeById.get(target.to) : undefined;
                  return (
                    <div key={r} className="flex items-center gap-1.5 text-[11px] text-gray-300">
                      <ArrowRight className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="font-mono truncate">{r}</span>
                      {tNode && !tNode.isExternal && (
                        <button
                          className="ml-auto shrink-0 text-cyan-300 hover:underline"
                          onClick={() => {
                            onSelectFile(tNode.id);
                            onClose();
                          }}
                        >
                          {tNode.name}
                        </button>
                      )}
                      {tNode?.isExternal && <span className="ml-auto text-zinc-500 shrink-0">external</span>}
                    </div>
                  );
                })}
              </div>
              <div className="text-[11px] text-gray-300 mb-1 font-semibold">
                Used by ({selected.requiredBy.length})
              </div>
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto mb-2">
                {selected.requiredBy.length === 0 && <span className="text-[11px] text-gray-500">Nothing requires this</span>}
                {selected.requiredBy.map((id) => {
                  const n = nodeById.get(id);
                  return n ? (
                    <button
                      key={id}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1a2033] text-gray-200 hover:bg-[#242c44] truncate max-w-[120px]"
                      onClick={() => { onSelectFile(id); onClose(); }}
                    >
                      {n.name}
                    </button>
                  ) : null;
                })}
              </div>
              <button
                className="w-full py-1.5 rounded-xl bg-violet-600/30 border border-violet-500/40 text-violet-200 text-xs font-bold hover:bg-violet-600/50"
                onClick={() => { onSelectFile(selected.id); onClose(); }}
              >
                Open in editor
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
