import { ScriptFile } from '../types/roblox';

export const INITIAL_SCRIPTS: ScriptFile[] = [
  {
    id: 'script-1',
    name: 'DataStoreManager.luau',
    type: 'ModuleScript',
    suggestedPlacement: 'ServerScriptService.Modules',
    code: `--!strict
-- DataStoreManager: Handles player profile saves with auto-retry
-- Notice: This version has several real-world Roblox bugs for testing!

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local PlayerDataStore = DataStoreService:GetDataStore("PlayerData_v1")

local DataStoreManager = {}
DataStoreManager.__index = DataStoreManager

local sessionData = {}

-- BUG 1: Unsafe call without pcall
function DataStoreManager.LoadData(player: Player)
    local key = "Player_" .. player.UserId
    -- Potential crash if Roblox datastores are down!
    local data = PlayerDataStore:GetAsync(key)
    
    if data then
        sessionData[player.UserId] = data
    else
        sessionData[player.UserId] = {
            Coins = 100,
            Level = 1,
            Inventory = {}
        }
    end
    
    -- BUG 2: Anti-pattern Instance.new with 2nd argument
    local folder = Instance.new("Folder", player)
    folder.Name = "leaderstats"
    
    local coinsVal = Instance.new("IntValue", folder)
    coinsVal.Name = "Coins"
    coinsVal.Value = sessionData[player.UserId].Coins
    
    return sessionData[player.UserId]
end

-- BUG 3: Deprecated wait() and spawn()
function DataStoreManager.AutoSaveRoutine(player: Player)
    spawn(function()
        while true do
            wait(60) -- Legacy wait()
            if not player or not player.Parent then
                break
            end
            DataStoreManager.SaveData(player)
        end
    end)
end

function DataStoreManager.SaveData(player: Player)
    local key = "Player_" .. player.UserId
    local current = sessionData[player.UserId]
    if current then
        -- BUG 4: SetAsync without pcall or exponential backoff
        PlayerDataStore:SetAsync(key, current)
        print("Saved data for " .. player.Name)
    end
end

-- BUG 5: Forgot 'return DataStoreManager' at bottom of ModuleScript!
`,
  },
  {
    id: 'script-2',
    name: 'CombatHitboxService.luau',
    type: 'ServerScript',
    suggestedPlacement: 'ServerScriptService.Combat',
    code: `--!strict
-- CombatHitboxService: Validates melee and weapon hits on the server
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")
local Workspace = game:GetService("Workspace")

local AttackRemote = ReplicatedStorage:WaitForChild("AttackEvent")

local MAX_MELEE_DISTANCE = 12
local ATTACK_COOLDOWN = 0.45
local lastAttackTime = {}

local function onAttackReceived(player: Player, targetCharacter: Model, clientReportedDamage: number)
    local now = os.clock()
    local last = lastAttackTime[player.UserId] or 0
    
    -- Anti-cheat: Debounce & cooldown validation
    if now - last < ATTACK_COOLDOWN then
        warn(player.Name .. " attempted attack too quickly (rate-limit triggered)")
        return
    end
    lastAttackTime[player.UserId] = now

    local character = player.Character
    if not character then return end
    
    local rootPart = character:FindFirstChild("HumanoidRootPart") :: BasePart
    local targetRoot = targetCharacter and targetCharacter:FindFirstChild("HumanoidRootPart") :: BasePart
    local targetHumanoid = targetCharacter and targetCharacter:FindFirstChild("Humanoid") :: Humanoid
    
    if not rootPart or not targetRoot or not targetHumanoid then return end

    -- Server distance sanity check (Exploit protection)
    local distance = (rootPart.Position - targetRoot.Position).Magnitude
    if distance > MAX_MELEE_DISTANCE then
        warn(player.Name .. " attack rejected: Out of range (" .. math.floor(distance) .. " studs)")
        return
    end

    -- Server authoritative damage (never trust clientReportedDamage!)
    local verifiedDamage = 25
    targetHumanoid:TakeDamage(verifiedDamage)
    
    print("[Combat] " .. player.Name .. " struck " .. targetCharacter.Name .. " for " .. verifiedDamage .. " dmg")
end

AttackRemote.OnServerEvent:Connect(onAttackReceived)
`,
  },
  {
    id: 'script-3',
    name: 'CharacterDashController.luau',
    type: 'LocalScript',
    suggestedPlacement: 'StarterPlayer.StarterPlayerScripts',
    code: `--!strict
-- CharacterDashController: Smooth directional dodge-roll with LinearVelocity
local UserInputService = game:GetService("UserInputService")
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid") :: Humanoid
local rootPart = character:WaitForChild("HumanoidRootPart") :: BasePart

local DASH_POWER = 75
local DASH_DURATION = 0.25
local COOLDOWN = 1.2
local isDashing = false
local lastDashTime = 0

local function performDash()
    local now = os.clock()
    if isDashing or (now - lastDashTime < COOLDOWN) then return end
    if humanoid.Health <= 0 then return end

    isDashing = true
    lastDashTime = now

    -- Determine dash vector from move direction or camera orientation
    local moveDirection = humanoid.MoveDirection
    if moveDirection.Magnitude == 0 then
        moveDirection = -rootPart.CFrame.LookVector
    end

    -- Modern physics: LinearVelocity attachment
    local attachment = Instance.new("Attachment")
    attachment.Name = "DashAttachment"
    attachment.Parent = rootPart

    local linearVelocity = Instance.new("LinearVelocity")
    linearVelocity.Name = "DashVelocity"
    linearVelocity.MaxForce = 150000
    linearVelocity.VectorVelocity = moveDirection.Unit * DASH_POWER
    linearVelocity.Attachment0 = attachment
    linearVelocity.Parent = rootPart

    -- Visual trail / camera fov impulse
    task.delay(DASH_DURATION, function()
        linearVelocity:Destroy()
        attachment:Destroy()
        isDashing = false
    end)
end

UserInputService.InputBegan:Connect(function(input, gameProcessed)
    if gameProcessed then return end
    if input.KeyCode == Enum.KeyCode.Q or input.KeyCode == Enum.KeyCode.ButtonX then
        performDash()
    end
end)
`,
  },
];

export const ROBLOX_TEMPLATES = [
  {
    title: 'DataStore with Session Locking & Profile Cache',
    type: 'ModuleScript' as const,
    architecture: 'DataStore',
    description: 'Production-ready player data manager with pcall, exponential backoff, BindToClose autosave, and session locking.',
    prompt: 'Create a robust DataStore module with session-locking, player auto-save on 5-minute intervals, Game:BindToClose flush, pcall wrappers with 3 exponential backoff retries, and leaderstats creation.',
  },
  {
    title: 'OOP Weapon Class with Recoil & Raycasting',
    type: 'ModuleScript' as const,
    architecture: 'OOP',
    description: 'Object-oriented gun module with metatables, ammo management, FastCast-style raycasting, and sound effects.',
    prompt: 'Create an OOP Weapon class with metatables, reload logic, ammo state, spread/recoil calculation, RaycastParams setup excluding character, and cleanup on :Destroy().',
  },
  {
    title: 'Knit-Style Service & Remote Controller',
    type: 'ModuleScript' as const,
    architecture: 'Service',
    description: 'Singleton service architecture with Client-Server RemoteSignals, OnInit, and OnStart lifecycles.',
    prompt: 'Create a modern Knit-style Service module for an inventory shop with client-facing remote methods, server purchase validation, and state signals.',
  },
  {
    title: 'Smart NPC Pathfinding & Patrol System',
    type: 'ServerScript' as const,
    architecture: 'Component',
    description: 'PathfindingService NPC with waypoint traversal, blocked path recalculation, jump links, and target chasing.',
    prompt: 'Create an intelligent NPC AI script using PathfindingService, Path:ComputeAsync, Path.Blocked recalculation, waypoint visualization, and humanoid:MoveToFinished waiting.',
  },
  {
    title: 'Client Tween & UI Spring Animator',
    type: 'ModuleScript' as const,
    architecture: 'Utility',
    description: 'Reusable TweenService animation module for smooth button bounces, modal popups, and notification toasts.',
    prompt: 'Create a Tween utility module that offers spring-like UI pop animations, hover effects, number counters, and sequential tweens using TweenService.',
  },
];
