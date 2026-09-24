import { RobloxProject, ScriptFile, ProjectTemplateId } from '../types/roblox';

export interface ProjectTemplateMeta {
  id: ProjectTemplateId;
  title: string;
  badge: string;
  description: string;
  iconName: string;
  defaultFiles: ScriptFile[];
}

export const PROJECT_TEMPLATES: ProjectTemplateMeta[] = [
  {
    id: 'rpg',
    title: 'Roblox RPG & Combat Simulator',
    badge: 'Popular',
    description: 'Complete architecture with Server authoritative Hitbox validation, DataStore profile saves, Character Dash, and OOP Weapon Class.',
    iconName: 'Swords',
    defaultFiles: [
      {
        id: 'rpg-1',
        name: 'DataStoreManager.luau',
        folder: 'src/server',
        path: 'src/server/DataStoreManager.luau',
        type: 'ModuleScript',
        suggestedPlacement: 'ServerScriptService.Modules',
        code: `--!strict
-- DataStoreManager: Production-ready player profile manager
local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")

local PlayerDataStore = DataStoreService:GetDataStore("PlayerData_v2")

local DataStoreManager = {}
local sessionCache: { [number]: { Coins: number, Level: number, Inventory: { string } } } = {}

function DataStoreManager.LoadData(player: Player)
    local key = "Player_" .. player.UserId
    local success, result = pcall(function()
        return PlayerDataStore:GetAsync(key)
    end)

    if success and result then
        sessionCache[player.UserId] = result
    else
        sessionCache[player.UserId] = {
            Coins = 100,
            Level = 1,
            Inventory = {"WoodenSword"}
        }
    end

    -- Setup leaderstats
    local folder = Instance.new("Folder")
    folder.Name = "leaderstats"
    
    local coins = Instance.new("IntValue")
    coins.Name = "Coins"
    coins.Value = sessionCache[player.UserId].Coins
    coins.Parent = folder
    
    local level = Instance.new("IntValue")
    level.Name = "Level"
    level.Value = sessionCache[player.UserId].Level
    level.Parent = folder

    folder.Parent = player
    return sessionCache[player.UserId]
end

function DataStoreManager.SaveData(player: Player)
    local key = "Player_" .. player.UserId
    local current = sessionCache[player.UserId]
    if not current then return end

    local success, err = pcall(function()
        PlayerDataStore:SetAsync(key, current)
    end)
    if not success then
        warn("Failed to save data for " .. player.Name .. ": " .. tostring(err))
    end
end

Players.PlayerAdded:Connect(DataStoreManager.LoadData)
Players.PlayerRemoving:Connect(function(player)
    DataStoreManager.SaveData(player)
    sessionCache[player.UserId] = nil
end)

game:BindToClose(function()
    for _, player in ipairs(Players:GetPlayers()) do
        DataStoreManager.SaveData(player)
    end
end)

return DataStoreManager
`,
      },
      {
        id: 'rpg-2',
        name: 'CombatHitboxService.luau',
        folder: 'src/server',
        path: 'src/server/CombatHitboxService.luau',
        type: 'ServerScript',
        suggestedPlacement: 'ServerScriptService.Combat',
        code: `--!strict
-- CombatHitboxService: Server-authoritative anti-exploit hit confirmation
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local AttackRemote = Instance.new("RemoteEvent")
AttackRemote.Name = "AttackEvent"
AttackRemote.Parent = ReplicatedStorage

local MAX_REACH = 14
local COOLDOWN = 0.4
local lastAttack = {}

AttackRemote.OnServerEvent:Connect(function(player: Player, targetModel: Model)
    local now = os.clock()
    local last = lastAttack[player.UserId] or 0
    if now - last < COOLDOWN then return end
    lastAttack[player.UserId] = now

    local char = player.Character
    if not char then return end
    local root = char:FindFirstChild("HumanoidRootPart") :: BasePart
    local targetRoot = targetModel and targetModel:FindFirstChild("HumanoidRootPart") :: BasePart
    local humanoid = targetModel and targetModel:FindFirstChild("Humanoid") :: Humanoid

    if not root or not targetRoot or not humanoid then return end

    local dist = (root.Position - targetRoot.Position).Magnitude
    if dist > MAX_REACH then
        warn(player.Name .. " hit rejected: distance " .. math.floor(dist) .. " studs")
        return
    end

    humanoid:TakeDamage(30)
end)
`,
      },
      {
        id: 'rpg-3',
        name: 'CharacterDashController.luau',
        folder: 'src/client',
        path: 'src/client/CharacterDashController.luau',
        type: 'LocalScript',
        suggestedPlacement: 'StarterPlayer.StarterPlayerScripts',
        code: `--!strict
-- CharacterDashController: Luau physics dash with LinearVelocity
local UserInputService = game:GetService("UserInputService")
local Players = game:GetService("Players")

local player = Players.LocalPlayer
local char = player.Character or player.CharacterAdded:Wait()
local root = char:WaitForChild("HumanoidRootPart") :: BasePart
local humanoid = char:WaitForChild("Humanoid") :: Humanoid

local isDashing = false
local DASH_FORCE = 80
local DASH_TIME = 0.25

local function dash()
    if isDashing or humanoid.Health <= 0 then return end
    isDashing = true

    local dir = humanoid.MoveDirection
    if dir.Magnitude == 0 then
        dir = -root.CFrame.LookVector
    end

    local att = Instance.new("Attachment")
    att.Name = "DashAtt"
    att.Parent = root

    local vel = Instance.new("LinearVelocity")
    vel.MaxForce = 200000
    vel.VectorVelocity = dir.Unit * DASH_FORCE
    vel.Attachment0 = att
    vel.Parent = root

    task.delay(DASH_TIME, function()
        vel:Destroy()
        att:Destroy()
        isDashing = false
    end)
end

UserInputService.InputBegan:Connect(function(input, processed)
    if processed then return end
    if input.KeyCode == Enum.KeyCode.Q or input.KeyCode == Enum.KeyCode.ButtonB then
        dash()
    end
end)
`,
      },
      {
        id: 'rpg-4',
        name: 'WeaponClass.luau',
        folder: 'src/shared',
        path: 'src/shared/WeaponClass.luau',
        type: 'ModuleScript',
        suggestedPlacement: 'ReplicatedStorage.Classes',
        code: `--!strict
-- WeaponClass: OOP Metatable weapon instance
export type WeaponProps = {
    Name: string,
    Damage: number,
    FireRate: number,
    Ammo: number,
    MaxAmmo: number
}

local Weapon = {}
Weapon.__index = Weapon

function Weapon.new(name: string, damage: number, maxAmmo: number)
    local self = setmetatable({}, Weapon)
    self.Name = name
    self.Damage = damage
    self.MaxAmmo = maxAmmo
    self.Ammo = maxAmmo
    self.LastFire = 0
    return self
end

function Weapon:CanFire(): boolean
    return self.Ammo > 0 and (os.clock() - self.LastFire > 0.2)
end

function Weapon:Fire(): boolean
    if not self:CanFire() then return false end
    self.Ammo -= 1
    self.LastFire = os.clock()
    return true
end

function Weapon:Reload()
    task.wait(1.5)
    self.Ammo = self.MaxAmmo
end

function Weapon:Destroy()
    setmetatable(self, nil)
end

return Weapon
`,
      },
    ],
  },
  {
    id: 'tycoon',
    title: 'Roblox Tycoon Framework',
    badge: 'Framework',
    description: 'Multi-plot tycoon system with auto-droppers, conveyor collection, unlockable buttons, and currency multipliers.',
    iconName: 'Building',
    defaultFiles: [
      {
        id: 'tycoon-1',
        name: 'TycoonPlotServer.luau',
        folder: 'src/server',
        path: 'src/server/TycoonPlotServer.luau',
        type: 'ServerScript',
        suggestedPlacement: 'ServerScriptService.Tycoon',
        code: `--!strict
-- TycoonPlotServer: Assigns plots and handles dropper cycles
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local plotsClaimed: { [Player]: Model? } = {}

local function claimPlot(player: Player)
    local plots = workspace:FindFirstChild("TycoonPlots")
    if not plots then return end

    for _, plot in ipairs(plots:GetChildren()) do
        if not plot:GetAttribute("Owner") then
            plot:SetAttribute("Owner", player.UserId)
            plotsClaimed[player] = plot :: Model
            print(player.Name .. " claimed " .. plot.Name)
            break
        end
    end
end

Players.PlayerAdded:Connect(claimPlot)
Players.PlayerRemoving:Connect(function(player)
    local plot = plotsClaimed[player]
    if plot then
        plot:SetAttribute("Owner", nil)
        plotsClaimed[player] = nil
    end
end)
`,
      },
      {
        id: 'tycoon-2',
        name: 'DropCollector.luau',
        folder: 'src/shared',
        path: 'src/shared/DropCollector.luau',
        type: 'ModuleScript',
        suggestedPlacement: 'ReplicatedStorage.Modules',
        code: `--!strict
-- DropCollector: Spawns and recycles dropper currency blocks
local DropCollector = {}
DropCollector.__index = DropCollector

function DropCollector.ProcessDrop(part: BasePart, player: Player, value: number)
    local leaderstats = player:FindFirstChild("leaderstats")
    if not leaderstats then return end
    local cash = leaderstats:FindFirstChild("Cash") :: IntValue
    if cash then
        cash.Value += value
    end
    part:Destroy()
end

return DropCollector
`,
      },
    ],
  },
  {
    id: 'obby',
    title: 'Roblox Obby / Obstacle Course',
    badge: 'Adventure',
    description: 'Checkpoint system, stage leaderstats, client timer speedrun UI, and safe KillPart touch listeners.',
    iconName: 'Flag',
    defaultFiles: [
      {
        id: 'obby-1',
        name: 'CheckpointService.luau',
        folder: 'src/server',
        path: 'src/server/CheckpointService.luau',
        type: 'ServerScript',
        suggestedPlacement: 'ServerScriptService.Obby',
        code: `--!strict
-- CheckpointService: Checkpoint touch tracking and respawn positioning
local Players = game:GetService("Players")

local playerStages: { [number]: number } = {}

local function onPlayerAdded(player: Player)
    playerStages[player.UserId] = 1

    local leaderstats = Instance.new("Folder")
    leaderstats.Name = "leaderstats"
    leaderstats.Parent = player

    local stageVal = Instance.new("IntValue")
    stageVal.Name = "Stage"
    stageVal.Value = 1
    stageVal.Parent = leaderstats

    player.CharacterAdded:Connect(function(char)
        local stage = playerStages[player.UserId] or 1
        local checkpoint = workspace:FindFirstChild("Checkpoints") and workspace.Checkpoints:FindFirstChild(tostring(stage))
        if checkpoint and checkpoint:IsA("BasePart") then
            char:PivotTo(checkpoint.CFrame + Vector3.new(0, 3.5, 0))
        end
    end)
end

Players.PlayerAdded:Connect(onPlayerAdded)
`,
      },
      {
        id: 'obby-2',
        name: 'KillPartHandler.luau',
        folder: 'src/server',
        path: 'src/server/KillPartHandler.luau',
        type: 'ServerScript',
        suggestedPlacement: 'ServerScriptService.Obby',
        code: `--!strict
-- KillPartHandler: Tags parts with CollectionService for instant lava kills
local CollectionService = game:GetService("CollectionService")

local function onKillPartTouched(part: BasePart)
    part.Touched:Connect(function(hit)
        local hum = hit.Parent and hit.Parent:FindFirstChild("Humanoid") :: Humanoid
        if hum and hum.Health > 0 then
            hum.Health = 0
        end
    end)
end

for _, part in ipairs(CollectionService:GetTagged("KillPart")) do
    if part:IsA("BasePart") then
        onKillPartTouched(part)
    end
end

CollectionService:GetInstanceAddedSignal("KillPart"):Connect(function(inst)
    if inst:IsA("BasePart") then
        onKillPartTouched(inst)
    end
end)
`,
      },
    ],
  },
  {
    id: 'knit',
    title: 'Modern Knit-Style Architecture',
    badge: 'Modular',
    description: 'Singleton pattern with Knit Services (server) and Knit Controllers (client) communicating via typed RemoteSignals.',
    iconName: 'Network',
    defaultFiles: [
      {
        id: 'knit-1',
        name: 'KnitBootstrapper.server.luau',
        folder: 'src/server',
        path: 'src/server/KnitBootstrapper.server.luau',
        type: 'ServerScript',
        suggestedPlacement: 'ServerScriptService',
        code: `--!strict
-- Knit Server Bootstrapper: Initializes all services sequentially
print("[Knit Server] Starting up services...")

local services = {
    -- Require services here
}

for _, service in ipairs(services) do
    if service.KnitInit then
        service:KnitInit()
    end
end

for _, service in ipairs(services) do
    if service.KnitStart then
        task.spawn(service.KnitStart, service)
    end
end

print("[Knit Server] All services operational!")
`,
      },
      {
        id: 'knit-2',
        name: 'InventoryService.luau',
        folder: 'src/server',
        path: 'src/server/InventoryService.luau',
        type: 'ModuleScript',
        suggestedPlacement: 'ServerScriptService.Services',
        code: `--!strict
-- InventoryService: Service pattern with client exposure
local InventoryService = {
    Name = "InventoryService",
    Client = {}
}

function InventoryService:KnitInit()
    print("[InventoryService] Initialized")
end

function InventoryService:KnitStart()
    print("[InventoryService] Started")
end

function InventoryService.Client:GetInventory(player: Player)
    return {"StarterPotion", "WoodStick"}
end

return InventoryService
`,
      },
    ],
  },
  {
    id: 'blank',
    title: 'Empty Roblox Studio Project',
    badge: 'Clean',
    description: 'Fresh canvas with Rojo directory layout: src/server, src/client, and src/shared.',
    iconName: 'FilePlus',
    defaultFiles: [
      {
        id: 'blank-1',
        name: 'Main.server.luau',
        folder: 'src/server',
        path: 'src/server/Main.server.luau',
        type: 'ServerScript',
        suggestedPlacement: 'ServerScriptService',
        code: `--!strict
-- Main Server script entry point
print("Hello from Roblox Server!")
`,
      },
      {
        id: 'blank-2',
        name: 'Client.client.luau',
        folder: 'src/client',
        path: 'src/client/Client.client.luau',
        type: 'LocalScript',
        suggestedPlacement: 'StarterPlayer.StarterPlayerScripts',
        code: `--!strict
-- Client script entry point
local Players = game:GetService("Players")
local player = Players.LocalPlayer

print("Hello from Roblox Client: " .. player.Name)
`,
      },
      {
        id: 'blank-3',
        name: 'SharedModule.luau',
        folder: 'src/shared',
        path: 'src/shared/SharedModule.luau',
        type: 'ModuleScript',
        suggestedPlacement: 'ReplicatedStorage.Modules',
        code: `--!strict
-- Shared module required by both Client and Server
local SharedModule = {}

function SharedModule.GetGameVersion(): string
    return "1.0.0"
end

return SharedModule
`,
      },
    ],
  },
];

export const INITIAL_PROJECT: RobloxProject = {
  id: 'proj-rpg-default',
  name: 'Roblox RPG & Combat Game',
  description: 'Production-ready RPG combat with server hit validation, DataStore profile saves, and character dash controller.',
  template: 'rpg',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  files: PROJECT_TEMPLATES[0].defaultFiles,
};
