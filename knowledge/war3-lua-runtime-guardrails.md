# Warcraft III Lua Runtime Guardrails

> **Rune Weaver Code Generation Constraint Document**  
> **Version**: 1.1 (2026-04-13)  
> **Scope**: Warcraft III: Reforged (1.31+) Lua Runtime / KK Host

---

## Executive Summary

Warcraft III uses a **Deterministic Lockstep** networking model—all clients execute identical instruction sequences, and any state divergence causes a **Desync**. For Rune Weaver code generation, core constraints are:

1. **GetLocalPlayer() Red Line**: Only for UI display, sound playback, camera control; strictly prohibited for modifying game world state (unit creation, variable modification, sync event triggers)
2. **Async Function Blacklist**: Functions returning client-local values like `GetUnitName`, `GetCameraTargetPositionX/Y/Z`, `BlzFrameGetText` must not participate in sync logic
3. **Code Generation Forbidden Zones**: Avoid generating `pairs()` iterations, string concatenation condition branches, non-deterministic random usage patterns

**Key Decision Recommendations**:
- Generated Lua should follow Host-authoritative pattern: core logic decided by Host/Server, client handles presentation only
- Use `BlzSendSyncData` for client-to-server input sync, never direct state modification
- **Never create Location objects inside GetLocalPlayer conditional blocks**—known Desync trigger (see Reference #6)

---

## 1. Lockstep Architecture & Desync Principles

### 1.1 Lockstep Operation Model

```
All player inputs -> Collect -> Broadcast to all clients -> Each simulates locally -> Hash validation
                                    |
                              Any client state differs -> DESYNC
```

**Key Characteristics**:
- Only player inputs (commands, UI interactions) are synced, not unit positions/health
- Every frame, all clients must compute identical game world states
- Floating-point calculations may have minor differences across CPU architectures (handled by WC3)

### 1.2 Desync Trigger Conditions

| Category | Manifestation |
|----------|---------------|
| World State Divergence | Unit A dies on player 1's screen, lives on player 2's |
| Random Sequence Divergence | Different clients produce different `GetRandomInt` values |
| Branch Divergence | `if GetLocalPlayer() == ...` causes different execution paths affecting world |
| Iteration Order Divergence | `pairs()` traversal order inconsistency |
| Handle ID Allocation Divergence | First-time Handle allocation calls inside `GetLocalPlayer` blocks |
| GC Behavior Divergence | Lua garbage collection timing differences causing Handle reuse order mismatch |

**Critical Finding**: Desync is not detected instantly—0-15 second delay between occurrence and kick. This means desync timestamp != code error timestamp.

---

## 2. GetLocalPlayer() Boundaries & Async Functions

### 2.1 GetLocalPlayer() Safe Usage List

**Safe Scenarios** (local effects only, no Desync):
- UI Frame Ops: `BlzFrameSetText`, `BlzFrameSetVisible`, `BlzFrameSetTexture`
- Local Sound: `PlaySoundFile`, `StartSound` (non-3D)
- Camera Control: `SetCameraPosition`, `SetCameraTargetController`
- Local Display: `DisplayTextToPlayer`, `CreateTextTag` + `SetTextTagVisibility`
- Selection Control: `SelectUnit`, `ClearSelection` (local player selection only)

**Dangerous Scenarios** (cause Desync):
- Unit Create/Delete: `CreateUnit`, `RemoveUnit`
- Unit Property Modification: `SetUnitLife`, `SetUnitPosition`
- Location Object Creation: `Location(x, y)` — Extremely dangerous, Desyncs even inside GetLocalPlayer blocks
- Variable Assignment: Modifying global/local variables inside `GetLocalPlayer() == p` blocks for later sync decisions

### 2.2 Standard Safe Patterns

```lua
-- CORRECT: UI display differentiation
function ShowLocalMessage(msg)
    local p = GetLocalPlayer()
    DisplayTextToPlayer(p, 0, 0, "Hello, " .. GetPlayerName(p))
end

-- WRONG: Modifying world based on LocalPlayer
function BadCreateUnit()
    if GetLocalPlayer() == Player(0) then
        CreateUnit(Player(0), FourCC("hfoo"), 0, 0, 0)  -- Only P0 creates unit -> DESYNC
    end
end

-- FATAL: Creating Location inside GetLocalPlayer block (known Desync trigger)
function BadLocationCreate()
    if GetLocalPlayer() == Player(0) then
        local loc = Location(0, 0)  -- DESYNC!
    end
end

-- CORRECT: Sync creation + local display
function GoodCreateUnit()
    local u = CreateUnit(Player(0), FourCC("hfoo"), 0, 0, 0)  -- Everyone executes
    -- Local display only (doesn't affect world state)
    DisplayTextToPlayer(GetLocalPlayer(), 0, 0, GetUnitName(u))
end
```

### 2.3 Async Function Blacklist

The following functions return client-local values and must not be used in sync logic:

| Function | Risk Reason | Safe Usage |
|----------|-------------|------------|
| `GetUnitName` | Localization differences (Russian vs English client) | Display only |
| `GetPlayerName` | Player can change at any time | Display only |
| `GetCameraTargetPositionX/Y/Z` | Each player has different camera position | Local camera control only |
| `GetLocalPlayer` | Async by definition | UI/display isolation only |
| `BlzFrameGetText` | Player input content differs | Inside Frame event callbacks only |
| `BlzFrameGetValue` | Slider local values differ | Inside Frame event callbacks only |
| `BlzFrameIsVisible` | May be modified by GetLocalPlayer | Use with caution |
| `GetUnitX/Y` + compare | Floating-point precision differences | Use epsilon comparison |

**Correct vs Wrong Conditional Branching**:

```lua
-- WRONG: Condition based on localized name
local unitName = GetUnitName(u)  -- async!
if unitName == "Footman" then  -- Russian client returns different value
    KillUnit(u)  -- Execution path divergence -> DESYNC
end

-- CORRECT: Condition based on type ID (sync)
if GetUnitTypeId(u) == FourCC("hfoo") then
    KillUnit(u)  -- All clients execute same path
end
```

### 2.4 Frame/UI Special Constraints

**Handle ID Allocation Trap**:
```lua
-- DANGEROUS: First call to BlzGetFrameByName allocates Handle ID
-- If first called inside GetLocalPlayer block, different allocation order -> DESYNC
if GetLocalPlayer() == Player(0) then
    local f = BlzGetFrameByName("MyFrame", 0)  -- Potential desync
end

-- CORRECT: Pre-allocate Handle for all players globally
local frame = BlzGetFrameByName("MyFrame", 0)  -- Global execution, all allocate
-- Then safely use for LocalPlayer checks
if GetLocalPlayer() == Player(0) then
    BlzFrameSetVisible(frame, true)
end
```

**String Concatenation Trap**:
```lua
-- DANGEROUS: String concatenation inside GetLocalPlayer block used for conditions
local s = "damage"
if GetLocalPlayer() == Player(0) then
    s = s .. "_local"  -- New string generated, may trigger desync
end
if s == "damage" then  -- Different s values across clients -> DESYNC
    DoSomething()
end
```

---

## 3. Timer / Event / Coroutine Usage Guidelines

### 3.1 Timer Best Practices

**TimerStart** is the WC3 Lua standard timer API:

```lua
-- RECOMMENDED: Single delayed execution
TimerStart(CreateTimer(), 2.0, false, function()
    -- Execute one-time task after 2 seconds
    DestroyTimer(GetExpiredTimer())  -- Cleanup
end)

-- RECOMMENDED: Periodic timer (must cleanup)
local t = CreateTimer()
TimerStart(t, 1.0, true, function()
    -- Execute every second
    if someCondition then
        DestroyTimer(t)  -- Stop when condition met
    end
end)
```

**Code Generation Notes**:
- Avoid generating many independent Timers, consider single Timer + dispatch logic (performance)
- Periodic Timers must have explicit destruction paths to prevent memory leaks

### 3.2 Event Handling Patterns

**Sync Events** (safe, all players trigger simultaneously):
- EVENT_PLAYER_UNIT_DEATH
- EVENT_PLAYER_UNIT_SPELL_EFFECT
- EVENT_GAME_TIMER_EXPIRED

**Async Events** (handle with care):
- Frame events: FRAMEEVENT_CONTROL_CLICK, FRAMEEVENT_EDITBOX_ENTER
- These require BlzSendSyncData in callback to sync input to all players

```lua
-- CORRECT: Standard async input sync pattern
local clickTrigger = CreateTrigger()
BlzTriggerRegisterFrameEvent(clickTrigger, button, FRAMEEVENT_CONTROL_CLICK)
TriggerAddAction(clickTrigger, function()
    local p = GetTriggerPlayer()  -- Know who triggered
    -- Sync data to all players
    BlzSendSyncData("MyChannel", tostring(someData))
end)

-- Sync receiver
local syncTrigger = CreateTrigger()
for i = 0, bj_MAX_PLAYERS - 1 do
    BlzTriggerRegisterPlayerSyncEvent(syncTrigger, Player(i), "MyChannel", false)
end
TriggerAddAction(syncTrigger, function()
    local data = BlzGetTriggerSyncData()
    local p = GetTriggerPlayer()
    -- All players execute same modification
    CreateUnit(p, FourCC("hfoo"), x, y, 0)
end)
```

### 3.3 Coroutine Usage Boundaries

WC3 Lua supports `coroutine.create` / `coroutine.resume` / `coroutine.yield`, but with constraints:

```lua
-- USABLE: Cooperative multitasking for frame-distributed heavy logic
local co = coroutine.create(function()
    for i = 1, 1000 do
        HeavyComputation(i)
        if i % 100 == 0 then
            coroutine.yield()  -- Yield execution, continue next frame
        end
    end
end)

-- Resume in Timer
TimerStart(CreateTimer(), 0.01, true, function()
    if coroutine.status(co) ~= "dead" then
        coroutine.resume(co)
    else
        DestroyTimer(GetExpiredTimer())
    end
end)
```

**Risk Warnings**:
- Do not hold async data across yield points in coroutines
- GC behavior differences may theoretically cause desync (rare, but reported)
- Avoid complex coroutine patterns in code generation, use simple Timers instead

---

## 4. Code Generation Forbidden Zones

### 4.1 Iterator Selection

```lua
-- FORBIDDEN: pairs() traversal order is non-deterministic
for k, v in pairs(someTable) do
    ModifyWorldState(k, v)  -- May have inconsistent order -> DESYNC
end

-- SAFE: ipairs() or numeric for
for i = 1, #someArray do
    ModifyWorldState(someArray[i])
end

-- SAFE: Pre-sort then traverse
local keys = {}
for k in pairs(someTable) do table.insert(keys, k) end
table.sort(keys)
for _, k in ipairs(keys) do
    ModifyWorldState(k, someTable[k])
end
```

### 4.2 Random Number Usage

```lua
-- DANGEROUS: Different clients may produce different random sequences
local damage = GetRandomInt(10, 20)
SetUnitState(u, UNIT_STATE_LIFE, GetUnitState(u, UNIT_STATE_LIFE) - damage)

-- SAFE: Sync random (WC3 internal is synced)
-- GetRandomInt/GetRandomReal are actually synced in WC3
-- But ensure all clients call same number of times
```

### 4.3 String Condition Branches

```lua
-- DANGEROUS: Condition based on dynamic string
local unitName = GetUnitName(u)  -- async!
if unitName == "Footman" then  -- Russian client: "Pekhotinets"
    DoSomething()  -- Path divergence -> DESYNC
end

-- SAFE: Condition based on type ID (sync)
if GetUnitTypeId(u) == FourCC("hfoo") then
    DoSomething()
end
```

### 4.4 Floating-Point Comparison

```lua
-- CAUTION: Floating-point may have tiny platform differences
if GetUnitX(u) == 100.0 then  -- May be 100.0000001 vs 99.9999999
    -- Use epsilon range
end

-- SAFE
if math.abs(GetUnitX(u) - 100.0) < 0.001 then
    DoSomething()
end
```

---

## 5. Known Desync Trigger List

| Trigger | Explanation | Source |
|---------|-------------|--------|
| `GetLocalPlayer()` for non-UI ops | Classic error | HiveWorkshop |
| `pairs()` for world state modification | Non-deterministic iteration | HiveWorkshop |
| `GameCacheSync` > 344 times/frame | Internal buffer limit | HiveWorkshop |
| `SetSkyModel` invalid path | Engine internal error | HiveWorkshop |
| `SelectGroupForPlayerBJ` (GUI) | Use `EnumUnits` pattern instead | HiveWorkshop |
| Legacy widgetizer tools | Cache pollution | Fixed in 1.32+ |
| Lua GC during init phase reclaiming Handle | Handle ID reallocation inconsistency | Blizzard Forums |
| `BlzFrameSetText` with nested function calls | Function argument evaluation order | HiveWorkshop |
| `Location()` inside `GetLocalPlayer` block | Handle allocation order divergence | Blizzard Forums |
| Creating 100+ trash objects triggering GC | GC timing differences | Community Reports |

---

## 6. Direct Recommendations for Rune Weaver Code Generation

### 6.1 Code Template Standards

```lua
-- Template: Sync event handling
function RegisterSyncAction(eventType, handler)
    local trg = CreateTrigger()
    TriggerRegister[EventType](trg, ...)
    TriggerAddAction(trg, function()
        -- All sync logic executes here
        handler(GetTriggeringEntity(), ...)
    end)
end

-- Template: Local UI update
function RegisterUIUpdate(frame, updateFn)
    -- Ensure frame handle pre-allocated globally
    local f = BlzGetFrameByName(frame, 0)
    local trg = CreateTrigger()
    -- ... event binding
    TriggerAddAction(trg, function()
        local p = GetLocalPlayer()
        if GetTriggerPlayer() == p then
            updateFn(f, p)  -- UI updates only
        end
    end)
end
```

### 6.2 Static Analysis Recommendations

Implement these checks on generated Lua code:
1. Scan `GetLocalPlayer()` usage positions, ensure only inside UI/display API calls
2. Ban `pairs()` for loops involving world state modification
3. Check `GetUnitName`, `GetPlayerName` usage in condition branches
4. Verify `BlzSendSyncData` usage for async input sync
5. **NEW**: Check that `Location()` is never called inside `GetLocalPlayer` conditional blocks
6. **NEW**: Verify no Handle allocation API first-calls inside `GetLocalPlayer` blocks

### 6.3 Debugging Support

Generated code should include Desync debugging aids:
```lua
-- Conditional compilation debug output
if DEBUG then
    function LogSyncPoint(label)
        print(string.format("[SYNC] %s | Tick: %d | Hash: %s", 
            label, GetGameTick(), ComputeStateHash()))
    end
end
```

---

## 7. Recommended Unknowns for Validation

| Question | Risk Level | Validation Method |
|----------|------------|-------------------|
| KK host additional anti-cheat/sync checks | High | Live injection testing |
| Reforged 2.0 Lua runtime changes | Medium | Compare 1.32 vs 2.0 behavior |
| `coroutine` determinism in complex scenarios | Medium | Stress testing |
| `pcall`/`xpcall` error handling impact on sync | Low | Unit testing |
| Large table (>1000 items) `ipairs` performance | Low | Performance benchmarking |
| Incremental GC timing differences | High | Multi-client GC stress test |
| Frame Handle pre-allocation requirements | Medium | Desync reproduction test |

---

## 8. Reference Sources

### Core Documentation
1. **Explaining Warcraft's lockstep architecture for mapping (avoid desyncs)** - HiveWorkshop  
   https://www.hiveworkshop.com/threads/explaining-warcrafts-lockstep-architecture-for-mapping-avoid-desyncs.351561/
2. **Known causes of desync** - HiveWorkshop  
   https://www.hiveworkshop.com/threads/known-causes-of-desync.317486/
3. **The Big UI-Frame Tutorial** - HiveWorkshop  
   https://www.hiveworkshop.com/pastebin/e23909d8468ff4942ccea268fbbcafd1.20598
4. **GetLocalPlayer() Desync Discussion** - HiveWorkshop  
   https://www.hiveworkshop.com/threads/getlocalplayer-desync.274112/

### Official/Engine
5. **Blizzard Jass/Lua API Documentation** (in-game editor help)
6. **Desync due to Lua objects and GC (init phase)** - Blizzard Forums  
   https://us.forums.blizzard.com/en/warcraft3/t/desync-due-to-lua-objects-and-gc-init-phase/36996
   - Critical: Location() inside GetLocalPlayer causes desync
   - GC incremental mode may cause iteration order differences

### Community Resources
7. **W3-Bug-Tracker** (GitHub: inwc3)  
   https://github.com/inwc3/w3-bug-tracker
8. **Jassdoc** - Community-maintained API documentation  
   https://jassdoc.readthedocs.io/
9. **Desync tag on HiveWorkshop**  
   https://www.hiveworkshop.com/tags/desync/

---

## Appendix: Quick Checklist

### Code Generation Self-Check List

- [ ] No `GetLocalPlayer()` in non-UI API calls
- [ ] No `pairs()` for world state modification
- [ ] No `GetUnitName`/`GetPlayerName` in condition checks
- [ ] Async input (Frame events) uses `BlzSendSyncData` for sync
- [ ] Frame Handles pre-allocated in global scope
- [ ] Timers have explicit destruction paths
- [ ] Floating-point comparisons use epsilon range
- [ ] No string concatenation in `GetLocalPlayer` blocks for later conditions
- [ ] **NEW**: No `Location()` calls inside `GetLocalPlayer` conditional blocks
- [ ] **NEW**: No first-time Handle allocation API calls inside `GetLocalPlayer` blocks

---

*Document End*
