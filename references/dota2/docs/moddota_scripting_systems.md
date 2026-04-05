# ModDota Scripting Systems 文档

> 本文档爬取自 https://moddota.com/scripting/ 系统相关子页面
> 生成日期: 2024年

---

## 目录

1. [Custom Mana System](#custom-mana-system)
2. [Item Restrictions/Requirements](#item-restrictionsrequirements)
3. [Item Drop System](#item-drop-system)
4. [Making an RPG-like Looting Chest](#making-an-rpg-like-looting-chest)
5. [Scripted Shop Spawning](#scripted-shop-spawning)
6. [Lava Damage](#lava-damage)
7. [Using Dota Filters](#using-dota-filters)
8. [Particle Attachment](#particle-attachment)
9. [Vector Math](#vector-math)

---

# Custom Mana System | ModDota

**Source:** https://moddota.com/scripting/custom-mana-system

---


# Custom Mana System ​

This is a guide to make a simple custom mana system. A working barebones addon is assumed.

In this example we'll make a classic Rage system, meaning:

1. No normal mana regeneration, starting mana 0
2. Gain mana after an attack, scaling with level
3. Gain mana after being attacked, scaling with level
4. Gain mana on particular spell cast
5. Decrease mana over time, scaling with level

## No normal mana regeneration and start mana at 0 ​

The easier approach is to nullify your hero's Intelligence For this you'll need to set the following in your hero definition

```javascript
//KV code inside npc_heroes_custom.txt
"AttributeBaseIntelligence" "0" // Base intelligence
"AttributeIntelligenceGain" "0" // Intelligence bonus per level.

"StatusMana"	"50"    // Initial Max Mana
"StatsManaRegen"	"0"	// Base Mana Regen (KV doesn't like negative numbers here)
```
123456
If you need to keep your Int stat but still have 0 natural mana regen, you'll need to apply modifiers for each Int point with negative mana regen to compensate.

I won't be following this process in this guide, but you can check the guide on the wiki.

For your mana to start at 0, we'll begin by making the passive hidden ability which will be the base for our Rage system:

```javascript
//KV code inside npc_abilities_custom.txt
"barbarian_rage"
{
    "BaseClass" "ability_datadriven"
    "AbilityTextureName"	"barbarian_rage"
    "MaxLevel" "1"
    "AbilityBehavior"	"DOTA_ABILITY_BEHAVIOR_PASSIVE | DOTA_ABILITY_BEHAVIOR_HIDDEN"

    "Modifiers"
    {
        "rage_modifier"
        {
            "Passive"	"1"	//Auto apply this modifier when the spell is learned
            "IsBuff"	"1"	//Display as a green modifier
            "IsHidden"	"0"	//Show in the UI

            "OnCreated"
            {
                "RunScript"
                {
                    "ScriptFile"	"barbarian.lua"
                    "Function"	"ZeroManaOnSpawn"
                }
            }
        }
    }
}
```
123456789101112131415161718192021222324252627
This requires a barbarian.lua script inside your_addon/scripts/vscripts folder. The script is very simple:
lua
```javascript
-- lua code inside barbarian.lua
    function ZeroManaOnSpawn( event )
        local hero = event.caster
        Timers:CreateTimer(.01, function()
        -- Set Mana to 0 on created
        hero:SetMana(0)
    end)
 end
```
12345678
We need to do a wait a bit for the hero to be properly spawned else it might fail. Notice the use of BMD's Timers.

### Before we continue: ​

Right now our spell is not even available on the hero, and we want it to be learned when we spawn. For this we'll need to add the following in our OnHeroInGame* listener (*function hook of npc_spawned, see barebones Event Hooks )
lua
```javascript
-- lua code inside OnHeroInGame(hero)
local heroName = hero:GetUnitName()
if heroName == "npc_dota_hero_beastmaster" then
    -- Add the spell
    hero:AddAbility("barbarian_rage")
    -- Level it up
    hero:FindAbilityByName("barbarian_rage"):SetLevel(1)
end
```
12345678
The if is not exactly necessary but you'll need to filter your desired hero somehow. We'll use Beastmaster for our example

## Gain mana after an attack, scaling with level ​

Our rage_modifier block gains another modifier event:

```javascript
"OnAttackLanded"
{
    "RunScript"
    {
        "ScriptFile"	"barbarian.lua"
        "Function"	"ManaOnAttack"
    }
}
```
12345678
I'll use a basic formula for it, which gives a base mana per attack but also scales with levels slightly. Keep in mind this function is used for a 200 hero level system, so if you have something different or bigger mana costs, you need to adjust to your liking.
lua
```javascript
-- lua code inside barbarian.lua
function ManaOnAttack( event )
    local hero = event.caster
    local level = hero:GetLevel()

    hero:GiveMana(0.01 * level + 3)
end
```
1234567
## Gain mana after being attacked, scaling with level ​

Our modifier block gains another modifier event:

```javascript
"OnAttacked"
{
   "RunScript"
    {
        "ScriptFile"	"barbarian.lua"
        "Function"	"ManaOnAttacked"
    }
}
```
12345678
Same as before, another different formula can be used, we will give a bit less mana on attacked.
lua
```javascript
function ManaOnAttacked( event )
   local hero = event.caster
   local level = hero:GetLevel()

   hero:GiveMana(0.01 * level + 0.4)
end
```
123456
## Gain mana on particular spell cast ​

```javascript
"OnSpellStart"
{
    "RunScript"
    {
        "ScriptFile"	"barbarian.lua"
        "Function"	"leap"
    }
}
```
12345678
Then in your lua spell script we need to have this somewhere:
lua
```javascript
local manaGain = event.ability:GetSpecialValueFor("mana_gain")
event.caster:GiveMana(manaGain)
```
12
This will take your "mana_gain" from AbilityValues, in my leap example it would be:

```javascript
"AbilityValues"
{
  "mana_gain" "8 16 25 35 47 60 72 85"
}
```
1234
## Decrease mana over time, scaling with level ​

In the beginning we had set our StatsManaRegen to 0. This is done to properly control the mana regen dynamically in our main lua file.

Base Mana Regen will need to be updated when the hero spawns OnHeroInGame, and then each time he levels up OnPlayerLevelUp if we want it to scale.

For this we create a local function somewhere inside our main addon lua file and call it whenever we need (at least once OnHeroInGame):
lua
```javascript
function AdjustWarriorClassMana( hero )
    Timers:CreateTimer(0.1,function()
        local heroLevel = hero:GetLevel()
        -- Adjust the new mana regen
        hero:SetBaseManaRegen( -(0.01 * heroLevel) - 0.25)
    end)
end
```
1234567
With this, our hero's mana will decrease over time by ~0.3 and slightly faster on higher levels.

Check the original complete file scripts in TBR Github

- main lua scripts
- barbarian lua scripts
- heroes_custom file
- abilities file


---

# Item Restrictions & Requirements | ModDota

**Source:** https://moddota.com/scripting/item-restrictions-requirements

---


# Item Restrictions & Requirements ​

This implements the following mechanic:

## Step 1. Key Values Table ​

First create a text file to write down your item properties. File Name, extension and path can be anything as long as the file structure is a proper table.

For this example, we will use this path: scripts/maps/item_info.kv

```javascript
"Items"
{
    "item_name_here" //change it to a custom items
    {
        "levelRequired"	"10"
        "classRequired"	"Warrior"
    }

    "item_other_name_here"
    {
        "levelRequired"	"25"
    }
}
```
12345678910111213
To load a table into your game mode, you need to use the LoadKeyValues( "path/to/file" ) lua function. This can be called at GameMode:InitGameMode() inside your main lua addon. GameMode = self
lua
```javascript
self.ItemInfoKV = LoadKeyValues( "scripts/maps/item_info.kv" )
```
1
If your table is badly formed (e.g. you missed a quotation mark or a bracket), this will fail and you'll get a lua console error when starting the game.

Note how I didn't add a "classRequired" to the 2nd item. When trying to access the GameMode.ItemInfoKV[itemNane].classRequired value will be nil, meaning there is no restriction on class (but still checks the level)

There are many ways to set a class, the most basic one is indexing .class in the hero handle the first time the hero is in game (using the barebones.lua default calls)
lua
```javascript
function GameMode:OnHeroInGame(hero)

    if heroName == "npc_dota_hero_axe" then
        hero.class = "Warrior"
        print("Axe is ready!")
    end

end
```
12345678
## Step 2. OnEquip Ability Event ​

Add this datadriven event on every item that needs to do a check for restrictions. It calls a lua script to do the logic check against the table.

This is needed because the listener for inventory changed is broken, and the Lua OnItemPickedUp event hook doesn't account for someone dragging an item into another players inventory.

```javascript
"OnEquip"
{
    "RunScript"
    {
        "ScriptFile"	"items.lua"
        "Function"	"ItemCheck"
    }
}
```
12345678
## Step 3. Lua Script ​

In this example, I'll look for Level and Class requirements

Make use of the CustomError Flash UI by zedor to display a red error message when the item doesn't meet any criteria found in the table.

There are some DeepPrintTable and print to check that the table is being reviewed as you expect.
lua
```javascript
function ItemCheck( event )
    local itemName = event.ability:GetAbilityName()
    local hero = EntIndexToHScript( event.caster_entindex )
    local itemTable = GameMode.ItemInfoKV[itemName]
    print("Checking Restrictions for "..itemName)
    DeepPrintTable(itemTable)

    -- if there is no subtable for this item, end this script
    if itemTable == nil then
        return true
    end

    -- This timer is needed because OnEquip triggers before the item actually being in inventory
    Timers:CreateTimer(0.1,function()
        -- Go through every item slot
        for itemSlot = 0, 5, 1 do
            local Item = hero:GetItemInSlot( itemSlot )
            -- When we find the item we want to check
            if Item ~= nil and itemName == Item:GetName() then
                DeepPrintTable(Item)

                -- Check Level Restriction
                if itemTable.levelRequired then
                    print("Name","Level Req","Hero Level")
                    print(itemName,itemTable.levelRequired,hero:GetLevel())
                    -- If the hero doesn't meet the level required, show message and call DropItem
                    if itemTable.levelRequired > hero:GetLevel() then
                        FireGameEvent( 'custom_error_show', { player_ID = pID, _error = "You need level "..itemTable.levelRequired.." to use this." } )
                        DropItem(Item, hero)
                    end
                end

                -- Check Class Restriction
                if itemTable.classRequired then
                    print("Name","Class Req","Hero Class")
                    print(itemName,itemTable.classRequired,hero.class)
                    -- If the item is for an specific class, message and drop
                    if itemTable.classRequired ~= hero.class then
                        FireGameEvent( 'custom_error_show', { player_ID = pID, _error = "Requires ".. hero.class .." to use." } )
                        DropItem(Item, hero)
                    end
                end
            end
        end
    end)
end

function DropItem( item, hero )
    -- Error Sound
    EmitSoundOnClient("General.CastFail_InvalidTarget_Hero", hero:GetPlayerOwner())

    -- Create a new empty item
    local newItem = CreateItem( item:GetName(), nil, nil )
    newItem:SetPurchaseTime( 0 )

    -- This is needed if you are working with items with charges, uncomment it if so.
    -- newItem:SetCurrentCharges( goldToDrop )

    -- Make a new item and launch it near the hero
    local spawnPoint = Vector( 0, 0, 0 )
    spawnPoint = hero:GetAbsOrigin()
    local drop = CreateItemOnPositionSync( spawnPoint, newItem )
    newItem:LaunchLoot( false, 200, 0.75, spawnPoint + RandomVector( RandomFloat( 50, 150 ) ) )

    --finally, remove the item
    hero:RemoveItem(item)
end
```
12345678910111213141516171819202122232425262728293031323334353637383940414243444546474849505152535455565758596061626364656667

---

# Item Drop System | ModDota

**Source:** https://moddota.com/scripting/item-drop-system

---


# Item Drop System ​

Here I'll go over the implementation of a flexible item drop system for any sort of gamemode, mostly useful for RPGs.

There are multiple ways to do this, for example Warchasers uses a pure datadriven system that goes over 2 thousand lines of abilities, each one for a different drop type... yeah you don't want to do that 😅

The best way for this is to have a text file to configure what items can drop from each unit, how many, its chances, etc, then whenever a unit dies, if it has an entry for item drops, handle the chances and drops accordingly, with a couple of choices that can be further extended if necessary.

## Step 1. Key Values Table ​

I recommend having a kv folder under scripts to store this and other similar table files. The file can have any extension, but using .kv is a good convention.

```javascript
"Drops"
{
    "creature_name1"
    {
        "item_name1" "10"
        "item_name2" "50"
        "item_name3" "100"
    }
}
```
123456789
This table will set a creature to drop the first item with 10% chance, 50% on the second, and the third item will be dropped every time.

After saving and naming the file, this table has to be loaded in Lua, ideally in the initialization of the game mode, using the LoadKeyValues("relative/path/to/file") this way:
lua
```javascript
GameRules.DropTable = LoadKeyValues("scripts/kv/item_drops.kv")
```
1
In this initial version, each item drop chance is independent from the others. From the same creature there might be 1 drop, all of them, or none (if the chances are all less than 100). This behavior will be expanded later to provide some of the classic drop options.

## Step 2. OnEntityKilled Lua Event ​

Simply listen to entity_killed and call a custom RollDrops function with the killed unit as a parameter.
lua
```javascript
ListenToGameEvent('entity_killed', Dynamic_Wrap(GameMode, 'OnEntityKilled'), self)
```
1lua
```javascript
function GameMode:OnEntityKilled( keys )
    local killedUnit = EntIndexToHScript( keys.entindex_killed )
    if killedUnit:IsCreature() then
        RollDrops(killedUnit)
    end
end
```
123456
## Step 3. RollDrops Lua Script ​

Now given the subtable of the unit name contained in the main Drop Table, if it exists, iterate over the elements rolling each chance value.

If the Roll succeeds, proceed to create an item handle with the name, and LaunchLoot it with some fancy parameters (could also just use a CreateItemOnPositionSync to drop the item instantly at the death position)
lua
```javascript
function RollDrops(unit)
    local DropInfo = GameRules.DropTable[unit:GetUnitName()]
    if DropInfo then
        for item_name,chance in pairs(DropInfo) do
            if RollPercentage(chance) then
                -- Create the item
                local item = CreateItem(item_name, nil, nil)
                local pos = unit:GetAbsOrigin()
                local drop = CreateItemOnPositionSync( pos, item )
                local pos_launch = pos+RandomVector(RandomFloat(150,200))
                item:LaunchLoot(false, 200, 0.75, pos_launch, nil)
            end
        end
    end
end
```
123456789101112131415
## Step 4. Extending the solution to allow multiple drops of the same item ​

The way Lua KV tables work, it's not possible to have more than 1 of the same index, so if we were to add 2 "item_name1" entries both with some chance value, LoadKeyValues would fail.

To get around this, the table has to use another level and have each possible item drop of the unit be a table by itself:

```javascript
"Drops"
{
    "creature_name1"
    {
        "1"
        {
            "Item"     "item_name1"
            "Chance"   "10"
            "Multiple" "3"
        }
        "2"
        {
            "Item"     "item_name2"
            "Chance"   "50"
            "Multiple" "1"
        }
    }
}
```
123456789101112131415161718
This structure along with the Multiple value will allow an item to be dropped more than once from the same creature. "Multiple" "1" will just be 1 drop max.

The RollDrops function needs to be adjusted to read the subtables and the Item/Chance in a slightly different way:
lua
```javascript
function RollDrops(unit)
    local DropInfo = GameRules.DropTable[unit:GetUnitName()]
    if DropInfo then
        for k,ItemTable in pairs(DropInfo) do
            local chance = ItemTable.Chance or 100
            local max_drops = ItemTable.Multiple or 1
            local item_name = ItemTable.Item
            for i=1,max_drops do
                if RollPercentage(chance) then
                    print("Creating "..item_name)
                    local item = CreateItem(item_name, nil, nil)
                    item:SetPurchaseTime(0)
                    local pos = unit:GetAbsOrigin()
                    local drop = CreateItemOnPositionSync( pos, item )
                    local pos_launch = pos+RandomVector(RandomFloat(150,200))
                    item:LaunchLoot(false, 200, 0.75, pos_launch, nil)
                end
            end
        end
    end
end
```
123456789101112131415161718192021
The 'or 100' and 'or 1' are just to make sure that if the "Chance" or "Multiple" lines are missing, a default value ('drop always' and 'drop 1') will be used.

## Step 5. Extending to "100% drop one of these" ​

Sometimes doing "50% of item 1 and 50% of item 2" is too random, because it will mean sometimes a mob will drop nothing, and sometimes it might drop 2. In order to reduce the randomness and ensure a certain combination of items will drop, the most common approach is to have a set list of possible drops, and make it so that the unit will drop only one of that set at random.

To do this, instead of tying a single item to each item table, there will be yet another table of the {possible Set of items} that we want this creature to drop:

```javascript
"Drops"
{
    "creature_name1"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_name_set1"
                "2" "item_name_set2"
                "3" "item_name_set3"
            }
            "Chance"   "100" //of dropping 1 of the set
        }
        "2"
        {
            "Item"     "item_name2"
            "Chance"   "50"
            "Multiple" "3"
        }
    }
}
```
12345678910111213141516171819202122
The ItemSets entry could also have a "Multiple" kv if we wanted an scenario like "2 of these 3", but this can't guarantee that the 2nd roll won't drop the same item as the first, if it did.

And the RollDrops now looks like this:
lua
```javascript
function RollDrops(unit)
    local DropInfo = GameRules.DropTable[unit:GetUnitName()]
    if DropInfo then
        print("Rolling Drops for "..unit:GetUnitName())
        for k,ItemTable in pairs(DropInfo) do
            -- If its an ItemSet entry, decide which item to drop
            local item_name
            if ItemTable.ItemSets then
            	-- Count how many there are to choose from
            	local count = 0
            	for i,v in pairs(ItemTable.ItemSets) do
            		count = count+1
            	end
                local random_i = RandomInt(1,count)
                item_name = ItemTable.ItemSets[tostring(random_i)]
            else
                item_name = ItemTable.Item
            end
            local chance = ItemTable.Chance or 100
            local max_drops = ItemTable.Multiple or 1
            for i=1,max_drops do
            	print("Rolling chance "..chance)
                if RollPercentage(chance) then
                    print("Creating "..item_name)
                    local item = CreateItem(item_name, nil, nil)
                    item:SetPurchaseTime(0)
                    local pos = unit:GetAbsOrigin()
                    local drop = CreateItemOnPositionSync( pos, item )
                    local pos_launch = pos+RandomVector(RandomFloat(150,200))
                    item:LaunchLoot(false, 200, 0.75, pos_launch, nil)
                end
            end
        end
    end
end
```
1234567891011121314151617181920212223242526272829303132333435
## Example item_drops.kv file ​

```javascript
"Drops"
{
    //===============================================
    // ItemDrops UI Configuration
    //===============================================

    "MaxTime"        "60"
    "MaxDropsOnScreen"  "3"

    "ItemQualityColors"
    {
        "artifact"  "#FFA500" //Orange
        "epic"      "#8847FF" //Purple
        "rare"      "#4B69FF" //Blue
        "common"    "#00FF00" //Lime Green
        "component" "#FFFFFF" //White
        "consumable" "#FFFFFF" //White
    }

    // Don't fire the item_drop event for these
    "ExcludedQualities"
    {
        "consumable" "1"
        "component"  "1"
    }

    //===============================================
    // Roll Drops Configuration
    // Zone Specific
    //===============================================

    //===============================================
    // Titans
    //===============================================

    "titan_Avatar_of_Earth"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_boots_of_agility_16"
                "2" "item_cloak_of_flames_25"
                "3" "item_gauntlets_of_might_16"
                "4" "item_orb_of_mana"
                "5" "item_life_gem"
                "6" "item_firehand_gauntlets_20"
                "7" "item_robes_of_enlightenment_16"
            }
            "Chance"   "100"
        }
    }
    "titan_Avatar_of_Nature"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_boots_of_agility_16"
                "2" "item_heros_blade"
                "3" "item_gauntlets_of_might_16"
                "4" "item_orb_of_mana"
                "5" "item_ring_of_spell_power"
                "6" "item_heros_hauberk"
                "7" "item_robes_of_enlightenment_16"
                "8" "item_ring_of_healing_power"
            }
            "Chance"   "100"
        }
    }
    "titan_Avatar_of_Justice"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_boots_of_agility_16"
                "2" "item_cloak_of_flames_25"
                "3" "item_gauntlets_of_might_16"
                "4" "item_orb_of_mana"
                "5" "item_life_gem"
                "6" "item_firehand_gauntlets_20"
                "7" "item_robes_of_enlightenment_16"
            }
            "Chance"   "100"
        }
    }
    "titan_Avatar_of_Death"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_tbr_ring_of_health"
                "3" "item_pendant_of_energy"
            }
            "Chance"   "100"
        }
    }
    "titan_Avatar_of_the_Sky"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_tbr_ring_of_health"
                "3" "item_pendant_of_energy"
            }
            "Chance"   "100"
        }
    }
    "titan_Avatar_of_Sacrifice"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_tbr_ring_of_health"
                "3" "item_pendant_of_energy"
            }
            "Chance"   "100"
        }
    }
    "titan_Avatar_of_the_Sea"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_tbr_ring_of_health"
                "3" "item_pendant_of_energy"
            }
            "Chance"   "100"
        }
    }
    "titan_Mother_of_Earth"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_tbr_ring_of_health"
                "3" "item_pendant_of_energy"
            }
            "Chance"   "100"
        }
    }

    //===============================================
    // Demon Area
    //===============================================

	"demon_imp"     // noob tier
    {
        "1"
        {
            "Item"     "item_potion_of_minor_healing"
            "Chance"   "10"
        }
        "2"
        {
            "Item"     "item_gold_bag_100"
            "Chance"   "10"
        }
        "3"
        {
            "ItemSets"
            {
                "1" "item_talisman_of_health"
                "2" "item_ring_of_regeneration"
                "3" "item_apprentice_robes"
                "4" "item_hard_leather_armor"
                "5" "item_ring_mail"
            }
            "Chance"   "3"
        }
    }

    "demon_hound"   // noob tier
    {
        "1"
        {
            "Item"     "item_potion_of_minor_healing"
            "Chance"   "10"
        }
        "2"
        {
            "Item"     "item_potion_of_minor_healing"
            "Chance"   "10"
        }
        "3"
        {
            "Item"     "item_gold_bag_100"
            "Chance"   "10"
        }
        "4"
        {
            "ItemSets"
            {
                "1" "item_talisman_of_health"
                "2" "item_ring_of_regeneration"
                "3" "item_apprentice_robes"
                "4" "item_hard_leather_armor"
                "5" "item_ring_mail"
            }
            "Chance"   "8"
        }
    }

    "demon_fire"    // noob tier
    {
        "1"
        {
            "Item"     "item_potion_of_minor_healing"
            "Chance"   "10"
        }
        "2"
        {
            "Item"     "item_potion_of_minor_healing"
            "Chance"   "10"
        }
        "3"
        {
            "Item"     "item_gold_bag_100"
            "Chance"   "10"
        }
        "4"
        {
            "ItemSets"
            {
                "1" "item_talisman_of_health"
                "2" "item_ring_of_regeneration"
                "3" "item_apprentice_robes"
                "4" "item_hard_leather_armor"
                "5" "item_ring_mail"
            }
            "Chance"   "5"
        }
    }

    "forest_bear"   // tier 1
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "nukacha"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_tbr_ring_of_health"
                "3" "item_pendant_of_energy"
                //"4" "item_goldbag" // It spawns between 1 to 6 Gold Bags of 50 gold each
            }
            "Chance"   "100"
        }
    }

    //===============================================
    // Goblin Area
    //===============================================

    "goblin"        // tier 1
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "shaman"        // tier 1
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }
    //===============================================
    // Black Goblin Area
    //===============================================

    "black_goblin"  // tier 1
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "black_shaman"  // tier 1
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "ogre"          // tier 1
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "rokthul"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_boots_of_agility_8"
                "2" "item_medallion_of_stamina"
                "3" "item_pendant_of_mana"
                "4" "item_gauntlets_of_might_8"
                "5" "item_robes_of_enlightenment_8"
                "6" "item_tbr_circlet_of_nobility"
            }
            "Chance"   "100"
        }
    }
    //===============================================
    // Bandit Area
    //===============================================

    "bandit"        // tier 1
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "mance_swiftsword"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_pendant_of_energy"
                "2" "item_tbr_ring_of_health"
                "3" "item_orb_of_unending_life"
                "4" "item_ring_of_vigor"
                //"5" "item_goldbag" // drops between 1 to 12 goldbags of 50 gold each
            }
            "Chance"   "100"
        }
    }
    //===============================================
    // Spider Area
    //===============================================

    "forest_spider" // tier 1
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "forest_lurker" // tier 2
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "giant_spider"  // tier 2
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "forest_terror"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_boots_of_agility_8"
                "2" "item_tbr_broadsword"
                "3" "item_mail_shirt"
                "4" "item_gauntlets_of_might_8"
                "5" "item_robes_of_enlightenment_8"
                "6" "item_wand_of_healing_power"
                "7" "item_wand_of_spell_power"
            }
            "Chance"   "100"
        }
    }
    //===============================================
    // Sea Servant Area
    //===============================================

    "sea_servant_huntsman"  // tier 1
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }
    "sea_servant_wavecaller"    // tier 2
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    //===============================================
    // Mountain Wolf Area
    //===============================================

    "mountain_wolf"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    //===============================================
    // Minotaur Area
    //===============================================

    "minotaur_grunt"    // tier 1
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "minotaur_warlock"  // tier 2
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "minotaur_beastman" // tier 2
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "giant_of_the_seas" // tier 2 or 3 (its lvl 29)
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }
    //===============================================
    // Area
    //===============================================

    "bandit"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "bandit"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "bandit"
    {
       "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "bandit"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }

    "bandit"
    {
        "1"
        {
            "ItemSets"
            {
                "1" "item_ring_of_regeneration"
                "2" "item_boots_of_agility_8"
                "3" "item_tbr_broadsword"
                "4" "item_tbr_circlet_of_nobility"
                "5" "item_cloak_of_flames_25"
                "6" "item_firehand_gauntlets_20"
                "7" "item_gauntlets_of_might_8"
                "8" "item_mail_shirt"
                "9" "item_pendant_of_energy" // This item doesn't exist, needs to be made
                "10" "item_ring_of_dodging"
                "11" "item_tbr_ring_of_health"  // This item doesn't exist, needs to be made
                "12" "item_ring_of_vigor"
                "13" "item_robes_of_enlightenment_8"
                "14" "item_wand_of_healing_power"
                "15" "item_wand_of_spell_power"
            }
            "Chance"   "5" //of dropping 1 of the set
        }
        "2"
        {
            "ItemSets"
            {
                "1" "item_potion_of_lesser_healing"
                "2" "item_potion_of_lesser_mana"
            }
            "Chance"   "10" //of dropping 1 of the set
        }
    }
}
```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566676869707172737475767778798081828384858687888990919293949596979899100101102103104105106107108109110111112113114115116117118119120121122123124125126127128129130131132133134135136137138139140141142143144145146147148149150151152153154155156157158159160161162163164165166167168169170171172173174175176177178179180181182183184185186187188189190191192193194195196197198199200201202203204205206207208209210211212213214215216217218219220221222223224225226227228229230231232233234235236237238239240241242243244245246247248249250251252253254255256257258259260261262263264265266267268269270271272273274275276277278279280281282283284285286287288289290291292293294295296297298299300301302303304305306307308309310311312313314315316317318319320321322323324325326327328329330331332333334335336337338339340341342343344345346347348349350351352353354355356357358359360361362363364365366367368369370371372373374375376377378379380381382383384385386387388389390391392393394395396397398399400401402403404405406407408409410411412413414415416417418419420421422423424425426427428429430431432433434435436437438439440441442443444445446447448449450451452453454455456457458459460461462463464465466467468469470471472473474475476477478479480481482483484485486487488489490491492493494495496497498499500501502503504505506507508509510511512513514515516517518519520521522523524525526527528529530531532533534535536537538539540541542543544545546547548549550551552553554555556557558559560561562563564565566567568569570571572573574575576577578579580581582583584585586587588589590591592593594595596597598599600601602603604605606607608609610611612613614615616617618619620621622623624625626627628629630631632633634635636637638639640641642643644645646647648649650651652653654655656657658659660661662663664665666667668669670671672673674675676677678679680681682683684685686687688689690691692693694695696697698699700701702703704705706707708709710711712713714715716717718719720721722723724725726727728729730731732733734735736737738739740741742743744745746747748749750751752753754755756757758759760761762763764765766767768769770771772773774775776777778779780781782783784785786787788789790791792793794795796797798799800801802803804805806807808809810811812813814815816817818819820821822823824825826827828829830831832833834835836837838839840841842843844845846847848849850851852853854855856857858859860861862863864865866867868869870871872873874875876877878879880881882883884885886887888889890891892893894895896897898899900901902903904905906907908909910911912913914915916917918919920921922923924925926927928929930931932933934935936937938939940941942943944945946947948949950951952953954955956957958959960961962963964965966967968969970971972973974975976977978979980981982983984985986987988989990991992993994995996997998999100010011002100310041005100610071008100910101011101210131014101510161017101810191020102110221023102410251026102710281029103010311032103310341035103610371038103910401041104210431044104510461047104810491050105110521053105410551056105710581059106010611062106310641065106610671068106910701071107210731074107510761077107810791080108110821083108410851086108710881089109010911092109310941095109610971098109911001101110211031104110511061107

---

# Making a "rpg-like" looting chest | ModDota

**Source:** https://moddota.com/scripting/making-a-rpg-like-looting-chest

---


# Making a "rpg-like" looting chest ​

First off, you need to create your chest item in npc_items_custom.txt:

```javascript
"item_chest"
	{
		// General
		//-------------------------------------------------------------------------------------------------------------
		"ID"							"1282"														// Here put a unused ID.
		"AbilityBehavior"				"DOTA_ABILITY_BEHAVIOR_CHANNELLED|DOTA_ABILITY_BEHAVIOR_NO_TARGET" // here we define it as a channeled item
		"BaseClass"						"item_datadriven"
		"AbilityTextureName"			"item_present" //Here goes the texture name of the item
		"ItemShareability"				"ITEM_FULLY_SHAREABLE" // make everyone able to use it
		"Model"							"models/props_winter/present.vmdl"
		"ItemKillable"					"0" // the chest can't be destroyed when on ground
		"ItemSellable"					"0" // can't be sold at a shop
		"ItemPurchasable"				"0" //can't be purchased
		"ItemDroppable"					"1" // can be put on the ground (set it to 0 if you don't want allow the player to
		"ItemCost"						"99999"
		"ItemQuality"					"artifact"
		"ItemDeclarations"				"DECLARE_PURCHASES_TO_TEAMMATES | DECLARE_PURCHASES_IN_SPEECH | DECLARE_PURCHASES_TO_SPECTATORS"
		"AbilityCooldown"				"1.0" //time before the player can open another chest
		"AbilityChannelTime"			"1.0" //time the player must channel to open the chest



		"OnChannelSucceeded"
		{
			"RunScript"
		    {
		        "ScriptFile"			"lua_datadriven/chest.lua" //create a folder named lua_item in "your_game_mode\scripts\vscripts" and create a text file called chest.lua
				"Function"				"chest_open" // here we call the function
				"chest_name"				"chest_1" // here you can give a name to this chest in case you want more than 1 chest type
				"gold"				"1" // does this chest give gold or only item ? (0 = no gold , 1 = gold instead of item , 2 = gold + item)
				"gold_amt"				"1500" // how many gold the chest give if it give out
				"gold_rand"				"250" // if you want gold to be random

		    }
		}
	}
```
123456789101112131415161718192021222324252627282930313233343536
then your script in lua_datadriven/chest.lua
lua
```javascript
function chest_open(keys)
	local item_list = LoadKeyValues("scripts/kv/chest_result.kv") --Here we load a kv file where we will put all the item you can find in chest
	local caster = keys.caster
	local Player_ID = caster:GetPlayerOwnerID()
	local item = keys.ability
	local gold = 0
	if keys.gold >0 then
		gold = keys.gold_amt + math.random(-(keys.gold_rand),(keys.gold_rand))
	end
	caster:RemoveItem(item)--Here we remove the chest
	local chest_name = keys.chest_name

	item_list = item_list[chest_name] -- here we load the item list specific to this chest
	--DeepPrintTable (item_list) --undo the commentary to check if your item_list is right
	local len = 0
	for k,v in pairs( item_list ) do
		len = len + 1
	end
	local item_number = 0
	if keys.gold == 1 then
		item_number = math.random(1,(len + 1)) -- here we determine the item number (so here we chose the item), the +1 is to add the gold chance in, you can change it to 2 or more if you want gold to have higher chance of appearing
	else
		item_number = math.random(1,len)
	end
	if item_number > len then --in case the player obtains gold instead of item
	       PlayerResource:ModifyGold(Player_ID, gold, true, 0 )
	else
		local item_name = item_list[tostring(item_number)] -- i know it could be better, but i'm not really used to kv
		local item_reward = CreateItem( item_name, caster, caster )
		caster:AddItem(item_reward)
		if keys.gold == 2 then
			PlayerResource:ModifyGold(Player_ID, gold, true, 0 )
		end
	end
end
```
1234567891011121314151617181920212223242526272829303132333435
and finally we create our kv file where we put all the item for each chest scripts/kv/chest_result.kv

```javascript
"put_the_name_you_wanna"
{
    "chest_1"
    {
        "1" "item_assault"
        "2" "item_desolator"
        "3" "item_sange_and_yasha"
        "4" "item_butterfly"
    }
    "chest_2"
    {
        "1" "item_youritem"
    }
}
```
1234567891011121314
Now you can easily make a chest for your rpg game 😄 If you want to make the chest loot on enemy death, look at this other tutorial from Noya about an item drop system


---

# Scripted Shop Spawning | ModDota

**Source:** https://moddota.com/scripting/scripted-shop-spawning

---


# Scripted Shop Spawning ​

A feature commonly asked about is how to dynamically create shops. Turns out it's actually quite easy! Here's what to do.

## Step 1. ​

You need to create the triggering area for your shop in Hammer. Use the block tool (ctrl+b) to draw the triggering area you want for the shop, you can change the shape in the block tool to whatever you need.

Draw the area somewhere off the map. You don't want players randomly stumbling across it.

## Step 2. ​

Turn the block into an entity by selecting it and pressing ctrl+t. Change the entity class to trigger_shop and give it a name. Also filter materials and find the trigger material, drag it onto the block. Finally set the shop type at the bottom. It should now look like this . When that's done rebuild the map.

## Step 3. ​

Now simply add the following code to create a shop at your desired location! I added this to OnConstructionCompleted in building helper.
lua
```javascript
local shopEnt = Entities:FindByName(nil, "my_new_shop") -- entity name in hammer
local newshop = SpawnEntityFromTableSynchronous('trigger_shop', {origin = unit:GetAbsOrigin(), shoptype = 1, model=shopEnt:GetModelName()}) -- shoptype is 0 for a "home" shop, 1 for a side shop and 2 for a secret shop
```
12
Example:


---

# Lava damage | ModDota

**Source:** https://moddota.com/scripting/lava-damage

---


# Lava damage ​

Today we are going to create a lava area — when a hero steps on the lava, he will get damaged per second until he dies.

First you need to create a block and assign trigger texture to it

First press Shift+B and drag your desired box for the lava area.

Once you've created your Block, we have to assign it a trigger material. This can be done by going to the material library and name filtering "trigger", then drag and drop this material onto the block. It should change to the specified (trigger) material.

Then convert the mesh to Entity by pressing Ctrl+T or find the Outliner => Right Click => Selected Meshes => Tie to Entity. Afterwards, name it plus assign this Entity script to lavatrigger.lua <-- you can name it whatever you want.

Next, go to the Outputs tab at the top, click on it, and add the following as shown in the picture.

Now go to your vscripts folder and create a file called lavatrigger.lua and put this script inside.
lua
```javascript
LAVA_MODIFIER_NAME = "lava_modifier"
LAVA_DAMAGE_AMOUNT = 10

lava_modifier = lava_modifier or class({})

local LAVA_DAMAGE_TICK_RATE = 0.5

function lava_modifier:IsHidden()
    return true
end

function lava_modifier:IsPurgable()
    return false
end

function lava_modifier:IsDebuff()
    return false
end

function lava_modifier:DeclareFunctions()
    local funcs = {}
    return funcs
end

-- Modifiers exist both on server and client, so take care what methods you use
function lava_modifier:OnCreated()
    if IsServer() then
        self:SetStackCount(0)
        self:StartIntervalThink(LAVA_DAMAGE_TICK_RATE)
    end
end

function lava_modifier:OnIntervalThink()
    if IsServer() then
        if self:GetStackCount() > 0 then
            local ent = self:GetCaster()
            local damageTable = {
                victim = ent,
                attacker = ent,
                damage = LAVA_DAMAGE_AMOUNT,
                damage_type = DAMAGE_TYPE_PURE,
            }
            ApplyDamage(damageTable)
        end
    end
end

LinkLuaModifier(LAVA_MODIFIER_NAME, "lavatrigger", LUA_MODIFIER_MOTION_NONE)

function applyLava(trigger, delta)
    if not IsServer() then
        return
    end

    local ent = trigger.activator

    if not ent then
        return
    end
    if not ent:HasModifier(LAVA_MODIFIER_NAME) then
        ent:AddNewModifier(ent, nil, LAVA_MODIFIER_NAME, nil)
    end
    local originalStacks = ent:GetModifierStackCount(LAVA_MODIFIER_NAME, nil)
    local newStacks = originalStacks + delta
    ent:SetModifierStackCount(LAVA_MODIFIER_NAME, ent, newStacks)
end

function lavaEnter(trigger)
    applyLava(trigger, 1)
end

function lavaExit(trigger)
    applyLava(trigger, -1)
end
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647484950515253545556575859606162636465666768697071727374
You should be done!


---

# Using the order filter and other filters | ModDota

**Source:** https://moddota.com/scripting/using-dota-filters

---


# Using the order filter and other filters ​

## Filters in general ​

This tutorial explains the use of the different filter functions currently in the API, and illustrates this using a small example in the order filter.

There are currently 9 filters available in the lua API, namely:

- AbilityTuningFilter - Filters abilities and all values they use on cast.
- BountyRunePickupFilter - Filters bounty rune pickups.
- DamageFilter - Filters damage events.
- ExecuteOrderFilter - Filters orders (usually given by players).
- ModifierGainedFilter - Filters modifiers events when they are first applied to a unit.
- ModifyExperienceFilter - Filters modifications of experience.
- ModifyGoldFilter - Filters modifications of gold.
- RuneSpawnFilter - Filters rune spawns.
- TrackingProjectileFilter - Filters tracking projectile launches.

These filters are set using functions like CDOTABaseGameMode:SetExecuteOrderFilter(function, context), check the API declarations for the exact function name for each function. The filters can then be cleared again using functions like CDOTABaseGameMode:ClearExecuteOrderFilter() and similar functions - again, see the API declarations.

## The general idea ​

(This is the most important section of this entire tutorial)

The Source 2 engine listens for events, either generated by players or units in the game. The engine has a lot of handlers that determine what to do when a certain event is received. Filters get to look at these events before they reach the engine and have the opportunity to decide not to deliver the event, or maybe to deliver a modified version of the event.

An analogy to explain this is that of a company receiving mail. The regular situation would be the company(the engine) receiving mail (events) and reading them as usual. Now imagine a new secretary is hired(the filter) that reads every letter received and decides if the letter is important enough to be handled or not. This system is illustrated in the following picture:

## Filters in Lua ​

So now we know how filters work, how do we use them? This explanation will use the ExecuteOrderFilter, keep in mind that all filters use the same basic idea.

The first step is to set the filter using the CDOTABaseGameMode:SetExecuteOrderFilter(function, context) API call. Let's analyze what this function expects. There are two parameters:

Parameter: function - The filter function. This function is your actual filter. It is called every time the event you are filtering is called (in this case when an order arrives). The filter function receives two parameters: self and event. The self parameter is just the context of the function (and is hidden if you use Dynamic_Wrap and the : operator). The really interesting parameter is the event parameter. This parameter contains all the data of the event. Your filter function should look at this event and make a decision. There are three possible outcomes:

1. You want to do nothing and accept the event, you return true.
2. You want to reject the event, it will be like this event never happened, return false.
3. You want to accept the event with some changes, all you have to do modify the event table and return true.

Parameter: context - This parameter is what is passed into the filter function as self.

## Example 1: Disabling glyph ​

Time to put into practice what we just learned. We know the glyph is an order given by a player, so we should use the order filter to disable it. All we have to do is find any glyph orders and return false. Of course you can add any restriction you want based on the contents of the event parameter. Just DeepPrintTable( event ) to see what data is available to you.

To check which order types there are, look at the API.

Note that in this example the : operator on GameMode:OrderFilter hides the first (self) parameter.
lua
```javascript
--First set the filter to start catching events, usually this is in your init
GameRules:GetGameModeEntity():SetExecuteOrderFilter(Dynamic_Wrap(GameMode, "OrderFilter"), self)

--......................

--Add the order filter to your game mode entity
function GameMode:OrderFilter(event)
    --Check if the order is the glyph type
    if event.order_type == DOTA_UNIT_ORDER_GLYPH then
        return false
    end

    --Return true by default to keep all other orders the same
    return true
end
```
123456789101112131415
## Example 2: Order modification ​

This example mimics a sort of 'drunk' state of a unit by adding a random offset to any movement orders. The code is pretty easy, all you have to do is modify the incoming order and return true.
lua
```javascript
--First set the filter to start catching events, usually this is in your init
GameRules:GetGameModeEntity():SetExecuteOrderFilter(Dynamic_Wrap(GameMode, "OrderFilter"), self)

--......................

--Add the order filter to your game mode entity
function GameMode:OrderFilter(event)
    --Check if the order is the glyph type
    if event.order_type == DOTA_UNIT_ORDER_MOVE_TO_POSITION then
        local offsetVector = RandomVector(100)
        event.position_x = event.position_x + offsetVector.x
        event.position_y = event.position_y + offsetVector.y
        return true
    end

    --Return true by default to keep all other orders the same
    return true
end
```
123456789101112131415161718

---

# Particle Attachment | ModDota

**Source:** https://moddota.com/scripting/particle-attachment

---


# Particle Attachment ​

## Particle Types ​

Each particle system in Dota is designed for a certain purpose, for example:

- Buff/Debuff or Ambient effect
- Explosions and other limited-time effects
- Circle AoE Indicators
- Line Indicators
- Projectiles (Linear or Tracking)
- Others

When attempting to use some of the available particles, keep in mind what was the original behavior of it.

For example if you try to use a projectile particle as a buff, or an explosion as a projectile, you will get disastrous or just no effect at all.

You can browse particles in the asset browser, for filtering just write keywords like "particle" or .vpcf.

Also every time you use a particle, remember to add them in a datadriven precache block on the ability:

```javascript
"precache"
{
    "particle"  "particles/units/heroes/hero_magnataur/magnataur_shockwave.vpcf"
}
```
1234
Else you won't see them unless they belonged originally to the hero that is casting them.

## Parents and Children ​

A Parent Particle is indicated by a P in the Asset Browser.

You normally want to use a Parent because it will show the complete particle effect. Children are harder to display and might not show or display properly.

Copy this entire path for the particleName

## Attachments ​

Particles need to be attached to some entity location to begin their behavior. This can be as easy as a single "Target" "TARGET" line, or contain many weird attach points that you will need to discover through numerous trial and error attempts.

Here is a list of every attach type, in order of importance/relevance.

| Constant | String | Attachment Description |
| --- | --- | --- |
| PATTACH_ABSORIGIN_FOLLOW | follow_origin | Follows the movement of the target at its origin location |
| PATTACH_OVERHEAD_FOLLOW | follow_overhead | Follows the movement of the target over its head |
| PATTACH_ABSORIGIN | attach_origin | Starts at the origin of the target and stays there |
| PATTACH_POINT | attach_hitloc | Normally the body of the model, where the attack projectiles hit |
| PATTACH_POINT_FOLLOW | follow_hitloc | Follows the body |
| PATTACH_CUSTOMORIGIN | start_at_customorigin | Enables the attachment to a custom origin |
| PATTACH_CUSTOMORIGIN_FOLLOW | follow_customorigin | Follow the movement of the custom origin set |
| PATTACH_WORLDORIGIN | world_origin | Targets a Point entity in the world, use with "TargetPoint" key |
| PATTACH_EYES_FOLLOW | follow_eyes | Fills the screen, used for the damage stun or arcana drop indicator. |
| PATTACH_POINT_FOLLOW_SUBSTEPPED | follow_attachment_substepped |  |
| PATTACH_RENDERORIGIN_FOLLOW | follow_renderorigin |  |
| PATTACH_ROOTBONE_FOLLOW | follow_rootbone |  |
| Attach to a specific bone | attach_attack1 | You can check these by opening the hero VMDL file in the Model Editor. |
| - | start_at_origin |  |
| - | start_at_attachment |  |
| - | follow_attachment |  |

Basically the engine will try to find the "bone" or attach point and type of the constant/string used, if the model has it and the particle is designed to properly attach to that point you will get a nice behavior.

Numerous times when dealing with complex particle systems you will get errors like:

- Particle children showing at the Vector (0,0,0). This is what normally happens when you miss a Control Point (explained later)
- Effect appearing in a different position than expected. Wrong attachment or particle can't attach that place.

## Control Points ​

Control points are x,y,z values that are used to set the particle to a target entity location or a vector for radius, color, duration, speed, etc.

It's easier to understand them with examples, so we'll move through some basic particles that don't need specific control points and then see some that need them to display properly.

### Decompiled Particles ​

With Reborn, now the default dota particles can be opened directly with the Particle Editor and make copies of them. Read more about this on the wiki in Particle Copy Tool

## Examples ​

### 1. Simple buff particles, datadriven ​

This type of particles is the easiest to attach. They are tied to a modifier and automatically stop after the modifier is destroyed.

For this too, the particle system duration usually needs to be infinite, designed as a simple buff, internally they have a single control point which is set with the EffectAttachType key.

Example

```javascript
"modifier_borrowed_time"
{
    "EffectName" "particles/units/heroes/hero_abaddon/abaddon_borrowed_time.vpcf"
    "EffectAttachType" "follow_origin"

    "StatusEffectName" "particles/status_fx/status_effect_abaddon_borrowed_time.vpcf"
    "StatusEffectPriority" "15"
}
```
12345678
Status Effects are a particular type of particle that is generally applied to change the texture color of the hero, for things like illusions, ghosts, etc.

### 2. Basic attachment ​

When you want more than one particle attached to a modifier or the particle needs additional control points, you need to do it in a "FireEffect" or "AttachEffect" block instead.

```javascript
"modifier_stampede"
{
    "OnCreated"
    {
        "AttachEffect"
        {
            "EffectName" "particles/units/heroes/hero_centaur/centaur_stampede_overhead.vpcf"
            "EffectAttachType" "follow_overhead"
            "Target" "TARGET"
        }
    }
}
```
123456789101112
"Target" uses the same target rules as any datadriven block

### 3. Control Points ​

When the easy attachment procedure fails, it means the particle has Control Points to control certain properties like radius, position of multiple elements, color, etc.

To know what each CP controls, you need to open the particle in the Particle Editor. Now you will be able to double click any of the copied particles in the Asset Browser and try to understand how to set each CP

Control Points can be either set in the datadriven "AttachEffect" or in lua. Doing it in Lua has the advantage that you can dynamically reload the control points by doing script_reload after changing the code.

#### 3.1 Lua Particle Attachment with SetParticleControl ​

Example
lua
```javascript
local particle = ParticleManager:CreateParticle("particles/units/heroes/hero_omniknight/omniknight_purification.vpcf", PATTACH_ABSORIGIN_FOLLOW, target)
ParticleManager:SetParticleControl(particle, 0, target:GetAbsOrigin())
ParticleManager:SetParticleControl(particle, 1, Vector(particle_radius,0,0))
```
123
CP0 is not really needed (because this type of attachment already sets the particle to follow the AbsOrigin) but its nice to have.

CP1.x controls the radius of the particle, as seen in the Particle Editor after playing around with the values

Hovering over the button tells us its a "Position along ring"

Example
lua
```javascript
local target = event.unit
local player = PlayerResource:GetPlayer( caster:GetPlayerID() )
local particleName = "particles/units/heroes/hero_alchemist/alchemist_lasthit_coins.vpcf"
local particle = ParticleManager:CreateParticleForPlayer( particleName, PATTACH_ABSORIGIN, target, player )
ParticleManager:SetParticleControl( particle, 0, target:GetAbsOrigin() )
ParticleManager:SetParticleControl( particle, 1, target:GetAbsOrigin() )
```
123456
In this particular case, we are using CreateParticleForPlayer to only display it to one particular player. Could also use PATTACH_OVERHEAD_FOLLOW

#### 3.2 Datadriven "ControlPoints" block ​

The same can be translated to datadriven, except if you need the control points to be decided at runtime (like, doing a radius * some variable)

```javascript
"FireEffect"
{
    "Target" "TARGET"
    "EffectName" "particles/units/heroes/hero_omniknight/omniknight_purification.vpcf"
    "EffectAttachType" "follow_origin"

    "ControlPoints"
    {
        "00" "0 0 0"
        "01" "%radius %radius %radius"
    }
}
```
123456789101112
Keep in mind that a "FireEffect" or "AttachEffect" action can be inside any Ability or Modifier Event, not only on the "OnCreated" / "OnDestroy" Modifier Events.

Example:

```javascript
"OnSpellStart"
{
    "FireEffect"
    {
        "EffectName"       "particles/units/heroes/hero_lina/lina_spell_light_strike_array_ray_team.vpcf"
        "EffectAttachType" "start_at_customorigin"
        "TargetPoint"      "POINT" //This also works with world_origin

        "ControlPoints"
        {
            "01" "%light_strike_array_aoe 0 0"
            "03" "0 0 0"
        }
    }
}
```
123456789101112131415
### 4. Control Point Entities ​

Sometimes, particle attach points can get even more complicated when they need to be attached on specific locations or entities. If your attachment is not working with the simple lua method, you need to try the next level of control point setup, the Control Point Entities, in either Lua or Keyvalues.

#### 4.1 Lua SetParticleControlEnt ​

Example: This is the proper lua attachment for Abaddon Aphotic Shield Particle:
lua
```javascript
target.ShieldParticle = ParticleManager:CreateParticle("particles/units/heroes/hero_abaddon/abaddon_aphotic_shield.vpcf", PATTACH_ABSORIGIN_FOLLOW, target)
ParticleManager:SetParticleControl(target.ShieldParticle, 1, Vector(shield_size,0,shield_size))
ParticleManager:SetParticleControl(target.ShieldParticle, 2, Vector(shield_size,0,shield_size))
ParticleManager:SetParticleControl(target.ShieldParticle, 4, Vector(shield_size,0,shield_size))
ParticleManager:SetParticleControl(target.ShieldParticle, 5, Vector(shield_size,0,0))

ParticleManager:SetParticleControlEnt(target.ShieldParticle, 0, target, PATTACH_POINT_FOLLOW, "attach_hitloc", target:GetAbsOrigin(), true)
```
1234567
PATTACH_POINT_FOLLOW puts the particle at the targets body in this case. PATTACH_ABSORIGIN_FOLLOW will put it at its feet, and PATTACH_OVERHEAD_FOLLOW at its head.

Note the particle being defined under the target. handle, this is because we will need to destroy it later in Lua, because attaching a particle this way will not stop the particle effect by itself after the modifier is destroyed, as we are just tying the particle to a target. This is not a concern if the particle is meant for a short duration (unlike the buff particles that last forever until removed)

#### 4.2 DataDriven "ControlPointEntities" ​

This works by setting each CP in order to its key. If you need to set the CP8 to a Targets hitloc, you need 8 "TARGET" (or "CASTER" or anything) lines.

Example

```javascript
"modifier_aphotic_shield"
{
    "OnDestroy"
    {
        "AttachEffect"
        {
             "EffectName" "particles/units/heroes/hero_abaddon/abaddon_aphotic_shield_explosion.vpcf"
             "EffectAttachType" "follow_origin"
             "Target" "UNIT"
             "ControlPointEntities"
            {
                "TARGET" "attach_origin"
                "TARGET" "attach_origin"
            }
        }
    }
}
```
1234567891011121314151617
Example 2

```javascript
"modifier_return"
{
    "Passive" "1"
    "OnAttacked"
    {
        "RunScript"
        {
            "ScriptFile" "heroes/hero_centaur/return.lua"
            "Function" "Return"
        }
        "FireEffect"
        {
            "EffectName" "particles/units/heroes/hero_centaur/centaur_return.vpcf"
            "EffectAttachType" "attach_hitloc"
            "Target" "CASTER"
            "ControlPointEntities"
            {
                "CASTER" "attach_hitloc"
                "ATTACKER" "attach_hitloc"
            }
        }
    }
}
```
1234567891011121314151617181920212223
Example 3

```javascript
"OnProjectileHitUnit"
{
    "FireEffect"
    {
    "EffectName" "particles/units/heroes/hero_alchemist/alchemist_unstable_concoction_explosion.vpcf"
        "EffectAttachType" "attach_hitloc"
        "Target" "TARGET"
        "ControlPointEntities"
        {
            "TARGET" "attach_hitloc"
            "TARGET" "attach_hitloc"
            "TARGET" "attach_hitloc"
            "TARGET" "attach_hitloc"
        }
    }
}
```
12345678910111213141516
Example 4

Custom bones!

```javascript
"AttachEffect"
{
    "Target" "CASTER"
    "EffectName" "particles/units/heroes/hero_kunkka/kunkka_weapon_tidebringer.vpcf"
    "EffectAttachType" "start_at_customorigin"
    "ControlPointEntities"
    {
        "CASTER" "attach_sword"
        "CASTER" "attach_sword"
        "CASTER" "attach_sword"
    }
}
```
123456789101112
ControlPointEntities is the hardest method of Particle Attachment. Use it with caution and pride.

### 5. Stopping a Lua Particle ​

If the entity dies, it will normally destroy the particle.

To stop something like we created in the Aphotic Shield example, add a "OnDestroy" of the modifier with a RunScript that calls something like this:
lua
```javascript
function EndShieldParticle( event )
    local target = event.target
    target:EmitSound("Hero_Abaddon.AphoticShield.Destroy")
    ParticleManager:DestroyParticle(target.ShieldParticle,false)
end
```
12345
If the particle has a fixed duration you can also easily use BMD Timers:
lua
```javascript
Timers:CreateTimer(duration, function()
    ParticleManager:DestroyParticle(particle,false))
end)
```
123
### 6. Difference between "FireEffect" and "AttachEffect" ​

When used inside a modifier, AttachEffect will automatically stop the particle after the modifier is destroyed, while FireEffect won't (if the particle duration is infinite)

FireEffect is pretty much the same as doing the lua ParticleManager:CreateParticle in this sense.

So if you FireEffect with a particle of infinite duration inside a modifier, it will still live after the modifier ends.

If the particle duration has a short duration, using any of the 2 Effect actions has the same results.

### 7. Projectile Particles ​

There are two types of projectile particles: Linear and Tracking.

Linear follow a straight line and collide with anything in its path. Use "DeleteOnHit" "0" inside the "OnProjectileHitUnit" Ability Event if you want them to continue going up to its fixed distance.

Tracking can curve and follow a target movement. Every ranged attack particle is of this type.

#### LinearProjectile ​

DataDriven Example

```javascript
"LinearProjectile"
{
    "Target" "POINT"
    "EffectName" "particles/units/heroes/hero_nyx_assassin/nyx_assassin_impale.vpcf"
    "StartRadius" "%width"
    "EndRadius" "%width"
    "MoveSpeed" "%speed"
    "TargetTeams" "DOTA_UNIT_TARGET_TEAM_ENEMY"
    "TargetTypes" "DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC"
    "TargetFlags" "DOTA_UNIT_TARGET_FLAG_MAGIC_IMMUNE_ENEMIES"
    "FixedDistance" "%length"
    "ProvidesVision" "0"
    "HasFrontalCone" "0"
}
```
1234567891011121314
Lua Example
lua
```javascript
--[[
    Author: kritth
    Date: 10.01.2015
    Start traversing the ship
]]
function ghostship_start_traverse( keys )
  local ability = keys.ability
  local casterPoint = caster:GetAbsOrigin()
  local targetPoint = keys.target_points[1]
  local spawnDistance = ability:GetLevelSpecialValueFor( "ghostship_distance", ability:GetLevel() - 1 )
  local projectileSpeed = ability:GetLevelSpecialValueFor( "ghostship_speed", ability:GetLevel() - 1 )
  local radius = ability:GetLevelSpecialValueFor( "ghostship_width", ability:GetLevel() - 1 )

    -- Get necessary vectors
    local forwardVec = targetPoint - casterPoint
            forwardVec = forwardVec:Normalized()
    local backwardVec = casterPoint - targetPoint
            backwardVec = backwardVec:Normalized()
    local spawnPoint = casterPoint + ( spawnDistance * backwardVec )
    local impactPoint = casterPoint + ( spawnDistance * forwardVec )
    local velocityVec = Vector( forwardVec.x, forwardVec.y, 0 )

    -- Spawn projectile
    local projectileTable = {
        Ability = ability,
        EffectName = "particles/units/heroes/hero_kunkka/kunkka_ghost_ship.vpcf",
        vSpawnOrigin = spawnPoint,
        fDistance = spawnDistance * 2,
        fStartRadius = radius,
        fEndRadius = radius,
        fExpireTime = GameRules:GetGameTime() + 5,
        Source = caster,
        bHasFrontalCone = false,
        bReplaceExisting = false,
        bProvidesVision = false,
        iUnitTargetTeam = targetBuffTeam,
        iUnitTargetType = targetType,
        vVelocity = velocityVec * projectileSpeed
    }
    ProjectileManager:CreateLinearProjectile( projectileTable )

end
```
123456789101112131415161718192021222324252627282930313233343536373839404142
#### TrackingProjectile ​

DataDriven Example

```javascript
"TrackingProjectile"
{
    "Target" "TARGET"
    "EffectName" "particles/units/heroes/hero_alchemist/alchemist_unstable_concoction_projectile.vpcf"
    "Dodgeable" "0"
    "ProvidesVision" "1"
    "VisionRadius" "%vision_range"
    "MoveSpeed" "%movement_speed"
    "SourceAttachment" "DOTA_PROJECTILE_ATTACHMENT_ATTACK_1"
}
```
12345678910
Lua Example
lua
```javascript
local projectile_speed = ability:GetSpecialValueFor( "projectile_speed" )
local particle_name = "particles/units/heroes/hero_abaddon/abaddon_death_coil.vpcf"

-- Create the projectile
    local info = {
        Target = target,
        Source = caster,
        Ability = ability,
        EffectName = particle_name,
        bDodgeable = false,
        bProvidesVision = true,
        iMoveSpeed = projectile_speed,
        iVisionRadius = 0,
        iVisionTeamNumber = caster:GetTeamNumber(),
        iSourceAttachment = DOTA_PROJECTILE_ATTACHMENT_ATTACK_1
    }
    ProjectileManager:CreateTrackingProjectile( info )
```
1234567891011121314151617
INFO

You can't generally use a particle designed to be Linear in a Tracking action and vice versa.

You might be able to mimic a Linear behavior using a Tracking projectile if you make it to track a dummy unit that can't move, but you need another invisible Linear projectile to do the hit effects.


---

# Basic Vector Math | ModDota

**Source:** https://moddota.com/scripting/vector-math

---


# Basic Vector Math ​

While creating games it is hard to avoid using vector math, however they are not commonly taught in schools. While they are fairly intuitive once you get used to them, learning about vector math for the first time can be a bit difficult, therefore this tutorial.

## Introduction to vectors ​

### What is a vector ​

Vectors are a way to describe a point or direction in space. This space can have any number of dimensions, but for this tutorial we will focus on 2D just because it is easier to draw. All of these concepts also apply to higher dimension vectors though!

Usually a vector will be represented as (x, y), which you can either interpret as:

> Point with coordinates (x, y)

or

> Movement from (0, 0) to point (x, y)

INFO

When using vectors as a movement they only describe a movement TO somewhere, originating from the origin (0, 0). If you want to describe a movement that also has a FROM part, you need a second vector to describe the initial position.

#### Example ​

So let's look at how we would think about and visualize two vectors: A: (3, 2) and B: (-1, 3):

INFO

Vectors have no origin and always originate from (0, 0). If you consider vectors as movements from origin to a point, you can also calculate their length, denoted by l_A and l_B.

### Adding vectors ​

So let's say you consider vectors as movements, you can simply add two vectors to get the result of doing both movements. For example if you have a vector A (xa, ya) and B (xb, yb) indicating two movements, what is the result of doing both A and B? This is visualized like so:

INFO

Moving by vector A first and then by B will result in the same vector as moving by B first followed by A. (This is why visualizing vector addition always results in this parallelogram).

Example

You can calculate things like offsets or knockbacks using addition, i.e where does a unit end after getting knocked back in some direction?

```javascript
newUnitPos = unitPos + knockbackVector
```
1
### Subtracting vectors ​

Now let's say we want to know the inverse question to the previous one: Assuming I have two vector positions A and B, what movement do I have to do to get from A to B? The answer to this is a vector subtraction: C = B - A. Note that this works exactly like regular math, so doing A + C = B:

INFO

Just like when subtracting regular numbers, order matters! B - A gives the vector from A to B, while A - B gives the opposite vector, from B to A.

Example

You can use vector subtraction to calculate the difference in position between two units, and get for example the distance between them:

```javascript
distanceBetweenUnit1AndUnit2 = length(unit2Pos - unit1Pos)
```
1
### Multiplying vectors ​

The last 'basic' vector operation I want to go over is multiplication with a number (NOT with another vector).

When multiplying a vector with a number it retains its direction, but its length is multiplied by this number:

Example

You can use vector multiplication to rescale vectors to a certain length. For example when you have a unit or normal vector (length 1), multiplying with a number will make it that length.

```javascript
vectorOfLength100 = vectorOfLength1 * 100
```
1
### Vectors as Direction/Orientation ​

As seen before, vectors look very much like a direction to somewhere. This makes them very useful for representing the orientation of something instead of using an angle (because angles make calculating much more difficult).

To do so, orientation is often expressed as vectors of length 1. This is because of the special relation vectors have with angles: For an angle a, (cos(a), sin(a)) is a vector of length 1, pointing in the direction of angle a:

You might be wondering what the point of this is, for an application of why storing orientation as vectors of length 1 see section 'Spawning an item in front of the player'.

### Dot product ​

The final vector concept for this tutorial is the 'dot product' of two vectors. Simply put, this dot product gives you a measure of 'how much vectors are pointing in the same direction'. If two vectors (of length 1) point in exactly the same direction, the dot product is 1. If two vectors (of length 1) point in exactly the opposite direction the dot product is -1. If the two vectors are at a 90 degree angle, the dot product is 0:

INFO

Technically dot(A, B) = length(A) * length(B) * cos(angle), so watch out when calculating the dot product of non-length-1 vectors: they will no longer range from -1 to 1.

### Normalization ​

As shown above it is often very useful to have vectors of length 1 (only the direction, not the distance). This is so common there is a standard procedure to calculate this: Normalization. When normalizing a vector you simply divide it by its length (or multiply with 1/length). This will always give you a vector of length 1.

INFO

Vectors with length 1 are referred to as 'Normal' or 'Unit' vectors.

## Vector math in games ​

### Spawning an item in front of the player ​

Let's say we want to spawn an item 100 units in front of a player hero, how do we calculate this location A?

We can visualize this question like this:

Referencing this visualization it is obvious we can calculate this A as follows:
LuaTypeScriptlua
```javascript
-- Calculate the vector from the hero to the point by multiplying
-- their forward vector (length 1) with the desired distance.
local heroToPoint = hero:GetForwardVector() * 100
-- Calculate world position  of the item by adding the vector
-- from hero to point to the world position of the hero
local itemPos = hero:GetAbsOrigin() + heroToPoint
```
123456ts
```javascript
// Calculate the vector from the hero to the point by multiplying
// their forward vector (length 1) with the desired distance.
const heroToPoint = (hero.GetForwardVector() * 100) as Vector;
// Calculate world position  of the item by adding the vector
// from hero to point to the world position of the hero
const itemPos = (hero.GetAbsOrigin() + heroToPoint) as Vector;
```
123456
### Checking if unit is facing a direction ​

Another common question is how can we calculate if my unit is facing a specific point on the map.

We visualize this problem like this:

So looking at the visualization, when does a unit face point P? Well it looks like this happens when their forward vector (the orange one) aligns with the vector from the unit to the point (the purple one). So capturing this in code would look a little like this:
LuaTypeScriptlua
```javascript
function isUnitFacingPoint(unit, point)
  -- Calculate the relative position of the unit to the point
  local relativePosition = point - unit:GetAbsOrigin()
  -- Remember, using dot product works best with normal vectors
  -- The unit's forward is already normal, but we need to normalize
  -- the relative position to only get its direction.
  local directionToPoint = relativePosition:Normalized()

  -- Check if the alignment of the forward vector and relative direction
  -- is within some acceptable range of tolerance
  return unit:GetForwardVector():Dot(directionToPoint) > 0.7
end
```
123456789101112ts
```javascript
function isUnitFacingPoint(unit: CDOTA_BaseNPC, point: Vector): boolean {
  // Calculate the relative position of the unit to the point
  const relativePosition = (point - unit.GetAbsOrigin()) as Vector;
  // Remember, using dot product works best with normal vectors
  // The unit's forward is already normal, but we need to normalize
  // the relative position to only get its direction.
  const relativeDirection = relativePosition.Normalized();

  // Check if the alignment of the forward vector and relative direction
  // is within some acceptable range of tolerance
  return unit.GetForwardVector().Dot(relativeDirection) > 0.7;
}
```
123456789101112
### Checking if unit is attacked from behind ​

This question is similar to the previous question, only now there are two units facing in different ways:

Looking at this drawing it becomes obvious that the forward vector of unit 2 (F2) actually does not matter. What matters is the angle (dot product) between the forward vector of the unit getting attacked, and the where the attack is coming from (the vector from unit 2 to unit 1: P1 - P2)
LuaTypeScriptlua
```javascript
function isAttackedFromBehind(victim, attacker)
  -- Calculate the relative position from attacker to victim (P1 - P2)
  local relativePosition = victim:GetAbsOrigin() - attacker:GetAbsOrigin()
  -- Normalize relative position to get attack direction
  local attackDirection = relativePosition:Normalized()
  -- Get the forward vector of the victim
  local victimForward = victim:GetForwardVector()

  -- Check if both normal(!) vectors are pointing in the same direction
  return victimForward:Dot(attackDirection) > 0.7
end
```
1234567891011ts
```javascript
function isAttackedFromBehind(victim: CDOTA_BaseNPC, attacker: CDOTA_BaseNPC): boolean {
  // Calculate the relative position from attacker to victim (P1 - P2)
  const relativePosition = (victim.GetAbsOrigin() - attacker.GetAbsOrigin()) as Vector;
  // Normalize relative position to get attack direction
  const attackDirection = relativePosition.Normalized();
  // Get the forward vector of the victim
  const victimForward = victim.GetForwardVector();

  // Check if both normal(!) vectors are pointing in the same direction
  return victimForward.Dot(attackDirection) > 0.7;
}
```
1234567891011
### Creating some effects around player ​

Consider the case where you want multiple things to happen evenly spaced in a circle around the player character. We can visualize it as follows:

By now it should be obvious we need to add the green vectors to the player position, the question is however how do you calculate these green vectors?

What we can simply do is divide the full circle radius (2 * pi) by the number of points we want to use, and then for each angle calculate the unit vector from the angle, multiply it with the desired length and add it to the player position:
LuaTypeScriptlua
```javascript
-- Calculate the angle between each point on the circle
-- (This is in radians, the full circle is 2*pi radians)
local angle = 2 * math.pi / numPoints

for i=1,numPoints do
  -- Create direction vector from the angle
  local direction = Vector(math.cos(angle * i), math.sin(angle * i))
  -- Multiply the direction (length 1) with the desired radius of the circle
  local circlePoint = direction * radius

  -- Add the calculated green vector to the player position and do something
  doSomething(player:GetAbsOrigin() + circlePoint)
end
```
12345678910111213ts
```javascript
// Calculate the angle between each point on the circle
// (This is in radians, the full circle is 2*pi radians)
const angle = (2 * Math.PI) / numPoints;

for (let i = 0; i < numPoints; i++) {
  // Create direction vector from the angle
  const direction = Vector(Math.cos(angle * i), Math.sin(angle * i));
  // Multiply the direction (length 1) with the desired radius of the circle
  const circlePoint = (direction * radius) as Vector;

  // Add the calculated green vector to the player position and do something
  doSomething((player.GetAbsOrigin() + circlePoint) as Vector);
}
```
12345678910111213
### Physics with vectors - Homing projectile ​

As you have seen vector math is quite powerful and can be used to express positional and movement concepts in simple statements. In this final example I will show how to do a simple 'physics' simulation to create a homing projectile.

We will express the projectile using two vectors: position and velocity. This makes the projectile unable to instantly change its direction, but suffer some inertia: it will home in on the player on every tick, but it cannot easily slow down or change direction:

To achieve this effect we simply 'accelerate' the velocity of the projectile towards the player on every update, so the velocity turns towards the player a little bit every update. We then simply update the position based on the current velocity:
LuaTypeScriptlua
```javascript
function updateProjectile(projectile, target)
    -- Calculate direction from projectile to target
    local relativeTargetPos = target:GetAbsOrigin() - projectile:GetAbsOrigin()
    local targetDirection = relativeTargetPos:Normalized()

    -- Now we update the projectile velocity to point more to the target
    -- Note: you can increase/decrease acceleration to make it change direction
    -- faster or slower
    projectile.velocity = projectile.velocity + targetDirection * acceleration

    -- Next we update the projectile position by simply adding the velocity
    projectile.position = projectile.position + projectile.velocity
end
```
12345678910111213ts
```javascript
function updateProjectile(projectile: Projectile, target: CDOTA_BaseNPC): void {
  // Calculate direction from projectile to target
  const relativeTargetPos = (target.GetAbsOrigin() - projectile.GetAbsOrigin()) as Vector;
  const targetDirection = relativeTargetPos.Normalized();

  // Now we update the projectile velocity to point more to the target
  // Note: you can increase/decrease acceleration to make it change direction
  // faster or slower
  projectile.velocity = (projectile.velocity + targetDirection * acceleration) as Vector;

  // Next we update the projectile position by simply adding the velocity
  projectile.position = (projectile.position + projectile.velocity) as Vector;
}
```
12345678910111213

---

