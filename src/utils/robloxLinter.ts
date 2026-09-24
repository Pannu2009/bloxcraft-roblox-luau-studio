import { RobloxIssue, ScriptType } from '../types/roblox';

export function runInstantRobloxLint(code: string, scriptType: ScriptType): RobloxIssue[] {
  const issues: RobloxIssue[] = [];
  const lines = code.split('\n');

  lines.forEach((rawLine, index) => {
    const lineNum = index + 1;
    const line = rawLine.trim();

    // Skip empty lines or comment lines
    if (!line || line.startsWith('--')) return;

    // 1. Deprecated wait() -> task.wait()
    if (/\bwait\s*\(/.test(line) && !line.includes('task.wait') && !line.includes('WaitForChild') && !line.includes('wait(')) {
      issues.push({
        id: `lint-wait-${lineNum}`,
        line: lineNum,
        severity: 'optimization',
        title: 'Deprecated wait() API',
        description: 'Using legacy global wait() causes 30Hz pipeline throttling and potential frame drops.',
        robloxGotcha: 'Global wait() runs on the legacy 30Hz scheduler. task.wait() runs on the modern Task Scheduler synchronized with Heartbeat at 60Hz+.',
        suggestedFix: line.replace(/\bwait\s*\(/g, 'task.wait('),
      });
    }

    // 2. Deprecated spawn() -> task.spawn()
    if (/\bspawn\s*\(/.test(line) && !line.includes('task.spawn')) {
      issues.push({
        id: `lint-spawn-${lineNum}`,
        line: lineNum,
        severity: 'warning',
        title: 'Deprecated spawn() thread creator',
        description: 'Global spawn() introduces an artificial delay (up to two frames or 1/30th sec) before executing.',
        robloxGotcha: 'spawn() does not execute immediately. Use task.spawn() or task.defer() which guarantees immediate or deferred execution on the modern scheduler.',
        suggestedFix: line.replace(/\bspawn\s*\(/g, 'task.spawn('),
      });
    }

    // 3. Deprecated delay() -> task.delay()
    if (/\bdelay\s*\(/.test(line) && !line.includes('task.delay')) {
      issues.push({
        id: `lint-delay-${lineNum}`,
        line: lineNum,
        severity: 'optimization',
        title: 'Deprecated delay() function',
        description: 'Use task.delay(seconds, function) for accurate task scheduler timing.',
        robloxGotcha: 'Legacy delay() can drift significantly under high server or client workload.',
        suggestedFix: line.replace(/\bdelay\s*\(/g, 'task.delay('),
      });
    }

    // 4. Deprecated :remove() -> :Destroy()
    if (/:\s*remove\s*\(/.test(line) || /:\s*Remove\s*\(/.test(line)) {
      issues.push({
        id: `lint-remove-${lineNum}`,
        line: lineNum,
        severity: 'critical',
        title: 'Deprecated :Remove() method',
        description: ':Remove() does not disconnect active RBXScriptConnections or unlock memory, causing memory leaks.',
        robloxGotcha: ':Destroy() disconnects all connections, sets Parent to nil, and marks the instance as destroyed. :Remove() is deprecated since 2012.',
        suggestedFix: line.replace(/:\s*remove\s*\(/gi, ':Destroy('),
      });
    }

    // 5. Instance.new("ClassName", parent) 2nd argument anti-pattern
    if (/Instance\.new\s*\(\s*["'][^"']+["']\s*,\s*[^)]+\)/.test(line)) {
      issues.push({
        id: `lint-instancenew-parent-${lineNum}`,
        line: lineNum,
        severity: 'optimization',
        title: 'Performance Anti-Pattern: Instance.new with Parent argument',
        description: 'Passing parent to Instance.new triggers redundant property replication and physics calculations for every subsequent property change.',
        robloxGotcha: 'Setting Parent immediately forces the Roblox engine to replicate the empty object and recalculate bounds for every subsequent property set. Always set properties first, and set .Parent last.',
        suggestedFix: '-- Example:\nlocal part = Instance.new("Part")\npart.Size = Vector3.new(4, 1, 2)\npart.Parent = workspace',
      });
    }

    // 6. Wrong context: LocalPlayer on Server
    if (scriptType === 'ServerScript' && /Players\.LocalPlayer\b/.test(line)) {
      issues.push({
        id: `lint-localplayer-server-${lineNum}`,
        line: lineNum,
        severity: 'critical',
        title: 'Runtime Error: Players.LocalPlayer is nil on Server',
        description: 'Players.LocalPlayer only exists on the client (LocalScript). On a Server Script it evaluates to nil.',
        robloxGotcha: 'The server handles all players collectively. Pass the player object through PlayerAdded event or RemoteEvent parameters.',
        suggestedFix: 'Players.PlayerAdded:Connect(function(player)\n    -- use player here\nend)',
      });
    }

    // 7. DataStore calls without pcall
    if (/(GetAsync|SetAsync|UpdateAsync|IncrementAsync)\s*\(/.test(line)) {
      const prevLines = lines.slice(Math.max(0, index - 4), index).join('\n');
      if (!prevLines.includes('pcall') && !line.includes('pcall')) {
        issues.push({
          id: `lint-datastore-pcall-${lineNum}`,
          line: lineNum,
          severity: 'critical',
          title: 'Unsafe DataStore API: Missing pcall wrapper',
          description: 'DataStore web requests can fail due to Roblox network outages, throttling, or 500 errors, crashing the script.',
          robloxGotcha: 'All Roblox web-backed services (DataStoreService, HttpService, MarketplaceService) will throw unhandled Lua errors if offline. Always wrap in pcall.',
          suggestedFix: 'local success, result = pcall(function()\n    return dataStore:GetAsync(key)\nend)\nif not success then\n    warn("DataStore error: " .. tostring(result))\nend',
        });
      }
    }

    // 8. Deprecated lowercase :connect
    if (/:\s*connect\s*\(/.test(line)) {
      issues.push({
        id: `lint-connect-lowercase-${lineNum}`,
        line: lineNum,
        severity: 'style',
        title: 'Deprecated lowercase :connect()',
        description: 'Roblox standardized on PascalCase :Connect() for RBXScriptSignal.',
        robloxGotcha: ':connect is a legacy alias kept for backward compatibility but deprecated in modern Luau.',
        suggestedFix: line.replace(/:\s*connect\s*\(/g, ':Connect('),
      });
    }

    // 9. Deprecated :children()
    if (/:\s*children\s*\(\s*\)/i.test(line)) {
      issues.push({
        id: `lint-children-${lineNum}`,
        line: lineNum,
        severity: 'style',
        title: 'Deprecated :children() method',
        description: 'Use :GetChildren() instead of :children().',
        robloxGotcha: ':children() was deprecated in favor of :GetChildren() and :GetDescendants().',
        suggestedFix: line.replace(/:\s*children\s*\(\s*\)/gi, ':GetChildren()'),
      });
    }

    // 10. WaitForChild without timeout warning
    if (/:\s*WaitForChild\s*\(\s*["'][^"']+["']\s*\)/.test(line)) {
      issues.push({
        id: `lint-waitforchild-notimeout-${lineNum}`,
        line: lineNum,
        severity: 'warning',
        title: 'Potential Infinite Yield: WaitForChild without timeout',
        description: 'If the target child never loads or is renamed, the script hangs forever with "Infinite yield possible on...".',
        robloxGotcha: 'Pass a 2nd argument (e.g. 5 or 10 seconds timeout) to safely prevent permanent thread lockup if an instance fails to stream in.',
        suggestedFix: line.replace(/(:\s*WaitForChild\s*\(\s*["'][^"']+["'])\s*\)/, '$1, 5)'),
      });
    }

    // 11. Exploit security warning: Client RemoteEvent setting stats
    if (scriptType === 'ServerScript' && /OnServerEvent:Connect\s*\(function\s*\(\s*\w+\s*,\s*(\w+)/.test(line)) {
      if (/(gold|money|cash|health|damage|level|exp|coins)/i.test(line)) {
        issues.push({
          id: `lint-remote-security-${lineNum}`,
          line: lineNum,
          severity: 'security',
          title: 'Critical Security Vulnerability: Trusting Client Values',
          description: 'Never let the client tell the server how much money, health, or damage to assign. Exploiters can fire any arbitrary value!',
          robloxGotcha: 'Exploiters have full memory and network injection on their client. The server must be the single source of truth for math, currency, and hit validation.',
          suggestedFix: '-- Server calculates rewards based on server-verified events, never raw client numbers.',
        });
      }
    }
  });

  // Check 12: ModuleScript must return a table/value
  if (scriptType === 'ModuleScript') {
    const hasReturn = lines.some((l) => /^\s*return\s+\w+/.test(l));
    if (!hasReturn) {
      issues.push({
        id: 'lint-modulescript-no-return',
        line: lines.length,
        severity: 'critical',
        title: 'ModuleScript Error: Missing "return Module" statement',
        description: 'Roblox ModuleScripts require returning exactly one value (usually a table). Without this, require() throws an error: "Module code did not return exactly one value".',
        robloxGotcha: 'A ModuleScript that does not end with `return Module` fails immediately upon require().',
        suggestedFix: 'return Module',
      });
    }
  }

  // Check 13: Infinite loop without yield
  const fullText = code;
  if (/while\s+true\s+do[\s\S]*?end/.test(fullText)) {
    const loops = fullText.match(/while\s+true\s+do[\s\S]*?end/g) || [];
    loops.forEach((loopBody) => {
      if (!loopBody.includes('wait') && !loopBody.includes('yield') && !loopBody.includes('break')) {
        issues.push({
          id: 'lint-infinite-loop-freeze',
          line: 1,
          severity: 'critical',
          title: 'Game Freeze: Infinite Loop without Yield',
          description: 'A "while true do" loop without task.wait() will instantly hang the entire game thread or freeze Roblox Studio.',
          robloxGotcha: 'Roblox Lua runs single-threaded per Actor. A tight loop that never yields crashes the engine with script timeout.',
          suggestedFix: 'while true do\n    task.wait(1)\n    -- work\nend',
        });
      }
    });
  }

  return issues;
}
