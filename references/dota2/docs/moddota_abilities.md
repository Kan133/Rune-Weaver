# ModDota Abilities, Items & Modifiers 文档

> 本文档爬取自 https://moddota.com/abilities/ 及其子页面
> 生成日期: 2024年

---

## 目录

1. [Ability KeyValues](#ability-keyvalues)
2. [Item KeyValues](#item-keyvalues)
3. [The Importance of AbilityValues Values](#the-importance-of-abilityvalues-values)
4. [Passing AbilityValues Values into Lua](#passing-abilityvalues-values-into-lua)
5. [AbilityDuration Tooltips](#abilityduration-tooltips)
6. [Simple Custom Ability](#simple-custom-ability)
7. [Creating Innate Abilities](#creating-innate-abilities)
8. [Making Any Ability Use Charges](#making-any-ability-use-charges)
9. [Calling Spells with SetCursor](#calling-spells-with-setcursor)
10. [Lua Item Tutorial](#lua-item-tutorial)
11. [Reutilizing Built-in Modifiers](#reutilizing-built-in-modifiers)
12. [Modifier Properties in Tooltips](#modifier-properties-in-tooltips)
13. [Server to Client](#server-to-client)

---

# Ability KeyValues | ModDota

**Source:** https://moddota.com/abilities/ability-keyvalues

---


# Ability KeyValues ​

## DataDriven Ability ​

A DataDriven ability is a collection KeyValues. KeyValues are simple, tree-based structures used for storing nested sections containing key/value pairs.

DataDriven abilities are defined inside scripts/npc/npc_abilities_custom.txt under a game addon folder.

This skeleton contains many keyvalues which will be expanded upon in this documentation.

```javascript
"datadriven_skeleton"
{
    // General
    // ----------------------------------------------------------------------------------------
    "BaseClass"              "ability_datadriven"
    "AbilityBehavior"        "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET"
    "AbilityTextureName"     "spellicon"
    "AbilityUnitTargetTeam"  "DOTA_UNIT_TARGET_TEAM_ENEMY"
    "AbilityUnitTargetType"  "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC"
    "AbilityUnitTargetFlags" "DOTA_UNIT_TARGET_FLAG_MAGIC_IMMUNE_ENEMIES"
    "AbilityUnitDamageType"  "DAMAGE_TYPE_MAGICAL"

    "AbilityType"            "DOTA_ABILITY_TYPE_BASIC"
    "MaxLevel"               "7"
    "RequiredLevel"          "-4"
    "LevelsBetweenUpgrades"  "7"

    "AbilityCastPoint"       "0.0"
    "AbilityCastAnimation"   "ACT_DOTA_ATTACK"
    "AnimationPlaybackRate"  "1"
    "AnimationIgnoresModelScale" "1"

    // Stats
    //----------------------------------------------------------------------------------------
    "AbilityDamage"           "0 0 0 0"
    "AbilityManaCost"         "0 0 0 0"
    "AbilityCooldown"         "0.0 0.0 0.0 0.0"
    "AbilityCastRange"        "0"
    "AbilityCastRangeBuffer"  "250"
    "AbilityChannelTime"      "0.0 0.0 0.0 0.0"
    "AbilityChannelledManaCostPerSecond" "30 35 40 45"
    "AbilityDuration"         "0.0 0.0 0.0 0.0"
    "AoERadius"               "250"

    // ...
}
```
123456789101112131415161718192021222324252627282930313233343536
## BaseClass ​

BaseClass can be any default dota ability name or "ability_datadriven", which allows the use of the entire data driven ability system.

Using a dota ability as the BaseClass can be done either as an override of the ability (goes in npc_abilities_override.txt) or just as a new ability in npc_abilities_custom.txt which inherits the exposed variables. This however doesn't let us change/add its internal structure, as that code is locked in C++ code.

Here we'll focus on everything that concerns writing custom abilities from scratch, using the "BaseClass" "ability_datadriven".

## AbilityBehavior ​

This describes how the ability works, the general behavior to perform when it is executed.

You can use different behaviors together, separated by spaces and | pipes.

Example:

```javascript
"DOTA_ABILITY_BEHAVIOR_CHANNELLED | DOTA_ABILITY_BEHAVIOR_NO_TARGET"
```
1
### List of every possible AbilityBehavior ​

| AbilityBehavior | Description |
| --- | --- |
| DOTA_ABILITY_BEHAVIOR_NO_TARGET | Doesn't need a target to be cast.  Ability fires off as soon as the button is pressed. |
| DOTA_ABILITY_BEHAVIOR_UNIT_TARGET | Needs a target to be cast on.  Requires AbilityUnitTargetTeam and AbilityUnitTargetType, see Targeting. |
| DOTA_ABILITY_BEHAVIOR_POINT | Can be cast anywhere the mouse cursor is.  If a unit is clicked, it will just be cast where the unit was standing. |
| DOTA_ABILITY_BEHAVIOR_PASSIVE | Cannot be cast. |
| DOTA_ABILITY_BEHAVIOR_CHANNELLED | Channeled ability.If the user moves, or is silenced/stunned, the ability is interrupted. |
| DOTA_ABILITY_BEHAVIOR_TOGGLE | Can be toggled On/Off. |
| DOTA_ABILITY_BEHAVIOR_AURA | Ability is an aura.Not really used other than to tag the ability as such. |
| DOTA_ABILITY_BEHAVIOR_AUTOCAST | Can be cast automatically.Usually doesn't work by itself in anything that is not an ATTACK ability. |
| DOTA_ABILITY_BEHAVIOR_HIDDEN | Can't be cast, and won't show up on the HUD. |
| DOTA_ABILITY_BEHAVIOR_AOE | Can draw a radius where the ability will have effect.Like POINT, but with an area of effect display.Makes use of AOERadius. |
| DOTA_ABILITY_BEHAVIOR_NOT_LEARNABLE | Cannot be learned by clicking on the HUD.Example: Invoker's abilities. |
| DOTA_ABILITY_BEHAVIOR_ITEM | Ability is tied to an item. There is no need to use this, the game will internally assign this behavior to any "item_datadriven". |
| DOTA_ABILITY_BEHAVIOR_DIRECTIONAL | Has a direction from the hero.Examples: Mirana's Arrow, or Pudge's Hook. |
| DOTA_ABILITY_BEHAVIOR_IMMEDIATE | Can be used instantly, without going into the action queue. |
| DOTA_ABILITY_BEHAVIOR_NOASSIST | Ability has no reticle assist. (?) |
| DOTA_ABILITY_BEHAVIOR_ATTACK | Is an attack, and cannot hit attack-immune targets. |
| DOTA_ABILITY_BEHAVIOR_ROOT_DISABLES | Cannot be used when rooted. |
| DOTA_ABILITY_BEHAVIOR_UNRESTRICTED | Ability is allowed when commands are restricted.Example: Lifestealer's Consume. |
| DOTA_ABILITY_BEHAVIOR_DONT_ALERT_TARGET | Does not alert enemies when target-cast on them.Example: Spirit Breaker's Charge. |
| DOTA_ABILITY_BEHAVIOR_DONT_RESUME_MOVEMENT | Should not resume movement when it completes.Only applicable to no-target, non-immediate abilities. |
| DOTA_ABILITY_BEHAVIOR_DONT_RESUME_ATTACK | Ability should not resume command-attacking the previous target when it completes.Only applicable to no-target, non-immediate abilities and unit-target abilities. |
| DOTA_ABILITY_BEHAVIOR_NORMAL_WHEN_STOLEN | Ability still uses its normal cast point when stolen.Examples: Meepo's Poof, Furion's Teleport. |
| DOTA_ABILITY_BEHAVIOR_IGNORE_BACKSWING | Ability ignores backswing pseudoqueue. |
| DOTA_ABILITY_BEHAVIOR_IGNORE_PSEUDO_QUEUE | Can be executed while stunned, casting, or force-attacking. Only applicable to toggled abilities.Example: Morphling's Attribute Shift. |
| DOTA_ABILITY_BEHAVIOR_RUNE_TARGET | Targets runes. |
| DOTA_ABILITY_BEHAVIOR_IGNORE_CHANNEL | Doesn't cancel abilities with _CHANNELED behavior. |
| DOTA_ABILITY_BEHAVIOR_OPTIONAL_UNIT_TARGET | Bottle and Wards. |
| DOTA_ABILITY_BEHAVIOR_OPTIONAL_NO_TARGET | (?) |

### Behavior Tooltips ​

The following behaviors will generate a line in the ability tooltip. You want at least one behavior of this list. The rest of the ability behaviors don't have any UI support yet.

The UI can only show one behavior tooltip, but internally it will behave as expected, as long as two contradicting keys are not used together (like NO_TARGET with UNIT_TARGET).

| AbilityBehavior | ABILITY: Tooltip | Takes precedence over: |
| --- | --- | --- |
| DOTA_ABILITY_BEHAVIOR_NO_TARGET | No Target |  |
| DOTA_ABILITY_BEHAVIOR_UNIT_TARGET | Unit Target | POINT |
| DOTA_ABILITY_BEHAVIOR_POINT | Point Target |  |
| DOTA_ABILITY_BEHAVIOR_PASSIVE | Passive |  |
| DOTA_ABILITY_BEHAVIOR_CHANNELLED | Channeled | POINT and UNIT |
| DOTA_ABILITY_BEHAVIOR_TOGGLE | Toggle | POINT and UNIT |
| DOTA_ABILITY_BEHAVIOR_AURA | Aura | PASSIVE |
| DOTA_ABILITY_BEHAVIOR_AUTOCAST | Auto-Cast | UNIT_TARGET |

For example, an ability with

```javascript
"AbilityBehavior" "DOTA_ABILITY_BEHAVIOR_UNIT_TARGET | DOTA_ABILITY_BEHAVIOR_CHANNELED"
```
1
will be shown like this:

## AbilityType ​

Omitting this will default to DOTA_ABILITY_TYPE_BASIC.

| AbilityType | Description |
| --- | --- |
| DOTA_ABILITY_TYPE_BASIC | Normal ability, learnable at level 1 and upgradeable every 2 levels. |
| DOTA_ABILITY_TYPE_ULTIMATE | 5 levels between upgrades, and requires level 6 to spend the first point on it.Also tags the ability as ultimate for the HUD. |
| DOTA_ABILITY_TYPE_ATTRIBUTES | Used for attribute_bonus. |
| DOTA_ABILITY_TYPE_HIDDEN | What for? |

Additionally, ability level intervals and limits can be directly changed with these keyvalues inside the ability block:

### MaxLevel ​

The UI currently supports the following ability level displays: 1, 3, 4, and 7.

You can still use any integer value as MaxLevel, and it will assign the proper level values internally, but it will use a combination of these UI display numbers, then "start again" to another UI.

Example:

```javascript
"MaxLevel" "10"
```
1
### RequiredLevel ​

At which level the ability can first be learned. This takes negative values, to enable for skills to be skilled at any point, because the next value sets the levels between ranks of the ability, including the first one.

### LevelsBetweenUpgrades ​

How many levels to wait to be able to learn the next rank.

Example:

```javascript
"MaxLevel"              "7"
"RequiredLevel"         "-4"
"LevelsBetweenUpgrades" "7"
```
123
Results in an ability that can be first skilled at levels 3/10/17/24/31/38/45.

Max level of the heroes can be changed using the Lua SetCustomHeroMaxLevel(MAX_LEVEL) API function.

## AbilityTextureName ​

The icon file name that should be used in the UI for this ability. You can reutilize the icon from another just by putting that ability name here if desired. The internal name of every default dota ability can be found in: Built-In Ability Names.

To use your own icons, place them in resources/flash3/images/spellicons in your game addon folder, and just directly refer to the image name without the path or the extension.

Format: 128x128 PNG

```javascript
"AbilityTextureName" "warchasers_buff"
```
1
### Reject Self-Cast ​

Added in Reborn:

```javascript
"CastFilterRejectCaster" "1"
```
1
### Cast While Hidden ​

Added in Reborn:

```javascript
"IsCastableWhileHidden" "1"
```
1
## Targeting ​

3 key elements set the rules for target selection: Team, Type, and Flags.

### Team ​

| AbilityUnitTargetTeam | Description |
| --- | --- |
| DOTA_UNIT_TARGET_TEAM_BOTH | All |
| DOTA_UNIT_TARGET_TEAM_ENEMY | Enemy |
| DOTA_UNIT_TARGET_TEAM_FRIENDLY | Allied |
| DOTA_UNIT_TARGET_TEAM_NONE | Default value by omission. |
| DOTA_UNIT_TARGET_TEAM_CUSTOM | (?) |

### Type ​

| AbilityUnitTargetType | Targets |
| --- | --- |
| DOTA_UNIT_TARGET_ALL | Everything, including hidden entities. |
| DOTA_UNIT_TARGET_HERO | npc_dota_hero Heroes.DOTA_NPC_UNIT_RELATIONSHIP_TYPE_HERO |
| DOTA_UNIT_TARGET_BASIC | Basic units, including summons. |
| DOTA_UNIT_TARGET_MECHANICAL | npc_dota_creep_siegeDOTA_NPC_UNIT_RELATIONSHIP_TYPE_SIEGE |
| DOTA_UNIT_TARGET_BUILDING | npc_dota_tower, npc_dota_buildingDOTA_NPC_UNIT_RELATIONSHIP_TYPE_BUILDING |
| DOTA_UNIT_TARGET_TREE | ent_dota_treeExamples: Tangos, Quelling Blade. |
| DOTA_UNIT_TARGET_CREEP | npc_dota_creature, npc_dota_creepSame as BASIC, but might not include things like some summons.Examples: Death Pact, Devour. |
| DOTA_UNIT_TARGET_COURIER | npc_dota_courier, npc_dota_flying_courierDOTA_NPC_UNIT_RELATIONSHIP_TYPE_COURIER |
| DOTA_UNIT_TARGET_NONE | Nothing! |
| DOTA_UNIT_TARGET_OTHER | Everything not included in the previous types. |
| DOTA_UNIT_TARGET_CUSTOM | Not exposed?Examples: Replicate, Sunder, Demonic Conversion, Tether, Infest... |

### Flags ​

Flags allow targeting units that are ignored by default (for example, magic immune enemies,) or to ignore specific types of units that will otherwise be targetable (like Ancients, or magic immune allies.)

| AbilityUnitTargetFlags | Targets / Ignores |
| --- | --- |
| DOTA_UNIT_TARGET_FLAG_NONE | Default value by omission. |
| DOTA_UNIT_TARGET_FLAG_DEAD | Dead units, which are otherwise ignored. |
| DOTA_UNIT_TARGET_FLAG_MELEE_ONLY | Units with AttackCapabilities DOTA_UNIT_CAP_MELEE_ATTACK. |
| DOTA_UNIT_TARGET_FLAG_RANGED_ONLY | Units with AttackCapabilities DOTA_UNIT_CAP_RANGED_ATTACK. |
| DOTA_UNIT_TARGET_FLAG_MANA_ONLY | Units with mana, without "StatusMana" "0" in the npc_units file. |
| DOTA_UNIT_TARGET_FLAG_CHECK_DISABLE_HELP | Units with Disable Help on.Not sure how to make a DataDriven ability use it? |
| DOTA_UNIT_TARGET_FLAG_NO_INVIS | Ignores invisible units (with MODIFIER_STATE_INVISIBLE.) |
| DOTA_UNIT_TARGET_FLAG_MAGIC_IMMUNE_ENEMIES | Targets ENEMY units with MODIFIER_STATE_MAGIC_IMMUNE.Examples: Ensnare, Culling Blade, Primal Roar... |
| DOTA_UNIT_TARGET_FLAG_NOT_MAGIC_IMMUNE_ALLIES | Ignores FRIENDLY units with MODIFIER_STATE_MAGIC_IMMUNE.Example: Bane's Nightmare. |
| DOTA_UNIT_TARGET_FLAG_NOT_ATTACK_IMMUNE | Ignores units with MODIFIER_STATE_ATTACK_IMMUNE. |
| DOTA_UNIT_TARGET_FLAG_FOW_VISIBLE | Breaks when the unit goes into the fog of war.Examples: Mana Drain, Life Drain. |
| DOTA_UNIT_TARGET_FLAG_INVULNERABLE | Units with MODIFIER_STATE_INVULNERABLE.Examples: Assassinate, Recall, Boulder Smash... |
| DOTA_UNIT_TARGET_FLAG_NOT_ANCIENTS | Ignores units with "IsAncient" "1" defined.Example: Hand of Midas. |
| DOTA_UNIT_TARGET_FLAG_NOT_CREEP_HERO | Ignores units with "ConsideredHero" "1" defined.Examples: Astral Imprisonment, Disruption, Sunder. |
| DOTA_UNIT_TARGET_FLAG_NOT_DOMINATED | Ignores units with MODIFIER_STATE_DOMINATED. |
| DOTA_UNIT_TARGET_FLAG_NOT_ILLUSIONS | Ignores units with MODIFIER_PROPERTY_IS_ILLUSION. |
| DOTA_UNIT_TARGET_FLAG_NOT_NIGHTMARED | Ignores units with MODIFIER_STATE_NIGHTMARED. |
| DOTA_UNIT_TARGET_FLAG_NOT_SUMMONED | Ignores units created through the SpawnUnit action. |
| DOTA_UNIT_TARGET_FLAG_OUT_OF_WORLD | Units with MODIFIER_STATE_OUT_OF_GAME. |
| DOTA_UNIT_TARGET_FLAG_PLAYER_CONTROLLED | Units controllable by a player, accessible with Lua's IsControllableByAnyPlayer(). |
| DOTA_UNIT_TARGET_FLAG_PREFER_ENEMIES | Prioritizes units over trees when both are selectable. |

Clean list:

- DOTA_UNIT_TARGET_FLAG_NONE
- DOTA_UNIT_TARGET_FLAG_DEAD
- DOTA_UNIT_TARGET_FLAG_MELEE_ONLY
- DOTA_UNIT_TARGET_FLAG_RANGED_ONLY
- DOTA_UNIT_TARGET_FLAG_MANA_ONLY
- DOTA_UNIT_TARGET_FLAG_CHECK_DISABLE_HELP
- DOTA_UNIT_TARGET_FLAG_NO_INVIS
- DOTA_UNIT_TARGET_FLAG_MAGIC_IMMUNE_ENEMIES
- DOTA_UNIT_TARGET_FLAG_NOT_MAGIC_IMMUNE_ALLIES
- DOTA_UNIT_TARGET_FLAG_NOT_ATTACK_IMMUNE
- DOTA_UNIT_TARGET_FLAG_FOW_VISIBLE
- DOTA_UNIT_TARGET_FLAG_INVULNERABLE
- DOTA_UNIT_TARGET_FLAG_NOT_ANCIENTS
- DOTA_UNIT_TARGET_FLAG_NOT_CREEP_HERO
- DOTA_UNIT_TARGET_FLAG_NOT_DOMINATED
- DOTA_UNIT_TARGET_FLAG_NOT_ILLUSIONS
- DOTA_UNIT_TARGET_FLAG_NOT_NIGHTMARED
- DOTA_UNIT_TARGET_FLAG_NOT_SUMMONED
- DOTA_UNIT_TARGET_FLAG_OUT_OF_WORLD
- DOTA_UNIT_TARGET_FLAG_PLAYER_CONTROLLED
- DOTA_UNIT_TARGET_FLAG_PREFER_ENEMIES

#### Fun with Flags ​

Flags were seen as AbilityUnitTargetFlags completions, but this is not their sole application.

The same applies to Team and Types.

- "Flags" and "ExcludeFlags" in a "Target" block gives control over how to target units to apply actions on them later:

```javascript
"Target"
{
    "Center"    "CASTER"
    "Flags"     "DOTA_UNIT_TARGET_FLAG_DEAD"
}
```
12345
- "TargetFlags" in a "LinearProjectile" action allows a LinearProjectile to ignore units that would otherwise be included by default in the Team+Type values, for example those with MODIFIER_STATE_INVISIBLE.
- "Aura_Flags" in a modifier with the other "Aura" keys can be used, for example, to make an aura modifier only affect ranged units by adding DOTA_UNIT_TARGET_FLAG_RANGED_ONLY.

The same applies for Teams and Types.

Example: Targets all friendly units in a radius of the caster, including couriers, buildings, and siege units. Excludes heroes, summons, and other player controlled units.

```javascript
"Target"
{
    "Center"        "CASTER"
    "Radius"        "%radius"

    // AbilityUnitTargetTeam values.
    "Teams"         "DOTA_UNIT_TARGET_TEAM_FRIENDLY"

    // AbilityUnitTargetTypes
    "Types"         "DOTA_UNIT_TARGET_ALL"
    "ExcludeTypes"  "DOTA_UNIT_TARGET_HERO"

    // AbilityUnitTargetFlags
    "Flags"         "DOTA_UNIT_TARGET_FLAG_NOT_SUMMONED"
    "ExcludeFlags"  "DOTA_UNIT_TARGET_FLAG_PLAYER_CONTROLLED"
}
```
12345678910111213141516
Example: Mirana's Arrow projectile rewrite that only hits heroes, including those that are magic immune:

```javascript
"LinearProjectile"
{
    "Target"            "POINT"
    "EffectName"        "particles/units/heroes/hero_mirana/mirana_spell_arrow.vpcf"
    "MoveSpeed"         "857"
    "StartRadius"       "115"
    "EndRadius"         "115"
    "StartPosition"     "attach_attack1"
    "FixedDistance"     "3000"
    "TargetTeams"       "DOTA_UNIT_TARGET_TEAM_ENEMY"
    "TargetTypes"       "DOTA_UNIT_TARGET_HERO"
    "TargetFlags"       "DOTA_UNIT_TARGET_FLAG_MAGIC_IMMUNE_ENEMIES"
    "HasFrontalCone"    "0"
    "ProvidesVision"    "1"
    "VisionRadius"      "650"
}
```
12345678910111213141516
With DOTA_UNIT_TARGET_FLAG_MAGIC_IMMUNE_ENEMIES, and with DOTA_UNIT_TARGET_FLAG_NONE:

### Other keyvalues of the Action Target block ​

#### Line ​

To target units in a line between the caster and the targeted point.

Instead of the "Radius" keyvalue, which only takes one parameter, Line takes Length and Thickness integer values in a block like this:

```javascript
"Line"
{
    "Length"    "600"
    "Thickness" "250"
}
```
12345
#### Limiting the amount of targets ​

MaxTargets takes an integer value to limit the amount of targets the Target block will select.

```javascript
"MaxTargets"    "10"
```
1
Random also takes an integer to be as "take up to this number of units randomly."

```javascript
"Random"    "1"
```
1
(For more complex targeting, Lua scripting is the answer.)

#### ScriptSelectPoints ​

Its use is very rare, normally when the targeting is complex we would just use RunScript lua and do all the actions inside the script.

```javascript
ScriptSelectPoints
{
    ScriptFile
    Function
    Radius
    Count
}
```
1234567
A more in-depth explanation is needed to explain the complete usage of the Target block, as understanding the scope of the "Target" "TARGET" keyvalue is one of the most difficult things of the datadriven system.

Sources

- Constants wiki
- Abilities Data Driven wiki
- Extracted npc_abilities.txt file
- holdout_example keyvalues
- random github datamining
- brute-forcing everything for countless hours!

## Targeting Tooltips ​

These are combinations of AbilityUnitTargetTeam + AbilityUnitTargetType and how they appear as AFFECTS: in the UI.

It's important to clarify that AbilityUnitTargetTeam & AbilityUnitTargetType only restricts the behavior of abilities with DOTA_ABILITY_BEHAVIOR_UNIT_TARGET — it will directly change what the spell can be cast on. For other behaviors these tags are just used to display extra info for players.

For example, a DOTA_ABILITY_BEHAVIOR_POINT | DOTA_ABILITY_BEHAVIOR_AOE ability will find its targets in any way and will not be restricted to what the AbilityUnitTarget values say.

### Without any AbilityUnitTargetType ​

| AbilityUnitTargetTeam | AFFECTS: Tooltip |
| --- | --- |
| DOTA_UNIT_TARGET_TEAM_ENEMY | Enemies |
| DOTA_UNIT_TARGET_TEAM_FRIENDLY | Allies |
| DOTA_UNIT_TARGET_TEAM_BOTH | Units |

### With AbilityUnitTargetTeam DOTA_UNIT_TARGET_TEAM_BOTH ​

| AbilityUnitTargetType | AFFECTS: Tooltip |
| --- | --- |
| DOTA_UNIT_TARGET_HERO | Heroes |
| DOTA_UNIT_TARGET_ALL | Units |
| DOTA_UNIT_TARGET_BASIC | Units |
| DOTA_UNIT_TARGET_CREEP | Units |
| DOTA_UNIT_TARGET_HERO + DOTA_UNIT_TARGET_BASIC | Units |

> "AFFECTS: Buildings" alone doesn't exist yet. DOTA_UNIT_TARGET_BUILDING defaults to Allies/Enemies. "AFFECTS: Creeps" is also not a thing."DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC" is the most common target type; use it when you aren't sure what your spell should target.

### With AbilityUnitTargetTeam DOTA_UNIT_TARGET_TEAM_ENEMY ​

| AbilityUnitTargetType | AFFECTS: Tooltip |
| --- | --- |
| DOTA_UNIT_TARGET_BASIC | Enemy Creeps |
| DOTA_UNIT_TARGET_HERO | Enemy Heroes |
| DOTA_UNIT_TARGET_HERO + DOTA_UNIT_TARGET_BASIC | Enemy Units |
| DOTA_UNIT_TARGET_HERO + DOTA_UNIT_TARGET_BUILDING | Enemy Heroes and Buildings |
| DOTA_UNIT_TARGET_HERO + DOTA_UNIT_TARGET_BASIC + DOTA_UNIT_TARGET_BUILDING | Enemy Units and Buildings |

### With AbilityUnitTargetTeam DOTA_UNIT_TARGET_TEAM_FRIENDLY ​

| AbilityUnitTargetType | AFFECTS: Tooltip |
| --- | --- |
| DOTA_UNIT_TARGET_BASIC | Allied Creeps |
| DOTA_UNIT_TARGET_HERO | Allied Heroes |
| DOTA_UNIT_TARGET_HERO + DOTA_UNIT_TARGET_BASIC | Allied Units |
| DOTA_UNIT_TARGET_HERO + DOTA_UNIT_TARGET_BUILDING | Allied Heroes and Buildings |
| DOTA_UNIT_TARGET_HERO + DOTA_UNIT_TARGET_BASIC + DOTA_UNIT_TARGET_BUILDING | Allied Units and Buildings |

> Adding DOTA_UNIT_TARGET_MECHANICAL will have no effect on the AFFECTS tooltip.

### Any AbilityUnitTargetTeam ​

| AbilityUnitTargetType | AFFECTS: Tooltip |
| --- | --- |
| DOTA_UNIT_TARGET_TREE | Trees |
| In the strings but not possible | Self |

### Cast Error Strings ​

The following strings from dota_english.txt control the error messages shown when a spell cannot be cast on a target. Many are not yet exposed:

```javascript
"dota_hud_error_cant_cast_on_hero"              "Ability Can't Target Heroes"
"dota_hud_error_cant_cast_on_considered_hero"   "Ability Can't Target Creep Heroes"
"dota_hud_error_cant_cast_on_creep"             "Ability Can't Target Creeps"
"dota_hud_error_cant_cast_on_mechanical"        "Ability Can't Target Mechanical Units"
"dota_hud_error_cant_cast_on_building"          "Ability Can't Target Buildings"
"dota_hud_error_cant_cast_on_courier"           "Ability Can't Target Couriers"
"dota_hud_error_cant_cast_on_other"             "Ability Can't Target That"
"dota_hud_error_cant_cast_on_self"              "Ability Can't Target Self"
"dota_hud_error_cant_cast_on_ally"              "Ability Can't Target Allies"
"dota_hud_error_cant_cast_on_enemy"             "Ability Can't Target Enemies"
"dota_hud_error_cant_cast_on_roshan"            "Ability Can't Target Roshan"
"dota_hud_error_cant_cast_on_non_tree_ward"     "Ability Can Only Target Trees and Enemy Wards"
"dota_hud_error_cant_target_shop"               "Can't Target Shop"
"dota_hud_error_cant_target_rune"               "Can't Target Rune"
"dota_hud_error_cant_target_item"               "Can't Target Item"
"dota_hud_error_cant_cast_on_ancient"           "Ability Can't Target Ancients"
"dota_hud_error_cant_cast_on_own_illusion"      "Ability Can't Target Own Illusion"
"dota_hud_error_cant_cast_on_summoned"          "Ability Can't Target Summoned Units"
"dota_hud_error_cant_cast_on_dominated"         "Ability Can't Target Dominated Units"
"dota_hud_error_cant_cast_enemy_hero"           "Ability Can't Target Enemy Heroes"
"dota_hud_error_cant_cast_creep_level"          "Ability Can't Target Creeps of This Level"
```
123456789101112131415161718192021
## AbilityUnitDamageType ​

Physical Damage can be reduced by Physical Armor or Damage Block. Magical Damage can be reduced by Magical Damage Resistance. Pure Damage cannot be reduced by either.

- DAMAGE_TYPE_MAGICAL
- DAMAGE_TYPE_PHYSICAL
- DAMAGE_TYPE_PURE

```javascript
"AbilityUnitDamageType" "DAMAGE_TYPE_MAGICAL"
```
1
This keyvalue also shows a DAMAGE: line in the ability tooltip, just after ABILITY: and AFFECTS:.

Keep in mind that AbilityUnitDamageType is only for displaying the tooltip in the UI. The real damage is applied through Damage Actions which have a Type of their own and aren't restricted to the value defined here (a spell can have multiple damage instances of different types).

```javascript
"Damage"
{
    "Target"  "TARGET"
    "Type"    "DAMAGE_TYPE_PHYSICAL"
    "Damage"  "%AbilityDamage"
}
```
123456
## SpellImmunityType ​

Controls whether the ability pierces spell immunity (formerly "Magic Immunity").

- SPELL_IMMUNITY_ENEMIES_NO
- SPELL_IMMUNITY_ENEMIES_YES

Ability tooltips show two related fields:

- Damage Type: Physical / Magical / Pure
- Pierces Spell Immunity: Yes / No

If the damage type is not Magical, or if it pierces spell immunity, the tooltip is colored differently to make it easier to notice.

## Animation ​

How will the hero move and act after the player decides to cast the ability.

### AbilityCastPoint ​

Time before the spell goes off when cast; can be cancelled with the Stop command. Takes a float value.

```javascript
"AbilityCastPoint" "0.3"
```
1
### AbilityCastAnimation ​

Usually the ability slot determines the animation used by default. You can force a different cast animation with this key.

Common activity values:

- ACT_DOTA_ATTACK
- ACT_DOTA_CAST_ABILITY_1 (2, 3, 4, 5, 6)
- ACT_DOTA_CHANNEL_ABILITY_1 (2, 3, 4, 5, 6)
- ACT_DOTA_DISABLED
- ACT_DOTA_RUN
- ACT_DOTA_SPAWN
- ACT_DOTA_TELEPORT
- ACT_DOTA_VICTORY

Full ACT List — many won't work or will only work on certain heroes.

```javascript
"AbilityCastAnimation" "ACT_DOTA_ATTACK"
```
1
### AnimationIgnoresModelScale ​

Animations have a predefined time designed for units at default model scale (1). When set to 1 (default), a unit with increased model scale will still use the default animation time, making it look faster on bigger models (or slower on small ones).

Set to 0 to make the animation time scale with the model:

```javascript
"AnimationIgnoresModelScale" "0"
```
1
### AnimationPlaybackRate ​

Animation speed multiplier. Takes the animation time and makes it faster or slower by a factor. Cast point is independent and is not affected by this value.

```javascript
"AnimationPlaybackRate" "2"
```
1
## General Ability Stats ​

### Damage ​

```javascript
"AbilityDamage" "100 200 300 400"
```
1
This damage value won't be dealt by itself — you'll later reference %AbilityDamage in a Damage Action block to let the game adjust with ability level. The tooltip automatically generates a DAMAGE: line from this value.

However this is a single instance; if you want different damage instances or different tooltip labels (e.g. "DAMAGE PER SECOND:") you'll need to use AbilitySpecial blocks instead.

### Mana Cost ​

Shows the mana cost in the UI and blocks the cast if there's not enough mana.

```javascript
"AbilityManaCost" "30 35 40 45"
```
1
### Cooldown ​

Shows the cooldown in the UI and blocks the cast while recharging. Accepts floats but will round to integer if no decimal point is given.

```javascript
"AbilityCooldown" "10.5 8 6 3.22"
```
1
### AbilityCastRange ​

For DOTA_ABILITY_BEHAVIOR_UNIT_TARGET and DOTA_ABILITY_BEHAVIOR_POINT this sets the maximum range. If targeted beyond this distance, the unit will move within cast range before casting.

```javascript
"AbilityCastRange" "600"
```
1
### AbilityCastRangeBuffer ​

The spell will cancel if the target moves beyond CastRange + CastRangeBuffer. Normally used with high AbilityCastPoint.

```javascript
"AbilityCastRangeBuffer" "250"
```
1
Examples: Assassinate, Nether Strike.

### AbilityCastMinimumRange ​

Not hooked up in most versions, but can be found in holdout_example:

```javascript
"AbilityCastMinimumRange" "500"
```
1
### AbilityDuration ​

```javascript
"AbilityDuration" "20"
```
1
This is a shortcut that should generally be avoided. Unlike AbilityDamage, it does not generate a "DURATION:" tooltip by itself. If you want to display the duration, you still need to make an AbilitySpecial entry. Only use AbilityDuration when you aren't concerned about displaying it as a variable tooltip (e.g. when you just write "Lasts 5 seconds." in the ability _Description).

If you ever change the value, you'll need to update both AbilityDuration and the tooltip string manually.

### AoERadius ​

Requires "AbilityBehavior" "DOTA_ABILITY_BEHAVIOR_AOE" (along with POINT and/or UNIT_TARGET). Displays the area of effect circle on the ground.

Important: This only affects the visual indicator, not the actual spell behavior. Real radius values should be controlled with AbilitySpecial entries.

```javascript
"AoERadius" "250"
```
1
### Channelling ​

For "AbilityBehavior" "DOTA_ABILITY_BEHAVIOR_CHANNELLED":

Channel Time — defaults to 0, so it's very important to set this or the channel will instantly end:

```javascript
"AbilityChannelTime" "5.0"
```
1
Channelled Mana Cost Per Second — an additional cost to maintain the channel:

```javascript
"AbilityChannelTime"                 "5.0"
"AbilityChannelledManaCostPerSecond" "30 35 40 45"
```
12
## Other First-Level KeyValues ​

### AbilitySharedCooldown ​

Links abilities/items together on a shared cooldown. Use the same string value in every ability you want to link:

```javascript
"AbilitySharedCooldown" "linkedProjectile"
```
1
When any of the linked abilities is used, all others go on cooldown simultaneously.

### AbilitySharedWithTeammates ​

Ability on a unit controlled by a team which can be used by everyone on that team (e.g. a building with upgrades purchasable by the team).

```javascript
"AbilitySharedWithTeammates" "1"
```
1
## Gold Cost ​

### AbilityGoldCost ​

Cost in gold to use the ability each time.

### AbilityUpgradeGoldCost ​

Cost in gold to learn and upgrade the ability.

```javascript
"AbilityGoldCost"        "100"
"AbilityUpgradeGoldCost" "300"
```
12
## Stats Tracking ​

Related to fantasy points calculation.

### AbilityModifierSupportValue ​

Float from 0.0 to 1.0. Abilities that do less damage but are important to secure the kill have a greater value.

- "AbilityModifierSupportValue" "0.6" — Applies multiple modifiers (e.g. Beastmaster: Primal Roar)
- "AbilityModifierSupportValue" "0.5" — Primarily about the summon (e.g. Warlock's Rain of Chaos)
- "AbilityModifierSupportValue" "0.1" — Just a ministun (e.g. Zeus: Lightning Bolt)
- "AbilityModifierSupportValue" "0.0" — Primarily about the damage (e.g. Lich: Chain Frost)

### AbilityModifierSupportBonus ​

Integer. Abilities with generally higher impact on securing the kill have a higher bonus.

- "AbilityModifierSupportBonus" "5" — Lycan: Howl
- "AbilityModifierSupportBonus" "35" — Jakiro's Liquid Fire
- "AbilityModifierSupportBonus" "100" — Templar Assassin: Trap
- "AbilityModifierSupportBonus" "120" — Alchemist: Unstable Concoction Throw

## Magic Stick ​

### AbilityProcsMagicStick ​

Useful for 0-second cooldown custom abilities if the game mode uses the default Magic Wand item.

```javascript
"AbilityProcsMagicStick" "1"
```
1
## Legacy Keys ​

### HotKeyOverride ​

If Legacy Keys are enabled, the ability will use this hotkey. Note: only works with Legacy Keys, and there is no way to force players to use them.

```javascript
"HotKeyOverride" "K"
```
1
## Meepo / Lone Druid UI ​

### DisplayAdditionalHeroes ​

Adding this to an ability will show the main hero and any additional heroes under the player's control in the top-left UI (similar to Meepo or Lone Druid).

```javascript
"DisplayAdditionalHeroes" "1"
```
1
Notes:

- DataDriven SpawnUnit with an npc_dota_hero as the UnitName and Lua will crash the game. Use CreateHeroForPlayer instead.
- npc_dota_lone_druid_bear4 doesn't show up as a new hero in the UI.

## FightRecapLevel ​

Used by the Fight Recap UI to prioritize the most important abilities and items used in a fight.

- Level 2: Cheese, Mek, Hex, BKB, Aegis, and most Ultimates with high cooldown
- Level 1: Everything else

```javascript
"FightRecapLevel" "2"
```
1
## OnCastbar / OnLearnbar ​

Presence of the Dark Lord and Necromastery have these at 0, but changing them to 1 doesn't produce noticeable effects. Use DOTA_ABILITY_BEHAVIOR_HIDDEN to hide from the cast bar, and DOTA_ABILITY_BEHAVIOR_NOT_LEARNABLE to hide from the learn bar instead.

```javascript
"OnCastbar"  "1"
"OnLearnbar" "1"
```
12
## AbilitySpecial Block ​

This block serves two purposes:

1. Defining values that change as the ability levels up, referenced with %value
2. Formatting ability tooltips

### Structure ​

```javascript
"AbilitySpecial"
{
    "01"
    {
        "var_type"  "FIELD_INTEGER"
        "value"     "3 4 5 6 7 8"
    }
    "02"
    {
        "var_type"      "FIELD_FLOAT"
        "another_value" "3.0"
    }
}
```
12345678910111213
### Variable Values ​

Wherever a value is needed, use "%name" to grab it from the AbilitySpecial block of that name.

### Tooltips ​

For every AbilitySpecial block you can add a corresponding tooltip string that will automatically pull the values into the ability tooltip. Given the example above inside an ability named datadriven_skeleton, the strings in addon_english.txt would be:

```javascript
"DOTA_Tooltip_Ability_datadriven_skeleton"             "Tooltip Example"
"DOTA_Tooltip_Ability_datadriven_skeleton_Description" "This shows the basic tooltip syntax"
"DOTA_Tooltip_Ability_datadriven_skeleton_Note0"       "This shows when hovering with Alt pressed"
"DOTA_Tooltip_Ability_datadriven_skeleton_Lore"        "And then, there was Documentation."
"DOTA_Tooltip_Ability_datadriven_skeleton_value"       "SOME:"
"DOTA_Tooltip_Ability_datadriven_skeleton_another_value" "DATA:"
```
123456
## precache Block ​

When using a particle, sound, or model asset inside a custom ability or item, if the resource is not preloaded it won't appear in game. This is especially important when using content from heroes that weren't loaded by the players.

```javascript
"precache"
{
    "particle"  "particles/units/heroes/hero_legion_commander/legion_commander_duel_victory.vpcf"
    "particle"  "particles/units/heroes/hero_legion_commander/legion_commander_duel_buff.vpcf"
    "soundfile" "soundevents/game_sounds_heroes/game_sounds_legion_commander.vsndevts"
    "model"     "models/particle/legion_duel_banner.vmdl"
}
```
1234567
The asset relative path can be copied directly from the Asset Browser:

A parent particle is a system with secondary child particles. Precaching a parent particle system will usually precache all of its children.

Full folders can also be precached through "particle_folder" and "model_folder", but this is not recommended as it increases memory usage.

### Lua Precache ​

The Precache() function in addon_game_mode.lua has issues with clients appropriately precaching assets. If this occurs, it causes the client to never precache things configured in that block.

You'll test your addon in the Tools and it will work fine because you are the host, but as soon as you upload it to the Workshop and make a lobby with 2 or more players, many particles, sounds, and models will not be seen by clients if you don't use this function with caution.

Try to always use a datadriven precache block — it will always preload what it has defined inside when the hero is picked. Use PostLoadPrecache() if you need to preload units or items that are created dynamically.

## Ability Events ​

See the detailed guide on Ability Events with Actions.

| Ability Event | Triggers |
| --- | --- |
| OnSpellStart | After the AbilityCastPoint is finished |
| OnToggleOn | Activating a DOTA_ABILITY_BEHAVIOR_TOGGLE |
| OnToggleOff | Deactivating a _TOGGLE |
| OnChannelFinish | Ending a channelled ability under any condition |
| OnChannelInterrupted | Ending a channel prematurely |
| OnChannelSucceeded | Ending after AbilityChannelTime has been completed |
| OnOwnerDied | Unit with this ability dies |
| OnOwnerSpawned | Unit with this ability spawns |
| OnProjectileHitUnit | A projectile collides with a valid unit |
| OnProjectileFinish | A projectile finishes its fixed distance |
| OnEquip | Item picked up |
| OnUnequip | Item leaves the inventory |
| OnUpgrade | Upgrading the ability from the HUD |
| OnAbilityPhaseStart | When the ability is cast (before the unit turns to target) |

### List of Actions ​

An Event can contain as many Actions as needed.

| Action | Parameters |
| --- | --- |
| AddAbility | Target, AbilityName |
| ActOnTargets | Target, Action |
| ApplyModifier | Target, ModifierName, Duration |
| ApplyMotionController | Target, ScriptFile, HorizontalControlFunction, VerticalControlFunction, TestGravityFunc |
| AttachEffect | EffectName, EffectAttachType, Target, TargetPoint, ControlPoints, ControlPointEntities, EffectRadius, EffectDurationScale, EffectLifeDurationScale, EffectColorA, EffectColorB, EffectAlphaScale |
| Blink | Target |
| CleaveAttack | CleaveEffect, CleavePercent, CleaveRadius |
| CreateBonusAttack | Target |
| CreateThinker | Target, ModifierName |
| CreateThinkerWall | Target, ModifierName, Width, Length, Rotation |
| CreateItem | Target, ItemName, ItemCount, ItemChargeCount, SpawnRadius, LaunchHeight, LaunchDistance, LaunchDuration |
| Damage | Target, Type, MinDamage/MaxDamage, Damage, CurrentHealthPercentBasedDamage, MaxHealthPercentBasedDamage |
| DelayedAction | Delay, Action |
| DestroyTrees | Target, Radius |
| FireEffect | EffectName, EffectAttachType, Target, TargetPoint, ControlPoints, EffectRadius, EffectDurationScale, EffectLifeDurationScale, EffectColorA, EffectColorB, EffectAlphaScale |
| FireSound | EffectName, Target |
| GrantXPGold | Target, XPAmount, GoldAmount, ReliableGold, SplitEvenly |
| Heal | HealAmount, Target |
| IsCasterAlive | OnSuccess, OnFailure |
| Knockback | Target, Center, Duration, Distance, Height, IsFixedDistance, ShouldStun |
| LevelUpAbility | Target, AbilityName |
| Lifesteal | Target, LifestealPercent |
| LinearProjectile | Target, EffectName, MoveSpeed, StartRadius, EndRadius, FixedDistance, StartPosition, TargetTeams, TargetTypes, TargetFlags, HasFrontalCone, ProvidesVision, VisionRadius |
| MoveUnit | Target, MoveToTarget |
| Random | Chance, PseudoRandom, OnSuccess, OnFailure |
| RemoveAbility | Target, AbilityName |
| RemoveModifier | Target, ModifierName |
| RemoveUnit | Target |
| ReplaceUnit | UnitName, Target |
| Rotate | Target, PitchYawRoll |
| RunScript | Target, ScriptFile, Function, (extra parameters) |
| SpawnUnit | UnitName, UnitCount, UnitLimit, SpawnRadius, Duration, Target, GrantsGold, GrantsXP, OnSpawn |
| Stun | Target, Duration |
| SpendMana | Mana |
| TrackingProjectile | Target, EffectName, Dodgeable, ProvidesVision, VisionRadius, MoveSpeed, SourceAttachment |

> Note: When used inside a modifier, AttachEffect will automatically stop the particle after the modifier is destroyed, while FireEffect won't. If you FireEffect with a particle of infinite duration inside a modifier, it will persist after the modifier ends.

## Modifiers ​

The Modifiers block contains each modifier definition:

```javascript
"Modifiers"
{
    "modifier_example"
    {
        // ...
    }
    "another_modifier"
    {
        // ...
    }
}
```
1234567891011
### Modifier Skeleton ​

```javascript
"modifier_example"
{
    "Attributes"       "MODIFIER_ATTRIBUTE_MULTIPLE"
    "Duration"         "10"
    "Passive"          "0"
    "TextureName"      "spellicon"

    "IsDebuff"         "0"
    "IsHidden"         "0"
    "IsPurgable"       "0"

    "EffectName"        "particles/effect_name.vpcf"
    "EffectAttachType"  "follow_origin"

    "StatusEffectName"     "particles/status_fx/status_effect_frost_lich.vpcf"
    "StatusEffectPriority" "10"

    "OverrideAnimation" "ACT_DOTA_VICTORY"

    // Properties {}
    // States {}
    // Modifier Events
}
```
1234567891011121314151617181920212223
### Attributes ​

| Attribute | Description |
| --- | --- |
| MODIFIER_ATTRIBUTE_NONE | Default value, same as omitting this key |
| MODIFIER_ATTRIBUTE_MULTIPLE | Multiple instances of the same modifier can be applied and will not override each other |
| MODIFIER_ATTRIBUTE_PERMANENT | Persists through death |
| MODIFIER_ATTRIBUTE_IGNORE_INVULNERABLE | Remains on units with MODIFIER_STATE_INVULNERABLE. To apply to an invulnerable unit you also need DOTA_UNIT_TARGET_FLAG_INVULNERABLE |

```javascript
"Attributes" "MODIFIER_ATTRIBUTE_MULTIPLE"
```
1
### Duration ​

The modifier ticks down and removes itself after a duration in seconds. Omit to make it last indefinitely (or until something removes it).

```javascript
"Duration" "10"
```
1
### Passive ​

The modifier is automatically applied to the unit when the ability is acquired. Default is 0. Used on most items and passive abilities.

```javascript
"Passive" "1"
```
1
### TextureName ​

Allows using a different icon in the buff bar. By default uses the ability icon from AbilityTextureName.

### IsBuff / IsDebuff / IsPurgable ​

Each defaults to 0 if omitted. Every modifier is displayed with a green border by default, but is not considered a Buff unless "IsBuff" "1" is set. Setting "IsDebuff" "1" shows a red border to indicate a negative effect.

```javascript
"IsDebuff" "1"
```
1
If "IsPurgable" "1", Purge and Dispel mechanics will act according to the IsBuff/IsDebuff values:

- "IsDebuff" "1" modifiers are purged from friendly units
- "IsBuff" "1" modifiers are purged from enemy units

Setting "IsStunDebuff" "true" requires a strong dispel (like Abaddon's Shield or Repel) to be removed.

### Particles on Modifiers ​

To attach a particle effect for the duration of the modifier, use these two keys together:

EffectName — name of the particle system to use. Most buff-type particles work. Make sure to use a parent particle.

EffectAttachType — where on the unit the particle is displayed. Most common values:

- follow_origin — body/feet, moves with the unit
- follow_overhead — on top of the model, moves with the unit

```javascript
"modifier_golden"
{
    "Passive"          "1"
    "EffectName"       "particles/econ/courier/courier_golden_roshan/golden_roshan_ambient.vpcf"
    "EffectAttachType" "follow_origin"
}
```
123456
Additional or complex particles should be attached with the AttachEffect action inside an OnCreated modifier event. Example with multiple effects:

```javascript
"modifier_much_gold"
{
    "Duration" "3"
    "States"
    {
        "MODIFIER_STATE_NO_HEALTH_BAR" "MODIFIER_STATE_VALUE_ENABLED"
    }
    "OnCreated"
    {
        "AttachEffect"
        {
            "Target"           "CASTER"
            "EffectName"       "particles/econ/items/gyrocopter/hero_gyrocopter_gyrotechnics/gyro_calldown_marker.vpcf"
            "EffectAttachType" "follow_origin"
            "EffectRadius"     "100"
        }
        "AttachEffect"
        {
            "Target"                "CASTER"
            "EffectName"            "particles/units/heroes/hero_alchemist/alchemist_lasthit_coins.vpcf"
            "EffectAttachType"      "start_at_customorigin"
            "ControlPointEntities"
            {
                "CASTER" "attach_origin"
                "CASTER" "attach_origin"
            }
        }
        "AttachEffect"
        {
            "EffectName"       "particles/units/heroes/hero_alchemist/alchemist_acid_spray.vpcf"
            "EffectAttachType" "follow_origin"
            "Target"           "CASTER"
            "ControlPoints"
            {
                "00" "0 0 0"
                "01" "200 1 1"   // Radius
                "15" "255 200 0" // Color
                "16" "1 0 0"
            }
        }
    }
}
```
123456789101112131415161718192021222324252627282930313233343536373839404142
### Status Effect Particles ​

These apply a texture overlay to the unit. Search for status_effect in the Asset Browser.

```javascript
"StatusEffectName"     "particles/status_fx/status_effect_frost_lich.vpcf"
"StatusEffectPriority" "10"
```
12
StatusEffectPriority allows more important effects to override others with lower priority values.

status_effect_frost_lich · status_effect_medusa_stone_gaze

status_effect_forcestaff · status_effect_avatar

status_effect_doom · status_effect_gods_strength

### OverrideAnimation ​

Forces a specific animation while the modifier is active. Can use any ACT_ value from the Animation section.

```javascript
"modifier_sleep"
{
    "EffectName"        "particles/newplayer_fx/npx_sleeping.vpcf"
    "EffectAttachType"  "follow_overhead"
    "OverrideAnimation" "ACT_DOTA_DISABLED"
    "States"
    {
        "MODIFIER_STATE_NO_HEALTH_BAR" "MODIFIER_STATE_VALUE_ENABLED"
    }
}
```
12345678910
### Aura ​

A modifier with Aura keys automatically applies the specified modifier to every valid unit within Aura_Radius, removing it when units leave the radius.

```javascript
"Modifiers"
{
    "modifier_armor_aura"
    {
        "Passive"   "1"
        "IsHidden"  "1"

        "Aura"              "armor_aura_effect"
        "Aura_Radius"       "%radius"
        "Aura_Teams"        "DOTA_UNIT_TARGET_TEAM_FRIENDLY"
        "Aura_Types"        "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC"
        "Aura_Flags"        "DOTA_UNIT_TARGET_FLAG_MAGIC_IMMUNE_ENEMIES"
        "Aura_ApplyToCaster" "0"
    }

    "armor_aura_effect"
    {
        "Properties"
        {
            "MODIFIER_PROPERTY_PHYSICAL_ARMOR_BONUS" "%armor_bonus"
        }
    }
}
```
1234567891011121314151617181920212223
### Illusions (AllowIllusionDuplicate) ​

By default illusions don't inherit modifiers from the original hero. Set this to make the modifier copy to illusions:

```javascript
"modifier_armor_oncopies"
{
    "Passive"                "1"
    "AllowIllusionDuplicate" "1"
    "Properties"
    {
        "MODIFIER_PROPERTY_PHYSICAL_ARMOR_BONUS" "1 2 3"
    }
}
```
123456789
### Repeating Actions (ThinkInterval) ​

Used with the OnIntervalThink modifier event to execute actions on a timer:

```javascript
"modifier_midas_effect"
{
    "ThinkInterval"  "1"
    "OnIntervalThink"
    {
        "FireEffect"
        {
            "EffectName"       "particles/items2_fx/hand_of_midas.vpcf"
            "Target"           "CASTER"
            "EffectAttachType" "follow_origin"
        }
    }
}
```
12345678910111213
### Priority ​

Makes a state like invisibility not be overridden by lower-priority effects.

```javascript
"Priority" "MODIFIER_PRIORITY_ULTRA"
```
1
Possible values: MODIFIER_PRIORITY_ULTRA and MODIFIER_PRIORITY_HIGH.

### ModelName ​

A datadriven way to change the model of a unit from within a modifier:

```javascript
"ModelName" "models/heroes/doom/doom.vmdl"
```
1
## Properties Block ​

This block inside a modifier gives numeric stat bonuses from the list of modifier properties. Supports AbilitySpecial references and negative values.

```javascript
"modifier_slow"
{
    "IsDebuff"  "1"
    "Duration"  "%duration"
    "Properties"
    {
        "MODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT"  "%attackspeed_reduction"
        "MODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE"  "%movespeed_reduction_percentage"
    }
}
```
12345678910
### List of Modifier Properties ​

- MODIFIER_PROPERTY_ABILITY_LAYOUT
- MODIFIER_PROPERTY_ABSOLUTE_NO_DAMAGE_MAGICAL
- MODIFIER_PROPERTY_ABSOLUTE_NO_DAMAGE_PHYSICAL
- MODIFIER_PROPERTY_ABSOLUTE_NO_DAMAGE_PURE
- MODIFIER_PROPERTY_ABSORB_SPELL
- MODIFIER_PROPERTY_ATTACK_RANGE_BONUS
- MODIFIER_PROPERTY_ATTACK_RANGE_BONUS_UNIQUE
- MODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT
- MODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT_POWER_TREADS
- MODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT_SECONDARY
- MODIFIER_PROPERTY_AVOID_CONSTANT
- MODIFIER_PROPERTY_AVOID_SPELL
- MODIFIER_PROPERTY_BASEATTACK_BONUSDAMAGE
- MODIFIER_PROPERTY_BASE_ATTACK_TIME_CONSTANT
- MODIFIER_PROPERTY_BASEDAMAGEOUTGOING_PERCENTAGE
- MODIFIER_PROPERTY_BASE_MANA_REGEN
- MODIFIER_PROPERTY_BONUS_DAY_VISION
- MODIFIER_PROPERTY_BONUS_NIGHT_VISION
- MODIFIER_PROPERTY_BONUS_VISION_PERCENTAGE
- MODIFIER_PROPERTY_CAST_RANGE_BONUS
- MODIFIER_PROPERTY_CHANGE_ABILITY_VALUE
- MODIFIER_PROPERTY_COOLDOWN_PERCENTAGE
- MODIFIER_PROPERTY_COOLDOWN_PERCENTAGE_STACKING
- MODIFIER_PROPERTY_DAMAGEOUTGOING_PERCENTAGE
- MODIFIER_PROPERTY_DAMAGEOUTGOING_PERCENTAGE_ILLUSION
- MODIFIER_PROPERTY_DEATHGOLDCOST
- MODIFIER_PROPERTY_DISABLE_AUTOATTACK
- MODIFIER_PROPERTY_DISABLE_HEALING
- MODIFIER_PROPERTY_DISABLE_TURNING
- MODIFIER_PROPERTY_EVASION_CONSTANT
- MODIFIER_PROPERTY_FORCE_DRAW_MINIMAP
- MODIFIER_PROPERTY_HEALTH_BONUS
- MODIFIER_PROPERTY_HEALTH_REGEN_CONSTANT
- MODIFIER_PROPERTY_HEALTH_REGEN_PERCENTAGE
- MODIFIER_PROPERTY_IGNORE_CAST_ANGLE
- MODIFIER_PROPERTY_INCOMING_DAMAGE_PERCENTAGE
- MODIFIER_PROPERTY_INCOMING_PHYSICAL_DAMAGE_CONSTANT
- MODIFIER_PROPERTY_INCOMING_PHYSICAL_DAMAGE_PERCENTAGE
- MODIFIER_PROPERTY_INCOMING_SPELL_DAMAGE_CONSTANT
- MODIFIER_PROPERTY_INVISIBILITY_LEVEL
- MODIFIER_PROPERTY_IS_ILLUSION
- MODIFIER_PROPERTY_IS_SCEPTER
- MODIFIER_PROPERTY_LIFETIME_FRACTION
- MODIFIER_PROPERTY_MAGICAL_RESISTANCE_BONUS
- MODIFIER_PROPERTY_MAGICAL_RESISTANCE_DECREPIFY_UNIQUE
- MODIFIER_PROPERTY_MAGICAL_RESISTANCE_ITEM_UNIQUE
- MODIFIER_PROPERTY_MAGICDAMAGEOUTGOING_PERCENTAGE
- MODIFIER_PROPERTY_MANA_BONUS
- MODIFIER_PROPERTY_MANA_REGEN_CONSTANT
- MODIFIER_PROPERTY_MANA_REGEN_CONSTANT_UNIQUE
- MODIFIER_PROPERTY_MANA_REGEN_PERCENTAGE
- MODIFIER_PROPERTY_MANA_REGEN_TOTAL_PERCENTAGE
- MODIFIER_PROPERTY_MAX_ATTACK_RANGE
- MODIFIER_PROPERTY_MIN_HEALTH
- MODIFIER_PROPERTY_MISS_PERCENTAGE
- MODIFIER_PROPERTY_MODEL_CHANGE
- MODIFIER_PROPERTY_MOVESPEED_ABSOLUTE
- MODIFIER_PROPERTY_MOVESPEED_BASE_OVERRIDE
- MODIFIER_PROPERTY_MOVESPEED_BONUS_CONSTANT
- MODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE
- MODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE_UNIQUE
- MODIFIER_PROPERTY_MOVESPEED_BONUS_UNIQUE
- MODIFIER_PROPERTY_NEGATIVE_EVASION_CONSTANT
- MODIFIER_PROPERTY_OVERRIDE_ANIMATION
- MODIFIER_PROPERTY_OVERRIDE_ANIMATION_RATE
- MODIFIER_PROPERTY_OVERRIDE_ANIMATION_WEIGHT
- MODIFIER_PROPERTY_OVERRIDE_ATTACK_MAGICAL
- MODIFIER_PROPERTY_PERSISTENT_INVISIBILITY
- MODIFIER_PROPERTY_PHYSICAL_ARMOR_BONUS
- MODIFIER_PROPERTY_PHYSICAL_ARMOR_BONUS_ILLUSIONS
- MODIFIER_PROPERTY_PHYSICAL_ARMOR_BONUS_UNIQUE
- MODIFIER_PROPERTY_PHYSICAL_ARMOR_BONUS_UNIQUE_ACTIVE
- MODIFIER_PROPERTY_PHYSICAL_CONSTANT_BLOCK
- MODIFIER_PROPERTY_POST_ATTACK
- MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE
- MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE_POST_CRIT
- MODIFIER_PROPERTY_PREATTACK_CRITICALSTRIKE
- MODIFIER_PROPERTY_PROCATTACK_BONUS_DAMAGE_COMPOSITE
- MODIFIER_PROPERTY_PROCATTACK_BONUS_DAMAGE_MAGICAL
- MODIFIER_PROPERTY_PROCATTACK_BONUS_DAMAGE_PHYSICAL
- MODIFIER_PROPERTY_PROCATTACK_BONUS_DAMAGE_PURE
- MODIFIER_PROPERTY_PROCATTACK_FEEDBACK
- MODIFIER_PROPERTY_PROVIDES_FOW_POSITION
- MODIFIER_PROPERTY_RESPAWNTIME
- MODIFIER_PROPERTY_RESPAWNTIME_PERCENTAGE
- MODIFIER_PROPERTY_RESPAWNTIME_STACKING
- MODIFIER_PROPERTY_STATS_AGILITY_BONUS
- MODIFIER_PROPERTY_STATS_INTELLECT_BONUS
- MODIFIER_PROPERTY_STATS_STRENGTH_BONUS
- MODIFIER_PROPERTY_SUPER_ILLUSION_WITH_ULTIMATE
- MODIFIER_PROPERTY_TOTAL_CONSTANT_BLOCK
- MODIFIER_PROPERTY_TOTAL_CONSTANT_BLOCK_UNAVOIDABLE_PRE_ARMOR
- MODIFIER_PROPERTY_TRANSLATE_ACTIVITY_MODIFIERS
- MODIFIER_PROPERTY_TRANSLATE_ATTACK_SOUND
- MODIFIER_PROPERTY_TURN_RATE_PERCENTAGE

### Unhandled Properties ​

These properties are not functional in a DataDriven context:

| Property | Alternative |
| --- | --- |
| MODIFIER_PROPERTY_MODEL_SCALE | Use Lua SetModelScale(float scale) |
| MODIFIER_PROPERTY_MODEL_CHANGE | Use "ModelName" key in the modifier |
| MODIFIER_PROPERTY_MOVESPEED_LIMIT | — |
| MODIFIER_PROPERTY_MOVESPEED_MAX | — |
| MODIFIER_PROPERTY_TOTALDAMAGEOUTGOING_PERCENTAGE | — |
| MODIFIER_PROPERTY_REINCARNATION | — |
| MODIFIER_PROPERTY_EXTRA_STRENGTH_BONUS | — |
| MODIFIER_PROPERTY_EXTRA_HEALTH_BONUS | — |
| MODIFIER_PROPERTY_EXTRA_MANA_BONUS | — |
| MODIFIER_PROPERTY_COOLDOWN_REDUCTION_CONSTANT | — |
| MODIFIER_PROPERTY_TOOLTIP | — |

## States Block ​

States are similar to properties, except they take one of three values:

- MODIFIER_STATE_VALUE_NO_ACTION — default; don't change the state
- MODIFIER_STATE_VALUE_ENABLED — enable the state
- MODIFIER_STATE_VALUE_DISABLED — disable the state

```javascript
"Modifiers"
{
    "modifier_magic_immune_and_no_healthbar"
    {
        "Passive" "1"
        "States"
        {
            "MODIFIER_STATE_NO_HEALTH_BAR" "MODIFIER_STATE_VALUE_ENABLED"
            "MODIFIER_STATE_MAGIC_IMMUNE"  "MODIFIER_STATE_VALUE_ENABLED"
        }
    }

    "modifier_stun"
    {
        "EffectName"       "particles/generic_gameplay/generic_stunned_old.vpcf"
        "EffectAttachType" "follow_origin"
        "States"
        {
            "MODIFIER_STATE_MAGIC_IMMUNE" "MODIFIER_STATE_VALUE_DISABLED"
            "MODIFIER_STATE_STUNNED"      "MODIFIER_STATE_VALUE_ENABLED"
        }
    }
}
```
1234567891011121314151617181920212223
### List of Modifier States ​

- MODIFIER_STATE_ATTACK_IMMUNE
- MODIFIER_STATE_BLIND
- MODIFIER_STATE_BLOCK_DISABLED
- MODIFIER_STATE_CANNOT_MISS
- MODIFIER_STATE_COMMAND_RESTRICTED
- MODIFIER_STATE_DISARMED
- MODIFIER_STATE_DOMINATED
- MODIFIER_STATE_EVADE_DISABLED
- MODIFIER_STATE_FLYING
- MODIFIER_STATE_FROZEN
- MODIFIER_STATE_HEXED
- MODIFIER_STATE_INVISIBLE
- MODIFIER_STATE_INVULNERABLE
- MODIFIER_STATE_LOW_ATTACK_PRIORITY
- MODIFIER_STATE_MAGIC_IMMUNE
- MODIFIER_STATE_MUTED
- MODIFIER_STATE_NIGHTMARED
- MODIFIER_STATE_NO_HEALTH_BAR
- MODIFIER_STATE_NO_TEAM_MOVE_TO
- MODIFIER_STATE_NO_TEAM_SELECT
- MODIFIER_STATE_NOT_ON_MINIMAP
- MODIFIER_STATE_NOT_ON_MINIMAP_FOR_ENEMIES
- MODIFIER_STATE_NO_UNIT_COLLISION
- MODIFIER_STATE_OUT_OF_GAME
- MODIFIER_STATE_PASSIVES_DISABLED
- MODIFIER_STATE_PROVIDES_VISION
- MODIFIER_STATE_ROOTED
- MODIFIER_STATE_SILENCED
- MODIFIER_STATE_SOFT_DISARMED
- MODIFIER_STATE_SPECIALLY_DENIABLE
- MODIFIER_STATE_STUNNED
- MODIFIER_STATE_UNSELECTABLE

Added with Reborn:

- MODIFIER_STATE_FAKE_ALLY
- MODIFIER_STATE_FLYING_FOR_PATHING_PURPOSES_ONLY
- MODIFIER_STATE_TRUESIGHT_IMMUNE
- MODIFIER_STATE_LAST

## Modifier Events ​

See the detailed guide on Modifier Events with Actions.

Any of these can go inside a modifier and contain as many Actions as necessary.

| Modifier Event | Triggers |
| --- | --- |
| OnCreated | The modifier has been created |
| OnDestroy | The modifier has been removed |
| OnIntervalThink | Every ThinkInterval seconds |
| OnAttack | The unit this modifier is on has completed an attack |
| OnAttacked | The unit this modifier is on has been attacked (fires at end of attack) |
| OnAttackStart | The unit's attack animation begins (not when the projectile is created) |
| OnAttackLanded | The unit has landed an attack on a target |
| OnAttackFailed | Unit misses an attack |
| OnAttackAllied | When attacking units on the same team |
| OnDealDamage | The unit has dealt damage |
| OnTakeDamage | The unit has taken damage (%attack_damage is set to damage after mitigation) |
| OnDeath | The unit with this modifier died |
| OnKill | Unit kills anything |
| OnHeroKill | Unit kills a hero |
| OnRespawn | Unit respawns after the death timer |
| OnOrbFire | OnAttackStart of an Orb (fires on every attack if the Orb is used) |
| OnOrbImpact | OnAttackLanded of an Orb |
| OnAbilityExecuted | Any ability (including items) was used by the unit with this modifier |
| OnAbilityStart | The unit starts an ability (same as OnSpellStart but as a modifier event) |
| OnAbilityEndChannel | When the unit ends a channel by any means |
| OnHealReceived | Unit gained health by any means (triggers even at full HP) |
| OnHealthGained | Unit received health from an external source |
| OnManaGained | Unit gained mana (triggers even at full mana) |
| OnSpentMana | Unit spent mana |
| OnOrder | Triggers on Move/Cast/Hold/Stop |
| OnUnitMoved | Triggers on Move |
| OnTeleported | Triggers when finishing a Teleport |
| OnTeleporting | Triggers when starting a Teleport |
| OnProjectileDodge | The unit dodged a projectile |
| OnStateChanged | May trigger when the unit gets a modifier |


---

# Item KeyValues | ModDota

**Source:** https://moddota.com/abilities/item-keyvalues

---


# Item KeyValues ​

A comprehensive guide to npc_items_custom and coding items

## General ​

Start with item_ and your item name. If you don't put item_ at the beginning of an item, bad things happen.

```javascript
"item_custom"
{ ... }
```
12
Each item needs its proper ID for purchasing on the shop, although you can define items without an ID if you only plan to create them through Lua. Do not override Dota IDs, use IDs between 1000~2000

"ID" "1100"

Next is the BaseClass. It can be DataDriven, or overriding an existing item from the default dota item_names.

```javascript
"BaseClass" "item_datadriven"
            "item_aegis"
```
12
If you want to override an item, you won't be able to change/add abilities, you'll be limited to change values from items.txt (and some values can't even be changed) So it's recommended to always try to make a datadriven version of the item if you want to have complete freedom on what your item does.

Now that we settled that, I'll review the most common key values seen in items.

### Basic Rules ​

```javascript
"ItemCost" "322"
"ItemKillable" "0"
"ItemSellable" "1"
"ItemPurchasable" "1"
"ItemDroppable" "1"
```
12345
ItemKillable lets both allies and enemies destroy the dropped item by attacking it.

### Stock ​

```javascript
"ItemStockMax" "1"
"ItemStockTime" "100"
"ItemStockInitial" "3"
```
123
### Ownership ​

If you omit the following, its behavior will be NOT_SHAREABLE

```javascript
"ItemShareability" "ITEM_NOT_SHAREABLE"             //Rapier
                   "ITEM_PARTIALLY_SHAREABLE"       //Ring of Regen
                   "ITEM_FULLY_SHAREABLE"           //Gem
                   "ITEM_FULLY_SHAREABLE_STACKING"  //Consumables
```
1234
### Charges ​

```javascript
"ItemInitialCharges" "1" //How many charges should the item start with - Tango x3
"ItemDisplayCharges" "1" //Hide the charges of the item - Aegis
"ItemRequiresCharges" "1" //The active ability needs charges to be used - Urn
```
123
Also remember to add this somewhere, normally at the beginning of a OnSpellStart block

"SpendCharge" {}

### Stacking, Consumable ​

```javascript
"ItemStackable" "1"
"ItemPermanent" "0"
```
12
If "ItemPermanent" is set to 1, charged items won't disappear when they hit 0 charges (Bottle, Urn, etc) By omitting it will also default to 1.

### Auto Cast ​

This value is the key for Tomes of Stats and other consumable items:

"ItemCastOnPickup" "1"

### Upgradeable items ​

```javascript
"MaxUpgradeLevel" "5" // Dagon - 5
"ItemBaseLevel" "1" //You'll need 5 different items, and change each accordingly
```
12
### Recipes ​

```javascript
"item_recipe_custom"
{
    "ID" "1200"
    "BaseClass"           "item_datadriven"
    "ItemRecipe"          "1" //destroyed after combine
    "ItemCost"            "0" //if its 0, it will combine without needing a recipe.
    "ItemResult"          "item_custom" //the result of combining the ItemRequirements
    "ItemRequirements"
    {
        "01" "item_ingredient_1;item_ingredient_2;item_ingredient_3"
        "02" "item_ingredient_1;item_ingredient_2;item_ingredient_alternative_3"
    }
}
```
12345678910111213
IMPORTANT NOTE: Your item name for the recipe to be recognized by the Dota Shop UI NEEDS to have this format:

```javascript
"item_recipe_(name of your item)"
```
1
Meaning if the ItemResult you want to get is called "item_capuchino", your recipe would be: "item_recipe_capuchino"

If you don't, the item will still be combinable but it won't show the neat lines to the possible upgrades.

### Disassembling ​

```javascript
"ItemDisassembleRule" "DOTA_ITEM_DISASSEMBLE_ALWAYS"
                      "DOTA_ITEM_DISASSEMBLE_NEVER"
```
12
## Common Modifier Key Values for items ​

We now have an item, but it doesn't do anything on its own. To make it add stats or buffs, we need to set modifiers inside the item definition For more on Modifiers, check the [Constants in the wiki]

```javascript
"Modifiers"
{
    "item_custom_modifier"
    {
        "Passive" "1"
        "IsHidden" "0"
        "Attributes" "MODIFIER_ATTRIBUTE_MULTIPLE" //This makes duplicate items stack their properties
        "Properties"
        {
            "MODIFIER_PROPERTY_MOVESPEED_BONUS_CONSTANT" "%movement_speed"
            "MODIFIER_PROPERTY_EVASION_CONSTANT" "%evasion"
            "MODIFIER_PROPERTY_STATS_STRENGTH_BONUS" "%bonus_str_agi"
            "MODIFIER_PROPERTY_STATS_AGILITY_BONUS" "%bonus_agi"
            "MODIFIER_PROPERTY_STATS_INTELLECT_BONUS" "%bonus_int"
            "MODIFIER_PROPERTY_BASEDAMAGEOUTGOING_PERCENTAGE" "%damage_bonus_percent"
        }

        "States"
        {
            "MODIFIER_STATE_SPECIALLY_DENIABLE" "MODIFIER_STATE_VALUE_ENABLED"
            "MODIFIER_STATE_MAGIC_IMMUNE" "MODIFIER_STATE_VALUE_ENABLED"
            "MODIFIER_STATE_NO_HEALTH_BAR" "MODIFIER_STATE_VALUE_ENABLED"
        }
    }
}
```
12345678910111213141516171819202122232425
## Adding spell functionality ​

Apart from these values specially related to items, you can add everything that could be part of a datadriven ability, for example:

```javascript
"AbilityBehavior" "DOTA_ABILITY_BEHAVIOR_PASSIVE"
"AbilityUnitTargetTeam" "DOTA_UNIT_TARGET_TEAM_BOTH"
"AbilityUnitTargetType" "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC"
"AbilityCastAnimation" "ACT_DOTA_CAST_ABILITY_1"
"AbilityManaCost" "100"
"AbilityValues"
{...}
```
1234567
Ability Events like "OnSpellStart", "OnOwnerDied" or "OnEquip" also go here in the main block.

You need at least set the AbilityBehavior for your item to not be active (if you don't, it will default to DOTA_ABILITY_BEHAVIOR_UNIT_TARGET).

See more on the complete DataDriven Ability Breakdown

## Icons and Custom Shops ​

For your item to have an icon you'll need to go to your addon folder under this path:

/resource/flash3/images/items

And put a .PNG file with dimensions 86 x 64, with the same name as the item_custom, WITHOUT the item_

Then in your "item_custom" code, you add the following:

"AbilityTextureName" "item_custom"

You can also use the names of the dota icons. Just make sure this line starts with "item_, so the engine knows to look the image on the items folder.

Adding the item to a shop. Layout [Here] For this, inside your addon folder you need to go inside scripts/shops and make/edit a .txt file with this name file structure:

mapName_shops.txt

mapName should be the name of YOUR MAP (.vmap file in Hammer or content folder), NOT your addon name (both could be the same, or you could have multiple maps with different shops)

Adding _shops to the mapName is also mandatory.

A template shop file:

```javascript
//<map_name>_shops.txt inside a scripts\shops\ folder

"dota_shops"
{
	"consumables"
	{
		"item" 		"item_ingredient"
		"item"		"item_result"
	}

	"attributes"
	{

	}

	"weapons_armor"
	{

	}

	"misc"
	{

	}

	// Level 1 - Green Recipes
	"basics"
	{

	}

	// Level 2 - Blue Recipes
	"support"
	{

	}

	"magics"
	{

	}

	// Level 3 - Purple Recipes
	"defense"
	{

	}

	"weapons"
	{

	}

	// Level 4 - Orange / Orb / Artifacts
	"artifacts"
	{

	}

	"sideshop1"
	{

	}

	"sideshop2"
	{

	}

	"secretshop"
	{

	}
}
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647484950515253545556575859606162636465666768697071727374
In addition to this file, your item can have key value rules for where it can be bought

```javascript
"SideShop" "1"
"SecretShop" "0"
```
12
At the moment of writing this guide, we can only set up 3 different shops (Home, Side and Secret). You can change categories and shop tab names, with [addon_english modding]

To make an actual shop area inside your map on Hammer, check this other tutorial tutorial_creating_a_custom_shop_step_by_step

To disable your dota items, use this npc_abilities_override.txt inside the scripts/npc folder:
npc_abilities_override.txt
```javascript
// Dota Abilities Override File
"DOTAAbilities"
{

// ITEM SHOPS---------------------------------------------------

	"item_blink"			"REMOVE"
	"item_blades_of_attack"			"REMOVE"
	"item_broadsword"			"REMOVE"
	"item_chainmail"			"REMOVE"
	"item_claymore"			"REMOVE"
	"item_helm_of_iron_will"			"REMOVE"
	"item_javelin"			"REMOVE"
	"item_mithril_hammer"			"REMOVE"
	"item_platemail"			"REMOVE"
	"item_quarterstaff"			"REMOVE"
	"item_quelling_blade"			"REMOVE"
	"item_ring_of_protection"			"REMOVE"
	"item_stout_shield"			"REMOVE"
	"item_gauntlets"			"REMOVE"
	"item_slippers"			"REMOVE"
	"item_mantle"			"REMOVE"
	"item_branches"			"REMOVE"
	"item_belt_of_strength"			"REMOVE"
	"item_boots_of_elves"			"REMOVE"
	"item_robe"			"REMOVE"
	"item_circlet"			"REMOVE"
	"item_ogre_axe"			"REMOVE"
	"item_blade_of_alacrity"			"REMOVE"
	"item_staff_of_wizardry"			"REMOVE"
	"item_ultimate_orb"			"REMOVE"
	"item_gloves"			"REMOVE"
	"item_lifesteal"			"REMOVE"
	"item_ring_of_regen"			"REMOVE"
	"item_sobi_mask"			"REMOVE"
	"item_boots"			"REMOVE"
	"item_gem"			"REMOVE"
	"item_cloak"			"REMOVE"
	"item_talisman_of_evasion"			"REMOVE"
	"item_cheese"			"REMOVE"
	"item_magic_stick"			"REMOVE"
	"item_recipe_magic_wand"			"REMOVE"
	"item_magic_wand"			"REMOVE"
	"item_ghost"			"REMOVE"
	"item_clarity"			"REMOVE"
	"item_flask"			"REMOVE"
	"item_dust"			"REMOVE"
	"item_bottle"			"REMOVE"
	"item_ward_observer"			"REMOVE"
	"item_ward_sentry"			"REMOVE"
	"item_tango"			"REMOVE"
	"item_tango_single"			"REMOVE"
	"item_courier"			"REMOVE"
	"item_tpscroll"			"REMOVE"
	"item_recipe_travel_boots"			"REMOVE"
	"item_travel_boots"			"REMOVE"
	"item_recipe_phase_boots"			"REMOVE"
	"item_phase_boots"			"REMOVE"
	"item_demon_edge"			"REMOVE"
	"item_eagle"			"REMOVE"
	"item_reaver"			"REMOVE"
	"item_relic"			"REMOVE"
	"item_hyperstone"			"REMOVE"
	"item_ring_of_health"			"REMOVE"
	"item_void_stone"			"REMOVE"
	"item_mystic_staff"			"REMOVE"
	"item_energy_booster"			"REMOVE"
	"item_point_booster"			"REMOVE"
	"item_vitality_booster"			"REMOVE"
	"item_recipe_power_treads"			"REMOVE"
	"item_power_treads"			"REMOVE"
	"item_recipe_hand_of_midas"			"REMOVE"
	"item_hand_of_midas"			"REMOVE"
	"item_recipe_oblivion_staff"			"REMOVE"
	"item_oblivion_staff"			"REMOVE"
	"item_recipe_pers"			"REMOVE"
	"item_pers"			"REMOVE"
	"item_recipe_poor_mans_shield"			"REMOVE"
	"item_poor_mans_shield"			"REMOVE"
	"item_recipe_bracer"			"REMOVE"
	"item_bracer"			"REMOVE"
	"item_recipe_wraith_band"			"REMOVE"
	"item_wraith_band"			"REMOVE"
	"item_recipe_null_talisman"			"REMOVE"
	"item_null_talisman"			"REMOVE"
	"item_recipe_mekansm"			"REMOVE"
	"item_mekansm"			"REMOVE"
	"item_recipe_vladmir"			"REMOVE"
	"item_vladmir"			"REMOVE"
	"item_flying_courier"			"REMOVE"
	"item_recipe_buckler"			"REMOVE"
	"item_buckler"			"REMOVE"
	"item_recipe_ring_of_basilius"			"REMOVE"
	"item_ring_of_basilius"			"REMOVE"
	"item_recipe_pipe"			"REMOVE"
	"item_pipe"			"REMOVE"
	"item_recipe_urn_of_shadows"			"REMOVE"
	"item_urn_of_shadows"			"REMOVE"
	"item_recipe_headdress"			"REMOVE"
	"item_headdress"			"REMOVE"
	"item_recipe_sheepstick"			"REMOVE"
	"item_sheepstick"			"REMOVE"
	"item_recipe_orchid"			"REMOVE"
	"item_orchid"			"REMOVE"
	"item_recipe_cyclone"			"REMOVE"
	"item_cyclone"			"REMOVE"
	"item_recipe_force_staff"			"REMOVE"
	"item_force_staff"			"REMOVE"
	"item_recipe_dagon"			"REMOVE"
	"item_recipe_dagon_2"			"REMOVE"
	"item_recipe_dagon_3"			"REMOVE"
	"item_recipe_dagon_4"			"REMOVE"
	"item_recipe_dagon_5"			"REMOVE"
	"item_dagon"			"REMOVE"
	"item_dagon_2"			"REMOVE"
	"item_dagon_3"			"REMOVE"
	"item_dagon_4"			"REMOVE"
	"item_dagon_5"			"REMOVE"
	"item_recipe_necronomicon"			"REMOVE"
	"item_recipe_necronomicon_2"			"REMOVE"
	"item_recipe_necronomicon_3"			"REMOVE"
	"item_necronomicon"			"REMOVE"
	"item_necronomicon_2"			"REMOVE"
	"item_necronomicon_3"			"REMOVE"
	"item_recipe_ultimate_scepter"			"REMOVE"
	"item_ultimate_scepter"			"REMOVE"
	"item_recipe_refresher"			"REMOVE"
	"item_refresher"			"REMOVE"
	"item_recipe_assault"			"REMOVE"
	"item_assault"			"REMOVE"
	"item_recipe_heart"			"REMOVE"
	"item_heart"			"REMOVE"
	"item_recipe_black_king_bar"			"REMOVE"
	"item_black_king_bar"			"REMOVE"
	"item_aegis"			"REMOVE"
	"item_recipe_shivas_guard"			"REMOVE"
	"item_shivas_guard"			"REMOVE"
	"item_recipe_bloodstone"			"REMOVE"
	"item_bloodstone"			"REMOVE"
	"item_recipe_sphere"			"REMOVE"
	"item_sphere"			"REMOVE"
	"item_recipe_reflex_energy_regen_booster"			"REMOVE"
	"item_vanguard"			"REMOVE"
	"item_recipe_blade_mail"			"REMOVE"
	"item_blade_mail"			"REMOVE"
	"item_recipe_soul_booster"			"REMOVE"
	"item_soul_booster"			"REMOVE"
	"item_recipe_hood_of_defiance"			"REMOVE"
	"item_hood_of_defiance"			"REMOVE"
	"item_recipe_rapier"			"REMOVE"
	"item_rapier"			"REMOVE"
	"item_recipe_monkey_king_bar"			"REMOVE"
	"item_monkey_king_bar"			"REMOVE"
	"item_recipe_radiance"			"REMOVE"
	"item_radiance"			"REMOVE"
	"item_recipe_butterfly"			"REMOVE"
	"item_butterfly"			"REMOVE"
	"item_recipe_greater_crit"			"REMOVE"
	"item_greater_crit"			"REMOVE"
	"item_recipe_basher"			"REMOVE"
	"item_basher"			"REMOVE"
	"item_recipe_bfury"			"REMOVE"
	"item_bfury"			"REMOVE"
	"item_recipe_manta"			"REMOVE"
	"item_manta"			"REMOVE"
	"item_recipe_lesser_crit"			"REMOVE"
	"item_lesser_crit"			"REMOVE"
	"item_recipe_armlet"			"REMOVE"
	"item_armlet"			"REMOVE"
	"item_recipe_invis_sword"			"REMOVE"
	"item_invis_sword"			"REMOVE"
	"item_recipe_sange_and_yasha"			"REMOVE"
	"item_sange_and_yasha"			"REMOVE"
	"item_recipe_satanic"			"REMOVE"
	"item_satanic"			"REMOVE"
	"item_recipe_mjollnir"			"REMOVE"
	"item_mjollnir"			"REMOVE"
	"item_recipe_skadi"			"REMOVE"
	"item_skadi"			"REMOVE"
	"item_recipe_sange"			"REMOVE"
	"item_sange"			"REMOVE"
	"item_recipe_helm_of_the_dominator"			"REMOVE"
	"item_helm_of_the_dominator"			"REMOVE"
	"item_recipe_maelstrom"			"REMOVE"
	"item_maelstrom"			"REMOVE"
	"item_recipe_desolator"			"REMOVE"
	"item_desolator"			"REMOVE"
	"item_recipe_yasha"			"REMOVE"
	"item_yasha"			"REMOVE"
	"item_recipe_mask_of_madness"			"REMOVE"
	"item_mask_of_madness"			"REMOVE"
	"item_recipe_diffusal_blade"			"REMOVE"
	"item_recipe_diffusal_blade_2"			"REMOVE"
	"item_diffusal_blade"			"REMOVE"
	"item_diffusal_blade_2"			"REMOVE"
	"item_recipe_ethereal_blade"			"REMOVE"
	"item_ethereal_blade"			"REMOVE"
	"item_recipe_soul_ring"			"REMOVE"
	"item_soul_ring"			"REMOVE"
	"item_recipe_arcane_boots"			"REMOVE"
	"item_arcane_boots"			"REMOVE"
	"item_orb_of_venom"			"REMOVE"
	"item_recipe_ancient_janggo"			"REMOVE"
	"item_ancient_janggo"			"REMOVE"
	"item_recipe_medallion_of_courage"			"REMOVE"
	"item_medallion_of_courage"			"REMOVE"
	"item_smoke_of_deceit"			"REMOVE"
	"item_recipe_veil_of_discord"			"REMOVE"
	"item_veil_of_discord"			"REMOVE"
	"item_recipe_rod_of_atos"			"REMOVE"
	"item_rod_of_atos"			"REMOVE"
	"item_recipe_abyssal_blade"			"REMOVE"
	"item_abyssal_blade"			"REMOVE"
	"item_recipe_heavens_halberd"			"REMOVE"
	"item_heavens_halberd"			"REMOVE"
	"item_recipe_ring_of_aquila"			"REMOVE"
	"item_ring_of_aquila"			"REMOVE"
	"item_recipe_tranquil_boots"			"REMOVE"
	"item_tranquil_boots"			"REMOVE"
	"item_shadow_amulet"			"REMOVE"
	"item_halloween_candy_corn"			"REMOVE"
	"item_mystery_hook"			"REMOVE"
	"item_mystery_arrow"			"REMOVE"
	"item_mystery_missile"			"REMOVE"
	"item_mystery_toss"			"REMOVE"
	"item_mystery_vacuum"			"REMOVE"
	"item_halloween_rapier"			"REMOVE"
	"item_greevil_whistle"			"REMOVE"
	"item_greevil_whistle_toggle"			"REMOVE"
	"item_present"			"REMOVE"
	"item_winter_stocking"			"REMOVE"
	"item_winter_skates"			"REMOVE"
	"item_winter_cake"			"REMOVE"
	"item_winter_cookie"			"REMOVE"
	"item_winter_coco"			"REMOVE"
	"item_winter_ham"			"REMOVE"
	"item_winter_kringle"			"REMOVE"
	"item_winter_mushroom"			"REMOVE"
	"item_winter_greevil_treat"			"REMOVE"
	"item_winter_greevil_garbage"			"REMOVE"
	"item_winter_greevil_chewy"			"REMOVE"
}
```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869707172737475767778798081828384858687888990919293949596979899100101102103104105106107108109110111112113114115116117118119120121122123124125126127128129130131132133134135136137138139140141142143144145146147148149150151152153154155156157158159160161162163164165166167168169170171172173174175176177178179180181182183184185186187188189190191192193194195196197198199200201202203204205206207208209210211212213214215216217218219220221222223224225226227228229230231232233234235236237238239240241242
## Cosmetic Values: Models, Effects, Tags and others. ​

These values are optional but greatly improve the quality of your item

### Sounds when Picked, Dropped ​

```javascript
"UIPickupSound" "Item.PickUpRingShop" //Sound when acquiring the item
"UIDropSound" "Item.DropRecipeShop" //Sound when dropping the item manually
"WorldDropSound" "Item.DropGemWorld" //Sound when dropping the item on death (?)
```
123
### Model and Glow in the world. ​

VMDL and Particle files can be seen through the [Asset Browser]

```javascript
"Model" "models/chest_worlddrop.vmdl"
"Effect" "particles/generic_gameplay/dropped_item.vpcf"
```
12
You can find good models in /props_gameplay, /econ or use your own customs

Important: If you create the item through lua [CreateItemOnPositionSync], you need to provide vision of the world position where the item is being created, at least briefly, to properly display the particle effect.

### Change the displayed color of the item ​

```javascript
"ItemQuality"    "artifact" //Orange
                 "epic" //Purple
                 "rare" //Blue
                 "common" //Green
                 "component" //White
                 "consumable" //White
```
123456
### Tags & Alias ​

Tags are defined in addon_english.txt, find them in [dota_english] under // Tags Aliases help the search bar to find the item quickly with abbreviations

```javascript
"ItemShopTags" "int;str;agi;mana_pool;health_pool;hard_to_tag"
"ItemAliases" "this;appears_in;search"
```
12
Omit to not announce.

```javascript
"ItemDeclarations" "DECLARE_PURCHASES_TO_TEAMMATES"
                   "DECLARE_PURCHASES_IN_SPEECH"
                   "DECLARE_PURCHASES_TO_SPECTATORS"
```
123
### Restrictions ​

This is how Basher is disallowed for certain heroes

```javascript
"InvalidHeroes" "npc_dota_hero_spirit_breaker;npc_dota_hero_faceless_void"
```
1
For the Scripted, more powerful version, read more on Item Restrictions & Requirements

## Alt-Click ​

Alt-click text on items in Inventory and dropped on the ground. Takes the strings from resource/addon_english.txt or any other languages.

### PingOverrideText ​

Overrides the default "[ALLIES] ItemName dropped here". It will look for #DOTA_Chat_Text_String (Text_String can be whatever) in your addon strings.

In the item_datadriven:

```javascript
"PingOverrideText" "DOTA_Chat_Text_String"
```
1
In addon_english.txt:

```javascript
"DOTA_Chat_Text_String" "[VOLVO] Giff"
```
1
### ItemAlertable ​

Displays "[ALLIES] Gather for ItemName here."

```javascript
"ItemAlertable"	"1"
```
1
## Basic Item Skeleton ​

Copy this to start an item

```javascript
"item_custom"
{
    "ID"           "1100"
    "BaseClass"    "item_datadriven"
    "AbilityTextureName" "item_rapier"
    "Model"        "models/props_gameplay/recipe.vmdl"
    "Effect"       "particles/generic_gameplay/dropped_item.vpcf"
    "ItemQuality"  "artifact"

    "ItemCost"     "322"
    "ItemKillable" "0"
    "ItemSellable" "1"
    "ItemPurchasable" "1"
    "ItemDroppable" "1"
    "ItemShareability" "ITEM_NOT_SHAREABLE"

    "SideShop"     "1"
    "SecretShop"   "0"

    "ItemStackable" "1"
    "ItemPermanent" "1"
    "ItemDisassembleRule" "DOTA_ITEM_DISASSEMBLE_ALWAYS"

    "AbilitySpecial"
    {
        "01"
        {
            "var_type"      "FIELD_INTEGER"
            "bonus_stat"    "100"
        }
    }

    "Modifiers"
    {
        "modifier_item_custom"
        {
            "Passive"  "1"
            "IsHidden" "1"
            "Attributes" "MODIFIER_ATTRIBUTE_MULTIPLE"
            "Properties"
            {
                "MODIFIER_PROPERTY_STATS_STRENGTH_BONUS" "%bonus_stat"
            }
        }
    }
}
```
12345678910111213141516171819202122232425262728293031323334353637383940414243444546
Those are the most important values. For Charges, Upgrades, Sounds, Aliases & Declarations add the lines explained before, I kept them out of the basic layout because they aren't needed for most items.

I also added a very basic passive Modifier which takes the bonus_stat from AbilitySpecial to give 1 Strength bonus. Using AbilitySpecial makes it easier to make tooltips and adjust item values later without having to change said tooltips.

## Adding More Stats ​

Every value from Modifier Constants can be added to the "Properties" block, some very common examples are:

```javascript
"Properties"
    {
        "MODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT" "%bonus_attackspeed"
        "MODIFIER_PROPERTY_STATS_STRENGTH_BONUS" "%bonus_str"
        "MODIFIER_PROPERTY_STATS_AGILITY_BONUS" "%bonus_agi"
        "MODIFIER_PROPERTY_STATS_INTELLECT_BONUS" "%bonus_int"
        "MODIFIER_PROPERTY_HEALTH_BONUS"    "%bonus_hp"
        "MODIFIER_PROPERTY_HEALTH_REGEN_CONSTANT" "%bonus_health_regen"
        "MODIFIER_PROPERTY_MANA_BONUS"  "%bonus_hp"
        "MODIFIER_PROPERTY_MANA_REGEN_PERCENTAGE"  "%bonus_mana_regen"
        "MODIFIER_PROPERTY_BASEDAMAGEOUTGOING_PERCENTAGE"   "%bonus_damage_percent"
    }
```
123456789101112
## Charged Consumables ​

### Tome of Stats ​

item_tome_of_knowledge

### Potion of Health ​

item_potion_of_healing

### Summons ​

item_demonic_figurine

## Upgradeable Items and Recipes ​

- See Reflex

Apart from these values, item code uses the same datadriven values as abilities. See the DataDriven Ability Breakdown.

## Passives ​

### Auras ​

"AbilityBehavior" "DOTA_ABILITY_BEHAVIOR_AURA | DOTA_ABILITY_BEHAVIOR_PASSIVE"

In a modifier block:

```javascript
"Aura"  "custom_aura"
    "Aura_Teams"    "DOTA_UNIT_TARGET_TEAM_FRIENDLY"
    "Aura_Radius"   "%radius"
    "Aura_Types"    "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC"
    "Aura_Flags" "DOTA_UNIT_TARGET_FLAG_RANGED_ONLY"
```
12345
Then have a new modifier block with the Aura name with the desired effects.

### Damage over time ​

Inside a modifier, use "ThinkInterval" "1" and have a "OnIntervalThink" block in which you do damage.

```javascript
"ThinkInterval" "1"
    "OnIntervalThink"
    {
        "Damage"
        {
             "Target"
             {
                 "Center" "CASTER"
                 "Radius" "%radius"
                 "Teams" "DOTA_UNIT_TARGET_TEAM_ENEMY"
                 "Types" "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC"
             }
             "Type" "DAMAGE_TYPE_MAGICAL"
             "Damage"   "%damage_per_second"
        }
    }
```
12345678910111213141516
### Cleave ​

Inside a modifier. Keep in mind this will work on ranged, so you need to restrict it when applying this modifier if you need.

```javascript
"OnAttackLanded"
    {
        "CleaveAttack"
        {
            "CleavePercent" "10"
            "CleaveRadius"  "140"
            "CleaveEffect"  "particles/units/heroes/hero_sven/sven_spell_great_cleave.vpcf"
        }
    }
```
123456789
### Crit ​

There is a MODIFIER_PROPERTY_PREATTACK_CRITICALSTRIKE Property but this doesn't include a chance, so you need to use a DataDriven Random when starting the attack, and applying a modifier that has the crit, removing it later OnAttackLanded.

The first RemoveModifier is added to disable people from canceling attacks to get a guaranteed crit.

```javascript
"modifier_crit"
{
    "Passive"   "1"
    "IsHidden"  "1"
    "OnAttackStart"
    {
        "RemoveModifier"
        {
            "ModifierName" "crit"
            "Target" "CASTER"
        }
        "Random"
        {
            "Chance" "%crit_chance"
            "OnSuccess"
            {
                "ApplyModifier"
                {
                    "ModifierName" "crit"
                    "Target"    "CASTER"
                }
            }
        }
    }
}

"crit"
{
    "IsHidden"  "1"
    "Properties"
    {
        "MODIFIER_PROPERTY_PREATTACK_CRITICALSTRIKE" "%crit_bonus"
    }

    "OnAttackLanded"
    {
        "RemoveModifier"
        {
            "ModifierName"  "crit"
            "Target"    "CASTER"
        }

        // Basic blood particle effect
        "FireEffect"
        {
            "EffectName" "particles/units/heroes/hero_phantom_assassin/phantom_assassin_crit_impact.vpcf"
            "EffectAttachType"  "follow_origin"
            "Target"    "TARGET"
        }
    }
}
```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051
### Orb: Slow and Lifesteal with custom projectile ​

```javascript
"modifier_orb_of_frost"
{
    "Passive" "1"
    "IsHidden"  "1"
    "Attributes"    "MODIFIER_ATTRIBUTE_MULTIPLE"
    "Properties"
    {
        "MODIFIER_PROPERTY_BASEATTACK_BONUSDAMAGE" "6"
    }

    "Orb"
    {
        "Priority"  "DOTA_ORB_PRIORITY_ABILITY"
        "ProjectileName" "particles\items2_fx\skadi_projectile.vpcf"
    }

    "OnOrbImpact"
    {
        "Lifesteal"
        {
            "Target"    "ATTACKER"
            "LifestealPercent" "%bonus_lifesteal"
        }

        "ApplyModifier"
        {
            "Target"    "TARGET"
            "ModifierName"  "modifier_orb_of_frost_slow"
            "Duration"  "%slow_duration"
        }
    }
}

"modifier_orb_of_frost_slow"
{
    "IsDebuff" "1"
    "Duration"  "3"
    "Properties"
    {
        "MODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE"  "%move_speed_slow"
        "MODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT"  "%attack_speed_slow"
    }
    "EffectName"    "particles/generic_gameplay/generic_slowed_cold.vpcf"
    "EffectAttachType" "attach_hitloc"
    "Target" "TARGET"
}
```
12345678910111213141516171819202122232425262728293031323334353637383940414243444546
Note: DataDriven Lifesteal might steal from things you don't want to steal from, it's better done through lua.

### Block ​

This is a tricky one. Note that there are 2 modifiers again.

The first one has OnAttacked which randoms a block chance, OnSuccess it applies the block modifier, OnFailure it removes it. Inside the block_modifier, OnAttacked removes itself.

The OnCreated is just so it's possible to block the 1st hit after equiping the shield.

```javascript
"shield_modifier"
{
    "Passive" "1"
    "IsHidden" "1"
    "Properties"
    {
        "MODIFIER_PROPERTY_MAGICAL_RESISTANCE_BONUS" "%magic_resistance"
    }
    "OnCreated"
    {
        "Random"
        {
            "Chance" "%block_chance"
            "OnSuccess"
            {
                "ApplyModifier"
                {
                    "Target" "CASTER"
                    "ModifierName" "block_modifier"
                }
            }
        }
    }
    "OnAttacked"
    {
        "Random"
        {
            "Chance" "%block_chance"
            "OnSuccess"
            {
                "ApplyModifier"
                {
                    "Target" "CASTER"
                    "ModifierName" "block_modifier"
                }
            }
            "OnFailure"
            {
                "RemoveModifier"
                {
                    "Target" "CASTER"
                    "ModifierName" "block_modifier"
                }
            }
        }
    }
}

"block_modifier"
{
    "IsBuff" "1"
    "IsHidden" "1"
    "Properties"
    {
        "MODIFIER_PROPERTY_PHYSICAL_CONSTANT_BLOCK" "%damage_blocked"
    }
    "OnAttacked"
    {
        "RemoveModifier"
        {
            "Target" "CASTER"
            "ModifierName" "block_modifier"
        }
    }
}
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647484950515253545556575859606162636465

---

# The importance of AbilityValues values | ModDota

**Source:** https://moddota.com/abilities/the-importance-of-abilityvalues-values

---


# The importance of AbilityValues values ​

To specify numeric values, you can put in a number or you can use %name formatting to grab values out of the "AbilityValues" block of the ability. The advantage to using the %name syntax is that the value can change as the ability levels up and the numeric value can be formatted into tooltips.

When coding abilities or items, do not fall into the trap of replacing the use of AbilityValues variables with a constant (i.e. writing "Duration" "12", "MODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE" "-30" or doing similar assignations in lua scripts), thinking it will only be used once.

There are 2 problems with doing this

- Tooltips are hardIf you don't use AbilityValues for each variable, when you get to making the tooltips, you'll find it pretty much impossible to make quality dota-styled strings because your spell description needs to have direct copies of the values you've put in the ability. To make this worse, if you ever make a change to a static number in your datadriven ability, you will also need to update the addon_english.txt
- Consistency between Lua & Key ValuesChanging a key value won't only affect the datadriven but also the scripts and its easy to make a change and forget to extend this change to the .lua file. Doing proper references to the Specials also eliminates this problem.

TL;DR: Use as many AbilityValues values as possible, then modifying/balancing your abilities can be done just by changing these variables and it will extend to the rest of the game mode.


---

# Passing AbilityValues values into Lua | ModDota

**Source:** https://moddota.com/abilities/passing-abilityvalues-values-into-lua

---


# Passing AbilityValues values into Lua ​

Given this "AbilityValues" block in the ability:

```javascript
"AbilityValues"
{
  "radius" "300"
  "mana_per_second" "5 10 15 20"
}
```
12345
There are 2 functions to connect these with: GetSpecialValueFor and GetLevelSpecialValueFor. Both are applied over an ability.
lua
```javascript
local ability = event.ability
local radius = ability:GetSpecialValueFor("radius")
local mana_per_second = ability:GetLevelSpecialValueFor("mana_per_second", (ability:GetLevel() - 1))
```
123
The first one will get the value for the current level of the ability.

The second one will get the value for the specified level of the ability.

The first one is the most common and should be used every time, unless you need the value for a specific level.

Note the use of (ability:GetLevel() - 1) as the second parameter (which tells the script which level to take). This is needed because ability levels are 1-indexed but GetLevelSpecialValueFor is 0-indexed.


---

# AbilityDuration tooltips | ModDota

**Source:** https://moddota.com/abilities/abilityduration-tooltips

---


# AbilityDuration tooltips ​

TL;DR: AbilityDuration is a fairly useless keyvalue because whoever coded it forgot to make an automatic tooltip like with AbilityDamage. Use a "duration" AbilityValue and connect it with lua instead.

Imagine you want to have an ability apply a modifier for some seconds, duration changing with levels.

You can fall for the trap and do this:

```javascript
"AbilityDuration" "3 2 2"
```
1
And then have your modifier refer to %AbilityDuration in the "Duration" modifier key. All fine for now.

But when you want to indicate that your ability lasts for said duration, this AbilityDuration doesn't generate a "DURATION:" tooltip by itself, so you have 3 options:

Option 1. Write "Last 3 seconds at level 1 and then 2 at level 2 and 3" in the _Description.

This is bad for the reasons explained before.

Option 2*. Have a "duration" AbilityValue in addition to the AbilityDuration and keep both values synchronized.

Suboptimal but decent solution, as it allows you to use ability:GetAbilityDuration() which takes its value from AbilityDuration.

Option 3. Remove AbilityDuration, only keep the AbilityValue. Best way as far as I can tell.

```javascript
"AbilityValues"
{
  "duration" "3 2 2"
}
```
1234
And then do this in a Lua Script if needed.
lua
```javascript
function HowToTooltip(event)
   local ability = event.ability
   local duration = ability:GetLevelSpecialValueFor("duration", (ability:GetLevel() - 1))
   local damage = ability:GetAbilityDamage()
end
```
12345
Has the same results and works for every scenario.


---

# Simple Custom Ability | ModDota

**Source:** https://moddota.com/abilities/simple-custom-ability

---


# Simple Custom Ability ​

I have created a tutorial on making a simple custom ability here:


---

# Creating innate (available from level 1) abilities | ModDota

**Source:** https://moddota.com/abilities/creating-innate-abilities

---


# Creating innate (available from level 1) abilities ​

This article will guide you through creating an ability which is available to the given hero right away, like Earth Spirit's Stone Remnant. This guide assumes you already have an ability set up on a hero.

## Lua abilities ​

Lua abilities can define a Spawn method, that is invoked by the engine when ability is created.
lua
```javascript
my_innate_ability = my_innate_ability or {}
function my_innate_ability:Spawn()
    if IsServer() then
        self:SetLevel(1)
    end
end
```
123456
## Datadriven and builtin abilities ​

The plan is:

1. Subscribe to the hero spawn event
2. Determine if the spawned hero has a specific ability
3. Level it up

Okay. Since the entry point to every mod is the file addon_game_mode.lua go right there and find function Activate(). Activate is the function called on the very start of our custom game when all the players have loaded. We can subscribe to events using ListenToGameEvent.

Put the following code inside the Activate function:
lua
```javascript
ListenToGameEvent('npc_spawned', function(event)
    HandleNpcSpawned(event.entindex)
end, nil)
```
123
This code is subscribing to the npc_spawned event and then calling the HandleNpcSpawned function (we will create that later) with the spawned entity index. That entity index is provided to us in the event table when the event is triggered.

Let's create the HandleNpcSpawned function, put it in the same file just below Activate:
lua
```javascript
function HandleNpcSpawned(entityIndex)
    local entity = EntIndexToHScript(entityIndex)
    local innateAbilityName = "my_innate_ability"

    if entity:IsRealHero() and entity:HasAbility(innateAbilityName) then
        entity:FindAbilityByName(innateAbilityName):SetLevel(1)
    end
end
```
12345678
Let's go line by line here. After defining a function which accepts our entityIndex parameter we define a variable, which holds the actual entity. We turn entity index into an actual entity using EntIndexToHScript. Now we can call methods on our actual entity. First we declare our innate ability name for easier usage. Then we make a condition where we check that our entity is indeed a hero and that it has that ability. If all conditions hold true we get the handle of that ability and set it to level 1 right away.

That's it! Now all heroes who have my_innate_ability will automatically have it leveled up on spawn.


---

# Making any ability use charges | ModDota

**Source:** https://moddota.com/abilities/making-any-ability-use-charges

---


# Making any ability use charges ​

A guide/snippet which will help you to make any ability use charges like Shrapnel or Stone Caller.

First, save the following code with a name modifier_charges.lua to your vscripts folder (or any subfolder inside of it)
lua
```javascript
modifier_charges = class({})

if IsServer() then
    function modifier_charges:Update()
        if self:GetDuration() == -1 then
            self:SetDuration(self.kv.replenish_time, true)
            self:StartIntervalThink(self.kv.replenish_time)
        end

        if self:GetStackCount() == 0 then
            self:GetAbility():StartCooldown(self:GetRemainingTime())
        end
    end

    function modifier_charges:OnCreated(kv)
        self:SetStackCount(kv.start_count or kv.max_count)
        self.kv = kv

        if kv.start_count and kv.start_count ~= kv.max_count then
            self:Update()
        end
    end

    function modifier_charges:DeclareFunctions()
        local funcs = {
            MODIFIER_EVENT_ON_ABILITY_EXECUTED
        }

        return funcs
    end

    function modifier_charges:OnAbilityExecuted(params)
        if params.unit == self:GetParent() then
            local ability = params.ability

            if params.ability == self:GetAbility() then
                self:DecrementStackCount()
                self:Update()
            end
        end

        return 0
    end

    function modifier_charges:OnIntervalThink()
        local stacks = self:GetStackCount()

        if stacks < self.kv.max_count then
            self:SetDuration(self.kv.replenish_time, true)
            self:IncrementStackCount()

            if stacks == self.kv.max_count - 1 then
                self:SetDuration(-1, true)
                self:StartIntervalThink(-1)
            end
        end
    end
end

function modifier_charges:DestroyOnExpire()
    return false
end

function modifier_charges:IsPurgable()
    return false
end

function modifier_charges:RemoveOnDeath()
    return false
end
```
12345678910111213141516171819202122232425262728293031323334353637383940414243444546474849505152535455565758596061626364656667686970
Then, add an initialization line to your addon_game_mode.lua:
lua
```javascript
LinkLuaModifier("modifier_charges", LUA_MODIFIER_MOTION_NONE)
```
1
If your file is in a subfolder you can do it like this
lua
```javascript
LinkLuaModifier("modifier_charges", "subfolder/anothersubfolder/modifier_charges", LUA_MODIFIER_MOTION_NONE)
```
1
Gratz, you've successfully installed it!

Now you can add charges to any ability with this code:
lua
```javascript
unit:AddNewModifier(unit, unit:FindAbilityByName("ability_name"), "modifier_charges", {
    max_count = 2,
    start_count = 1,
    replenish_time = 6
})
```
12345
The settings in the end are pretty self-explanatory. You can omit the start_count if you want.

That's it.


---

# Calling Spells with SetCursor | ModDota

**Source:** https://moddota.com/abilities/calling-spells-with-setcursor

---


# Calling Spells with SetCursor ​

CDotaBaseAbility:OnSpellStart in combination with CDotaBaseNPC:SetCursorCastTarget and CDOTABaseNPC:SetCursorPosition are used to "Call" spells.

This is a powerful way to interact with Valve's spells in particular. This allows you to:

- Activate hidden abilities
- Ignore turn-restrictions
- Ignore castpoint or cooldown
- Ignore any other cruft associated with the formal spell-casting methods

This is easy to use, easy to configure and easy to think about. Here is an example that casts Tether on a hidden dummy unit, activated by a datadriven spell:
lua
```javascript
local tether = caster:FindAbilityByName("trollsandelves_hidden_tether")
tether:SetLevel(4)
tether:EndCooldown()
caster:SetCursorCastTarget(dummy)
tether:OnSpellStart()
```
12345

---

# Lua Item Tutorial | ModDota

**Source:** https://moddota.com/abilities/lua-item-tutorial

---


# Lua Item Tutorial ​

This tutorial is a walk-through of creating a completely new item with the new item_lua base class. For this first tutorial we create an upgrade from Blink Dagger to Blink Staff. How it will work is that when targeting any point on the ground it will work like Blink Dagger does, but if you target an allied unit you can 'tag' it to blink instead of you. We will also add passive bonuses from the item we will have in the recipe.

## Blink Staff ​

First open up your npc_items_custom.txt in your favourite text editor. If you don't have this file in your scripts/npc/ folder then create it and copy the following into it.

```javascript
"DOTAAbilities"
{
}
```
123
First and most important thing is naming your item. For this example I will use "item_blink_staff". Note that using the same name when referring to this item is important as dota 2 assumes some naming schemes. We will also setup unique ID for the item and a base class that tells the game that we are intending to create a lua item.

```javascript
"DOTAAbilities"
{
	"item_blink_staff"
	{
		"ID"							"1250" // anything above 1250 should be safe to use.
		"BaseClass"						"item_lua"
	}
}
```
12345678
Next we need an image for the item. For that we use "AbilityTextureName" as items classify as sort of abilities in dota 2. Its important that we have our image file in correct place and named correctly. For item in this example the file should be found from following path:

```javascript
dota 2 beta\game\dota_addons\{your addon name}\resource\flash3\images\items\blink_staff.png
```
1
note that the file name is 'blink_staff.png' instead of 'item_blink_staff.png'. This is because dota will read ability texture name of 'item_blink_staff' as 'item\blink_staff.png'It is also important to note that using same name for your ability texture is doubly important as the image in shop doesn't appear correctly if you use different name. The image I will be using for this item is this one:

```javascript
"DOTAAbilities"
{
	"item_blink_staff"
	{
		"ID"							"1250" // anything above 1250 should be safe to use.
		"BaseClass"						"item_lua"
		"AbilityTextureName"			"item_blink_staff"
	}
}
```
123456789
The last part we must add is link to the script file. You should create new *.lua file somewhere in your scripts/vscripts folder. You can even create sub-folder for it if you want to be organized. Now your npc_items_custom.txt should be something like this.

```javascript
"DOTAAbilities"
{
	"item_blink_staff"
	{
		"ID"							"1250" // anything above 1250 should be safe to use.
		"BaseClass"						"item_lua"
		"AbilityTextureName"			"item_blink_staff"
		"ScriptFile"					"lua_items/blink_staff/blink_staff.lua"
	}
}
```
12345678910
Truth of the lua items and abilities is that all you really need to define for them in lua file is their class table. So lets create that into our lua file:
lua
```javascript
if item_blink_staff == nil then
	item_blink_staff = class({})
end
```
123
IMPORTANT: Make sure you use same name as you defined in your npc_items_custom.txt Now next we want to define cooldown and mana cost for our blink staff. This can be done through npc_items_custom.txt or through lua. Note that everything we define through lua we can manipulate more dynamically. For example we could reduce cooldown by half during night time or double the mana cost if player has positive k/d ratio. Also advantage of defining them in npc_items_custom.txt is that what ever shows in the store (before player has the item) is the values defined there. Also currently there is issue that Manacost will always display the value defined by npc_items_custom.txt but the item will still grey(blue?)-out when your mana is lower than what is defined in lua for mana cost. Because we want things to look smooth lets define some basic parameters we can later over ride in lua as we like:

```javascript
"DOTAAbilities"
{
	"item_blink_staff"
	{
		"ID"							"1250" // anything above 1250 should be safe to use.
		"BaseClass"						"item_lua"
		"AbilityTextureName"			"item_blink_staff"
		"ScriptFile"					"lua_items/blink_staff/blink_staff.lua"
		// Casting
		//--------------------------------------------
		"AbilityCastRange"				"0" //We could define limit here but blink dagger has unlimited range to let player use it more efficiently. The range limiting comes in the script. 0 means unlimited.
		"AbilityCastPoint"				"0.3" //It's the wind up time of spell.
		"AbilityCooldown"				"10.0"
		"AbilityManaCost"				"50"
	}
}
```
12345678910111213141516
For more key-value stuff involving items use Noyas guide: Datadriven items

Its great reference but lets get on with the lua stuff!

## Defining Cast Rules ​

First we add behaviours. This will define what happens when player activates the hot-key of the item.
lua
```javascript
function item_blink_staff:GetBehavior()
	local behav = DOTA_ABILITY_BEHAVIOR_POINT + DOTA_ABILITY_BEHAVIOR_UNIT_TARGET + DOTA_ABILITY_BEHAVIOR_ROOT_DISABLES
	return behav
end
```
1234
The GetBehaviour() function is called by the engine when it needs to know how the ability should act on different occasions. The 'return' should return number 'int' value. Valve has made defining this easy for us by providing them as keys we can just sum together. These values take advantage of bit band where for example:

```javascript
Key ------ Value ------ Bytes
DOTA_ABILITY_BEHAVIOR_UNIT_TARGET ------ 8 ------ 01000
DOTA_ABILITY_BEHAVIOR_POINT ------ 16 ------ 10000
DOTA_ABILITY_BEHAVIOR_UNIT_TARGET + DOTA_ABILITY_BEHAVIOR_POINT ------ 24 ------ 11000
```
1234
As you can see in the bytes, while the value might look arbitrary, the bytes act like on/off switch of the behaviour. For available values for the behaviours use following link: https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Scripting/API#DOTA_ABILITY_BEHAVIOR

Next we add mana cost and cooldown.
lua
```javascript
function item_blink_staff:GetManaCost()
	return 50
end

function item_blink_staff:GetCooldown( nLevel )
	return 10
end
```
1234567
As items are defined like abilities the GetCooldown function has helper parameter for level of the ability. You can ignore it for items completely as the level will almost always be 1 (exception of corner cases like bkb or dagon.)

Now lets get to the actual spell casting part.

First we create OnSpellStart() function and define some initial keys to use in the script.
lua
```javascript
function item_blink_staff:OnSpellStart()
	local hCaster = self:GetCaster() --We will always have Caster.
	local hTarget = false --We might not have target so we make fail-safe so we do not get an error when calling - self:GetCursorTarget()
	if not self:GetCursorTargetingNothing() then
		hTarget = self:GetCursorTarget()
	end
	local vPoint = self:GetCursorPosition() --We will always have Vector for the point.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local nMaxBlink = 1200 --How far can we actually blink?
	local nClamp = 960 --If we try to over reach we use this value instead. (this is mechanic from blink dagger.)
end
```
1234567891011
Note that while we are in 'item_blink_staff' class we can use 'self' as quick reference to it. Now that we have our stuff set up lets start blinking our caster!
lua
```javascript
function item_blink_staff:OnSpellStart()
	local hCaster = self:GetCaster() --We will always have Caster.
	local hTarget = false --We might not have target so we make fail-safe so we do not get an error when calling - self:GetCursorTarget()
	if not self:GetCursorTargetingNothing() then
		hTarget = self:GetCursorTarget()
	end
	local vPoint = self:GetCursorPosition() --We will always have Vector for the point.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local nMaxBlink = 1200 --How far can we actually blink?
	local nClamp = 960 --If we try to over reach we use this value instead. (this is mechanic from blink dagger.)

	ProjectileManager:ProjectileDodge(hCaster)  --We disjoint disjointable incoming projectiles.
	ParticleManager:CreateParticle("particles/items_fx/blink_dagger_start.vpcf", PATTACH_ABSORIGIN, hCaster) --Create particle effect at our caster.
	hCaster:EmitSound("DOTA_Item.BlinkDagger.Activate") --Emit sound for the blink
	local vDiff = vPoint - vOrigin --Difference between the points
	if vDiff:Length2D() > nMaxBlink then  --Check caster is over reaching.
		vPoint = vOrigin + (vPoint - vOrigin):Normalized() * nClamp -- Recalculation of the target point.
	end
	hCaster:SetAbsOrigin(vPoint) --We move the caster instantly to the location
	FindClearSpaceForUnit(hCaster, vPoint, false) --This makes sure our caster does not get stuck
	ParticleManager:CreateParticle("particles/items_fx/blink_dagger_end.vpcf", PATTACH_ABSORIGIN, hCaster) --Create particle effect at our caster.
end
```
12345678910111213141516171819202122
IMPORTANT: We are using sounds and particle effects already precached by default. If you wish to use particle effects and sounds from other heroes or your custom ones then you have to do precaching for those resources. This is what our item should do right now:

## Cast on Allied ​

Now we are going to create the part that makes this item unique compared to Blink Dagger. First we add an if statement in our cast function that distinguishes how it should act depending on the target. At the same time we make sure that double tapping the item works like it does with Blink Dagger (self targeting blinks towards base).

Because this lua ability stuff still has some minor issues we have to return to our 'npc_items_custom.txt' file to add some targeting help. Just add the following to the item.

```javascript
"AbilityUnitTargetTeam"			"DOTA_UNIT_TARGET_TEAM_FRIENDLY"
		"AbilityUnitTargetType"			"DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC"
```
12
Now looking at our Lua code you can see that we can use most of our written blink code in multiple places. That's why we are going to change things around a bit like this:
lua
```javascript
function item_blink_staff:OnSpellStart()
	local hCaster = self:GetCaster() --We will always have Caster.
	local hTarget = false --We might not have target so we make fail-safe so we do not get an error when calling - self:GetCursorTarget()
	if not self:GetCursorTargetingNothing() then
		hTarget = self:GetCursorTarget()
	end
	local vPoint = self:GetCursorPosition() --We will always have Vector for the point.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local nMaxBlink = 1200 --How far can we actually blink?
	local nClamp = 960 --If we try to over reach we use this value instead. (this is mechanic from blink dagger.)
	self:Blink(hCaster, vPoint, nMaxBlink, nClamp)
end


function item_blink_staff:Blink(hTarget, vPoint, nMaxBlink, nClamp)
	local vOrigin = hTarget:GetAbsOrigin() --Our units's location
	ProjectileManager:ProjectileDodge(hTarget)  --We disjoint disjointable incoming projectiles.
	ParticleManager:CreateParticle("particles/items_fx/blink_dagger_start.vpcf", PATTACH_ABSORIGIN, hTarget) --Create particle effect at our caster.
	hTarget:EmitSound("DOTA_Item.BlinkDagger.Activate") --Emit sound for the blink
	local vDiff = vPoint - vOrigin --Difference between the points
	if vDiff:Length2D() > nMaxBlink then  --Check caster is over reaching.
		vPoint = vOrigin + (vPoint - vOrigin):Normalized() * nClamp -- Recalculation of the target point.
	end
	hTarget:SetAbsOrigin(vPoint) --We move the caster instantly to the location
	FindClearSpaceForUnit(hTarget, vPoint, false) --This makes sure our caster does not get stuck
	ParticleManager:CreateParticle("particles/items_fx/blink_dagger_end.vpcf", PATTACH_ABSORIGIN, hTarget) --Create particle effect at our caster.
end
```
123456789101112131415161718192021222324252627
Now we can just use the newly defined Blink function to blink our caster, and allies without writing it all again. Lets write the self cast now. We create IF statement first to check if we have hTarget. Then we check if the target is same as the caster or not. Also if we don't have hTarget we default to blinking ourselves. To get the location we want to blink towards we need to find some target location. For this we will use the fountain. (ent_dota_fountain)
lua
```javascript
function item_blink_staff:OnSpellStart()
	local hCaster = self:GetCaster() --We will always have Caster.
	local hTarget = false --We might not have target so we make fail-safe so we do not get an error when calling - self:GetCursorTarget()
	if not self:GetCursorTargetingNothing() then
		hTarget = self:GetCursorTarget()
	end
	local vPoint = self:GetCursorPosition() --We will always have Vector for the point.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local nMaxBlink = 1200 --How far can we actually blink?
	local nClamp = 960 --If we try to over reach we use this value instead. (this is mechanic from blink dagger.)
	if hTarget then
		if hCaster == hTarget then
			if not self.hFountain and not self.bNoFountain then --We check if we have ever tried finding the fountain before.
			local hFountain = Entities:FindByClassname(nil, "ent_dota_fountain") --Find first fountain
			local bFound = false --Make the boolean for while statement.
				while not bFound do
					if hFountain then --Is there a fountain entity?
						if hFountain:GetTeamNumber() == hCaster:GetTeamNumber() then -- Is it the right team?
							self.hFountain = hFountain --Store it so we don't have to trouble finding the foundtain again.
							bFound = true --Make sure while statement ends
						else
							hFountain = Entities:FindByClassname(hFountain, "ent_dota_fountain") --Find the next fountain if we didn't find the right team.
						end
					else
						self.bNoFountain = true --We have concluded that there is no fountain entity for this team. Lets not do that again!
						bFound = true --We could alternatively use 'Break' but I find this more funny.
					end
				end
			end
			if self.hFountain then --Do we have fountain?
				vPoint = self.hFountain:GetAbsOrigin() --Lets change our target location there then.
				self:Blink(hCaster, vPoint, nMaxBlink, nClamp) --BLINK!
			else
				self:EndCooldown()
				self:RefundManaCost()
			end
		end
	else
		self:Blink(hCaster, vPoint, nMaxBlink, nClamp) --BLINK!
	end
end
```
1234567891011121314151617181920212223242526272829303132333435363738394041
As you can see, this time we used while statement to go through all fountain entities and stored the results of our search into the ability. If it finds no entities it saves a boolean value so that it won't try to find fountain the next time. Also just like blink dagger if the target cannot be found the we won't blink at all.
Next we need to allow targeting allies with the spell but instead of blinking we store their id for next time we do "point" targeting on ground. There are few ways we can do this but It would be fair if we give them some sort of warning what is happening. So lets create two modifiers. One will simply be effect on target ally and one will be hidden modifier to store the target's entity index for short duration.
First we need to link our intended modifiers to the ability. Top of your blink staff lua file should look like this
lua
```javascript
if item_blink_staff == nil then
	item_blink_staff = class({})
end

LinkLuaModifier( "item_blink_staff_effect_modifier", "lua_items/blink_staff/effect_modifier.lua", LUA_MODIFIER_MOTION_NONE )
```
12345
Then we need our effect modifier file that was declared. For purposes of this tutorial we will use particle effect for armlet so we can skip precache again.
lua
```javascript
if item_blink_staff_effect_modifier == nil then
	item_blink_staff_effect_modifier = class({})
end

function item_blink_staff_effect_modifier:OnCreated( kv )
	if IsServer() then
		if self:GetCaster() ~= self:GetParent() then
			local nFXIndex = ParticleManager:CreateParticle("particles/items_fx/armlet.vpcf", PATTACH_ROOTBONE_FOLLOW, self:GetParent())
			self:AddParticle( nFXIndex, false, false, -1, false, false )
		end
	end
end

function item_blink_staff_effect_modifier:GetAttributes()
	return MODIFIER_ATTRIBUTE_MULTIPLE + MODIFIER_ATTRIBUTE_IGNORE_INVULNERABLE
end

function item_blink_staff_effect_modifier:IsHidden()
	if self:GetCaster() == self:GetParent() then
	return true
	else
	return false
	end
end
```
123456789101112131415161718192021222324
As you can see we for the first time used IsServer() function. This is used so some of the game logic is not ran multiple times (as some portions of the code is ran on both clients and server) Also for purposes of this tutorial we will use this same effect for both the caster and the target of the blink staff. We could create two modifiers but that would be wasteful. That's why we added some extra functionality to the modifier so we can distinguish if the target of the modifier is the caster or not. Also in case there are more than one blink staff in game we make sure there can be multiple modifiers of the same type on single unit.

Now we need to add the code that lets us add the modifier to the target and store that target's entity index to our modifier and when point casting retrieve the target again. For this tutorial we give player five seconds to recast. We also end cooldown and refund mana cost on ally target.
lua
```javascript
function item_blink_staff:OnSpellStart()
	local hCaster = self:GetCaster() --We will always have Caster.
	local hTarget = false --We might not have target so we make fail-safe so we do not get an error when calling - self:GetCursorTarget()
	if not self:GetCursorTargetingNothing() then
		hTarget = self:GetCursorTarget()
	end
	local vPoint = self:GetCursorPosition() --We will always have Vector for the point.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local nMaxBlink = 1200 --How far can we actually blink?
	local nClamp = 960 --If we try to over reach we use this value instead. (this is mechanic from blink dagger.)
	if hTarget then
		if hCaster == hTarget then
			if not self.hFountain and not self.bNoFountain then --We check if we have ever tried finding the fountain before.
			local hFountain = Entities:FindByClassname(nil, "ent_dota_fountain") --Find first fountain
			local bFound = false --Make the boolean for while statement.
				while not bFound do
					if hFountain then --Is there a fountain entity?
						if hFountain:GetTeamNumber() == hCaster:GetTeamNumber() then -- Is it the right team?
							self.hFountain = hFountain --Store it so we don't have to trouble finding the foundtain again.
							bFound = true --Make sure while statement ends
						else
							hFountain = Entities:FindByClassname(hFountain, "ent_dota_fountain") --Find the next fountain if we didn't find the right team.
						end
					else
						self.bNoFountain = true --We have concluded that there is no fountain entity for this team. Lets not do that again!
						bFound = true --We could alternatively use 'Break' but I find this more funny.
					end
				end
			end
			if self.hFountain then --Do we have fountain?
				vPoint = self.hFountain:GetAbsOrigin() --Lets change our target location there then.
				self:Blink(hCaster, vPoint, nMaxBlink, nClamp) --BLINK!
			else
				self:EndCooldown() --Cooldown refund if we could not find fountain on self cast
				self:RefundManaCost() --Manacost refund if we could not find fountain on self cast
			end
		else
			hTarget:AddNewModifier( hCaster, self, "item_blink_staff_effect_modifier", { duration = 5 } ) --lets add modifier to target
			hCaster:AddNewModifier( hCaster, self, "item_blink_staff_effect_modifier", { duration = 5 } ) --lets add modifier to caster
			local hModifier = hCaster:FindModifierByNameAndCaster("item_blink_staff_effect_modifier", hCaster) --find that modifier (they really should fix this by returning handle when adding new modifier.
			local nTargetIndex = hTarget:GetEntityIndex() --lets find the targets entity index
			hModifier:SetStackCount(nTargetIndex) --add that index to the modifier as it's stack count
			self:EndCooldown() --Cooldown refund so can cast again
			self:RefundManaCost() --Manacost refund
		end
	else

		local hModifier = hCaster:FindModifierByNameAndCaster("item_blink_staff_effect_modifier", hCaster) --Check if we have someone selected
		if hModifier then
			hTarget = EntIndexToHScript(hModifier:GetStackCount()) --Find the target with the ent index
			if hTarget:FindModifierByNameAndCaster("item_blink_staff_effect_modifier", hCaster) then --Check if the target is not purged.
				self:Blink(hTarget, vPoint, nMaxBlink, nClamp) --BLINK!
			else --Someone purged our target
			self:Blink(hCaster, vPoint, nMaxBlink, nClamp) --BLINK!
			end
		else
			self:Blink(hCaster, vPoint, nMaxBlink, nClamp) --BLINK!
		end
	end
end
```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960
Now there are two more things we need to do before we are done with our lua script. Right now this item has unlimited cast range for purposes of targeting allied unit. We also have issue of this item being abused when target does not want to be 'helped' by another. (Aka. Disable Help) Luckyly we have one tool for both of them: CastFilterResultTarget and GetCustomCastErrorTarget.Lets add following functions to our item's script:
lua
```javascript
function item_blink_staff:CastFilterResultTarget( hTarget ) -- hTarget is the targeted NPC.
	local hCaster = self:GetCaster() --We will always have Caster.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local vPoint = hTarget:GetAbsOrigin() --Our target's location
	local nMaxRange = 1200 --How far can we actually target?
	local vDiff = vPoint - vOrigin --Difference between the points
	local nTargetID = hTarget:GetPlayerOwnerID() --getting targets owner id
	local nCasterID = hCaster:GetPlayerOwnerID() --getting casters owner id
	if nTargetID and nCasterID then --making sure they both exist
		if PlayerResource:IsDisableHelpSetForPlayerID(nTargetID, nCasterID) then --target hates having caster help him out.
			return UF_FAIL_CUSTOM
		end
	end

	if vDiff:Length2D() > nMaxRange then  --Check caster is over reaching.
	return UF_FAIL_CUSTOM
	else
	return UF_SUCCESS
	end
end

function item_blink_staff:GetCustomCastErrorTarget( hTarget) -- hTarget is the targeted NPC.
	local hCaster = self:GetCaster() --We will always have Caster.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local vPoint = hTarget:GetAbsOrigin() --Our target's location
	local nMaxRange = 1200 --How far can we actually target?
	local vDiff = vPoint - vOrigin --Difference between the points
	local nTargetID = hTarget:GetPlayerOwnerID() --getting targets owner id
	local nCasterID = hCaster:GetPlayerOwnerID() --getting casters owner id
	if nTargetID and nCasterID then --making sure they both exist
		if PlayerResource:IsDisableHelpSetForPlayerID(nTargetID, nCasterID) then --target hates having caster help him out.
			return "#dota_hud_error_target_has_disable_help"
		end
	end
	if vDiff:Length2D() > nMaxRange then  --Check caster is over reaching.
	return "#dota_hud_error_target_out_of_range" --returning error from localization
	end
end
```
123456789101112131415161718192021222324252627282930313233343536373839
Now to save time and sanity you might want to add 'Special' values to your script. These are values you can modify easily without opening the script and searching for them there. This is extremely helpful when you use those values in multiple places. It also lets you display the values in your item description.First add following block to your item in 'npc_items_custom.txt'

```javascript
"AbilityValues"
		{
      "max_blink" "1200"
      "blink_clamp" "960"
      "help_range" "3000"
      "help_duration" "5.0"
		}
```
1234567
Now to use these values you use this function in your ability:
lua
```javascript
self:GetSpecialValueFor( "max_blink" )
```
1
Or in your modifier you have to get the handle for your ability first:
lua
```javascript
self:GetAbility():GetSpecialValueFor( "max_blink" )
```
1
Now we find and replace all those values with correct retrieval of a special value and we should end up with following result:
lua
```javascript
function item_blink_staff:OnSpellStart()
	local hCaster = self:GetCaster() --We will always have Caster.
	local hTarget = false --We might not have target so we make fail-safe so we do not get an error when calling - self:GetCursorTarget()
	if not self:GetCursorTargetingNothing() then
		hTarget = self:GetCursorTarget()
	end
	local vPoint = self:GetCursorPosition() --We will always have Vector for the point.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local nMaxBlink = self:GetSpecialValueFor( "max_blink" ) --How far can we actually blink?
	local nClamp = self:GetSpecialValueFor( "blink_clamp" ) --If we try to over reach we use this value instead. (this is mechanic from blink dagger.)
	if hTarget then
		if hCaster == hTarget then
			if not self.hFountain and not self.bNoFountain then --We check if we have ever tried finding the fountain before.
			local hFountain = Entities:FindByClassname(nil, "ent_dota_fountain") --Find first fountain
			local bFound = false --Make the boolean for while statement.
				while not bFound do
					if hFountain then --Is there a fountain entity?
						if hFountain:GetTeamNumber() == hCaster:GetTeamNumber() then -- Is it the right team?
							self.hFountain = hFountain --Store it so we don't have to trouble finding the foundtain again.
							bFound = true --Make sure while statement ends
						else
							hFountain = Entities:FindByClassname(hFountain, "ent_dota_fountain") --Find the next fountain if we didn't find the right team.
						end
					else
						self.bNoFountain = true --We have concluded that there is no fountain entity for this team. Lets not do that again!
						bFound = true --We could alternatively use 'Break' but I find this more funny.
					end
				end
			end
			if self.hFountain then --Do we have fountain?
				vPoint = self.hFountain:GetAbsOrigin() --Lets change our target location there then.
				self:Blink(hCaster, vPoint, nMaxBlink, nClamp) --BLINK!
			else
				self:EndCooldown() --Cooldown refund if we could not find fountain on self cast
				self:RefundManaCost() --Manacost refund if we could not find fountain on self cast
			end
		else
			hTarget:AddNewModifier( hCaster, self, "item_blink_staff_effect_modifier", { duration = self:GetSpecialValueFor( "help_duration" ) } ) --lets add modifier to target
			hCaster:AddNewModifier( hCaster, self, "item_blink_staff_effect_modifier", { duration = self:GetSpecialValueFor( "help_duration" ) } ) --lets add modifier to caster
			local hModifier = hCaster:FindModifierByNameAndCaster("item_blink_staff_effect_modifier", hCaster) --find that modifier (they really should fix this by returning handle when adding new modifier.
			local nTargetIndex = hTarget:GetEntityIndex() --lets find the targets entity index
			hModifier:SetStackCount(nTargetIndex) --add that index to the modifier as it's stack count
			self:EndCooldown() --Cooldown refund so can cast again
			self:RefundManaCost() --Manacost refund
		end
	else

		local hModifier = hCaster:FindModifierByNameAndCaster("item_blink_staff_effect_modifier", hCaster) --Check if we have someone selected
		if hModifier then
			hTarget = EntIndexToHScript(hModifier:GetStackCount()) --Find the target with the ent index
			if hTarget:FindModifierByNameAndCaster("item_blink_staff_effect_modifier", hCaster) then --Check if the target is not purged.
				self:Blink(hTarget, vPoint, nMaxBlink, nClamp) --BLINK!

			else --Someone purged our target
			self:Blink(hCaster, vPoint, nMaxBlink, nClamp) --BLINK!
			end
		else
			self:Blink(hCaster, vPoint, nMaxBlink, nClamp) --BLINK!
		end
	end
end


function item_blink_staff:Blink(hTarget, vPoint, nMaxBlink, nClamp)
	local vOrigin = hTarget:GetAbsOrigin() --Our units's location
	ProjectileManager:ProjectileDodge(hTarget)  --We disjoint disjointable incoming projectiles.
	ParticleManager:CreateParticle("particles/items_fx/blink_dagger_start.vpcf", PATTACH_ABSORIGIN, hTarget) --Create particle effect at our caster.
	hTarget:EmitSound("DOTA_Item.BlinkDagger.Activate") --Emit sound for the blink
	local vDiff = vPoint - vOrigin --Difference between the points
	if vDiff:Length2D() > nMaxBlink then  --Check caster is over reaching.
		vPoint = vOrigin + (vPoint - vOrigin):Normalized() * nClamp -- Recalculation of the target point.
	end
	hTarget:SetAbsOrigin(vPoint) --We move the caster instantly to the location
	FindClearSpaceForUnit(hTarget, vPoint, false) --This makes sure our caster does not get stuck
	ParticleManager:CreateParticle("particles/items_fx/blink_dagger_end.vpcf", PATTACH_ABSORIGIN, hTarget) --Create particle effect at our caster.
end

function item_blink_staff:CastFilterResultTarget( hTarget ) -- hTarget is the targeted NPC.
	local hCaster = self:GetCaster() --We will always have Caster.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local vPoint = hTarget:GetAbsOrigin() --Our target's location
	local nMaxRange = self:GetSpecialValueFor( "help_range" ) --How far can we actually target?
	local vDiff = vPoint - vOrigin --Difference between the points
	local nTargetID = hTarget:GetPlayerOwnerID() --getting targets owner id
	local nCasterID = hCaster:GetPlayerOwnerID() --getting casters owner id
	if nTargetID and nCasterID then --making sure they both exist
		if PlayerResource:IsDisableHelpSetForPlayerID(nTargetID, nCasterID) then --target hates having caster help him out.
			return UF_FAIL_CUSTOM
		end
	end

	if vDiff:Length2D() > nMaxRange then  --Check caster is over reaching.
	return UF_FAIL_CUSTOM
	else
	return UF_SUCCESS
	end
end

function item_blink_staff:GetCustomCastErrorTarget( hTarget) -- hTarget is the targeted NPC.
	local hCaster = self:GetCaster() --We will always have Caster.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local vPoint = hTarget:GetAbsOrigin() --Our target's location
	local nMaxRange = self:GetSpecialValueFor( "help_range" ) --How far can we actually target?
	local vDiff = vPoint - vOrigin --Difference between the points
	local nTargetID = hTarget:GetPlayerOwnerID() --getting targets owner id
	local nCasterID = hCaster:GetPlayerOwnerID() --getting casters owner id
	if nTargetID and nCasterID then --making sure they both exist
		if PlayerResource:IsDisableHelpSetForPlayerID(nTargetID, nCasterID) then --target hates having caster help him out.
			return "#dota_hud_error_target_has_disable_help"
		end
	end
	if vDiff:Length2D() > nMaxRange then  --Check caster is over reaching.
	return "#dota_hud_error_target_out_of_range" --returning error from localization
	end
end
```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869707172737475767778798081828384858687888990919293949596979899100101102103104105106107108109110111112113114115116
Now if we want to make sure the consistency between npc_items_custom.txt and our lua file is complete we can use self.BaseClass for things like cooldown or castrange. Lets replace our mana cost and cooldown functions to see how it works.
lua
```javascript
function item_blink_staff:GetManaCost()
	return self.BaseClass.GetManaCost( self, nLevel )
end

function item_blink_staff:GetCooldown( nLevel )
	return self.BaseClass.GetCooldown( self, nLevel )
end
```
1234567
Now all we need to do is make localization for the item. In your 'dota 2 beta\game\dota_addons{addon name}\resource' folder you should have addon_english.txtIf you are using some different language you might use differently named file. But all languages defaults to english if others fail. Open it up and lets add following lines to the mix.

```javascript
"DOTA_Tooltip_ability_item_blink_staff"                                           "Blink Staff"
		"DOTA_Tooltip_ability_item_blink_staff_Description"                               "Teleport to a target point up to 1200 units away. Can be used on allied units to select them to blink instead of you."
		"DOTA_Tooltip_ability_item_blink_staff_max_blink"                                 "Max Blink Distance:"
		"DOTA_Tooltip_ability_item_blink_staff_help_range"                                "Help Range:"

		"DOTA_Tooltip_item_blink_staff_effect_modifier"                                             "Blink Staff"
		"DOTA_Tooltip_item_blink_staff_effect_modifier_Description"                                 "Targeted by Blink Staff"
```
12345678
Lets see what we have now:

Now there are still some things we need to do but first lets fix the most obvious problem. Currently there is a bug where the: "AbilityUnitTargetTeam" "DOTA_UNIT_TARGET_TEAM_FRIENDLY" Is ignored! We can fix it by adding team check to our cast filters:
lua
```javascript
function item_blink_staff:CastFilterResultTarget( hTarget ) -- hTarget is the targeted NPC.
	local hCaster = self:GetCaster() --We will always have Caster.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local vPoint = hTarget:GetAbsOrigin() --Our target's location
	local nMaxRange = self:GetSpecialValueFor( "help_range" ) --How far can we actually target?
	local vDiff = vPoint - vOrigin --Difference between the points
	local nTargetID = hTarget:GetPlayerOwnerID() --getting targets owner id
	local nCasterID = hCaster:GetPlayerOwnerID() --getting casters owner id
	if hCaster:GetTeamNumber() ~= hTarget:GetTeamNumber() then
		return UF_FAIL_CUSTOM
	end
	if nTargetID and nCasterID then --making sure they both exist
		if PlayerResource:IsDisableHelpSetForPlayerID(nTargetID, nCasterID) then --target hates having caster help him out.
			return UF_FAIL_CUSTOM
		end
	end

	if vDiff:Length2D() > nMaxRange then  --Check caster is over reaching.
	return UF_FAIL_CUSTOM
	else
	return UF_SUCCESS
	end
end

function item_blink_staff:GetCustomCastErrorTarget( hTarget) -- hTarget is the targeted NPC.
	local hCaster = self:GetCaster() --We will always have Caster.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local vPoint = hTarget:GetAbsOrigin() --Our target's location
	local nMaxRange = self:GetSpecialValueFor( "help_range" ) --How far can we actually target?
	local vDiff = vPoint - vOrigin --Difference between the points
	local nTargetID = hTarget:GetPlayerOwnerID() --getting targets owner id
	local nCasterID = hCaster:GetPlayerOwnerID() --getting casters owner id
	if hCaster:GetTeamNumber() ~= hTarget:GetTeamNumber() then
		return "#dota_hud_error_cant_cast_on_enemy"
	end
	if nTargetID and nCasterID then --making sure they both exist
		if PlayerResource:IsDisableHelpSetForPlayerID(nTargetID, nCasterID) then --target hates having caster help him out.
			return "#dota_hud_error_target_has_disable_help"
		end
	end
	if vDiff:Length2D() > nMaxRange then  --Check caster is over reaching.
	return "#dota_hud_error_target_out_of_range" --returning error from localization
	end
end
```
123456789101112131415161718192021222324252627282930313233343536373839404142434445
Problem with this method is that its easier for user to blink towards the enemy rather than even try 'helping' him/her. But in this tutorial we assume you can figure out yourself how to edit the code to blink when caster and target have different teams using the cast filter changes as example. Now the thing that makes blink dagger less as efficient as escape tool is it's Cooldown when hurt. Lets add that in! To do that we create Intrinsic modifier. Lets link our new modifier:
lua
```javascript
LinkLuaModifier( "item_blink_staff_passive_modifier", "lua_items/blink_staff/passive_modifier.lua", LUA_MODIFIER_MOTION_NONE )
function item_blink_staff:GetIntrinsicModifierName()
	return "item_blink_staff_passive_modifier"
end
```
1234
Now create our declared lua file for it and its contents should be something like this:
lua
```javascript
if item_blink_staff_passive_modifier == nil then
	item_blink_staff_passive_modifier = class({})
end

function item_blink_staff_passive_modifier:IsHidden()
	return true --we want item's passive abilities to be hidden most of the times
end

function item_blink_staff_passive_modifier:DeclareFunctions() --we want to use these functions in this item
	local funcs = {
		MODIFIER_EVENT_ON_TAKEDAMAGE
	}

	return funcs
end

function item_blink_staff_passive_modifier:OnTakeDamage( params ) --When ever the unit takes damage this is called
	if IsServer() then --this should be only run on server.
		local hAbility = self:GetAbility() --we get the ability where this modifier is from
		if params.attacker ~= self:GetParent() and params.unit == self:GetParent() and  params.attacker:IsHero()  then
		hAbility:StartCooldown(hAbility:GetSpecialValueFor( "hurt_cooldown" )) --we start the cooldown
		end
	end
end
```
123456789101112131415161718192021222324
As you can see used declare functions to tell the game what to expect from this modifier. This makes sure the game doesn't check this modifier with every event that might be affected. We also added new special value for cooldown when caster gets hurt. Remember to add that to your 'npc_items_custom.txt' as float value preferably.

```javascript
"05"
			{
				"var_type"				"FIELD_FLOAT"
				"hurt_cooldown"			"3.0"
			}
```
12345
Now we should have covered all the main issues. Next we add recipe for the item and add stats from the components.

## Recipe and Stats ​

As you might have noticed testing our item, it right now costs no gold to purchase. There are two things we can do here. We can either add ItemCost into our 'npc_items_custom.txt' file or create a recipe for the item. When you create a recipe for your item the game automatically calculates the item cost. We can also add ItemCost to our new recipe to let the game know that you have to buy it aswell instead of items being automatically combined into one. We are also adding the stats from our component items so be sure to add special values to your item reflecting the component stats.

I will be using item_quarterstaff, item_robe and item_blink for my components. I also make the recipe cost 325 gold. One important thing to note when creating recipe is the naming scheme. The recipe name should always be 'item_recipe_your_item' my item: item_blink_staff my recipe: item_recipe_blink_staff Also you must give each item in npc_items_custom.txt unique ID. If you don't you may find odd bugs like item not being purchasable. Here is my current entries in npc_items_custom.txt

```javascript
"item_blink_staff"
	{
		"ID"							"1250"
		"BaseClass"						"item_lua"
		"ScriptFile"					"lua_items/blink_staff/blink_staff.lua"
		"AbilityTextureName"			"item_blink_staff"
		"AbilityUnitTargetTeam"			"DOTA_UNIT_TARGET_TEAM_FRIENDLY"
		"AbilityUnitTargetType"			"DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC"
		"AbilityCastRange"				"0"
		"AbilityCastPoint"				"0.3"
		"AbilityCooldown"				"10.0"
		"AbilityManaCost"				"50"
		//// Item Info
		////-------------------------------------------------------------------------------------------------------------
		"ItemCost"						"3900"
		"ItemShopTags"					"blink;staff"
		"ItemQuality"					"rare"
		"ItemAliases"					"blink;staff"
    //
		"AbilityValues"
		{
      // Blink
      "max_blink" "1200"
      "blink_clamp" "960"
      "help_range" "3000"
      "help_duration" "5.0"
      "hurt_cooldown" "3.0"

			// Quearterstaff
      "bonus_damage" "10"
      "bonus_attack_speed" "10"

      // Robe Of Magi
      "bonus_int" "6"
		}
	}

	"item_recipe_blink_staff"
	{
		// General
		//-------------------------------------------------------------------------------------------------------------
		"BaseClass"                     "item_datadriven"
		"ID"							"1251"

		// Item Info
		//-------------------------------------------------------------------------------------------------------------
		"ItemCost"						"325"
		"ItemShopTags"					""

		// Recipe
		//-------------------------------------------------------------------------------------------------------------
		"ItemRecipe"					"1"
		"ItemResult"					"item_blink_staff"
		"ItemRequirements"
		{
			"01"						"item_quarterstaff;item_robe;item_blink"
		}
	}
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647484950515253545556575859
Notice that the item requirements part lists the items you need. For valve defined ones use this as reference:  https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Scripting/Built-In_Item_Names  Also notice how the first entry is defined "01" . This is because you can create recipe that can be used with different sets of components. This is used by valve in Power Threads where you can use any of the basic 450 costing attribute items. Now while we have defined special values for our blink staff stats, we have not actually used those values anywhere. Lets get back to our blink staff passive modifier lua file we used for the cooldown when taking damage. Here we have to declare new functions for the stats we need.
lua
```javascript
function item_blink_staff_passive_modifier:DeclareFunctions() --we want to use these functions in this item
	local funcs = {
		MODIFIER_EVENT_ON_TAKEDAMAGE,
		MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE,
		MODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT,
		MODIFIER_PROPERTY_STATS_INTELLECT_BONUS
	}

	return funcs
end
```
12345678910
Now that we have declared what we want to effect in game with this modifier lets add functions the game can call on the correct events.
lua
```javascript
function item_blink_staff_passive_modifier:GetModifierBonusStats_Intellect()
	local hAbility = self:GetAbility() --we get the ability where this modifier is from
	return hAbility:GetSpecialValueFor( "bonus_int" )
end

function item_blink_staff_passive_modifier:GetModifierAttackSpeedBonus_Constant()
	local hAbility = self:GetAbility() --we get the ability where this modifier is from
	return hAbility:GetSpecialValueFor( "bonus_attack_speed" )
end

function item_blink_staff_passive_modifier:GetModifierPreAttack_BonusDamage()
	local hAbility = self:GetAbility() --we get the ability where this modifier is from
	return hAbility:GetSpecialValueFor( "bonus_damage" )
end
```
1234567891011121314
Now last thing we need to do is tell player about the awe-inspiring stats this item gives them. Lets add our new stats to the addon_english.txt After that our file should have something like this:

```javascript
"DOTA_Tooltip_ability_item_blink_staff"                                           "Blink Staff"
		"DOTA_Tooltip_ability_item_blink_staff_Description"                               "Teleport to a target point up to 1200 units away. Can be used on allied units to select them to blink instead of you."
		"DOTA_Tooltip_ability_item_blink_staff_max_blink"                                 "Max Blink Distance:"
		"DOTA_Tooltip_ability_item_blink_staff_help_range"                                "Help Range:"
		"DOTA_Tooltip_ability_item_blink_staff_bonus_damage"                              "+$damage"
		"DOTA_Tooltip_ability_item_blink_staff_bonus_attack_speed"                        "+$attack"
		"DOTA_Tooltip_ability_item_blink_staff_bonus_int"                                 "+$int"

		"DOTA_Tooltip_item_blink_staff_effect_modifier"                                             "Blink Staff"
		"DOTA_Tooltip_item_blink_staff_effect_modifier_Description"                                 "Targeted by Blink Staff"
```
1234567891011
Now we are pretty much done. But because the biggest advantage of lua items is that we can define so many things dynamically so rest of this tutorial we will do few experiments that might not seem very balanced or sensible from game play perspective but just because we can!

## Advanced Uses ​

First Lets try effecting the help casting range if we are dealing with large mana pool hero. Since we are using cast filters for the help range limitation we can do this part there. To do this we use our already defined hCaster handle and use function :GetMaxMana() to return the hero's mana pool. Then we add that value to our already existing help range. This means that if our caster has 5000 mana pool to use late game he or she will have massive support range of 8000 units. So lets change the CastFilterResult target and error functions with following:
lua
```javascript
local nRangeBonus = hCaster:GetMaxMana() --Get our caster's mana pool
	local nMaxRange = self:GetSpecialValueFor( "help_range" ) + nRangeBonus--How far can we actually target?
```
12
The end result should look something like this
lua
```javascript
function item_blink_staff:CastFilterResultTarget( hTarget ) -- hTarget is the targeted NPC.
	local hCaster = self:GetCaster() --We will always have Caster.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local vPoint = hTarget:GetAbsOrigin() --Our target's location
	local nRangeBonus = hCaster:GetMaxMana() --Get our caster's mana pool
	local nMaxRange = self:GetSpecialValueFor( "help_range" ) + nRangeBonus--How far can we actually target?
	local vDiff = vPoint - vOrigin --Difference between the points
	local nTargetID = hTarget:GetPlayerOwnerID() --getting targets owner id
	local nCasterID = hCaster:GetPlayerOwnerID() --getting casters owner id
	if hCaster:GetTeamNumber() ~= hTarget:GetTeamNumber() then
		return UF_FAIL_CUSTOM
	end
	if nTargetID and nCasterID then --making sure they both exist
		if PlayerResource:IsDisableHelpSetForPlayerID(nTargetID, nCasterID) then --target hates having caster help him out.
			return UF_FAIL_CUSTOM
		end
	end

	if vDiff:Length2D() > nMaxRange then  --Check caster is over reaching.
	return UF_FAIL_CUSTOM
	else
	return UF_SUCCESS
	end
end

function item_blink_staff:GetCustomCastErrorTarget( hTarget) -- hTarget is the targeted NPC.
	local hCaster = self:GetCaster() --We will always have Caster.
	local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
	local vPoint = hTarget:GetAbsOrigin() --Our target's location
	local nRangeBonus = hCaster:GetMaxMana() --Get our caster's mana pool
	local nMaxRange = self:GetSpecialValueFor( "help_range" ) + nRangeBonus--How far can we actually target?
	local vDiff = vPoint - vOrigin --Difference between the points
	local nTargetID = hTarget:GetPlayerOwnerID() --getting targets owner id
	local nCasterID = hCaster:GetPlayerOwnerID() --getting casters owner id
	if hCaster:GetTeamNumber() ~= hTarget:GetTeamNumber() then
		return "#dota_hud_error_cant_cast_on_enemy"
	end
	if nTargetID and nCasterID then --making sure they both exist
		if PlayerResource:IsDisableHelpSetForPlayerID(nTargetID, nCasterID) then --target hates having caster help him out.
			return "#dota_hud_error_target_has_disable_help"
		end
	end
	if vDiff:Length2D() > nMaxRange then  --Check caster is over reaching.
	return "#dota_hud_error_target_out_of_range" --returning error from localization
	end
end
```
12345678910111213141516171819202122232425262728293031323334353637383940414243444546
Now you may have noticed how we are using almost same code for both cast filter and the error function. Here is a way to reduce the redundancy:
lua
```javascript
function item_blink_staff:CastFilterResultTarget( hTarget ) -- hTarget is the targeted NPC.
	return self:CCastFilter( hTarget, false )
end

function item_blink_staff:GetCustomCastErrorTarget( hTarget) -- hTarget is the targeted NPC.
	return self:CCastFilter( hTarget, true )
end

function item_blink_staff:CCastFilter( hTarget, bError )
	if IsServer() then --this should be only run on server.
		local hCaster = self:GetCaster() --We will always have Caster.
		local vOrigin = hCaster:GetAbsOrigin() --Our caster's location
		local vPoint = hTarget:GetAbsOrigin() --Our target's location
		local nRangeBonus = hCaster:GetMaxMana() --Get our caster's mana pool
		local nMaxRange = self:GetSpecialValueFor( "help_range" ) + nRangeBonus--How far can we actually target?
		local vDiff = vPoint - vOrigin --Difference between the points
		local nTargetID = hTarget:GetPlayerOwnerID() --getting targets owner id
		local nCasterID = hCaster:GetPlayerOwnerID() --getting casters owner id
		if hCaster:GetTeamNumber() ~= hTarget:GetTeamNumber() then
			if bError then
				return "#dota_hud_error_cant_cast_on_enemy"
			else
				return UF_FAIL_CUSTOM
			end
		end
		if nTargetID and nCasterID then --making sure they both exist
			if PlayerResource:IsDisableHelpSetForPlayerID(nTargetID, nCasterID) then --target hates having caster help him out.
				if bError then
					return "#dota_hud_error_target_has_disable_help"
				else
					return UF_FAIL_CUSTOM
				end
			end
		end
		if vDiff:Length2D() > nMaxRange then  --Check caster is over reaching.
			if bError then
				return "#dota_hud_error_target_out_of_range" --returning error from localization
			else
				return UF_FAIL_CUSTOM
			end
		end
		if not bError then
			return UF_SUCCESS
		end
	end
end
```
12345678910111213141516171819202122232425262728293031323334353637383940414243444546
## Item Levels ​

As I mentioned early in the tutorial things like bkb and dagon has item levels used. Dagon uses separate items to define the levels while bkb has built-in leveling when ever it is used. We are going to code where we reduce our blink staff help range when ever it is used to help a player.First we need to add new values for our help ranges between the levels. These are simply separated by spaces between values.

```javascript
"03"
			{
				"var_type"				"FIELD_INTEGER"
				"help_range"			"3000 2500 2000 1500 1000"
			}
```
12345
Because there is some odd bugs here and there, the MaxLevel value that we would use for normal abilities doesn't work for items. To help us define it in the script we create new special value for it.

```javascript
"09"
			{
				"var_type"				"FIELD_INTEGER"
				"max_level"				"5"
			}
```
12345
Back to the lua script, we need to upgrade the item only when ally is teleported and not when we simply tag our ally for teleport. First find this line:
lua
```javascript
self:Blink(hTarget, vPoint, nMaxBlink, nClamp) --BLINK!
```
1
Under it lets add the upgrade part. Note that we have to check we don't upgrade the item when it's fully upgraded.
lua
```javascript
if self:GetLevel() < self:GetSpecialValueFor( "max_level" ) then --We can't define max level for item like we can with abilities. Best to create special value for it.
	self:UpgradeAbility(true)
end
```
123
We could also add condition where if the game is currently in night time the upgrade doesn't happen. Letting our hero help his allies for free!
lua
```javascript
if self:GetLevel() < self:GetSpecialValueFor( "max_level" ) and GameRules:IsDaytime() then
	self:UpgradeAbility(true)
end
```
123
Now if we want to let our hero refresh the help range levels then we can either script some event where we reset the item's level with:
lua
```javascript
self:SetLevel(1)
```
1
Or we can use more elegant choice of modifying our recipe to act like charge refresh for drums of endurance.

```javascript
"item_recipe_blink_staff"
	{
		// General
		//-------------------------------------------------------------------------------------------------------------
		"BaseClass"                     "item_datadriven"
		"ID"							"1251"

		// Item Info
		//-------------------------------------------------------------------------------------------------------------
		"ItemCost"						"325"
		"ItemShopTags"					""

		// Recipe
		//-------------------------------------------------------------------------------------------------------------
		"ItemRecipe"					"1"
		"ItemResult"					"item_blink_staff"
		"ItemRequirements"
		{
			"01"						"item_quarterstaff;item_robe;item_blink"
			"02"						"item_blink_staff"
		}
	}
```
1234567891011121314151617181920212223
Notice how we added "02" to the item requirements and it only requires the item "item_blink_staff". This means we can combine our original blink staff to create fully new one with level set to its default value.Now what you should remember to do is change the description of the item and not keep the player guessing.

```javascript
"DOTA_Tooltip_ability_item_blink_staff_Description"                               "Teleport to a target point up to 1200 units away. Can be used on allied units to select them to blink instead of you. If you take damage the Blink Staff is put on 3.0 second cooldown. Every time you help ally the help range is reduced by 500. This doesn't apply if used during night time. You maximum mana is added to the help distance."
```
1
## The End ​

That is the end of this tutorial. You can find this and other Lua items and abilities in my Dota2Overflow GitHub repo. https://github.com/DrTeaSpoon/Dota2Overflow
To help declaring modifier functions use this for resource:https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Lua_Abilities_and_Modifiers#Modifier_FunctionsBig thanks to BMD for barebones. While this tutorial has nothing to do with his repo, I used it for testing ground and creating the visual aids.Big thanks to all who have contributed to https://github.com/Pizzalol/SpellLibrary
Happy Blinking!


---

# Reutilizing Built-In Modifiers | ModDota

**Source:** https://moddota.com/abilities/reutilizing-built-in-modifiers

---


# Reutilizing Built-In Modifiers ​

Here it will be explained how to reuse any Built-In modifier through the datadriven system.

This has many uses, as sometimes it's impossible to replicate some effects that are very hidden/hardcoded within the engine.

In a previous example, the Illusion Ability Example made use of the "modifier_illusion modifier" in Lua like this:
lua
```javascript
illusion:AddNewModifier(caster, ability, "modifier_illusion", { duration = duration,
                                                                outgoing_damage = outgoingDamage,
                                                                incoming_damage = incomingDamage })
```
123
The fields between { } are Very specific.

The Full List of Built-In Modifiers can be found on the wiki

AddNewModifier can be replaced by the datadriven "ApplyNewModifier" Action block like this:

Basic Example: This will apply 1 frame of MODIFIER_STATE_NO_UNIT_COLLISION

```javascript
"ApplyModifier"
{
    "ModifierName"	"modifier_phased"
    "Target"       "TARGET"
    "Duration"     "0.03"
}
```
123456
However this isn't more than a shortcut to avoid creating a new modifier with the state. The real strength of this method is in applying modifiers that have very custom properties that aren't easily reproduced with the basic Properties/States/etc.

For example, in the alchemist_chemical_rage ability, Alchemist changes its attack/idle/run animation, model effect, attack sound and also gets the ability bonus.

If we wanted to get all the cosmetic properties but with different ability effects, we need to rewrite the skill from scratch, but sadly the autoattack sound and animations for attack/idle/run aren't easily changed, and we would need to find a wacky workaround for it.

Instead, we can make use of the "modifier_alchemist_chemical_rage_transform" which will handle everything, transforming the hero and applying a "modifier_alchemist_chemical_rage" with the exact ability we want.

Now to find out the field names and pass values to the modifier, follow these steps:

## Step 1. Finding the ability modifier ​

Go to the original ability that uses the modifier you want to reuse from the list. The SpellLibrary contains a split list of all Dota Abilities with its own names, it's very easy to find the fields there.

## Step 2. Setting the AbilityValues fields ​

Copy the ability specials from the main ability into your datadriven AbilityValues block. If the custom ability doesn't have the field, the modifier will default to 0, so you can remove those that you want to ignore.

Example: alchemist_chemical_rage AbilityValues block, with 2 added values and most of its ability bonus removed.

```javascript
"AbilityValues"
{
  "duration" "25.0"
  "transformation_time" "0.35"
  "bonus_movespeed_percent" "50"
  "bonus_attack_speed" "322"
}
```
1234567
## Step 3. Applying the modifier ​

On the desired Ability or Modifier Event, add the ApplyModifier action:

```javascript
"ApplyModifier"
{
    "ModifierName" "modifier_alchemist_chemical_rage_transform"
    "Target"       "CASTER"
    "Duration"     "%transformation_time"
}
```
123456
Without a Duration field, the modifier might be applied for duration = nil, meaning infinite duration.

## Step 4. Adjusting the Tooltip ​

The modifier_alchemist_chemical_rage tooltip needs to be adjusted to ignore AbilityValues we don't need, and instead use our bonus_attack_speed and bonus_movespeed_percent.

1. Go to dota_english.txt, which can be found in the main dota file or in this repository link
2. Find the modifier tooltip of the spell we want to modify, copy them into your addon_english.txt and edit them:

```javascript
"DOTA_Tooltip_modifier_alchemist_chemical_rage"             "Legacy Chemical Rage"
"DOTA_Tooltip_modifier_alchemist_chemical_rage_Description"	"Increasing attack and movement speed."
```
12
After modifying the addon_english.txt:

Note that you cannot refer to a new custom %dMODIFIER_PROPERTY_CONSTANT_LIST% in the tooltip, because it doesn't have the custom values in its modifier.

Instead you can make those tooltips in the separate modifier, or directly add the numbers to the original modifier tooltip if they are static values (like in this case I could've written 50 and 322). Sadly, you can't set the built-in modifier as hidden either.

## Full Example ​

```javascript
"alchemist_chemical_rage_warcraft"
{
    "BaseClass"            "ability_datadriven"
    "AbilityTextureName"   "alchemist_chemical_rage_warcraft"
    "MaxLevel"             "3"

    "AbilityBehavior"      "DOTA_ABILITY_BEHAVIOR_NO_TARGET"
    "AbilityCastAnimation" "ACT_DOTA_ALCHEMIST_CHEMICAL_RAGE_START"

    "AbilityCastRange"      "700"
    "AbilityCastPoint"      "0.0"
    "AbilityCooldown"       "30.0"

    "AbilityManaCost"       "25"

    "AbilityValues"
    {
        "duration" "15.0"
        "transformation_time" "0.35"
        "bonus_movespeed_percent" "50"
        "bonus_attack_speed" "25 75 125"
    }

    "precache"
    {
        "soundfile" "soundevents/game_sounds_heroes/game_sounds_alchemist.vsndevts"
        "particle"  "particles/status_fx/status_effect_chemical_rage.vpcf"
        "particle"  "particles/units/heroes/hero_alchemist/alchemist_chemical_rage.vpcf"
    }

    "OnSpellStart"
    {
        "FireSound"
        {
            "EffectName"   "Hero_Alchemist.ChemicalRage.Cast"
            "Target"       "CASTER"
        }

        "ApplyModifier"
        {
            "ModifierName" "modifier_alchemist_chemical_rage_transform"
            "Target"       "CASTER"
            "Duration"     "%transformation_time"
        }

        // Extra Modifier with what we need to add for the custom ability
        "ApplyModifier"
        {
            "ModifierName" "modifier_chemical_rage_warcraft"
            "Target"       "CASTER"
        }
  }

    "Modifiers"
    {

        "modifier_chemical_rage_warcraft"
        {
            "IsBuff"   "1"
            "IsHidden" "1"
            "Duration" "%duration"

            "Properties"
            {
                "MODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT" "%bonus_attack_speed"
                "MODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE" "%bonus_movespeed_percent"
            }
        }
    }
}
```
12345678910111213141516171819202122232425262728293031323334353637383940414243444546474849505152535455565758596061626364656667686970
Hopefully this will help you have more options if the ability you want to modify hasn't been rewritten yet, or to get a particular effect which is hard to replicate by normal means.


---

# Using Modifier Properties in tooltips | ModDota

**Source:** https://moddota.com/abilities/modifier-properties-in-tooltips

---


# Using Modifier Properties in tooltips ​

Any time you see a modifier tooltip using a non-static number it's getting its value from one of that modifier's MODIFIER_PROPERTY_'s

some examples:

```javascript
"DOTA_Tooltip_modifier_fountain_aura_buff_Description"				"Heals %dMODIFIER_PROPERTY_HEALTH_REGEN_PERCENTAGE%%% HP and %dMODIFIER_PROPERTY_MANA_REGEN_TOTAL_PERCENTAGE%%% mana per second."
```
1
```javascript
"DOTA_Tooltip_modifier_smoke_of_deceit_Description"	"Invisible, moving %dMODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE%%% faster, and hidden from the minimap. Attacking or moving within %dMODIFIER_PROPERTY_TOOLTIP% range of an enemy hero or tower will break the invisibility."
```
1
```javascript
"DOTA_Tooltip_modifier_tower_aura_bonus_Description"    "Armor increased by %dMODIFIER_PROPERTY_PHYSICAL_ARMOR_BONUS% and health regeneration by %dMODIFIER_PROPERTY_HEALTH_REGEN_CONSTANT%."
```
1
and approximately 560 more examples in valve's abilities_english.txt.

As you can see, all of those numbers are not manually written into the modifier description, they are dynamically grabbed from the modifier.

## Why is this useful? ​

Because if you manually write the numbers into the tooltip then any time you make a number change in the ability you will have to remember to update every related tooltip, and hassle aside you're bound to miss some.

Using the dynamic tooltip you only have to change the number in one place and it gets updated everywhere. And you can change the number you are returning in your script during the game.

## How to do it ​

First, please note that this only works with Lua Modifiers and Valve's built in modifiers. It cannot be done with datadriven modifiers.

Any time you use a modifier property in a lua modifier the value you return will be available for use in the modifier's description tooltip.

In your modifier script:
lua
```javascript
function modifier_example:DeclareFunctions()
	return {
		MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE,
	}
end

function modifier_example:GetModifierPreAttack_BonusDamage()
	return 100
end
```
123456789
In your addon_<language>.txt
json
```javascript
"DOTA_Tooltip_modifier_example_Description" "Granting %dMODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE% bonus damage!"
```
1
This would result in a tooltip that says: Granting 100 bonus damage!

In the tooltip the percentage % sign surrounds the MODIFIER_PROPERTY_ to mark it as text to be replaced with the value of the modifier property. If the contents between the %'s don't match the format then it won't work.

## The Format ​

%<-><number><d|f>MODIFIER_PROPERTY_%

Snippet from abilities_english.txt:

```javascript
// substitution for modifier tooltips
// %dMODIFIER_PROPERTY_MAGICAL_RESISTANCE_BONUS% - 'd' prints the value returned by the function as an integer
// 'd' for integer
// 'f' for float
// optional '-' to not abs() the values
// optional number to specify the number of decimals to print after a float
// eg: %-2fMODIFIER_PROPERTY_BASEDAMAGEOUTGOING_PERCENTAGE%
// use %% to draw a percentage sign
test
```
123456789
The first thing needed is a d for integer (whole number), or f for float (floating point number) Note that this is case sensitive, they must be lowercase. And one of these is required, if you try to omit it, it will not work.

%d...%%f...%

Next is the modifier property name, make sure there is no empty space.

%dMODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT%%fMODIFIER_PROPERTY_TOOLTIP%

That's it, that's all you need for your tooltip to display.

But, there are 2 more options you can use.

By default the returned number will be absolute. Meaning that even if you return a negative number it will be positive in the tooltip. Putting a dash/minus sign - before the d/f will make it not abs() the number, so it can be negative.

%-dMODIFIER_PROPERTY_COOLDOWN_REDUCTION_CONSTANT%%-fMODIFIER_PROPERTY_HEALTH_REGEN_CONSTANT%

And with a float you can add a number before the f to choose how many decimals to display (default 1)

%-2fMODIFIER_PROPERTY_MANA_REGEN_CONSTANT%%3fMODIFIER_PROPERTY_BASE_ATTACK_TIME_CONSTANT%

and finally, if you want to write a percentage sign % in your modifier tooltip you simply put 2 %% next to each other where ever you want it in the tooltip.

"This is a percentage sign: %%"

"Gaining %dMODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE%%% bonus movement speed"

## MODIFIER_PROPERTY_TOOLTIP ​

I'll leave a special note here for MODIFIER_PROPERTY_TOOLTIP and MODIFIER_PROPERTY_TOOLTIP2 These modifier properties do not do anything functionality wise, they exist only to display a custom number in your tooltip.

A simple example could be:
lua
```javascript
function modifier_example:DeclareFunctions()
	return {
		MODIFIER_PROPERTY_TOOLTIP,
		MODIFIER_PROPERTY_TOOLTIP2,
	}
end

function modifier_example:OnTooltip()
	return self:GetStackCount()
end
function modifier_example:OnTooltip2()
	return self.number_of_killed_units
end
```
12345678910111213
## My %property% always shows 0 ?? ​

If you're having this issue then your returned value is probably only seen on the Server and not the Client. See this guide for instruction: Sending Server values to the Client


---

# Sending Server values to the Client in a modifier. | ModDota

**Source:** https://moddota.com/abilities/server-to-client

---


# Sending Server values to the Client in a modifier. ​

Modifier scripts are run on both the server, and every client in the game. A lot of the Lua API is server-side functions that the client cannot use.

And so, oftentimes when using modifiers you will have to use Server only functions for calculations or whatever your purpose may be.

Usually the server is what handles the functionality, while the client is just for displaying information.

So if you for example gave your hero bonus damage that you calculated or stored only on the server then you would see that your hero does deal the bonus damage, but its not displayed on the UI or any Tooltips.

Example that grants 2x your primary attribute as bonus damage:
lua
```javascript
modifier_example = class({})

function modifier_example:DeclareFunction()
	return {
		MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE
	}
end

function modifier_example:GetModifierPreAttack_BonusDamage()
	if not IsServer() then return end
	--GetPrimaryStatValue is a server-only function
	return self:GetParent():GetPrimaryStatValue() * 2
end
```
12345678910111213
With this modifier you will run into the mentioned issue where your attack damage is not updated in the UI, but you will still deal the bonus damage.

To fix this, we need to somehow send this server-only value to the client. There are 2 primary methods for doing this, though there are other less convenient ways.

## Modifier Stack Count ​

This is the most basic method, where all you need to do is Set the modifiers stack count on the server and the stack count is automatically synced to the client.

Example using this method:
lua
```javascript
modifier_example = class({})

function modifier_example:DeclareFunction()
	return {
		MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE
	}
end

function modifier_example:GetModifierPreAttack_BonusDamage()
	if IsServer() then
		local stat = self:GetParent():GetPrimaryStatValue()
		self:SetStackCount(stat)
	end

	return self:GetStackCount() * 2
end
```
12345678910111213141516
Great, now the damage is applied and displayed correctly!

But, there are some limitations with using modifier stacks.

- You can only set integer values. No floats, booleans, strings, or tables.
- You can only set one stack count per modifier.
- The stack count is displayed on the modifier buff icon, and this is not always wanted.

So what can you do if you need to send one of these unsupported values or even send multiple values to the client?

Well, there are some workarounds but what you should use is Modifier Transmitters.

## Modifier Transmitters ​

Modifier transmitters allow you to send any amount of any value types from the server to the client in your modifier. But they require a bit of set-up.

There are 3 functions needed to make use of transmitters.

- SetHasCustomTransmitterData This should be called in your modifier's OnCreated function to tell the server you want your modifier to transmit data to the client
- AddCustomTransmitterData This is where you pick the data you want to send to the client, run on server-side only
- HandleCustomTransmitterData This is where the server data is sent to, run on client-side only.
- and also SendBuffRefreshToClients for refreshing the transmitted data if needed.

Example that grants bonus damage and attack speed based on your current health.
lua
```javascript
modifier_example = class({})

function modifier_example:OnCreated( kv )
	if not IsServer() then return end
	--grab some values from the ability's KV
	local percent_health_to_damage = self:GetAbility():GetSpecialValueFor("percent_health_to_damage")
	local percent_health_to_atk_spd = self:GetAbility():GetSpecialValueFor("percent_health_to_atk_spd")

	--GetHealth is a server-only function
	local health = self:GetParent():GetHealth()

	--calculate our values on the server.
	self.damage = health * percent_health_to_damage
	self.attack_speed = health * percent_health_to_atk_spd

	--tell the server we are ready to send data to the client
	self:SetHasCustomTransmitterData(true)

	--we want to think so we can periodically refresh the data we are sending to the client
	--note: this can be called on client, but in this script its only called on server, so it only thinks on server.
	self:StartIntervalThink(0.1)
end

--refresh the modifier on every think
function modifier_example:OnIntervalThink()
	self:OnRefresh()
end

--this function is called when a modifier is reapplied, or manually refreshed in a script.
function modifier_example:OnRefresh( kv )
	if IsServer() then
    --call OnCreated again to recalculate our values
    self:OnCreated()

		--SendBuffRefreshToClients is a server-only function
		self:SendBuffRefreshToClients()
	end
end

--this is a server-only function that is called whenever modifier:SetHasCustomTransmitterData(true) is called,
-- and also whenever modifier:SendBuffRefreshToClients() is called
function modifier_example:AddCustomTransmitterData()
	return {
		damage = self.damage,
		attack_speed = self.attack_speed,
	}
end

--this is a client-only function that is called with the table returned by modifier:AddCustomTransmitterData()
function modifier_example:HandleCustomTransmitterData( data )
	self.damage = data.damage
	self.attack_speed = data.attack_speed
end

function modifier_example:DeclareFunctions()
	return {
		MODIFIER_PROPERTY_ATTACKSPEED_BONUS_CONSTANT,
		MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE,
	}
end

function modifier_example:GetModifierAttackSpeedBonus_Constant()
	return self.attack_speed
end

function modifier_example:GetModifierPreAttack_BonusDamage()
	return self.damage
end
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647484950515253545556575859606162636465666768
You can find many other examples of modifier transmitters on GitHub


---

