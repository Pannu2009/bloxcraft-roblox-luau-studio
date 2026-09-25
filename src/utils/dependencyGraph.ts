// dependencyGraph.ts — builds a require() wiring graph across project Luau files.
//
// Parses every `require(...)` call in each script, resolves the target module
// to a project file (by module name), and produces nodes + edges + a layered
// layout for the wiring diagram.

import type { ScriptFile, ScriptType } from '../types/roblox';

export interface GraphNode {
  id: string;
  name: string;
  type: ScriptType;
  folder?: string;
  /** module names this file requires (as written) */
  requires: string[];
  /** ids of files that require this one */
  requiredBy: string[];
  /** require() targets that could not be matched to a project file */
  unresolved: string[];
  x: number;
  y: number;
  layer: number;
  isExternal?: boolean;
}

export interface GraphEdge {
  from: string; // requirer file id
  to: string; // required file id
  via: string; // module name as written in require()
  inCycle: boolean;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycles: string[][];
  stats: { files: number; wires: number; externals: number; cycles: number };
}

const REQUIRE_RE = /\brequire\s*\(\s*([^)]+?)\)/g;

/** Extract a candidate module name from a require() argument expression. */
export function extractModuleName(arg: string): string | null {
  const trimmed = arg.trim();
  if (!trimmed) return null;
  // Numeric asset id: require(123456) — not a project file
  if (/^\d+$/.test(trimmed)) return null;

  // String literal: require("Modules.Pets") / require('Shared/Util')
  const strMatch = trimmed.match(/^["']([^"']+)["']$/);
  if (strMatch) {
    const parts = strMatch[1].split(/[./\\]/).filter(Boolean);
    const last = parts[parts.length - 1];
    return last || null;
  }

  // Instance path expression: game:GetService("ReplicatedStorage").Modules.Pets
  // or script.Parent.Foo — take the last dotted identifier.
  // Strip string literals first so :GetService("X") doesn't confuse us.
  const noStrings = trimmed.replace(/["'][^"']*["']/g, '');
  const identifiers = noStrings.match(/[A-Za-z_][A-Za-z0-9_]*/g);
  if (!identifiers || identifiers.length === 0) return null;
  const blacklist = new Set(['require', 'game', 'script', 'Instance', 'self']);
  for (let i = identifiers.length - 1; i >= 0; i--) {
    const id = identifiers[i];
    if (!blacklist.has(id) && id !== 'Parent') return id;
    if (id === 'Parent') continue;
  }
  return identifiers[identifiers.length - 1] ?? null;
}

/** All module names required by a piece of Luau code (deduped, in order). */
export function parseRequires(code: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  // strip comments so -- require("x") doesn't count
  const noComments = code
    .replace(/--\[\[[\s\S]*?\]\]/g, '')
    .replace(/--[^\n]*/g, '');
  let m: RegExpExecArray | null;
  REQUIRE_RE.lastIndex = 0;
  while ((m = REQUIRE_RE.exec(noComments)) !== null) {
    const name = extractModuleName(m[1]);
    if (name && !seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
}

export function buildDependencyGraph(files: ScriptFile[]): DependencyGraph {
  // index files by base name (no extension), case-insensitive
  const byName = new Map<string, ScriptFile[]>();
  for (const f of files) {
    const base = f.name.replace(/\.luau$/i, '').toLowerCase();
    const list = byName.get(base) ?? [];
    list.push(f);
    byName.set(base, list);
  }

  const pickFile = (modName: string): ScriptFile | null => {
    const list = byName.get(modName.toLowerCase());
    if (!list || list.length === 0) return null;
    if (list.length === 1) return list[0];
    // prefer shared/modules folders on ambiguity
    return (
      list.find((f) => /shared|module|common/i.test(f.folder ?? '')) ?? list[0]
    );
  };

  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const externalNames = new Map<string, string>(); // name -> external node id

  for (const f of files) {
    const requires = parseRequires(f.code);
    nodeMap.set(f.id, {
      id: f.id,
      name: f.name,
      type: f.type,
      folder: f.folder,
      requires,
      requiredBy: [],
      unresolved: [],
      x: 0,
      y: 0,
      layer: 0,
    });
  }

  for (const f of files) {
    const node = nodeMap.get(f.id)!;
    for (const modName of node.requires) {
      const target = pickFile(modName);
      if (target && target.id !== f.id) {
        edges.push({ from: f.id, to: target.id, via: modName, inCycle: false });
        nodeMap.get(target.id)!.requiredBy.push(f.id);
      } else if (!target) {
        node.unresolved.push(modName);
        if (!externalNames.has(modName)) {
          const extId = `__ext__${modName}`;
          externalNames.set(modName, extId);
          nodeMap.set(extId, {
            id: extId,
            name: modName,
            type: 'ModuleScript',
            requires: [],
            requiredBy: [],
            unresolved: [],
            x: 0,
            y: 0,
            layer: 0,
            isExternal: true,
          });
        }
        const extId = externalNames.get(modName)!;
        edges.push({ from: f.id, to: extId, via: modName, inCycle: false });
        nodeMap.get(extId)!.requiredBy.push(f.id);
      }
      // self-require ignored
    }
  }

  // ---- cycle detection (DFS coloring) ----
  const cycles: string[][] = [];
  const color = new Map<string, number>(); // 0=unvisited 1=in-stack 2=done
  const stack: string[] = [];
  const adjacency = new Map<string, string[]>();
  for (const e of edges) {
    const list = adjacency.get(e.from) ?? [];
    list.push(e.to);
    adjacency.set(e.from, list);
  }
  const visit = (id: string) => {
    color.set(id, 1);
    stack.push(id);
    for (const next of adjacency.get(id) ?? []) {
      const c = color.get(next) ?? 0;
      if (c === 0) visit(next);
      else if (c === 1) {
        const idx = stack.indexOf(next);
        if (idx !== -1) cycles.push([...stack.slice(idx), next]);
      }
    }
    stack.pop();
    color.set(id, 2);
  };
  for (const id of nodeMap.keys()) {
    if ((color.get(id) ?? 0) === 0) visit(id);
  }
  const cycleEdgeKeys = new Set<string>();
  for (const cyc of cycles) {
    for (let i = 0; i < cyc.length - 1; i++) cycleEdgeKeys.add(`${cyc[i]}->${cyc[i + 1]}`);
  }
  for (const e of edges) e.inCycle = cycleEdgeKeys.has(`${e.from}->${e.to}`);

  // ---- layered layout: layer 0 = entry points (required by nobody) ----
  const nodes = [...nodeMap.values()];
  const inCycleSet = new Set(cycles.flat());
  // longest path from any entry point, ignoring cycle back-edges
  const layerOf = new Map<string, number>();
  const computeLayer = (id: string, visiting: Set<string>): number => {
    if (layerOf.has(id)) return layerOf.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    const requirers = nodeMap.get(id)?.requiredBy ?? [];
    let layer = 0;
    for (const r of requirers) {
      if (inCycleSet.has(id) && inCycleSet.has(r)) continue; // break cycles for layout
      layer = Math.max(layer, computeLayer(r, visiting) + 1);
    }
    visiting.delete(id);
    layerOf.set(id, layer);
    return layer;
  };
  for (const n of nodes) {
    n.layer = computeLayer(n.id, new Set());
    if (n.isExternal) n.layer = 999; // externals sink to the bottom
  }

  const maxLayer = Math.max(0, ...nodes.filter((n) => !n.isExternal).map((n) => n.layer));
  for (const n of nodes) if (n.isExternal) n.layer = maxLayer + 1;

  const NODE_W = 180;
  const NODE_H = 56;
  const LAYER_GAP_Y = 120;
  const NODE_GAP_X = 28;

  const byLayer = new Map<number, GraphNode[]>();
  for (const n of nodes) {
    const list = byLayer.get(n.layer) ?? [];
    list.push(n);
    byLayer.set(n.layer, list);
  }
  for (const [layer, list] of byLayer) {
    // stable order: most-connected first
    list.sort((a, b) => b.requiredBy.length + b.requires.length - (a.requiredBy.length + a.requires.length));
    const totalW = list.length * NODE_W + (list.length - 1) * NODE_GAP_X;
    list.forEach((n, i) => {
      n.x = -totalW / 2 + i * (NODE_W + NODE_GAP_X) + NODE_W / 2;
      n.y = layer * (NODE_H + LAYER_GAP_Y) + NODE_H / 2;
    });
  }

  return {
    nodes,
    edges,
    cycles,
    stats: {
      files: files.length,
      wires: edges.length,
      externals: externalNames.size,
      cycles: cycles.length,
    },
  };
}
