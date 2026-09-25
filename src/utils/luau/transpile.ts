// transpile.ts — converts Luau source into Lua 5.3 that Fengari can execute.
//
// Handles the Luau-isms most common in testable scripts:
//   --!strict headers, type annotations, type aliases, compound assignment
//   (+=, -=, ..=, ...), `continue` in for/while loops, backtick string
//   interpolation, and `::` type casts.
//
// Anything it cannot handle produces a clear error naming the line.

export interface TranspileResult {
  ok: boolean;
  code: string;
  error?: string;
  errorLine?: number;
}

const PH = '\u0000';

/** Replace strings/comments with placeholders so regexes can't see inside them. */
function mask(code: string): { masked: string; table: string[] } {
  const table: string[] = [];
  let out = '';
  let i = 0;
  const n = code.length;
  const push = (s: string) => {
    table.push(s);
    out += `${PH}${table.length - 1}${PH}`;
  };
  while (i < n) {
    const c = code[i];
    // long comment --[[ ... ]]
    if (c === '-' && code[i + 1] === '-') {
      if (code[i + 2] === '[' && code[i + 3] === '[') {
        const end = code.indexOf(']]', i + 4);
        const stop = end === -1 ? n : end + 2;
        push(code.slice(i, stop));
        i = stop;
        continue;
      }
      // line comment (also eats --!strict headers)
      const end = code.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      push(code.slice(i, stop));
      i = stop;
      continue;
    }
    // long string [[ ... ]] / [=[ ... ]=]
    if (c === '[' && (code[i + 1] === '[' || (code[i + 1] === '=' && /\[=*\[/.test(code.slice(i, i + 4))))) {
      const m = /^\[(=*)\[/.exec(code.slice(i));
      if (m) {
        const close = `]${m[1]}]`;
        const end = code.indexOf(close, i + m[0].length);
        const stop = end === -1 ? n : end + close.length;
        push(code.slice(i, stop));
        i = stop;
        continue;
      }
    }
    // quoted string
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\') { j += 2; continue; }
        if (code[j] === c) { j++; break; }
        if (code[j] === '\n') break; // unterminated — bail
        j++;
      }
      push(code.slice(i, j));
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return { masked: out, table };
}

function unmask(masked: string, table: string[]): string {
  return masked.replace(new RegExp(`${PH}(\\d+)${PH}`, 'g'), (_, id) => table[Number(id)] ?? '');
}

/** Remove `type Foo = ...` / `export type Foo = ...` aliases (may span lines). */
function removeTypeAliases(masked: string): string {
  let out = masked;
  const re = /(^|[;\n])\s*(export\s+)?type\s+[A-Za-z_]\w*\s*=/g;
  let m: RegExpExecArray | null;
  let result = '';
  let last = 0;
  while ((m = re.exec(out)) !== null) {
    const eqIdx = out.indexOf('=', m.index);
    let depth = 0;
    let j = eqIdx + 1;
    while (j < out.length) {
      const ch = out[j];
      if (ch === '{' || ch === '(' || ch === '[') depth++;
      else if (ch === '}' || ch === ')' || ch === ']') depth--;
      if (depth === 0 && (ch === '\n' || ch === ';')) break;
      j++;
      if (depth < 0) break;
    }
    result += out.slice(last, m.index + m[1].length);
    last = j;
    re.lastIndex = j;
  }
  result += out.slice(last);
  return result;
}

/** Strip `: Type` from a comma-separated parameter list (depth-aware). */
function stripParamTypes(params: string): string {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < params.length; i++) {
    const ch = params[i];
    if ('{[(<'.includes(ch)) depth++;
    else if ('}])>'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts
    .map((p) => {
      const t = p.trim();
      if (t === '...' || t.startsWith('...')) return t;
      // strip at first top-level colon
      let d = 0;
      for (let i = 0; i < t.length; i++) {
        const ch = t[i];
        if ('{[(<'.includes(ch)) d++;
        else if ('}])>'.includes(ch)) d--;
        else if (ch === ':' && d === 0) return t.slice(0, i).trim();
      }
      return t;
    })
    .join(', ');
}

/** Find matching close paren from open index (masked code: no strings). */
function matchParen(s: string, openIdx: number): number {
  let depth = 0;
  for (let j = openIdx; j < s.length; j++) {
    if (s[j] === '(') depth++;
    else if (s[j] === ')') {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

function stripFunctionTypes(masked: string): string {
  // params of named/anonymous functions — splice the whole balanced signature
  const re = /function(\s+[A-Za-z_][\w.:]*)?\s*\(/g;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const openIdx = m.index + m[0].length - 1;
    const closeIdx = matchParen(masked, openIdx);
    if (closeIdx === -1) continue; // unbalanced — leave for the syntax error to surface
    const inner = masked.slice(openIdx + 1, closeIdx);
    out += masked.slice(last, m.index) + m[0].slice(0, -1) + '(' + stripParamTypes(inner) + ')';
    last = closeIdx + 1;
    re.lastIndex = closeIdx + 1;
  }
  out += masked.slice(last);
  // return types:  `): Type` at end of a signature line
  out = out.replace(/\)\s*:\s*[^=\n;]+$/gm, ')');
  return out;
}

const COMPOUND_OPS: Record<string, string> = {
  '+=': '+', '-=': '-', '*=': '*', '/=': '/', '//=': '//', '%=': '%', '^=': '^', '..=': '..',
};

function expandCompoundAssign(masked: string): string {
  return masked.replace(
    /([A-Za-z_]\w*(?:\s*\.\s*[A-Za-z_]\w*|\s*\[[^\]\n]+\])*)\s*(\.\.=|\+=|-=|\*=|\/\/=|\/=|%=|\^=)/g,
    (_m, target: string, op: string) => {
      const t = target.replace(/\s+/g, '');
      const luaOp = COMPOUND_OPS[op];
      return `${t} = ${t} ${luaOp} `;
    }
  );
}

interface ContinueSite { line: number; loopId: number }
interface LoopEnd { line: number; loopId: number }

/** Rewrite `continue` inside for/while loops using goto. Returns errors for unsupported cases. */
function rewriteContinue(masked: string): { code: string; errors: string[] } {
  const lines = masked.split('\n');
  const errors: string[] = [];
  const stack: Array<{ kind: 'loop' | 'block' | 'repeat'; id: number; needsLabel: boolean }> = [];
  let loopSeq = 0;
  const sites: ContinueSite[] = [];
  const ends: LoopEnd[] = [];
  let expectDo = false;
  let braceDepth = 0;

  const wordRe = /[A-Za-z_]\w*|[{}]/g;
  lines.forEach((line, li) => {
    let wm: RegExpExecArray | null;
    wordRe.lastIndex = 0;
    while ((wm = wordRe.exec(line)) !== null) {
      const w = wm[0];
      if (w === '{') { braceDepth++; continue; }
      if (w === '}') { braceDepth--; continue; }
      switch (w) {
        case 'for':
        case 'while':
          stack.push({ kind: 'loop', id: ++loopSeq, needsLabel: false });
          expectDo = true;
          break;
        case 'do':
          if (expectDo) expectDo = false;
          else if (braceDepth === 0) stack.push({ kind: 'block', id: 0, needsLabel: false });
          break;
        case 'then':
          if (braceDepth === 0) stack.push({ kind: 'block', id: 0, needsLabel: false });
          break;
        case 'function':
          stack.push({ kind: 'block', id: 0, needsLabel: false });
          expectDo = false;
          break;
        case 'repeat':
          stack.push({ kind: 'repeat', id: 0, needsLabel: false });
          break;
        case 'end': {
          const top = stack.pop();
          if (top && top.kind === 'loop' && top.needsLabel) ends.push({ line: li, loopId: top.id });
          expectDo = false;
          break;
        }
        case 'until':
          stack.pop();
          break;
        case 'continue': {
          const loop = [...stack].reverse().find((s) => s.kind === 'loop' || s.kind === 'repeat');
          if (!loop) errors.push(`line ${li + 1}: 'continue' outside of a loop`);
          else if (loop.kind === 'repeat') errors.push(`line ${li + 1}: 'continue' inside repeat..until is not supported by the test runner`);
          else {
            loop.needsLabel = true;
            sites.push({ line: li, loopId: loop.id });
          }
          break;
        }
      }
    }
  });

  // apply: replace continue on its line, insert labels before loop ends
  const labelFor = new Map<number, number>(); // loopId -> count (unique labels per site not needed; one label per loop)
  for (const s of sites) {
    lines[s.line] = lines[s.line].replace(/\bcontinue\b/, `goto __bx_cont_${s.loopId}`);
    labelFor.set(s.loopId, s.loopId);
  }
  // group ends by line
  const endsByLine = new Map<number, number[]>();
  for (const e of ends) {
    const l = endsByLine.get(e.line) ?? [];
    l.push(e.loopId);
    endsByLine.set(e.line, l);
  }
  const newLines: string[] = [];
  lines.forEach((line, li) => {
    const ids = endsByLine.get(li);
    if (ids) {
      const indent = (line.match(/^\s*/) ?? [''])[0];
      for (const id of ids) newLines.push(`${indent}::__bx_cont_${id}::`);
    }
    newLines.push(line);
  });
  return { code: newLines.join('\n'), errors };
}

/** Backtick string interpolation: `hi {name}` -> "hi " .. tostring(name) .. "" */
function expandInterpolation(code: string): string {
  return code.replace(/`((?:[^`\\]|\\.)*)`/g, (match, inner: string) => {
    if (!inner.includes('{')) return `"${inner.replace(/"/g, '\\"')}"`;
    const parts: string[] = [];
    let lit = '';
    let i = 0;
    let ok = true;
    while (i < inner.length) {
      if (inner[i] === '{') {
        let depth = 1;
        let j = i + 1;
        while (j < inner.length && depth > 0) {
          if (inner[j] === '{') depth++;
          else if (inner[j] === '}') depth--;
          j++;
        }
        if (depth !== 0) { ok = false; break; }
        const expr = inner.slice(i + 1, j - 1).trim();
        if (!expr) { ok = false; break; }
        parts.push(JSON.stringify(lit));
        parts.push(`tostring(${expr})`);
        lit = '';
        i = j;
      } else {
        lit += inner[i];
        i++;
      }
    }
    if (!ok) return match; // leave it; will surface as a syntax error
    parts.push(JSON.stringify(lit));
    return parts.join(' .. ');
  });
}

export function transpileLuau(code: string): TranspileResult {
  try {
    // 1. backtick interpolation on raw code
    let step = expandInterpolation(code);
    // 2. mask strings/comments
    const { masked, table } = mask(step);
    let m = masked;
    // 3. type aliases
    m = removeTypeAliases(m);
    // 4. local annotations:  local x: Type = ... / local x: Type
    m = m.replace(/\blocal\s+([A-Za-z_]\w*)\s*:\s*[^=\n;]+(?=\s*(=|;|$))/gm, 'local $1');
    // 5. :: casts (not goto labels)
    m = m.replace(/::(?![^:\n]*::)[A-Za-z_][\w.<>{}()|?, ]*/g, '');
    // 6. function param + return types
    m = stripFunctionTypes(m);
    // 7. compound assignment
    m = expandCompoundAssign(m);
    // 8. continue -> goto
    const cont = rewriteContinue(m);
    if (cont.errors.length > 0) {
      return { ok: false, code: '', error: cont.errors[0], errorLine: undefined };
    }
    m = cont.code;
    // 9. unmask
    return { ok: true, code: unmask(m, table) };
  } catch (e: any) {
    return { ok: false, code: '', error: `Transpile failed: ${e?.message ?? e}` };
  }
}
