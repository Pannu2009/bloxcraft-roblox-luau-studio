// museLink.ts — connects the app to the user's Muse assistant (Ustaad).
//
// Pairing: the app generates a stable pairing code on first launch. The user
// tells Ustaad the code once in chat; every project bundle shared afterwards
// carries it, so Ustaad can verify the bundle really came from this install.

import type { RobloxProject } from '../types/roblox';
import { buildDependencyGraph } from './dependencyGraph';

const CODE_KEY = 'bloxcraft_muse_pairing_code';
const INTRODUCED_KEY = 'bloxcraft_muse_introduced';

function randomCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const pick = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  // crypto RNG when available
  try {
    const buf = new Uint32Array(8);
    crypto.getRandomValues(buf);
    let s = '';
    for (let i = 0; i < 8; i++) s += chars[buf[i] % chars.length];
    return `BX-${s.slice(0, 4)}-${s.slice(4)}`;
  } catch {
    return `BX-${pick()}-${pick()}`;
  }
}

/** Stable per-install pairing code (generated once, then reused). */
export function getPairingCode(): string {
  try {
    let code = localStorage.getItem(CODE_KEY);
    if (!code) {
      code = randomCode();
      localStorage.setItem(CODE_KEY, code);
    }
    return code;
  } catch {
    return randomCode();
  }
}

export function isIntroduced(): boolean {
  try {
    return localStorage.getItem(INTRODUCED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setIntroduced(v: boolean): void {
  try {
    localStorage.setItem(INTRODUCED_KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Build a plain-text bundle of the whole project for sharing with Ustaad. */
export function buildProjectBundle(project: RobloxProject): string {
  const code = getPairingCode();
  const lines: string[] = [];
  lines.push(`# BloxCraft project bundle`);
  lines.push(`# Project: ${project.name}`);
  lines.push(`# Pairing code: ${code}`);
  lines.push(`# Exported: ${new Date().toISOString()}`);
  lines.push(`# Files: ${project.files.length}`);
  lines.push('');

  lines.push('## FILES');
  for (const f of project.files) {
    lines.push(`- ${f.folder ? f.folder + '/' : ''}${f.name} [${f.type}]`);
  }
  lines.push('');

  try {
    const g = buildDependencyGraph(project.files);
    if (g.edges.length > 0) {
      lines.push('## WIRING (require graph)');
      for (const e of g.edges) {
        const from = g.nodes.find((n) => n.id === e.from)?.name ?? e.from;
        const to = g.nodes.find((n) => n.id === e.to)?.name ?? e.to;
        lines.push(`${from} -> ${to}  (via ${e.via})${e.inCycle ? '  [CIRCULAR]' : ''}`);
      }
      lines.push('');
    }
  } catch {
    /* wiring is best-effort */
  }

  lines.push('## CODE');
  for (const f of project.files) {
    lines.push('');
    lines.push(`### FILE: ${f.folder ? f.folder + '/' : ''}${f.name}  [${f.type}]`);
    lines.push('```luau');
    lines.push(f.code);
    lines.push('```');
  }
  lines.push('');
  lines.push(`# end of bundle (pairing ${code})`);
  return lines.join('\n');
}

export type ShareOutcome = 'shared' | 'copied' | 'failed';

/** Share the bundle via the OS share sheet, falling back to clipboard. */
export async function shareProjectBundle(project: RobloxProject): Promise<ShareOutcome> {
  const text = buildProjectBundle(project);
  const title = `BloxCraft: ${project.name}`;
  try {
    if (navigator.share) {
      await navigator.share({ title, text });
      return 'shared';
    }
    throw new Error('no share API');
  } catch (e: any) {
    // user cancelled the sheet -> not a failure
    if (e?.name === 'AbortError') return 'failed';
    try {
      await navigator.clipboard.writeText(text);
      return 'copied';
    } catch {
      return 'failed';
    }
  }
}
