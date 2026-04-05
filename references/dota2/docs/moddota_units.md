# ModDota Units 文档

> 本文档爬取自 https://moddota.com/units/ 及其子页面
> 生成日期: 2024年

---

## 目录

1. [Unit KeyValues](#unit-keyvalues)
2. [Unit Producing Buildings](#unit-producing-buildings)
3. [Creating Units with a Duration](#creating-units-with-a-duration)
4. [Adding a Simple AI to Units](#adding-a-simple-ai-to-units)
5. [Simple Neutral AI](#simple-neutral-ai)
6. [Creature AttachWearable Blocks](#creature-attachwearable-blocks)

---

# Unit KeyValues | ModDota

**Source:** https://moddota.com/units/unit-keyvalues

---


# Unit KeyValues ​

This document covers every keyvalue of the npc_units_custom.txt file

## General ​

Most unit names start with npc_ but this isn't necessary. A basic unit definition looks like this:

```javascript
"human_footman"
{
	// General
	//----------------------------------------------------------------
	"BaseClass"		"npc_dota_creature"
	"Model"			"models/heroes/dragon_knight/dragon_knight.vmdl"
	"ModelScale"		"0.8"
	"Level"			"2"
	"HealthBarOffset"	"140"
	"HasInventory"		"1"

	// Abilities
	//----------------------------------------------------------------
	"Ability1"		"human_defend"
	"Ability2"		"human_backpack"

	// Armor
	//----------------------------------------------------------------
	"ArmorPhysical"		"2"
	"MagicalResistance"	"0"

	// Attack
	//----------------------------------------------------------------
	"AttackCapabilities"	"DOTA_UNIT_CAP_MELEE_ATTACK"
	"AttackDamageType"	"DAMAGE_TYPE_ArmorPhysical"
	"AttackDamageMin"	"12.0"
	"AttackDamageMax"	"13.0"
	"AttackRate"		"1.35"
	"AttackAnimationPoint"	"0.5"
	"AttackAcquisitionRange" "500"
	"AttackRange"		"90"

	// Bounty
	//----------------------------------------------------------------
	"BountyGoldMin"		"26.0"
	"BountyGoldMax"		"38.0"

	// Bounds
	//----------------------------------------------------------------
	"BoundsHullName"	"DOTA_HULL_SIZE_HERO"
	"RingRadius"		"70"

	// Movement
	//----------------------------------------------------------------
	"MovementCapabilities"	"DOTA_UNIT_CAP_MOVE_GROUND"
	"MovementSpeed"		"270"
	"MovementTurnRate"	"0.6"

	// Status
	//----------------------------------------------------------------
	"StatusHealth"		"420"
	"StatusHealthRegen"	"0.25"
	"StatusMana"		"0"
	"StatusManaRegen"	"0"

	// Vision
	//----------------------------------------------------------------
	"VisionDaytimeRange"	"1400"
	"VisionNighttimeRange"	"800"

	// Team
	//----------------------------------------------------------------
	"TeamName"		"DOTA_TEAM_NEUTRALS"
	"CombatClassAttack"	"DOTA_COMBAT_CLASS_ATTACK_BASIC"
	"CombatClassDefend"	"DOTA_COMBAT_CLASS_DEFEND_STRONG"
	"UnitRelationShipClass"	"DOTA_NPC_UNIT_RELATIONSHIP_TYPE_DEFAULT"

	// Creature Data
	//----------------------------------------------------------------
	"Creature"
	{
		"DisableClumpingBehavior"	"1"
		"AttachWearables"
		{
			"Wearable1" { "ItemDef" "63" }
			"Wearable2" { "ItemDef" "64" }
			"Wearable3" { "ItemDef" "65" }
			"Wearable4" { "ItemDef" "66" }
			"Wearable5" { "ItemDef" "67" }
			"Wearable6" { "ItemDef" "68" }
		}
	}
}
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647484950515253545556575859606162636465666768697071727374757677787980818283
The definition of the default dota units can be found in npc_units.txt

### Base Classes ​

There are a lot of classes for units, but as we don't have much control over their properties, only a few are really useful for custom units in general:

- npc_dota_creatureThe most useful baseclass, it doesn't have any critical hardcoded property so it's the go-to unit type for most units. It also allows the usage of the "Creature" block, which is reviewed in the next section. It's linked to the "DOTA_UNIT_TARGET_BASIC" target type in abilities.There is however one simple property imposed to this unit type, which for the most part it's useful but it's good to keep in mind, and it's that abilities are automatically skilled up to the MaxLevel if possible (limited by the Level*2 of the creature, meaning a Level 1 creature will autolearn its abilities up to the 2nd rank). This can be of course modified through Lua SetLevel on each ability.
- npc_dota_buildingLinked to "DOTA_UNIT_TARGET_BUILDING", this baseclass can prove useful in many situations.It has the following properties imposed to it, which we have no control over them:Invulnerable by default. Very annoying, it can be removed through Lua with building_handle:RemoveModifierByName("modifier_invulnerable")Visible through fog. This is troublesome, and forces any game that wants to have building strategies to use npc_dota_creature and define custom building damage, with some other downsides.No visual turning, even if internally the unit is actually changing its forward vector. Usually a good thing, the creature equivalent behavior for this is the stunned state.  Worth mentioning npc_dota_tower is a subclass of building, and is coded to trigger stuff like the announcers, team gold sharing and aggro AI. Use npc_dota_building with attack to make towers that aren't forced to use those mechanics.
- npc_dota_thinkerFor dummy units. More on this later
For the rest of this guide, we'll be assuming a `"BaseClass" "npc_dota_creature"`
### Level ​

```javascript
"Level"                        "32"
```
1
This level can be accessed and modified with Lua though various creature functions.

### Model and Scale ​

```javascript
"Model"                        "models/heroes/dragon_knight/dragon_knight.vmdl"
"ModelScale"                    "0.8"
```
12
Self-explanatory, get the models through the asset browser and set its size (it will use "1" by omission).

Creatures using models that are broken down for cosmetic equipment will be 'naked' unless we attach them wearables. More on this later.

### Minimap Icons ​

```javascript
"MinimapIcon" 				"minimap_candybucket"
"MinimapIconSize" 			"1000"
```
12
Produces:

### Unit Label ​

```javascript
"UnitLabel"                    "healing_ward"
```
1
This can be any name, its only useful purpose is to use with Lua GetUnitLabel() which can work as an easy method of tagging units.

## Boolean Values and Flags ​

```javascript
"HasInventory"                "1"
```
1
Associated Lua functions: HasInventory() and SetHasInventory(bool)

INFO

SetHasInventory(true) won't work on units that didn't have "HasInventory" "1" previously defined.

```javascript
"IsSummoned"				"1"
"CanBeDominated"			"0"
```
12
Self-explanatory, the default values are 0 for summoned (so the lua IsSummoned will always return false unless you set this), and 1 for dominated creatures.
``` "ConsideredHero" "1" ```
"DOTA_UNIT_TARGET_FLAG_NOT_CREEP_HERO" datadriven flag. Gives the unit a hero styled health bar:
``` "IsAncient" "1" ```
Associated Lua function: IsAncient()"DOTA_UNIT_TARGET_FLAG_NOT_ANCIENTS" datadriven flag.
``` "IsNeutralUnitType" "1" ```
Associated Lua function: IsNeutralUnitType()
``` "CanBeDominated" "0" ```
Helm of the Dominator specific. No associated Lua function, but it's easy to make one to read from this value if you wish.
``` "AutoAttacksByDefault" "0" ```
Ignores Auto Attack Behavior setting, forces to not autoattack. Used on Visage Familiars.
``` "ShouldDoFlyHeightVisual" "0" ```
Seems broken, no noticeable difference.
``` "WakesNeutrals" "1" ```
Unit won't aggro units on the Neutral team within their acquisition range.

## Selection properties ​

```javascript
"SelectionGroup"               "string"
"SelectOnSpawn"                "1"
"IgnoreAddSummonedToSelection" "1"
```
123
- SelectionGroup will make it so that all the units of this type are in a group which can be accessed through tab.

I pressed tab once and all these units got selected after defining them in the same control group

- SelectOnSpawn forces the unit into the selection of the hero, even if the "Auto Select Summoned Units" setting is turned off. It's used on Visage Familiars.
- IgnoreAddSummonedToSelection if set to 1, makes the "Auto Select Summoned Units" ignore this unit when it spawns. It's used on Brewmaster Primal Split units.

## Sounds ​

```javascript
"SoundSet"                     "Hero_DragonKnight"
"GameSoundsFile"               "soundevents/game_sounds_heroes/game_sounds_dragon_knight.vsndevts"
"IdleSoundLoop"                "Hero_DragonKnight.Tutorial_Intro"
```
123
- SoundSet with the correct GameSoundsFile associated takes care of sounds like attacks and walking footsteps. The SoundSet string should be the first part of each of the hero sounds, which can be easily seen through the Dota 2 Sound Editor.
- IdleSoundLoop will be played constantly after the unit spawns. Some heroes don't have a loop sound defined, but as in the example above it's possible to use this as a spawn sound for the unit if you add the string of a non-loopable sound.

## Abilities ​

```javascript
"AbilityLayout"               "4"
"Ability1"                    ""            // Ability 1.
//"Ability2" ... up to "Ability16"
```
123
The unit can hold up to 16 abilities at any time being.

"AbilityLayout" is used for the built-in Flash UI to change how many abilities it can display, and currently its limited to 4, 5 and 6 (anything else will malfunction)

## Stats ​

Because of :valve: reasons, unit stats aren't hover-able, but they are there.

### Physical and Magical protection ​

```javascript
"ArmorPhysical"                "0"
"MagicalResistance"            "0"
```
12
### Attack Capabilities ​

```javascript
"AttackCapabilities"         "DOTA_UNIT_CAP_NO_ATTACK"
```
1
List of Attack Capabilities:

- DOTA_UNIT_CAP_NO_ATTACK
- DOTA_UNIT_CAP_MELEE_ATTACK
- DOTA_UNIT_CAP_RANGED_ATTACK

### Other Attack Stats: ​

```javascript
"AttackDamageMin"            "50"       // Damage range min.
"AttackDamageMax"            "40"       // Damage range max.
"AttackRate"                 "1.7"     // Speed of attack.
"AttackAnimationPoint"       "0.75"    // Normalized time in animation cycle to attack.
"AttackAcquisitionRange"     "800"     // Range within a target can be acquired.
"AttackRange"                "600"     // Range within a target can be attacked.
"AttackRangeBuffer"          "250"     // Extra range the target can move without canceling the attack
```
1234567
### Ranged Attack Projectiles ​

```javascript
"ProjectileModel"            "particles/units/heroes/hero_lina/lina_base_attack.vpcf"
"ProjectileSpeed"            "900"
```
12
Find hero/unit attack particles with the asset browser, filtering for the hero name + "attack vpcf"

If you have any "Melee to Ranged" mechanic, the unit definition should have a projectile speed, else it will default to 0, effectively making them never reach its target.

### The things we could do... ​

```javascript
"AttackDamageType"           "DAMAGE_TYPE_ArmorPhysical"
```
1
This is seen in every unit file, but worthless/unsupported. In the future, we could see it being used to easily define Air/Ground attacks, Magic Attacks, etc, which currently require scripted abilities to simulate those behaviors.

### Attribute Stats ​

Attributes are ignored for anything that isn't a hero unit, but because anything used to define units can also be used for npc_heroes_custom, these are the keyvalues, all self-explanatory:

```javascript
"AttributePrimary"             "DOTA_ATTRIBUTE_STRENGTH"
"AttributeBaseStrength"        "0"            // Base strength
"AttributeStrengthGain"        "0"            // Strength bonus per level.
"AttributeBaseAgility"         "0"            // Base agility
"AttributeAgilityGain"         "0"            // Agility bonus per level.
"AttributeBaseIntelligence"    "0"            // Base intelligence
"AttributeIntelligenceGain"    "0"            // Intelligence bonus per level.
```
1234567
### Bounty ​

If you want to make any complex rule for XP/Gold, for example, give less XP from this unit to heroes at a certain level, it's better to leave the values at 0 and grant it through lua.

```javascript
"BountyXP"                    "0"            // Experience earn.
"BountyGoldMin"                "0"           // Gold earned min.
"BountyGoldMax"                "0"           // Gold earned max.
```
123
## Bounds ​

This defines the unit collision with other units.

```javascript
"BoundsHullName"            "DOTA_HULL_SIZE_HERO"
```
1
Bound Size Reference:

| Value | Radius in Hammer units |
| --- | --- |
| DOTA_HULL_SIZE_SMALL | 8 |
| DOTA_HULL_SIZE_REGULAR | 16 |
| DOTA_HULL_SIZE_SIEGE | 16 |
| DOTA_HULL_SIZE_HERO | 24 |
| DOTA_HULL_SIZE_HUGE | 80 |
| DOTA_HULL_SIZE_BUILDING | 81 |
| DOTA_HULL_SIZE_FILLER | 96 |
| DOTA_HULL_SIZE_BARRACKS | 144 |
| DOTA_HULL_SIZE_TOWER | 144 |

- Lua SetHullRadius(float) can change this to any value in between or even above 144.

```javascript
"RingRadius"                "70"
```
1
The visible selection ring when the unit is selected

```javascript
"HealthBarOffset"           "250"
```
1
The height from the ground at which the Health Bar should be placed. By default this value is set to "-1" to use the models default height. The bigger the Model and ModelScale, this should be adjusted to a higher number so it doesn't look weird.

## Movement ​

```javascript
"MovementCapabilities"        "DOTA_UNIT_CAP_MOVE_NONE"
"MovementSpeed"               "300"       // Speed
"MovementTurnRate"            "0.5"       // Turning rate.
```
123
List of Movement Capabilities

- DOTA_UNIT_CAP_MOVE_NONE
- DOTA_UNIT_CAP_MOVE_GROUND
- DOTA_UNIT_CAP_MOVE_FLY

### Less used movement-related values: ​

```javascript
"HasAggressiveStance"         "0"
```
1
Plays alternate idle/run animation when near enemies, e.g. Abaddon model

```javascript
"FollowRange"                 "100"
```
1
Distance to keep when following. Healing Ward/Sigil have it set at 250.

## Health and Mana ​

```javascript
"StatusHealth"                "150"       // Base health.
"StatusHealthRegen"           "0"         // Health regeneration rate.
"StatusMana"                  "0"         // Base mana.
"StatusManaRegen"             "0"         // Mana regeneration rate.
```
1234
Notes:

- Negative Health/Mana Regen doesn't work.
- Setting StatusMana on 0 will make it not have a mana bar.
- There is currently no way of Setting MAX Mana in Lua! Unit mana pool modification has to be done with the Creature block and Levels.

### Rarely used: ​

```javascript
"StatusStartingMana"          "-1"
```
1
-1 means default to full mana, which is the default. It can be changed to any integer value so the units don't spawn with a filled pool.

## Armor and Attack Types ​

The Table of Physical Attacks vs Armor Types can be found here in this link to the dota wiki

```javascript
"CombatClassAttack"           "DOTA_COMBAT_CLASS_ATTACK_HERO"
"CombatClassDefend"           "DOTA_COMBAT_CLASS_DEFEND_HERO"
```
12
### Attack Types Table ​

| Name | Dota Equivalent |
| --- | --- |
| Normal | DOTA_COMBAT_CLASS_ATTACK_BASIC |
| Pierce | DOTA_COMBAT_CLASS_ATTACK_PIERCE |
| Siege | DOTA_COMBAT_CLASS_ATTACK_SIEGE |
| Chaos | DOTA_COMBAT_CLASS_ATTACK_LIGHT |
| Hero | DOTA_COMBAT_CLASS_ATTACK_HERO |

### Armor Types Table ​

| Name | Dota Equivalent |
| --- | --- |
| Unarmored | DOTA_COMBAT_CLASS_DEFEND_SOFT |
| Light | DOTA_COMBAT_CLASS_DEFEND_WEAK |
| Medium | DOTA_COMBAT_CLASS_DEFEND_BASIC |
| Heavy | DOTA_COMBAT_CLASS_DEFEND_STRONG |
| Fortified | DOTA_COMBAT_CLASS_DEFEND_STRUCTURE |
| Hero | DOTA_COMBAT_CLASS_DEFEND_HERO |

## Vision ​

```javascript
"VisionDaytimeRange"        "1200"        // Range of vision during day light.
"VisionNighttimeRange"      "1800"        // Range of vision at night time.
```
12
Vision on any unit can't exceed 1800, any value above that will just default to 1800.
## Unit Relationship Class
This doesn't seem to make any difference, might be deprecated or just used for tagging stuff internally.

```javascript
"UnitRelationshipClass"       "DOTA_NPC_UNIT_RELATIONSHIP_TYPE_DEFAULT"
```
1
List:

- DOTA_NPC_UNIT_RELATIONSHIP_TYPE_BARRACKS
- DOTA_NPC_UNIT_RELATIONSHIP_TYPE_BUILDING
- DOTA_NPC_UNIT_RELATIONSHIP_TYPE_COURIER
- DOTA_NPC_UNIT_RELATIONSHIP_TYPE_DEFAULT
- DOTA_NPC_UNIT_RELATIONSHIP_TYPE_HERO
- DOTA_NPC_UNIT_RELATIONSHIP_TYPE_SIEGE
- DOTA_NPC_UNIT_RELATIONSHIP_TYPE_WARD

## Lua VScript AI ​

```javascript
"vscripts"                    "path_to_ai_script.lua"
```
1
This will load a lua script file as soon as the unit is spawned. With a Spawn ( entityKeyValues ) function one can initiate a thinker to do any sort of logic, this is a very simple example for a unit that goes through a series of waypoints while casting spells anytime its possible: ai_tank_miniboss.lua.

## Neutral Behavior ​

When you add a creep to the map and set it to the neutral team, the default is to turn it to a neutral. If you want to use a custom behavior, turn it off:

```javascript
"UseNeutralCreepBehavior" 	"0"
```
1
## Creature Block ​

The creature block allows for a variety of features to be applied from KV like basic AI, stat bonuses based on creature level, and wearables. All these settings can and should be put inside one creature block, but they will be separated by category in this guide.

### Stats Settings and Items ​

```javascript
"Creature"
{
  "CanRespawn"        "0"

  //Pathing Setting
  "DisableClumpingBehavior" "1"

  //Level Up Parameters
  "HPGain"           "10"
  "DamageGain"       "20"
  "ArmorGain"        "0.25"
  "MagicResistGain"  "0"
  "MoveSpeedGain"    "1"
  "BountyGain"       "3"
  "XPGain"           "15"

  "DisableResistance" "80.0"

  //Starting Items | Note: requires "HasInventory" "1" outside of creature block
  "EquippedItems"
  {
    "Maelstrom" { "Item"  "item_maelstrom" }
    "Treads" { "Item"  "item_power_treads" }
    "SnY" { "Item"  "item_sange_and_yasha" }
  }
}
```
1234567891011121314151617181920212223242526
### Wearables ​

See this guide for more info.

```javascript
"Creature"
{
  "AttachWearables"
  {
    "Wearable1" { "ItemDef" "101" }
    "Wearable2" { "ItemDef" "102" }
    "Wearable3" { "ItemDef" "103" }
  }
}
```
123456789
### Creature AI ​

I highly recommend using Lua for AI instead, but will leave some information here anyway.

```javascript
"Creature"
{
  // ?
  "PermanentDesire"  "1"

  "DefaultState"  "Invade"

  "States"
  {
    "Invade"
    {
      "Name"          "Invade"
      "Aggression"    "100.0"
      "Avoidance"     "0.0"
      "Support"       "0.0"
      "RoamDistance"  "2000.0"
    }
  }

  "OffensiveAbilities"
  {
    "Ability1"
    {
      "Name"        "broodmother_spawn_spiderlings"
    }
    "Ability2"
    {
      "Name"        "centaur_hoof_stomp"

      //Targeting Parameters
      "Radius"             "275"
      "MinimumTargets"     "2"
      "UseAtHealthPercent" "50"
      "UseSelfishly"       "1"

      //Ability Descriptors
      "AOE"          "1"
      "Debuff"       "1"
      "Buff"         "1"
      "Stun"         "1"
      "Damage"       "1"
      "Heal"         "1"
    }
  }
  "DefensiveAbilities"
  {
    "Ability1"
    {
      "Name"           "undying_tombstone"
      "AOE"            "1"
      "Radius"         "1000"
      "MinimumTargets" "1"
    }
  }
}
```
12345678910111213141516171819202122232425262728293031323334353637383940414243444546474849505152535455

---

# Unit producing buildings | ModDota

**Source:** https://moddota.com/units/unit-producing-buildings

---


# Unit producing buildings ​

This is a response tutorial on a question thread, I'm gonna explain the scripting approaches to fully spawning units with a building, including making them controllable and defining initial orders.

## Step 1. The npc_units_custom.txt files ​

First of all, you'll need a KeyValue definition for a building and the unit you want to spawn.

There are many examples of units in Warchasers & DotaCraft repositories, so I don't think I need to explain much about this.

I want to make one special note here though. "BaseClass" "npc_dota_building" can be seen through fog.

So if you have a problem with this, don't make your unit a building, but a npc_dota_creature instead.

This has the issue of creatures having a turn rate, so additionally you'll need to apply a MODIFIER_STATE_STUNNED on them, make them Magic Immune so most spells don't damage them, and make a special rule for spells that are supposed to damage buildings this way.

That being said, we won't be bothering with that for the purpose of this tutorial.

I'll be using a simplified version of the human_barracks definition, with a "human_train_footman" ability, which I'll expand on the possibilities for it later.

```javascript
"human_barracks"
{
	// General
	//----------------------------------------------------------------
	"BaseClass"					"npc_dota_building"
	"Model"						"models/props_structures/good_barracks_melee001.vmdl"
	"ModelScale"				"1"
	"Level"						"1"
	"HealthBarOffset"			"140"

	// Abilities
	//----------------------------------------------------------------
	"AbilityLayout"				"1"
	"Ability1"				"human_train_footman"

	// Armor
	//----------------------------------------------------------------
	"ArmorPhysical"				"5"
	"MagicalResistance"			"0"

	// Attack
	//----------------------------------------------------------------
	"AttackCapabilities"		"DOTA_UNIT_CAP_NO_ATTACK"
	"AttackDamageType"			"DAMAGE_TYPE_ArmorPhysical"
	"AttackDamageMin"			"0"
	"AttackDamageMax"			"0"

	// Bounty
	//----------------------------------------------------------------
	"BountyGoldMin"				"0.0"
	"BountyGoldMax"				"0.0"

	// Bounds
	//----------------------------------------------------------------
	"BoundsHullName"			"DOTA_HULL_SIZE_BARRACKS"
	"RingRadius"				"220"
	"CollisionSize"				"144"

	// Movement
	//----------------------------------------------------------------
	"MovementCapabilities"		"DOTA_UNIT_CAP_MOVE_NONE"	// Needed to cast Point abilities
	"MovementSpeed"				"0"

	// Status
	//----------------------------------------------------------------
	"StatusHealth"				"1200"
	"StatusHealthRegen"			"0"
	"StatusMana"				"0"
	"StatusManaRegen"			"0"

	// Vision
	//----------------------------------------------------------------
	"VisionDaytimeRange"		"900"
	"VisionNighttimeRange"		"600"

	// Team
	//----------------------------------------------------------------
	"TeamName"					"DOTA_TEAM_NEUTRALS"
	"CombatClassAttack"			"DOTA_COMBAT_CLASS_ATTACK_BASIC"
	"CombatClassDefend"			"DOTA_COMBAT_CLASS_DEFEND_STRUCTURE"
	"UnitRelationShipClass"		"DOTA_NPC_UNIT_RELATIONSHIP_TYPE_BUILDING"

}
```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263
## Step 2. Putting your unit into the map. ​

There are 2 main options for doing this, one is Hammer oriented, and the other is a fully scripted approach.

### Hammer Units ​

As described in the first thread, you can point and click to add a unit to the map, with all sort of properties.

The problem with this approach is that even though the building is "part of your team", you have no control over it, the same way you can't control the autoattacks of Towers in Dota.

To solve this, we need to use a couple of lines in lua, basically the SetOwner and SetControllableByPlayer API functions.

[CBaseEntity] void SetOwner( handle_owningEntity ) -- Sets this entity's owner

[CDOTA_BaseNPC] void SetControllableByPlayer( int, bool ) -- Set this unit controllable by a player.

To properly call these functions, I'm gonna assume you already know the basics explained under the Beginners Guide to Scripting and just explain where should you call these with an example.

A good GameMode hook to call these would be after the dota_player_picked_hero, so given a standard barebones listener like this:
lua
```javascript
ListenToGameEvent('dota_player_pick_hero', Dynamic_Wrap(GameMode, 'OnPlayerPickHero'), self)
```
1
In OnPlayerPickHero you need to find the handle of the BaseEntity/BaseNPC, that is, the unit you want to change ownership and control state.

This can be done in a couple of ways, for example, using the functions defined under CEntities. We want this building to have a unique identifier so its easy to search it, so inside Hammer, select it, go into its properties, and give it a name (I use the Alt+Enter hotkey for this):

Now you can search the building and get a local variable to it with this line:
lua
```javascript
local building = Entities:FindByName(nil, "building_barracks1")
```
1
Note: Remember to select Entities when building the map!

The OnPlayerPickHero function should then look like this:
lua
```javascript
function GameMode:OnPlayerPickHero(keys)
    local hero = EntIndexToHScript(keys.heroindex)
    local player = EntIndexToHScript(keys.player)
    local playerID = hero:GetPlayerID()

    local building = Entities:FindByName(nil, "building_barracks1")
    building:SetOwner(hero)
    building:SetControllableByPlayer(playerID, true)
end
```
123456789
Now your building should be fully controllable for ability usage, and even subtract gold from the player if you use abilities with gold cost.

### Scripting Approach ​

Hey Hammer is good and everything, but its behavior is very static. You need to have predefined positions for the units, build the map every time you make a change, and can't choose to not spawn any of them if there are less players than expected, etc.

There is a fully scripted method for placing units on the map, which is done by using the CreateUnitByName function, with some additional perks.

handle CreateUnitByName( szUnitName, vLocation, bFindClearSpace, hNPCOwner, hUnitOwner, iTeamNumber )

Still working inside the same OnPlayerPickHero, we can either make a static position for each playerID, such as Vector(450,322,128), doing random positions with named info_target entities in Hammer, or a dynamic position based on the hero spawn location. Let's do the latter:
lua
```javascript
local origin = hero:GetAbsOrigin() -- Spawn position
local fv = hero:GetForwardVector() -- Vector the hero is facing
local distance = 300
local position = origin + fv * distance
```
1234
This will define a Vector facing 300 units to the direction the hero is facing.

Now, CreateUnitByName should then be called in this way:
lua
```javascript
local building = CreateUnitByName("human_barracks", position, true, hero, hero, hero:GetTeamNumber())
```
1
Even though we set the hNPCOwner and hUnitOwner, the SetOwner and SetControllableByPlayer are still necessary.

#### Building invulnerability ​

There's a small issue with npc_dota_building baseclass which is that they spawn with "modifier_invulnerable" by default, to get rid of this, run this line:
lua
```javascript
building:RemoveModifierByName("modifier_invulnerable")
```
1
#### Did I mention Buildings can be buggy? ​

There's another issue, buildings will sometimes be not created where you want them to be, and instead be stuck to the (0,0,0) position, so, if this happens, add this:
lua
```javascript
Timers:CreateTimer(function() building:SetAbsOrigin(position) end)
```
1
Wait 1 frame, and using BMD's timers4life, your building will finally appear in the correct position

#### Precache ​

Last thing is the Unit's Precache requirement. Unlike units dropped on Hammer, lua CreateUnitByName won't run the precache {} blocks of the unit abilities nor Model, so we need to do it manually in either addon_game_mode.lua or in PostLoadPrecache() if you are worried about your clients not loading properly. I'll just go with the first method in this case:
lua
```javascript
function Precache( context ) -- Find this in addon_game_mode.lua
    PrecacheUnitByNameSync("human_barracks", context)
end
```
123
Done! Full code of the building spawning in front of the hero looks like this:
lua
```javascript
function GameMode:OnPlayerPickHero(keys)
    local hero = EntIndexToHScript(keys.heroindex)
    local player = EntIndexToHScript(keys.player)
    local playerID = hero:GetPlayerID()

    -- Choose a Position
    local origin = hero:GetAbsOrigin() -- Spawn position
    local fv = hero:GetForwardVector() -- Vector the hero is facing
    local distance = 300
    local position = origin + fv * distance

    -- Spawning
local building = CreateUnitByName("human_barracks", position, true, hero, hero, hero:GetTeamNumber())
    building:SetOwner(hero)
    building:SetControllableByPlayer(playerID, true)
    building:SetAbsOrigin(position)
    building:RemoveModifierByName("modifier_invulnerable")
```
1234567891011121314151617
## Step 3. Scripting the unit-spawning ability inside the building ​

Now that we have a fully working building ingame, let's move to npc_abilities_custom.txt and creature spawning from this building.

There are 2 main ways of doing this: with the DataDriven Action "SpawnUnit", or just with the CreateUnitByName Lua function as explained before.

### DataDriven "SpawnUnit" ​

I actually prefer this DD Action and use it extensively throughout all of DotaCraft's unit spawning, because it has access to the very useful "OnSpawn" Sub-Event, which is only accessible through this action, and has some other options for unit count, limit (so you can't have more than X units of the same unit at the same time), modifier_kill integration, etc.

Of course you could listen to the game event of unit spawned and do your OnSpawn stuff there, but that makes the ability less modular and harder to maintain.

SpawnUnit should be used as it follows, and is included in the Sublime Dota KV snippets:

```javascript
"SpawnUnit"
{
    "UnitName"       "npc_name"
    "Target"         "CASTER"
    "Duration"       "%duration"
    "UnitCount"      "1"
    "UnitLimit"      "0"
    "GrantsGold"     "1"
    "GrantsXP"       "1"
    "SpawnRadius"    "10"
    "OnSpawn"
    {
        "ApplyModifier"
        {
            "ModifierName"  "modifier_phased"
            "Target"        "TARGET"
            "Duration"      "0.03"
        }
        [ACTIONS]
    }
}
```
123456789101112131415161718192021
Applying "modifier_phased" for 1 frame is to prevent units getting stuck, for example if you cast the ability directly on the caster, without the phasing, it will be stuck on the same point and both units will be unable to move. This is similar to running the Lua FindClearSpaceForUnit, because once the phasing ends, units will try to find an empty position.

Units created by this function are already under control of the owner of the building.

Inside the "OnSpawn" replacing the [ACTIONS], it's useful to send orders to the unit, which can be referenced in lua as the event.target.

Here is a full example:

```javascript
"human_train_footman"
{
    "BaseClass"             "ability_datadriven"
    "AbilityTextureName"    "footman"
    "MaxLevel"              "1"

    "AbilityBehavior"    "DOTA_ABILITY_BEHAVIOR_NO_TARGET"

    "AbilityGoldCost"    "10"

    "OnSpellStart"
    {

        "SpawnUnit"
        {
            "UnitName"    "footman"
            "Target"      "CASTER"
            "UnitCount"   "1"
            "UnitLimit"   "0"
            "GrantsGold"  "1"
            "GrantsXP"    "1"
            "SpawnRadius" "100"
            "OnSpawn"
            {
                "ApplyModifier"
                {
                    "ModifierName" "modifier_phased"
                    "Target"       "TARGET"
                    "Duration"     "0.03"
                }
                "RunScript"
                {
                    "ScriptFile"    "buildings/rally_point.lua"
                    "Function"      "MoveToRallyPoint"
                }
            }
        }
    }
}
```
123456789101112131415161718192021222324252627282930313233343536373839
The footman unit definition is just a Dragon Knight with some wearables:

```javascript
//=================================================================================
// Creature: Footman
//=================================================================================
"human_footman"
{
	// General
	//----------------------------------------------------------------
	"BaseClass"					"npc_dota_creature"
	"Model"						"models/heroes/dragon_knight/dragon_knight.vmdl"
	"ModelScale"				"0.8"
	"Level"						"2"
	"HealthBarOffset"			"140"

	// Armor
	//----------------------------------------------------------------
	"ArmorPhysical"				"2"
	"MagicalResistance"			"0"

	// Attack
	//----------------------------------------------------------------
	"AttackCapabilities"		"DOTA_UNIT_CAP_MELEE_ATTACK"
	"AttackDamageType"			"DAMAGE_TYPE_ArmorPhysical"
	"AttackDamageMin"			"12.0"
	"AttackDamageMax"			"13.0"
	"AttackRate"				"1.35"
	"AttackAnimationPoint"		"0.5"
	"AttackAcquisitionRange"	"500"
	"AttackRange"				"90"

	// Bounty
	//----------------------------------------------------------------
	"BountyGoldMin"				"26.0"
	"BountyGoldMax"				"38.0"

	// Bounds
	//----------------------------------------------------------------
	"BoundsHullName"			"DOTA_HULL_SIZE_HERO"
	"RingRadius"				"70"
	"CollisionSize"				"31"
	"FormationRank"				"0"

	// Building Cost Stats
	//----------------------------------------------------------------
	"GoldCost"					"135"
	"LumberCost"				"0"
	"FoodCost"					"2"
	"BuildTime"					"20"

	// Movement
	//----------------------------------------------------------------
	"MovementCapabilities"		"DOTA_UNIT_CAP_MOVE_GROUND"
	"MovementSpeed"				"270"
	"MovementTurnRate"			"0.6"

	// Status
	//----------------------------------------------------------------
	"StatusHealth"				"420"
	"StatusHealthRegen"			"0.25"
	"StatusMana"				"0"
	"StatusManaRegen"			"0"

	// Vision
	//----------------------------------------------------------------
	"VisionDaytimeRange"		"1400"
	"VisionNighttimeRange"		"800"

	// Team
	//----------------------------------------------------------------
	"TeamName"					"DOTA_TEAM_NEUTRALS"
	"CombatClassAttack"			"DOTA_COMBAT_CLASS_ATTACK_BASIC"
	"CombatClassDefend"			"DOTA_COMBAT_CLASS_DEFEND_STRONG"
	"UnitRelationShipClass"		"DOTA_NPC_UNIT_RELATIONSHIP_TYPE_DEFAULT"

	// Creature Data
	//----------------------------------------------------------------
	"Creature"
	{
		"DisableClumpingBehavior"	"1"
		"AttachWearables"
		{
			"Wearable1"		{	"ItemDef"		"6789"		} //"Shield of Ascension"
			"Wearable2"		{	"ItemDef"		"6791"		} //"Pauldrons of Ascension"
			"Wearable3" 	        {	"ItemDef"		"6790"		} //"Gauntlets of Ascension"
			"Wearable4"		{	"ItemDef"		"6788"		} //"Drapes of Ascension"
			"Wearable5"		{	"ItemDef"		"6787"		} //"Sword of Ascension"
			"Wearable6"		{	"ItemDef"		"6792"		} //"Helm of Ascension"
		}
	}
}
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647484950515253545556575859606162636465666768697071727374757677787980818283848586878889
Note the usage of a RunScript to call a MoveToRallyPoint function, this will introduce the 4th and last step of this guide.

## Orders ​

Various orders can be run after the unit spawns.

Try to use the ExecuteOrderFromTable to avoid dropping orders because the unit is doing something else (like spawning), if you want to use easier functions like MoveToPosition you might need to add timers to make sure the unit is ready to perform the order.

Also, the Ownership of the unit needs to be changed to the hero handle, because the caster is a creature and those can't gain gold!
lua
```javascript
function MoveToRallyPoint( event )
    local caster = event.caster
    local target = event.target

    -- Change this to your desired Vector, usually as an hscript:GetAbsOrigin()
    local position = Vector(420,322,128)

    ExecuteOrderFromTable({ UnitIndex = target:GetEntityIndex(),
                            OrderType = DOTA_UNIT_ORDER_MOVE_TO_POSITION,
                            Position = position, Queue = true })
    print(target:GetUnitName().." moving to position",position)

    local player = caster:GetPlayerOwner()
    local hero = player:GetAssignedHero()
    target:SetOwner(hero)
end
```
12345678910111213141516

---

# Creating units with a duration | ModDota

**Source:** https://moddota.com/units/creating-units-with-a-duration

---


# Creating units with a duration ​

This is a quick tutorial on how to create custom units so that they appear with a circular timer next to their health bar and the time remaining on the XP bar.

If you are not sure what I am referring to then look at these images  and

The thing that we will need is modifier_kill

You can either apply it in KV using ApplyModifier or in Lua using AddNewModifier

It allows for more flexibility and allows for the proper creation of summoned timed units through Lua

## KV example ​

Here is an example of it in KV; one spider spawns without the modifier_kill and the other one with it

Note: In this example there is no difference between applying modifier_kill or using the inbuilt Duration parameter of the SpawnUnit action block

```javascript
"test_ability"
{
    // General
    "BaseClass"                "ability_datadriven"
    "AbilityBehavior"                "DOTA_ABILITY_BEHAVIOR_NO_TARGET | DOTA_ABILITY_BEHAVIOR_IMMEDIATE"
    "AbilityType"                    "DOTA_ABILITY_TYPE_BASIC"
    // Time
    "AbilityCooldown"                "0.0"
    // Cost
    "AbilityManaCost"                "0"
    // Special
    "AbilityValues"
    {
        "duration"                    "10.0"
    }
    "OnSpellStart"
    {
        "SpawnUnit"
        {
            "UnitName"    "npc_dota_broodmother_spiderling"
            "UnitCount"    "1"
            "SpawnRadius"    "200"
            "Target"        "CASTER"

            "OnSpawn"
            {
                "ApplyModifier"
                {
                    "ModifierName"    "modifier_kill"
                    "Target"        "TARGET"
                    "Duration"        "%duration"
                }
            }
        }
        "SpawnUnit"
        {
            "UnitName"    "npc_dota_broodmother_spiderling"
            "UnitCount"    "1"
            "SpawnRadius"    "200"
            "Target"        "CASTER"
        }
    }
}
```
12345678910111213141516171819202122232425262728293031323334353637383940414243
and a short video along with it

## Lua example ​

This is a really simple example on how to use it with Lua

this function will apply the modifier_kill modifier with a duration of 10 seconds after which the caster will die
lua
```javascript
function KillCaster( keys )
    local caster = keys.caster

    caster:AddNewModifier(caster, nil, "modifier_kill", {duration = 10})
end
```
12345

---

# Adding a Very Simple AI to Units | ModDota

**Source:** https://moddota.com/units/adding-a-very-simple-ai-to-units

---


# Adding a Very Simple AI to Units ​

This tutorial will cover how to issue very simple orders to units. This tutorial uses a move order to make a unit wander inside an area randomly, and a cast order to make a unit cast an untargeted spell randomly.

This tutorial assumes a basic knowledge of Lua scripting.

## Drawbacks ​

- This technique should not be used for units which need to perform more than one kind of order each. If a more advanced AI is required, you should check holdout_example's lua ai scripts.
- Some functionality is hard-coded into this script. If you want to iterate on your game and change the behaviour often, I would suggest having some global constants or loading in the values from an external KV file. Doing this allows you to keep all the values in one place.

## References ​

I've copied some units from holdout_example for testing, and copied Berserkers Call from Spell Library.

If you need help on making your own units or abilities, Noya's documentation is an excellent resource: Datadriven UnitsDataDriven Ability Breakdown - Documentation

## Hammer Setup ​

In Hammer, I've placed an info_target entity named "spawn_loc_test" which can be found in lua. This allows me to place the units spawn location in Hammer without changing the lua scripts around. If you wish to do this, give each entity a unique name and place them where you want the spawn point on your map.

## Lua Setup ​

In the InitGameMode() function we do a few things: seed the random number generator, create an empty table in order to keep track of every unit with behaviour, spawn some units, and set a thinker function up.

Settings which aren't relevant to this tutorial have been omitted, but in this function you can set up things like GameRules for your game mode.
lua
```javascript
function CAITesting:InitGameMode()
	print( "Loading AI Testing Game Mode." )
	-- SEEDING RNG IS VERY IMPORTANT
	math.randomseed(Time())

	-- Set up a table to hold all the units we want to spawn
	self.UnitThinkerList = {}

	-- Spawn some units
	for i = 1,5 do
		self:SpawnAIUnitWanderer()
	end
	for i = 1,3 do
		self:SpawnAIUnitCaster()
	end

	-- Set the unit thinker function
	GameRules:GetGameModeEntity():SetThink( "OnUnitThink", self, "UnitThink", 1 )
end
```
12345678910111213141516171819
## Spawning a Wanderer ​

This function will spawn a unit with wandering behaviour. The bounds which the unit wanders between are hard coded. An easy way to determine these bounds is to spawn a simple entity in Hammer (such as info_target), move it about and read the coordinates. In this example, my info_target entity is named "spawn_loc_test".
lua
```javascript
function CAITesting:SpawnAIUnitWanderer()
	--Start an iteration finding each entity with this name
	--If you've named everything with a unique name, this will return your entity on the first go
	local spawnVectorEnt = Entities:FindByName(nil, "spawn_loc_test")

	-- GetAbsOrigin() is a function that can be called on any entity to get its location
	local spawnVector = spawnVectorEnt:GetAbsOrigin()

	-- Spawn the unit at the location on the neutral team
	local spawnedUnit = CreateUnitByName("npc_dota_creature_kobold_tunneler", spawnVector, true, nil, nil, DOTA_TEAM_NEUTRALS)

	-- make this unit passive
	spawnedUnit:SetIdleAcquire(false)

	-- Add some variables to the spawned unit so we know its intended behaviour
	-- You can store anything here, and any time you get this entity the information will be intact
	spawnedUnit.ThinkerType = "wander"
	spawnedUnit.wanderBounds = {}
	spawnedUnit.wanderBounds.XMin = -768
	spawnedUnit.wanderBounds.XMax = 768
	spawnedUnit.wanderBounds.YMin = -64
	spawnedUnit.wanderBounds.YMax = 768

	-- Add a random amount to the game time to randomise the behaviour a bit
	spawnedUnit.NextOrderTime = GameRules:GetGameTime() + math.random(5, 10)

	-- finally, insert the unit into the table
	table.insert(self.UnitThinkerList, spawnedUnit)
end
```
1234567891011121314151617181920212223242526272829
## Spawning a Caster ​

This function will spawn a unit with casting behaviour. The bounds which the unit is spawned in are hard coded. The spell is an untargeted spell which requires no additional variables to cast.
lua
```javascript
function CAITesting:SpawnAIUnitCaster()
	-- Generate a random location inside the neutrals area
	local spawnVector = Vector(math.random(-768, 768), math.random(-64, 768), 128)

	-- Spawn the unit at the location on the neutral team
	local spawnedUnit = CreateUnitByName("npc_dota_creature_gnoll_assassin", spawnVector, true, nil, nil, DOTA_TEAM_NEUTRALS)

	-- make this unit passive
	spawnedUnit:SetIdleAcquire(false)

	-- Add some variables to the spawned unit so we know its intended behaviour
	-- You can store anything here, and any time you get this entity the information will be intact
	spawnedUnit.ThinkerType = "caster"
	spawnedUnit.CastAbilityIndex = spawnedUnit:GetAbilityByIndex(0):entindex()

	-- Add a random amount to the game time to randomise the behaviour a bit
	spawnedUnit.NextOrderTime = GameRules:GetGameTime() + math.random(5, 10)

	-- finally, insert the unit into the table
	table.insert(self.UnitThinkerList, spawnedUnit)
end
```
123456789101112131415161718192021
## Thinker Function ​

This function gets called every second. It will read each of the units and determine if they should be issued with a new order, then issue that order.
lua
```javascript
function CAITesting:OnUnitThink()
	if GameRules:State_Get() == DOTA_GAMERULES_STATE_GAME_IN_PROGRESS then

		local deadUnitCount = 0

		-- Check each of the units in this table for their thinker behaviour
		for ind, unit in pairs(self.UnitThinkerList) do

			-- The first check should be to see if the units are still alive or not.
			-- Keep track of how many units are removed from the table, as the indices will change by that amount
			if unit:IsNull() or not unit:IsAlive() then
				table.remove(self.UnitThinkerList, ind - deadUnitCount)
				deadUnitCount = deadUnitCount + 1

			-- Check if the game time has passed our random time for next order
			elseif GameRules:GetGameTime() > unit.NextOrderTime then

				if unit.ThinkerType == "wander" then
					--print("thinker unit is a wanderer")
					--print("time: " .. GameRules:GetGameTime() .. ". next wander: " .. unit.NextWanderTime)

					-- Generate random coordinates to wander to
					local x = math.random(unit.wanderBounds.XMin, unit.wanderBounds.XMax)
					local y = math.random(unit.wanderBounds.YMin, unit.wanderBounds.YMax)
					local z = GetGroundHeight(Vector(x, y, 128), nil)

					print("wandering to x: " .. x .. " y: " .. y)

					-- Issue the movement order to the unit
					unit:MoveToPosition(Vector(x, y, z))


				elseif unit.ThinkerType == "caster" then

					-- If you want a more complicated order, use this syntax
					-- Some more documentation: https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Scripting/API/Global.ExecuteOrderFromTable
					-- Unit order list is here: https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Panorama/Javascript/API#dotaunitorder_t
					-- (Ignore the dotaunitorder_t. on each one)

					print("casting ability " .. EntIndexToHScript(unit.CastAbilityIndex):GetName())

					local order = {
						UnitIndex = unit:entindex(),
						AbilityIndex = unit.CastAbilityIndex,
						OrderType = DOTA_UNIT_ORDER_CAST_NO_TARGET,
						Queue = false
					}
					ExecuteOrderFromTable(order)
				end

				-- Generate the next time for the order
				unit.NextOrderTime = GameRules:GetGameTime() + math.random(5, 10)
			end
		end

		-- Make sure our testing map stays on day time
		if not GameRules:IsDaytime() then
			GameRules:SetTimeOfDay(0.26)
		end

	elseif GameRules:State_Get() >= DOTA_GAMERULES_STATE_POST_GAME then
		return nil
	end

	-- this return statement means that this thinker function will be called again in 1 second
	-- returning nil will cause the thinker to terminate and no longer be called
	return 1
end
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647484950515253545556575859606162636465666768
## Finishing Up ​

If you need more advanced behaviour, an AI script should be used. The method covered in this tutorial can be extended up to a point however, for example casting a ground-targeted ability in a random area would be possible using only code posted here.

The full files for this example can be found here: https://github.com/Wigguno/AITesting

If you have any questions, the ModDota Discord helpdesk channel is always happy to help.


---

# Writing a simple AI for neutrals | ModDota

**Source:** https://moddota.com/units/simple-neutral-ai

---


# Writing a simple AI for neutrals ​

INFO

This article is a rewrite of a very old AI tutorial: http://yrrep.me/dota/dota-simple-ai.html

I have encountered many questions about AI on the modding irc over the time, so I decided to write up a tutorial for a very basic AI that can be used in Lua. The term AI might seem intimidating as a programmer that has little to no experience with it. I will try however to lay out the process for a simple state-driven AI in a way that is as clear as possible. Hopefully by the end of this article writing your own AI does not seem as scary anymore.

## What are we making ​

We will make a little state-driven AI that mimics how neutrals behave in DotA 2. This means it will do these things:

- It will stand idle in its location until an enemy comes in range.
- After spotting an enemy it will run to attack them.
- If the neutral runs too far from its initial 'idle location' it will return back to it.
- Repeat from the first point.

The first phase to making reliable AI (in the sense that it will always do what you expect it to) is planning. I personally think that making a diagram representing the different states and the transitions between these states are a big help when making an AI like this. The more effort you put into this diagram, the easier the actual implementation of your AI will be.

For our neutral example I have translated the text describing the unit's behaviour into a state diagram, which contains all possible states and the conditions for transitioning between these states. The result is the following diagram:

These diagrams can be made with any software with drawing possibilities such as paint, photoshop or word. I really like using https://www.draw.io/, which is an online drawing tool specialised for drawing diagrams and graphs.

In the diagram you can see the different states represented by boxes and transitions represented by arrows. The labels on the arrows describe when this transition happens.

## Implementing a single state ​

To show how to translate one state to code I will give the example implementation of the aggressive state. I am implementing each state as a 'think' function that will check if any of the transition conditions are true, and execute that transition if they are true.

Look at the 'Aggressive' state in the above diagram. It has two transitions, so I would expect the 'AggressiveThink' function to contain one check for 'Target died', one check for 'Out of leash range', and some aggressive behavior that happens inside the state.

This translates to the following code:
lua
```javascript
function modifier_ai:AggressiveThink()
    -- Check if the unit has walked outside its leash range
    if (self.spawnPos - self.unit:GetAbsOrigin()):Length() > self.leashRange then
        self.unit:MoveToPosition(self.spawnPos) --Move back to the spawnpoint
        self.state = AI_STATE_RETURNING --Transition the state to the 'Returning' state(!)
        return -- Stop processing this state
    end

    -- Check if the target has died
    if not self.aggroTarget:IsAlive() then
        self.unit:MoveToPosition(self.spawnPos) --Move back to the spawnpoint
        self.state = AI_STATE_RETURNING --Transition the state to the 'Returning' state(!)
        return -- Stop processing this state
    end

    -- Still in the aggressive state, so do some aggressive stuff.
    self.unit:MoveToTargetToAttack(self.aggroTarget)
end
```
123456789101112131415161718
This way of translating your state diagram to code will always work as long as you can write code describing your transition conditions.

## AI as Lua modifier ​

Now we have one function that describes one 'tick' of one of our AI states, how do we make sure this is called?

The easiest way to create an AI tied to one unit is to make the AI a Lua modifier. This modifier has some very convenient properties built in:

- The AI will stop once the unit dies
- The modifier provides convenient created/destroyed handlers to setup/cleanup your AI
- The modifier provides an interval think

So really, the very core of your AI comes down to calling StartIntervalThink(interval) in your modifier's OnCreated, and then in the OnIntervalThink calling the correct 'state' function that you created like in the previous section.

## Complete AI modifier ​

Below is the complete state diagram from above implemented as AI. This AI can be added to unit by calling:
lua
```javascript
unit:AddNewModifier(nil, nil, "modifier_ai", { aggroRange = 600, leashRange = 600 });
```
1
I pass in some parameters to the AI behavior when I apply it, allowing for customization per-unit. Keep in mind this modifier is just like any other Lua modifier, so you can execute any code you can also call in regular modifiers.
lua
```javascript
modifier_ai = class({})

local AI_STATE_IDLE = 0
local AI_STATE_AGGRESSIVE = 1
local AI_STATE_RETURNING = 2

local AI_THINK_INTERVAL = 0.5

function modifier_ai:OnCreated(params)
    -- Only do AI on server
    if IsServer() then
        -- Set initial state
        self.state = AI_STATE_IDLE

        -- Store parameters from AI creation:
        -- unit:AddNewModifier(caster, ability, "modifier_ai", { aggroRange = X, leashRange = Y })
        self.aggroRange = params.aggroRange
        self.leashRange = params.leashRange

        -- Store unit handle so we don't have to call self:GetParent() every time
        self.unit = self:GetParent()

        -- Set state -> action mapping
        self.stateActions = {
            [AI_STATE_IDLE] = self.IdleThink,
            [AI_STATE_AGGRESSIVE] = self.AggressiveThink,
            [AI_STATE_RETURNING] = self.ReturningThink,
        }

        -- Start thinking
        self:StartIntervalThink(AI_THINK_INTERVAL)
    end
end

function modifier_ai:OnIntervalThink()
    -- Execute action corresponding to the current state
    self.stateActions[self.state](self)
end

function modifier_ai:IdleThink()
    -- Find any enemy units around the AI unit inside the aggroRange
    local units = FindUnitsInRadius(self.unit:GetTeam(), self.unit:GetAbsOrigin(), nil,
        self.aggroRange, DOTA_UNIT_TARGET_TEAM_ENEMY, DOTA_UNIT_TARGET_ALL, DOTA_UNIT_TARGET_FLAG_NONE,
        FIND_ANY_ORDER, false)

    -- If one or more units were found, start attacking the first one
    if #units > 0 then
        self.spawnPos = self.unit:GetAbsOrigin() -- Remember position to return to
        self.aggroTarget = units[1] -- Remember who to attack
        self.unit:MoveToTargetToAttack(self.aggroTarget) --Start attacking
        self.state = AI_STATE_AGGRESSIVE --State transition
        return -- Stop processing this state
    end

    -- Nothing else to do in Idle state
end

function modifier_ai:AggressiveThink()
    -- Check if the unit has walked outside its leash range
    if (self.spawnPos - self.unit:GetAbsOrigin()):Length() > self.leashRange then
        self.unit:MoveToPosition(self.spawnPos) --Move back to the spawnpoint
        self.state = AI_STATE_RETURNING --Transition the state to the 'Returning' state(!)
        return -- Stop processing this state
    end

    -- Check if the target has died
    if not self.aggroTarget:IsAlive() then
        self.unit:MoveToPosition(self.spawnPos) --Move back to the spawnpoint
        self.state = AI_STATE_RETURNING --Transition the state to the 'Returning' state(!)
        return -- Stop processing this state
    end

    -- Still in the aggressive state, so do some aggressive stuff.
    self.unit:MoveToTargetToAttack(self.aggroTarget)
end

function modifier_ai:ReturningThink()
    -- Check if the AI unit has reached its spawn location yet
    if (self.spawnPos - self.unit:GetAbsOrigin()):Length() < 10 then
        self.state = AI_STATE_IDLE -- Transition the state to the 'Idle' state(!)
        return -- Stop processing this state
    end

    -- If not at return position yet, try to move there again
    self.unit:MoveToPosition(self.spawnPos)
end
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647484950515253545556575859606162636465666768697071727374757677787980818283848586
## Your next (more complicated) AI ​

This tutorial only covers very basic concepts for making your first AI, but if you want to extend this here are some more interesting ideas:

- Since you are using a lua modifier, you do not have to change state in a think function, you can also just register a modifier event listener and change state inside those!
- Generalize state classes and give each state OnStateEnter, OnStateThink and OnStateLeave functions.
- You can nest these AIs! You could make the internal behavior of one state be its own AI built in the same way.


---

# Create Creature AttachWearable blocks directly from the keyvalues | ModDota

**Source:** https://moddota.com/units/create-creature-attachwearable-blocks-directly-from-the-keyvalues

---


# Create Creature AttachWearable blocks directly from the keyvalues ​

For those still Ctrl+F'ing and copying from items_game.txt I bring you the better solution:

First, "Map" the valid wearables from items_game:
lua
```javascript
function MapWearables()
    GameRules.items = LoadKeyValues("scripts/items/items_game.txt")['items']
    GameRules.modelmap = {}
    for k,v in pairs(GameRules.items) do
        if v.name and v.prefab ~= "loading_screen" then
            GameRules.modelmap[v.name] = k
        end
    end
end
```
123456789
Then, there's 2 options:

- Generate a default set for a hero name (internal npc_dota_hero_name)
- Generate a bundle set, you can use this list for set names: https://dota2.gamepedia.com/Equipment

Usage

- For default hero sets, run GenerateDefaultBlock(hero_name)
- For generating a bundle set, run: GenerateBundleBlock(set_name)

Code, using 4 space indents
lua
```javascript
function GenerateDefaultBlock( heroName )
    print("    \"Creature\"")
    print("    {")
    print("        \"AttachWearables\" ".."// Default "..heroName)
    print("        {")
    local defCount = 1
    for code,values in pairs(GameRules.items) do
        if values.name and values.prefab == "default_item" and values.used_by_heroes then
            for k,v in pairs(values.used_by_heroes) do
                if k == heroName then
                    local itemID = GameRules.modelmap[values.name]
                    GenerateItemDefLine( defCount, itemID, values.name )
                    defCount = defCount + 1
                end
            end
        end
    end
    print("        }")
    print("    }")
end

function GenerateBundleBlock( setname )
    local bundle = {}
    for code,values in pairs(GameRules.items) do
        if values.name and values.name == setname and values.prefab and values.prefab == "bundle" then
            bundle = values.bundle
        end
    end

    print("    \"Creature\"")
    print("    {")
    print("        \"AttachWearables\" ".."// "..setname)
    print("        {")
    local wearableCount = 1
    for k,v in pairs(bundle) do
        local itemID = GameRules.modelmap[k]
        if itemID then
            GenerateItemDefLine(wearableCount, itemID, k)
            wearableCount = wearableCount+1
        end
    end
    print("        }")
    print("    }")
end

function GenerateItemDefLine( i, itemID, comment )
    print("            \""..tostring(i).."\" { ".."\"ItemDef\" \""..itemID.."\" } // "..comment)
end
```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748

---

