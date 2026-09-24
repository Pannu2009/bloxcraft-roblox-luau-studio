/**
 * Roblox Studio Luau Syntax Highlighter
 * Mirrors Roblox Studio's default Dark Theme syntax colors:
 * - Keywords (local, function, if, then, end, etc.) -> Roblox Studio Red (#F86D7C / #FF5C57)
 * - Built-in Roblox Globals & Services (game, workspace, task, Vector3, etc.) -> Light Blue / Cyan (#84D6F7)
 * - Strings ("...", '...', [[...]]) -> Roblox Studio Green (#ADDB67 / #7EE787)
 * - String Interpolation (`...{val}...`) -> Modern Luau interpolated string highlighting
 * - Numbers (0, 123, 0xFF, 0b101, 3.14) -> Yellow / Orange (#FFC600 / #FFAB70)
 * - Booleans & nil (true, false, nil) -> Orange (#FFB454)
 * - Comments (-- ..., --[[ ... ]]) -> Muted Green / Gray (#6A9955)
 * - Luau Directives (--!strict, --!nocheck) -> Purple (#C678DD)
 * - Functions & Methods (:Connect, .new, :WaitForChild, print, pcall) -> Gold / Yellow (#FAD000 / #E5C07B)
 * - Luau Types (number, string, boolean, any, Player, etc.) -> Teal (#4EC9B0)
 * - Self & Metamethods (self, __index) -> Magenta / Purple (#C678DD)
 * - Operators (==, ~=, ->, ::, +=, -=, *=, /=, ..=, etc.) -> Slate / Silver (#ABB2BF)
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ROBLOX_KEYWORDS = new Set([
  'local',
  'function',
  'end',
  'if',
  'then',
  'else',
  'elseif',
  'for',
  'in',
  'do',
  'while',
  'repeat',
  'until',
  'return',
  'break',
  'continue',
  'export',
  'type',
  'typeof',
  'and',
  'or',
  'not',
]);

const ROBLOX_GLOBALS_AND_SERVICES = new Set([
  'game',
  'workspace',
  'script',
  'math',
  'table',
  'string',
  'task',
  'coroutine',
  'os',
  'debug',
  'utf8',
  'buffer',
  'bit32',
  'Vector3',
  'Vector2',
  'Vector3int16',
  'Vector2int16',
  'CFrame',
  'Color3',
  'Instance',
  'TweenInfo',
  'RaycastParams',
  'UDim2',
  'UDim',
  'Enum',
  'ColorSequence',
  'ColorSequenceKeypoint',
  'NumberSequence',
  'NumberSequenceKeypoint',
  'NumberRange',
  'Rect',
  'Ray',
  'Region3',
  'Region3int16',
  'DateTime',
  'Axes',
  'Faces',
  'PathWaypoint',
  'PhysicalProperties',
  'Random',
  'OverlapParams',
  'Font',
  'SharedTable',
  'Players',
  'RunService',
  'ReplicatedStorage',
  'ServerScriptService',
  'ServerStorage',
  'TweenService',
  'UserInputService',
  'ContextActionService',
  'CollectionService',
  'HttpService',
  'SoundService',
  'Debris',
  'Lighting',
  'StarterPlayer',
  'StarterGui',
  'Chat',
  'MarketplaceService',
  'DataStoreService',
  'TeleportService',
  'PathfindingService',
  'BadgeService',
  'MemoryStoreService',
  'LocalizationService',
]);

const ROBLOX_BUILTIN_FUNCS = new Set([
  'print',
  'warn',
  'error',
  'pcall',
  'xpcall',
  'require',
  'assert',
  'tostring',
  'tonumber',
  'setmetatable',
  'getmetatable',
  'rawget',
  'rawset',
  'rawequal',
  'rawlen',
  'select',
  'unpack',
  'next',
  'pairs',
  'ipairs',
  'newproxy',
  'tick',
  'time',
  'delay',
  'spawn',
  'wait',
  'elapsedTime',
]);

const LUAU_PRIMITIVE_TYPES = new Set([
  'number',
  'string',
  'boolean',
  'any',
  'unknown',
  'never',
  'thread',
  'table',
  'nil',
  'void',
  'RBXScriptConnection',
  'RBXScriptSignal',
  'Player',
  'Model',
  'Part',
  'BasePart',
  'Humanoid',
  'Tool',
  'GuiObject',
  'ScreenGui',
  'RemoteEvent',
  'RemoteFunction',
  'BindableEvent',
  'BindableFunction',
  'Camera',
  'Animation',
  'AnimationTrack',
]);

const ROBLOX_METAMETHODS = new Set([
  'self',
  '__index',
  '__newindex',
  '__tostring',
  '__call',
  '__mode',
  '__metatable',
  '__add',
  '__sub',
  '__mul',
  '__div',
  '__idiv',
  '__mod',
  '__pow',
  '__concat',
  '__unm',
  '__eq',
  '__lt',
  '__le',
  '__len',
  '__iter',
]);

export interface HighlightStyles {
  keyword: string; // Red
  global: string; // Light blue / Cyan
  builtinFunc: string; // Yellow
  string: string; // Green
  number: string; // Orange / Peach
  boolean: string; // Orange
  comment: string; // Gray-green
  directive: string; // Purple
  type: string; // Teal
  metamethod: string; // Magenta
  operator: string; // Slate
  punctuation: string; // Gray
  methodCall: string; // Yellow-gold
}

export const ROBLOX_STUDIO_COLORS: HighlightStyles = {
  keyword: '#F86D7C', // Roblox Studio signature red for local, function, end, if, then, return
  global: '#84D6F7', // Cyan / Light blue for game, workspace, task, Vector3, etc.
  builtinFunc: '#FAD000', // Gold/Yellow for print, warn, pcall, require, etc.
  string: '#ADDB67', // Light green for strings
  number: '#FFAB70', // Warm peach/orange for numbers
  boolean: '#FFB454', // Amber/orange for true, false, nil
  comment: '#6A9955', // Muted green-gray for comments
  directive: '#C678DD', // Purple for --!strict, --!nocheck
  type: '#4EC9B0', // Teal for Luau types
  metamethod: '#C678DD', // Purple for self, __index
  operator: '#ABB2BF', // Slate for ==, ~=, ->, ::, =
  punctuation: '#8892B0', // Subtle gray for brackets, parenthesis, commas
  methodCall: '#E5C07B', // Yellow for methods like :Connect, :WaitForChild
};

/**
 * High-performance tokenizer & HTML highlighter for Luau code
 */
export function highlightLuauCode(code: string): string {
  if (!code) return '';

  const c = ROBLOX_STUDIO_COLORS;
  let html = '';
  let i = 0;
  const len = code.length;

  while (i < len) {
    const char = code[i];

    // 1. Comments & Directives: -- ... or --[[ ... ]]
    if (char === '-' && code[i + 1] === '-') {
      // Check multi-line comment: --[[
      if (code[i + 2] === '[' && code[i + 3] === '[') {
        const endIdx = code.indexOf(']]', i + 4);
        const commentContent = endIdx === -1 ? code.slice(i) : code.slice(i, endIdx + 2);
        html += `<span style="color: ${c.comment}; font-style: italic;">${escapeHtml(commentContent)}</span>`;
        i = endIdx === -1 ? len : endIdx + 2;
        continue;
      }

      // Check single-line comment
      let lineEnd = code.indexOf('\n', i + 2);
      if (lineEnd === -1) lineEnd = len;
      const commentLine = code.slice(i, lineEnd);

      // Check for Luau directive like --!strict, --!nocheck, --!nonstrict
      if (commentLine.startsWith('--!')) {
        html += `<span style="color: ${c.directive}; font-weight: 600;">${escapeHtml(commentLine)}</span>`;
      } else {
        html += `<span style="color: ${c.comment}; font-style: italic;">${escapeHtml(commentLine)}</span>`;
      }
      i = lineEnd;
      continue;
    }

    // 2. Multiline String: [[ ... ]]
    if (char === '[' && code[i + 1] === '[') {
      const endIdx = code.indexOf(']]', i + 2);
      const strContent = endIdx === -1 ? code.slice(i) : code.slice(i, endIdx + 2);
      html += `<span style="color: ${c.string};">${escapeHtml(strContent)}</span>`;
      i = endIdx === -1 ? len : endIdx + 2;
      continue;
    }

    // 3. Quoted Strings: "..." or '...'
    if (char === '"' || char === "'") {
      const quote = char;
      let j = i + 1;
      let escaped = false;
      while (j < len) {
        if (escaped) {
          escaped = false;
        } else if (code[j] === '\\') {
          escaped = true;
        } else if (code[j] === quote) {
          j++;
          break;
        } else if (code[j] === '\n') {
          break;
        }
        j++;
      }
      const strToken = code.slice(i, j);
      html += `<span style="color: ${c.string};">${escapeHtml(strToken)}</span>`;
      i = j;
      continue;
    }

    // 4. Modern Luau String Interpolation: `...{val}...`
    if (char === '`') {
      let j = i + 1;
      let escaped = false;
      let interpolatedHtml = `<span style="color: ${c.string};">\`</span>`;
      let textChunk = '';

      while (j < len) {
        if (escaped) {
          textChunk += code[j];
          escaped = false;
          j++;
        } else if (code[j] === '\\') {
          escaped = true;
          j++;
        } else if (code[j] === '`') {
          if (textChunk) {
            interpolatedHtml += `<span style="color: ${c.string};">${escapeHtml(textChunk)}</span>`;
            textChunk = '';
          }
          interpolatedHtml += `<span style="color: ${c.string};">\`</span>`;
          j++;
          break;
        } else if (code[j] === '{') {
          if (textChunk) {
            interpolatedHtml += `<span style="color: ${c.string};">${escapeHtml(textChunk)}</span>`;
            textChunk = '';
          }
          interpolatedHtml += `<span style="color: ${c.punctuation}; font-weight: 600;">{</span>`;
          let braceDepth = 1;
          let k = j + 1;
          while (k < len && braceDepth > 0) {
            if (code[k] === '{') braceDepth++;
            else if (code[k] === '}') braceDepth--;
            if (braceDepth === 0) break;
            k++;
          }
          const expr = code.slice(j + 1, k);
          interpolatedHtml += highlightLuauCode(expr);
          interpolatedHtml += `<span style="color: ${c.punctuation}; font-weight: 600;">}</span>`;
          j = k + 1;
        } else {
          textChunk += code[j];
          j++;
        }
      }

      if (textChunk) {
        interpolatedHtml += `<span style="color: ${c.string};">${escapeHtml(textChunk)}</span>`;
      }
      html += interpolatedHtml;
      i = j;
      continue;
    }

    // 5. Numbers: 0x..., 0b..., 123.45, 1e5
    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(code[i + 1] || ''))) {
      let j = i;
      if (code.startsWith('0x', j) || code.startsWith('0X', j)) {
        j += 2;
        while (j < len && /[0-9a-fA-F_]/.test(code[j])) j++;
      } else if (code.startsWith('0b', j) || code.startsWith('0B', j)) {
        j += 2;
        while (j < len && /[01_]/.test(code[j])) j++;
      } else {
        while (j < len && /[0-9._eE+-]/.test(code[j])) {
          if ((code[j] === 'e' || code[j] === 'E') && (code[j + 1] === '+' || code[j + 1] === '-')) {
            j += 2;
          } else {
            j++;
          }
        }
      }
      const numToken = code.slice(i, j);
      html += `<span style="color: ${c.number};">${escapeHtml(numToken)}</span>`;
      i = j;
      continue;
    }

    // 6. Method calls: :MethodName or .MethodName
    if (char === ':' || char === '.') {
      let nextIdx = i + 1;
      while (nextIdx < len && (code[nextIdx] === ' ' || code[nextIdx] === '\t')) nextIdx++;

      if (nextIdx < len && /[a-zA-Z_]/.test(code[nextIdx])) {
        let j = nextIdx;
        while (j < len && /[a-zA-Z0-9_]/.test(code[j])) j++;
        const identifier = code.slice(nextIdx, j);

        // Check if followed by ( or { or string (method call)
        let afterIdx = j;
        while (afterIdx < len && (code[afterIdx] === ' ' || code[afterIdx] === '\t')) afterIdx++;
        const isCall =
          afterIdx < len &&
          (code[afterIdx] === '(' ||
            code[afterIdx] === '{' ||
            code[afterIdx] === '"' ||
            code[afterIdx] === "'" ||
            code[afterIdx] === '`');

        html += `<span style="color: ${c.operator};">${escapeHtml(char)}</span>`;
        if (nextIdx > i + 1) {
          html += escapeHtml(code.slice(i + 1, nextIdx));
        }

        if (char === ':' || isCall) {
          html += `<span style="color: ${c.methodCall}; font-weight: 500;">${escapeHtml(identifier)}</span>`;
        } else if (ROBLOX_METAMETHODS.has(identifier)) {
          html += `<span style="color: ${c.metamethod}; font-weight: 600;">${escapeHtml(identifier)}</span>`;
        } else if (LUAU_PRIMITIVE_TYPES.has(identifier)) {
          html += `<span style="color: ${c.type}; font-weight: 500;">${escapeHtml(identifier)}</span>`;
        } else {
          html += escapeHtml(identifier);
        }

        i = j;
        continue;
      }
    }

    // 7. Words / Identifiers (Keywords, Services, Builtins, Types)
    if (/[a-zA-Z_]/.test(char)) {
      let j = i;
      while (j < len && /[a-zA-Z0-9_]/.test(code[j])) j++;
      const word = code.slice(i, j);

      // Check if keyword (e.g. local, function, end, return, if, etc. -> RED)
      if (ROBLOX_KEYWORDS.has(word)) {
        html += `<span style="color: ${c.keyword}; font-weight: 600;">${escapeHtml(word)}</span>`;
      }
      // Check if boolean / nil
      else if (word === 'true' || word === 'false' || word === 'nil') {
        html += `<span style="color: ${c.boolean}; font-weight: 600;">${escapeHtml(word)}</span>`;
      }
      // Check if metamethod or self
      else if (ROBLOX_METAMETHODS.has(word)) {
        html += `<span style="color: ${c.metamethod}; font-weight: 600;">${escapeHtml(word)}</span>`;
      }
      // Check if Roblox Global or Service (game, workspace, task, Vector3 -> CYAN/LIGHT BLUE)
      else if (ROBLOX_GLOBALS_AND_SERVICES.has(word)) {
        html += `<span style="color: ${c.global}; font-weight: 600;">${escapeHtml(word)}</span>`;
      }
      // Check if Built-in Function (print, warn, pcall, require -> GOLD)
      else if (ROBLOX_BUILTIN_FUNCS.has(word)) {
        html += `<span style="color: ${c.builtinFunc}; font-weight: 500;">${escapeHtml(word)}</span>`;
      }
      // Check if Luau primitive type (number, string, boolean, any -> TEAL)
      else if (LUAU_PRIMITIVE_TYPES.has(word)) {
        html += `<span style="color: ${c.type}; font-weight: 500;">${escapeHtml(word)}</span>`;
      }
      // General identifier
      else {
        // Lookahead: is it a function call? e.g. myFunction()
        let k = j;
        while (k < len && (code[k] === ' ' || code[k] === '\t')) k++;
        if (k < len && (code[k] === '(' || code[k] === '{' || code[k] === '"' || code[k] === "'" || code[k] === '`')) {
          html += `<span style="color: ${c.builtinFunc};">${escapeHtml(word)}</span>`;
        } else {
          html += escapeHtml(word);
        }
      }

      i = j;
      continue;
    }

    // 8. Compound & Special Operators (3 chars & 2 chars)
    const threeChars = code.slice(i, i + 3);
    if (threeChars === '..=') {
      html += `<span style="color: ${c.operator}; font-weight: 600;">..=</span>`;
      i += 3;
      continue;
    }

    const twoChars = code.slice(i, i + 2);
    if (
      twoChars === '==' ||
      twoChars === '~=' ||
      twoChars === '<=' ||
      twoChars === '>=' ||
      twoChars === '..' ||
      twoChars === '->' ||
      twoChars === '::' ||
      twoChars === '+=' ||
      twoChars === '-=' ||
      twoChars === '*=' ||
      twoChars === '/=' ||
      twoChars === '%=' ||
      twoChars === '^=' ||
      twoChars === '//'
    ) {
      html += `<span style="color: ${c.operator}; font-weight: 600;">${escapeHtml(twoChars)}</span>`;
      i += 2;
      continue;
    }

    if (
      char === '=' ||
      char === '+' ||
      char === '-' ||
      char === '*' ||
      char === '/' ||
      char === '%' ||
      char === '^' ||
      char === '#' ||
      char === '<' ||
      char === '>' ||
      char === ':'
    ) {
      html += `<span style="color: ${c.operator};">${escapeHtml(char)}</span>`;
      i++;
      continue;
    }

    // 9. Punctuation: (), {}, [], commas, semicolons
    if (
      char === '(' ||
      char === ')' ||
      char === '{' ||
      char === '}' ||
      char === '[' ||
      char === ']' ||
      char === ',' ||
      char === ';'
    ) {
      html += `<span style="color: ${c.punctuation};">${escapeHtml(char)}</span>`;
      i++;
      continue;
    }

    // 10. Whitespace / Newline
    html += escapeHtml(char);
    i++;
  }

  return html;
}
