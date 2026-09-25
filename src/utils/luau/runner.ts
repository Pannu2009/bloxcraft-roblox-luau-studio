// runner.ts — executes Luau on-device with Fengari (Lua 5.3).
//
// Pipeline: transpile Luau -> Lua, load the Roblox stub prelude, then run
// the entry script with a custom require() that resolves project modules.
// An instruction-count hook aborts infinite loops. print/warn/engine calls
// are captured as console logs.

import { lua, lauxlib, lualib, to_luastring } from 'fengari';
import { transpileLuau } from './transpile';
import { PRELUDE } from './prelude';
import type { ScriptFile } from '../../types/roblox';

export interface RunLog {
  id: string;
  type: 'print' | 'warn' | 'error' | 'info' | 'stub';
  message: string;
  source: string;
  timestamp: string;
}

export interface RunResult {
  ok: boolean;
  logs: RunLog[];
  durationMs: number;
}

// ~8M instructions total per run (hook fires every 20k)
const HOOK_EVERY = 20000;
const HOOK_MAX = 400;

let logSeq = 0;

export async function runLuauScript(
  entry: ScriptFile,
  files: ScriptFile[]
): Promise<RunResult> {
  const t0 = performance.now();
  const logs: RunLog[] = [];
  const stamp = () => new Date().toLocaleTimeString();
  const push = (type: RunLog['type'], message: string, source = entry.name) => {
    logs.push({ id: `run-${logSeq++}`, type, message, source, timestamp: stamp() });
  };

  // let the UI paint "running" before the synchronous VM work
  await new Promise((r) => setTimeout(r, 30));

  const byName = new Map<string, ScriptFile>();
  for (const f of files) byName.set(f.name.replace(/\.luau$/i, '').toLowerCase(), f);

  const L = lauxlib.luaL_newstate();
  lualib.luaL_openlibs(L);

  // instruction budget -> abort runaway scripts
  let steps = 0;
  lua.lua_sethook(
    L,
    (L2: any) => {
      if (++steps > HOOK_MAX) {
        lauxlib.luaL_error(L2, to_luastring('execution limit exceeded — possible infinite loop'));
      }
    },
    lua.LUA_MASKCOUNT,
    HOOK_EVERY
  );

  const fail = (message: string): RunResult => {
    push('error', message, 'TestRunner');
    return { ok: false, logs, durationMs: performance.now() - t0 };
  };

  try {
    // ---- log capture ----
    lua.lua_pushjsfunction(L, (L2: any) => {
      const kind = lua.lua_tojsstring(L2, 1);
      const msg = lua.lua_tojsstring(L2, 2);
      push(kind === 'stub' ? 'stub' : kind === 'warn' ? 'warn' : kind === 'error' ? 'error' : 'print', msg);
      return 0;
    });
    lua.lua_setglobal(L, to_luastring('__bx_emit'));

    // ---- prelude (stubs) ----
    let st = lauxlib.luaL_loadbufferx(
      L, to_luastring(PRELUDE), null, to_luastring('@__stubs__'), to_luastring('t')
    );
    if (st !== lua.LUA_OK) return fail(`stub prelude failed to load: ${lua.lua_tojsstring(L, -1)}`);
    if (lua.lua_pcall(L, 0, 0, 0) !== lua.LUA_OK) {
      return fail(`stub prelude crashed: ${lua.lua_tojsstring(L, -1)}`);
    }

    // registry table for loaded modules
    lua.lua_newtable(L);
    lua.lua_setfield(L, lua.LUA_REGISTRYINDEX, to_luastring('__bx_modules'));

    const setScriptMock = (file: ScriptFile) => {
      lua.lua_getglobal(L, to_luastring('__bx_newMock'));
      lua.lua_pushstring(L, to_luastring(file.name.replace(/\.luau$/i, '')));
      lua.lua_pushstring(L, to_luastring(file.type));
      lua.lua_call(L, 2, 1);
      lua.lua_setglobal(L, to_luastring('script'));
    };

    const loading = new Set<string>();

    const loadModule = (file: ScriptFile): boolean => {
      // returns true with module value on stack
      if (loading.has(file.id)) {
        lauxlib.luaL_error(L, to_luastring(`circular require involving '${file.name}' (see Wiring diagram)`));
        return false;
      }
      // cache hit?
      lua.lua_getfield(L, lua.LUA_REGISTRYINDEX, to_luastring('__bx_modules'));
      lua.lua_getfield(L, -1, to_luastring(file.id));
      if (lua.lua_type(L, -1) !== lua.LUA_TNIL) {
        lua.lua_remove(L, -2);
        return true;
      }
      lua.lua_pop(L, 2);

      loading.add(file.id);
      try {
        const tr = transpileLuau(file.code);
        if (!tr.ok) {
          lauxlib.luaL_error(L, to_luastring(`in '${file.name}': ${tr.error ?? 'transpile failed'}`));
          return false;
        }
        setScriptMock(file);
        const ld = lauxlib.luaL_loadbufferx(
          L, to_luastring(tr.code), null, to_luastring(`@${file.name}`), to_luastring('t')
        );
        if (ld !== lua.LUA_OK) {
          const msg = lua.lua_tojsstring(L, -1);
          lauxlib.luaL_error(L, to_luastring(`in '${file.name}': ${msg}`));
          return false;
        }
        const pc = lua.lua_pcall(L, 0, 1, 0);
        if (pc !== lua.LUA_OK) {
          const msg = lua.lua_tojsstring(L, -1);
          lauxlib.luaL_error(L, to_luastring(msg));
          return false;
        }
        // cache the returned value
        lua.lua_getfield(L, lua.LUA_REGISTRYINDEX, to_luastring('__bx_modules'));
        lua.lua_pushvalue(L, -2);
        lua.lua_setfield(L, -2, to_luastring(file.id));
        lua.lua_pop(L, 1);
        return true;
      } finally {
        loading.delete(file.id);
      }
    };

    // ---- custom require() ----
    lua.lua_pushjsfunction(L, (L2: any) => {
      void L2;
      let name: string | null = null;
      const t = lua.lua_type(L, 1);
      if (t === lua.LUA_TSTRING) {
        name = lua.lua_tojsstring(L, 1);
      } else if (t === lua.LUA_TNUMBER) {
        lauxlib.luaL_error(L, to_luastring('require(assetId) is not supported in the test runner'));
        return 0;
      } else if (t === lua.LUA_TTABLE) {
        lua.lua_getfield(L, 1, to_luastring('Name'));
        if (lua.lua_type(L, -1) === lua.LUA_TSTRING) name = lua.lua_tojsstring(L, -1);
        lua.lua_pop(L, 1);
      }
      if (!name) {
        lauxlib.luaL_error(L, to_luastring('require() could not determine the module name'));
        return 0;
      }
      // strip dotted paths: "Modules.Pets" -> "Pets"
      const short = name.split('.').pop() ?? name;
      const file = byName.get(short.toLowerCase()) ?? byName.get(name.toLowerCase());
      if (!file) {
        lauxlib.luaL_error(L, to_luastring(`module '${name}' not found in this project`));
        return 0;
      }
      if (!loadModule(file)) return 0; // error already raised
      return 1;
    });
    lua.lua_setglobal(L, to_luastring('require'));

    // ---- run the entry script ----
    push('info', `TestRunner: executing ${entry.name} (${entry.type}) on-device…`, 'TestRunner');
    const tr = transpileLuau(entry.code);
    if (!tr.ok) return fail(`transpile: ${tr.error ?? 'unknown error'}`);

    setScriptMock(entry);
    st = lauxlib.luaL_loadbufferx(L, to_luastring(tr.code), null, to_luastring(`@${entry.name}`), to_luastring('t'));
    if (st !== lua.LUA_OK) {
      return fail(`syntax: ${lua.lua_tojsstring(L, -1)}`);
    }
    const pc = lua.lua_pcall(L, 0, 0, 0);
    if (pc !== lua.LUA_OK) {
      return fail(`runtime: ${lua.lua_tojsstring(L, -1)}`);
    }

    const ms = Math.round(performance.now() - t0);
    push('info', `done in ${ms}ms on-device`, 'TestRunner');
    return { ok: true, logs, durationMs: ms };
  } catch (e: any) {
    return fail(`runner crashed: ${e?.message ?? e}`);
  }
}
