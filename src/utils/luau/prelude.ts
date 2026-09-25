// prelude.ts — Lua source loaded before user code in the test runner.
// Provides: print/warn capture, Luau builtins (typeof, table.find/create,
// string.split, math.clamp/round, task.*), and a permissive mock of the
// Roblox engine (game, workspace, script, Instance, Vector3, CFrame,
// UDim2, Color3, Enum, ...). Engine calls are logged as [stub] entries so
// the user can see what their script touched.
//
// NOTE: this is a template literal — it must not contain backticks or ${.

export const PRELUDE = `
-- __bx_emit(kind, message) is installed from JS before this runs.

local function _fmt(...)
  local n = select("#", ...)
  local parts = {}
  for i = 1, n do parts[i] = tostring(select(i, ...)) end
  return table.concat(parts, "\\t")
end

function print(...) __bx_emit("print", _fmt(...)) end
function warn(...) __bx_emit("warn", _fmt(...)) end

-- sandbox: no filesystem / bytecode loading on device
dofile = nil
loadfile = nil

-- ============ Luau builtins ============
function typeof(v)
  local t = type(v)
  if t == "table" then
    local mt = getmetatable(v)
    if mt and mt.__bxtype then return mt.__bxtype end
    return "table"
  end
  return t
end

function table.find(t, v, init)
  for i = init or 1, #t do if t[i] == v then return i end end
  return nil
end

function table.create(n, v)
  local t = {}
  for i = 1, n or 0 do t[i] = v end
  return t
end

function table.clear(t)
  for k in pairs(t) do t[k] = nil end
end

function string.split(s, sep)
  local out = {}
  local pat = "([^" .. sep .. "]*)" .. sep .. "?"
  for part in tostring(s):gmatch(pat) do table.insert(out, part) end
  if #out > 0 and out[#out] == "" then table.remove(out) end
  return out
end

function math.clamp(x, mn, mx)
  if x < mn then return mn elseif x > mx then return mx end
  return x
end

function math.round(x) return math.floor(x + 0.5) end
function math.sign(x) if x > 0 then return 1 elseif x < 0 then return -1 end return 0 end

-- ============ task + clock ============
__bx = { clock = 0 }

task = {}
function task.wait(t)
  t = t or 0
  __bx.clock = __bx.clock + t
  return __bx.clock
end
function task.spawn(fn, ...)
  if type(fn) == "function" then fn(...) end
end
function task.defer(fn, ...)
  if type(fn) == "function" then fn(...) end
end
function task.delay(t, fn, ...)
  if type(fn) == "function" then fn(...) end
  return { Connected = true, Disconnect = function() end }
end
function task.cancel(...) end
function task.desynchronize() end
function task.synchronize() end

function tick() return __bx.clock end
os.clock = function() return __bx.clock end

-- ============ Mock instances ============
local EVENT_NAMES = {
  Touched = true, TouchEnded = true, Changed = true, ChildAdded = true,
  DescendantAdded = true, ChildRemoved = true, AncestryChanged = true,
  PlayerAdded = true, PlayerRemoving = true, CharacterAdded = true,
  CharacterAppearanceLoaded = true, Chatted = true, MouseClick = true,
  MouseButton1Click = true, MouseButton1Down = true, Activated = true,
  Focused = true, FocusLost = true, Stepped = true, Heartbeat = true,
  RenderStepped = true, BindToClose = true, OnInvoke = true,
}

local function newEvent(name)
  local ev = { _name = name, _cons = {} }
  setmetatable(ev, { __bxtype = "RBXScriptSignal" })
  function ev:Connect(fn)
    local c = { Connected = true }
    setmetatable(c, { __bxtype = "RBXScriptConnection" })
    function c:Disconnect() self.Connected = false end
    table.insert(ev._cons, { fn = fn, c = c })
    return c
  end
  function ev:Once(fn) return ev:Connect(fn) end
  function ev:Wait() return nil end
  function ev:Fire(...)
    for _, co in ipairs(ev._cons) do
      if co.c.Connected then pcall(co.fn, ...) end
    end
  end
  return ev
end

local mockMt = {
  __bxtype = "Instance",
  __tostring = function(self) return self.Name end,
  __index = function(self, k)
    if k == "Parent" then
      local p = rawget(self, "_parent")
      if p == nil then
        p = newMock("Parent", "Instance")
        rawset(self, "_parent", p)
      end
      return p
    end
    if EVENT_NAMES[k] then
      local ev = newEvent(k)
      rawset(self, k, ev)
      return ev
    end
    local child = newMock(k, "Instance")
    child._parent = self
    rawset(self, k, child)
    return child
  end,
}

function newMock(name, className)
  local t = {
    Name = name,
    ClassName = className or "Instance",
    _parent = nil,
    _attrs = {},
  }
  setmetatable(t, mockMt)

  function t:GetChildren()
    local r = {}
    for k, v in pairs(self) do
      if type(v) == "table" and type(v.ClassName) == "string"
        and k ~= "_parent" and k ~= "_attrs" then
        table.insert(r, v)
      end
    end
    return r
  end

  function t:GetDescendants()
    local r = {}
    local function walk(m)
      for _, c in ipairs(m:GetChildren()) do
        table.insert(r, c)
        walk(c)
      end
    end
    walk(self)
    return r
  end

  function t:FindFirstChild(n) return rawget(self, n) end
  function t:FindFirstAncestor(n)
    local p = self.Parent
    while p do
      if p.Name == n then return p end
      p = rawget(p, "_parent")
    end
    return nil
  end
  function t:WaitForChild(n)
    __bx_emit("stub", "WaitForChild('" .. tostring(n) .. "') on " .. self.Name .. " (test runner returns instantly)")
    return self[n]
  end
  function t:Destroy()
    __bx_emit("stub", self.ClassName .. " '" .. self.Name .. "' destroyed")
  end
  function t:Clone()
    local c = newMock(self.Name, self.ClassName)
    return c
  end
  function t:GetAttribute(n) return self._attrs[n] end
  function t:SetAttribute(n, v) self._attrs[n] = v end
  function t:IsA(cn) return self.ClassName == cn end
  function t:IsDescendantOf(a)
    local p = rawget(self, "_parent")
    while p do
      if p == a then return true end
      p = rawget(p, "_parent")
    end
    return false
  end
  return t
end

__bx_newMock = newMock

Instance = {}
function Instance.new(className, parent)
  __bx_emit("stub", "Instance.new('" .. tostring(className) .. "')")
  local m = newMock(tostring(className), tostring(className))
  if parent ~= nil then
    m._parent = parent
    rawset(m, "Parent", parent)
  end
  return m
end

-- ============ game / workspace / script ============
local _services = {}
game = newMock("game", "DataModel")
function game:GetService(name)
  if not _services[name] then
    local s = newMock(name, name)
    if name == "Players" then
      s.LocalPlayer = newMock("Player1", "Player")
      s.LocalPlayer.Character = newMock("Character", "Model")
    end
    _services[name] = s
  end
  return _services[name]
end
game.Workspace = newMock("Workspace", "Workspace")
workspace = game.Workspace

script = newMock("Script", "Script")

-- ============ Datatypes ============
local vecMt = {
  __bxtype = "Vector3",
  __tostring = function(self) return self.X .. ", " .. self.Y .. ", " .. self.Z end,
  __add = function(a, b) return Vector3.new(a.X + b.X, a.Y + b.Y, a.Z + b.Z) end,
  __sub = function(a, b) return Vector3.new(a.X - b.X, a.Y - b.Y, a.Z - b.Z) end,
  __mul = function(a, b)
    if type(a) == "number" then return Vector3.new(a * b.X, a * b.Y, a * b.Z) end
    return Vector3.new(a.X * b, a.Y * b, a.Z * b)
  end,
}

Vector3 = {}
function Vector3.new(x, y, z)
  local v = { X = x or 0, Y = y or 0, Z = z or 0 }
  setmetatable(v, vecMt)
  return v
end
Vector3.zero = Vector3.new(0, 0, 0)
Vector3.one = Vector3.new(1, 1, 1)
Vector3.yAxis = Vector3.new(0, 1, 0)
Vector3.xAxis = Vector3.new(1, 0, 0)
Vector3.zAxis = Vector3.new(0, 0, 1)

Vector2 = {}
function Vector2.new(x, y)
  return setmetatable({ X = x or 0, Y = y or 0 }, { __bxtype = "Vector2" })
end

CFrame = {}
function CFrame.new(x, y, z)
  return setmetatable(
    { Position = Vector3.new(x or 0, y or 0, z or 0) },
    { __bxtype = "CFrame" }
  )
end
CFrame.identity = CFrame.new(0, 0, 0)

UDim = {}
function UDim.new(scale, offset)
  return setmetatable({ Scale = scale or 0, Offset = offset or 0 }, { __bxtype = "UDim" })
end

UDim2 = {}
function UDim2.new(sx, ox, sy, oy)
  return setmetatable(
    { X = UDim.new(sx, ox), Y = UDim.new(sy, oy) },
    { __bxtype = "UDim2" }
  )
end
function UDim2.fromScale(x, y) return UDim2.new(x, 0, y, 0) end
function UDim2.fromOffset(x, y) return UDim2.new(0, x, 0, y) end

Color3 = {}
function Color3.new(r, g, b)
  return setmetatable({ R = r or 0, G = g or 0, B = b or 0 }, { __bxtype = "Color3" })
end
function Color3.fromRGB(r, g, b) return Color3.new(r / 255, g / 255, b / 255) end
function Color3.fromHSV(h, s, v) return Color3.new(h, s, v) end

BrickColor = {}
function BrickColor.new(name)
  return setmetatable({ Name = tostring(name) }, { __bxtype = "BrickColor" })
end

Enum = setmetatable({}, {
  __index = function(_, cat)
    return setmetatable({}, {
      __index = function(_, item)
        return setmetatable(
          { Name = item, Value = 0, EnumType = cat },
          { __bxtype = "EnumItem" }
        )
      end,
    })
  end,
})

TweenInfo = {}
function TweenInfo.new(t, style, dir, rep, rev, delay)
  return setmetatable({
    Time = t or 1, EasingStyle = style, EasingDirection = dir,
    RepeatCount = rep or 0, Reverses = rev or false, DelayTime = delay or 0,
  }, { __bxtype = "TweenInfo" })
end

Random = {}
function Random.new(seed)
  local r = { _s = seed or 1 }
  function r:NextInteger(a, b) return a end
  function r:NextNumber(a, b) return a end
  return setmetatable(r, { __bxtype = "Random" })
end

DateTime = {}
function DateTime.now()
  return setmetatable(
    { UnixTimestamp = os.time(), UnixTimestampMillis = os.time() * 1000 },
    { __bxtype = "DateTime" }
  )
end

NumberRange = {}
function NumberRange.new(a, b)
  return setmetatable({ Min = a or 0, Max = b or a or 0 }, { __bxtype = "NumberRange" })
end

NumberSequence = {}
function NumberSequence.new(...)
  return setmetatable({}, { __bxtype = "NumberSequence" })
end

Rect = {}
function Rect.new(...) return setmetatable({}, { __bxtype = "Rect" }) end

-- TweenService helper: real tween instantly applies (test runner)
-- (accessed via game:GetService("TweenService"))
`;
