# ModDota Scripting / TypeScript 文档

> 本文档爬取自 https://moddota.com/scripting/ 及其子页面
> 生成日期: 2024年

---

## 目录

1. [TypeScript Introduction](#typescript-introduction)
2. [TypeScript Ability](#typescript-ability)
3. [TypeScript Modifier](#typescript-modifier)
4. [TypeScript Events](#typescript-events)
5. [Tooltip Generator](#tooltip-generator)

---

# Typescript Introduction | ModDota

**Source:** https://moddota.com/scripting/Typescript/typescript-introduction

---


# Typescript Introduction ​

Typescript is a powerful tool that we can use to improve our ability to properly script files for Dota 2. Using tstl (Typescript-to-Lua), it automatically generates a Lua file for the game to use for each file you're working on - this process is completely automatic from the moment it starts up.

Typescript is more strict compared to Lua, will use types to enforce certain functionalities, and will immediately alert you if you do something that doesn't make sense to it, and will show an error until you fix it. For instance, doing GetStrength() on an ability doesn't make sense and will show an error message.

Typescript can work well with most editors using plugins, however, VSCode is recommended as it comes with Typescript support built in, and is a very powerful editor.

## Pros and Cons for using Typescript ​

Pros:

- Enforces types, prevents you from using irrelevant functions.
- Typescript is much more similar to most languages such as C#, Java, Javascript, and C (compared to Lua).
- Auto-complete that will only show API functions that match the type being called.
- Saves a ton of time by immediately finding logical errors in code, instead of having to find them in-game (sometimes as edge cases which may not be found during local testing).
- Tremendous support of Typescript in the web (e.g. Stack Overflow) for common Typescript questions.
- Typescript itself comes with very powerful built-in functionalities and types, such as Sets, Maps, and array functionalities. Additionally, it supports class and types inheritance.
- Typescript is used for both Lua and Javascript, so you never have to switch between scripting languages; Typescript will convert it to the correct language for you.
- Auto-complete for various arguments in APIs, such as a built-in event list.
- Built-in enums and interfaces to make finding a specific Dota-based value extremely fast and easy.
- Very easy to update new APIs when Valve (eventually) releases new functions.
- Symlinks your Dota 2 folder for you as part of the setup, so you can easily integrate your changes into github, should you choose to do so.

Cons:

- Takes some time to set up for the first time.
- Some rare types may be incorrect. Those can be updated manually when the need arises.
- Sometimes, requires more of a set up for specific game logic, such as interfaces, typeguards and casts (this is again due to the nature of typed language).
- Not very convenient to integrate for ongoing projects, though it can still work.
- Referencing code or guides that are written in Lua might not be easy in Typescript due to differences between how the languages work.

## Setting Up TypeScript ​

INFO

This guide assumes your operating system is Windows. If you have other operating systems, please contact us in the Typescript channel in the Discord below.

First, since Typescript uses Node.js, it must be installed on your computer. You can download NodeJS from here. Simply choose the recommended version, which is the latest stable version. Download and install it with its default configuration.

Next, navigate to the Typescript template. This template has most of the files of a new addon configured for you, along with Typescript support. There are two versions to use the template:

1. Without GitHub: if you're not planning to put your code in GitHub, clone the above template. See below for explanation how.
2. With GitHub: if you do plan on putting your code in GitHub, click on the  button located in the top right of the github page. This will create a new github repository that uses the template under your name. Fill in the repository name, description, and whether it is public or private. You can leave "Include all branches" unchecked, then click "Create repository from template". When the new repository is created, clone it. See below for explanation how. For those unfamiliar with github, I recommend using a Github GUI, such as Github Desktop.

Cloning the repository means making a copy of it on your computer. This can be done by clicking on "Code", then on "Download Zip", as shown here:

You can then extract the ZIP anywhere you want. However, do NOT put it inside your Dota 2 folder. For example, I placed it in my Desktop, inside a folder named "Dota 2 custom games". The folder that becomes extracted is named TypeScriptAddonTemplate-master, so just rename the folder to more correctly reflect your custom game's name. For the sake of this tutorial, I named it typescript-example.

## Creating a Typescript-based addon in Dota ​

Now that we have the files on our computer, we can set up a new addon game very quickly. There are a few steps remaining before doing so:

- Go into your folder, in my case typescript-example.
- Open package.json with any text editor. You'll notice that the name field is an empty string. Add the name of your custom game. For example, I named it typescript_tutorial. The field should look like this:

```javascript
"name": "typescript_tutorial",
```
1
Save and close the file.

INFO

Make sure there is no folder with that name inside both the game/dota_addons and content/dota_addons of your Dota 2 game folder. The installation process will create those folders for you. If the folders exist, delete them first, or change the name in package.json to something else.

- While inside the folder with the package.json file you just edited, click on the address bar, so the path to your folder becomes highlighted and editable as text. It should look like this:

- While the path is highlighted, delete the text and instead type "cmd" and press Enter. This will open the Command Shell with the folder path shown right before your input cursor.
- Type npm install and press enter. You'll see a loading bar, which should take up to a minute to complete. If it was successful, you should see that your game and content folders now have a "shortcut" icon next to them. They're now symlinked to your Dota 2 folder. The typescript_tutorial folder now exists for both game/dota_addons/ and content/dota_addons in your Dota 2 folder.

INFO

Symlinked folders are copies of each other, where any action done on one is also applied on the other folder. Therefore, you can simply work on your conveniently placed folder (Desktop/Dota 2 custom games/typescript-example in my example), and it will automatically be applied on the Steam Dota 2 folder as well.

## Typescript Addon Structure ​

Most of the structure for Typescript is identical to a standard Dota addon, such as having the scripts/npc/ folder.

Note the src folder in the project's root. This is where you create and work on your Typescript files. When they're compiled, the resulting Lua files are placed in the appropriate locations, such as /game/scripts/vscripts/ for files produced from /src/vscripts/. You can add additional folders inside those folders, which will keep the same routing in the output location.

You can change the structure of the folders inside the addon. However, you might need to adjust the output paths to match those changes. Some changes might break the mod, as Dota expects a specific structure to be set up (such as game/scripts/vscripts).

INFO

In src, you'll also find the common folder. This folder is extremely useful for storing interface declarations that are shared between game logic and panorama, such as events and nettables, among other custom declarations such as enums. This folder should only include d.ts files.

There are a few additional files and folders responsible for making Typescript identify and work with Dota 2 API, and in the custom game in general. Most of those files can be left untouched. Most of those files are located at /src/vscripts/ folder:

- tsconfig.json: Configures how Typescript works in the Lua portion of the project. The same type of file exists in the /src/panorama/ folder for javascript configuration for panorama.
- vscripts/lib/dota_ts_adapter.ts: Responsible for registering various common classes, such as abilities, items, and modifiers.
- vscripts/lib/tstl-utils.ts: Responsible for the typescript-to-Lua translation.
- vscripts/lib/timers.lua and vscripts/lib/timers.d.ts: The common Timers library is already included by default in its Lua form, with timers.d.ts including an interface to allow using the Timers library in Typescript.

## Updating Your Addon ​

Occasionally, Valve will release new API or changes to existing API, usually at events and major patches. Your Typescript project will not automatically adjust to those changes as they need to be filed and typed first, which is usually done by the community who maintain Typescript template. However, when a new update is announced for Typescript for Dota 2, you can easily update your project. There are two ways to do so:

- Using VSCode's terminal: If your chosen editor is VSCode and it has your project's folder loaded, click on Terminal -> New Terminal. A new terminal will open. Type npm update and press Enter.
- Using cmd: Open cmd from your project's root directory (Desktop/Dota 2 custom games/typescript-example in my example), then type npm update and press enter.

The project will update to the newest version automatically.

## Activating The Watcher ​

In order for your files to compile and have their compiled Lua or javascript equivalents, it is required to activate the watcher. The watcher watches over all changes done on your files in the project, and immediately produces a Lua or javascript equivalent, assuming the file compiled with no errors. There are three ways to activate the watcher:

- Using VSCode's terminal: If you're using VSCode and it has your project's folder loaded, click on Terminal -> Run Build Task. Alternatively, you can use the hotkey for it, default Ctrl+Shift+B.
- Using cmd: Open cmd from your project's root directory (Desktop/Dota 2 custom games/typescript-example in my example), then type npm run dev and press enter.
- Other editors: Depending on the editor, the editor might have their own method to invoke a Run Build Task command; check the editor's documentation for more details.

## Normalized types ​

When dumping enums from Dota's API, it comes with some predefined types. Some of those types are not very convenient to work with, so instead, we use the normalized types. Those normalized types change enums slightly, and their purpose is to increase readability of your code. The template comes with the normalized types already activated.

## Integrated Examples ​

As of writing this tutorial, the Typescript template comes with a few examples to show how game logic is done in Typescript. I recommend keeping those files for reference until you're more comfortable with Typescript.

The examples are:

- In src/vscripts/abilities/heroes/meepo/earthbind_ts_example.ts: A custom Meepo's Earthbind ability example.
- In src/vscripts/modifiers/modifier_panic.ts: A custom modifier that restricts commands and orders the parent to periodically move to a random position near it.
- In src/vscripts/GameMode.ts: Game mode logic examples, such as setting the maximum players for each team to 3. Timer and event listening examples are also shown here.
- In src/panorama/hud.ts: Panorama example for subscribing and sending events.

You can see how the examples apply in your addon:

- Each hero you pick will have the custom Meepo's Earthbind ability added to it.
- A welcome UI panel is shown in the center of the screen. Clicking on the close button in it will remove the panel and apply the panic modifier for a few seconds.

## Dedicated Typescript Channel in Moddota Discord ​

We have a dedicated Typescript channel in our moddota Discord for every Typescript related question. Feel free to join and ask anything and we'll be happy to assist.

## What's Next? ​

Check out the Abilities in Typescript tutorial, which will show how to set up and code a basic ability to use in the game.


---

# Abilities in Typescript | ModDota

**Source:** https://moddota.com/scripting/Typescript/typescript-ability

---


# Abilities in Typescript ​

Regardless of what kind of game you're going for, you'll most probably have to code a couple of abilities for your characters to use to fight whatever they need to fight. Typescript enables coding many abilities with a ton of flexibility.

For this tutorial, I'm going to be demonstrating Typescript with a fairly simple ability: Skywrath's Arcane Bolt. It fires a slow moving tracking projectile that deals damage that equals a base damage, plus a multiplier of the hero's intelligence.

This tutorial assumes you have basic knowledge of how abilities are registered for units or heroes. If you're not aware, I'd recommend the amazing guides by Elfansoer: Ability Form and Registering and Testing Ability. Note, however, that this guide assumes you'll be using Typescript instead of lua, so going over the rest of tutorials in Elfansoer's Ability Lua Tutorial are not required; however, he does a fantastic job explaining mechanics and techniques which are employed whenever coding an ability, regardless of language, so I'm going ahead and recommend going over those if you're interested.

Before we start, I'm going to go ahead and link the moddota tools, which feature the most up to date API for custom games in Dota 2. If you were using Valve's wiki, ditch it; it hasn't been updated in years.

## Creating A New Ability ​

Before we can start coding an ability, we need to define it. Typescript only replaces lua files, so anything with KVs, like the npc_abilities_custom.txt or npc_heroes_custom.txt files is completely unchanged.

In the npc_abilities_custom.txt, which is located in scripts/npc folder, we'll put the ability definition, which is taken straight from the original Dota 2:

```javascript
"typescript_skywrath_mage_arcane_bolt"
{
    // General
    //-------------------------------------------------------------------------------------------------------------
    "BaseClass"             		"ability_lua"
    "AbilityTextureName"			"skywrath_mage_arcane_bolt"
    "ScriptFile"				      "abilities/typescript_skywrath_mage_arcane_bolt"
    "AbilityBehavior"				"DOTA_ABILITY_BEHAVIOR_UNIT_TARGET"
    "AbilityUnitTargetTeam"			"DOTA_UNIT_TARGET_TEAM_ENEMY"
    "AbilityUnitTargetType"			"DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC"
    "AbilityUnitDamageType"			"DAMAGE_TYPE_MAGICAL"
    "SpellImmunityType"				"SPELL_IMMUNITY_ENEMIES_NO"
    "FightRecapLevel"				"1"
    "AbilitySound"					"Hero_SkywrathMage.ArcaneBolt.Cast"

    // Casting
    //-------------------------------------------------------------------------------------------------------------
    "AbilityCastRange"				"875"
    "AbilityCastPoint"				"0.1 0.1 0.1 0.1"

    // Time
    //-------------------------------------------------------------------------------------------------------------
    "AbilityCooldown"				"5.0 4.0 3.0 2.0"

    // Cost
    //-------------------------------------------------------------------------------------------------------------
    "AbilityManaCost"				"90"

    // Special
    //-------------------------------------------------------------------------------------------------------------
    "AbilityValues"
    {
      "bolt_speed"				"500"
      "bolt_vision"				"325"
      "bolt_damage"				"60 80 100 120"
      "int_multiplier"
      {
        "value" "1.6"
        "CalculateSpellDamageTooltip" "1"
      }
      "vision_duration"			"3.34"
    }
    "AbilityCastAnimation"		"ACT_DOTA_CAST_ABILITY_1"
}
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344
Note that has slight changes: the ability was renamed to typescript_skywrath_mage_arcane_bolt in order to not conflict with the original ability. The ID was also removed, as it is not necessary for custom game abilities. Plus, for the sake of simplicity, the ability no longer has a scepter effect.

Three new fields were added:

- "BaseClass" "ability_lua" - though we code in Typescript, the resulting file will still be lua, which is what the engine expects. Therefore, we'll use "ability_lua" as the ability class type.
- "AbilityTextureName" "skywrath_mage_arcane_bolt" - since we're not using the original ability, it is necessary to add this field to tell the game which icon to use for the ability.
- "ScriptFile" "abilities/typescript_skywrath_mage_arcane_bolt" - this is the path of the file that has the code for the ability. Remember that it uses a relative path starting from the /game/scripts/vscripts, which has the abilities folder.

## Creating The Ability File ​

Now that the ability is defined, it is time to start coding it. The first step would be to create a file named typescript_skywrath_mage_arcane_bolt.ts inside of source folder src/vscripts/abilities. The source is where we'll create the file, but when we compile it, it will produce a lua file in /game/vscripts/abilities, as the game expects. Remember that even though we create the ability in Typescript, the engine works with lua files, which is what we need to produce.

INFO

While the Watcher is active, each time you save your file, a .lua file of the same name will be created in the respective output folder. This lua file will be used by the game, and will immediately update to correspond for any changes you do in your Typescript file.

## Adding The Ability Class ​

First, we need to declare the ability's class. This is done by adding the following:
ts
```javascript
@registerAbility()
export class typescript_skywrath_mage_arcane_bolt extends BaseAbility {}
```
12
Let's go over it quickly:

- @registerAbility() - This assigns the class to the global scope, which allows Dota to recognize the ability.
- export - Including this keyword is not actually required, but is recommended. It allows you to call this class as a type, if you need to do so at some point. For example, your ability might have a unique function or property that others might want to reference or call.
- class - Standard keyword for creating classes.
- typescript_skywrath_mage_arcane_bolt - This is exactly the same as the ability name. It must be identical to the name of the ability at the top of the ability definition.
- extends BaseAbility - All standard abilities extend the BaseAbility class, and inherit various traits of it, such as it being an entity.
- {} - Your entire code for that ability will be inside of those curly brackets.

While your cursor is inside that block, all functions inherited from BaseAbility will show up here. Simply start typing for the auto complete to immediately show you possible completions of what you typed.

INFO

If either @registerAbility() or BaseAbility are not recognized and show an error, highlight them, and use the Ctrl + . hotkey shortcut, which opens a small menu that suggests to import them. You'll see the top of the file now has the import statement: import { BaseAbility, registerAbility } from "../lib/dota_ts_adapter";, which shows that those are now imported from their respective files.

## Ability Properties ​

Before we actually add any functions, we should add properties to the class. Those are very easily accessible from everywhere in the class, and are very useful to store information for that ability instance there. This is not required, but this is where I usually store any of the values for:

- Particle paths
- Sounds
- Models
- Any other information needed for the ability to function, such as a boolean or a number.

Let's add the ability properties for Ancient Bolt: its cast sound, its projectile particle, and its impact sound. Those are fetched from the asset browser. The class should now look like this:
ts
```javascript
@registerAbility()
export class typescript_skywrath_mage_arcane_bolt extends BaseAbility {
  sound_cast: string = 'Hero_SkywrathMage.ArcaneBolt.Cast';
  sound_impact: string = 'Hero_SkywrathMage.ArcaneBolt.Impact';
  projectile_arcane_bolt: string =
    'particles/units/heroes/hero_skywrath_mage/skywrath_mage_arcane_bolt.vpcf';
}
```
1234567
INFO

The property names are arbitrary, and could be anything you'd like.

Note that after the property name, comes : string. This defines the type of the property. Technically, this is not required, as Typescript will know that it is a string due to it being assigned to a string. However, it is good practice to add the type to increase readability and to make sure you don't assign it with something you didn't intend to.

## Coding The Ability: Properties and Methods ​

Now that we've set up everything we need for the ability, let's start coding it. First, we'll add a OnSpellStart() method, which is called when the unit or hero casts it.
ts
```javascript
@registerAbility()
export class typescript_skywrath_mage_arcane_bolt extends BaseAbility {
  sound_cast: string = 'Hero_SkywrathMage.ArcaneBolt.Cast';
  sound_impact: string = 'Hero_SkywrathMage.ArcaneBolt.Impact';
  projectile_arcane_bolt: string =
    'particles/units/heroes/hero_skywrath_mage/skywrath_mage_arcane_bolt.vpcf';

  OnSpellStart() {}
}
```
123456789
Inside OnSpellStart(), we want to fetch the target of the ability, which the bolt will be fired at. We'll initialize a variable to hold that information. We have two main types of variables that we can initialize:

- const - A constant. This variable must be assigned a value when it's called. This variables can never be reassigned. Useful for variables that should never change, such as instances of classes, or definitive results of a function that will be used as is.
- let - A standard variable. This variable can be undefined, be assigned immediately, or be assigned later. It can be reassigned as many times as you need. Useful for things that change, such as numerical calculations, or boolean operators.

For this case, once we fetch our target, it should never change this cast, which is a good indication that we should use const. It will be immediately assigned to the ability's cursor target, using this.GetCursorTarget().

INFO

this refers to the instance of the class where it is called, in this case, the typescript_skywrath_mage_arcane_bolt class. Since it inherits BaseAbility, it also inherits its functionality of fetching its cursor target.
ts
```javascript
@registerAbility()
export class typescript_skywrath_mage_arcane_bolt extends BaseAbility {
  sound_cast: string = 'Hero_SkywrathMage.ArcaneBolt.Cast';
  sound_impact: string = 'Hero_SkywrathMage.ArcaneBolt.Impact';
  projectile_arcane_bolt: string =
    'particles/units/heroes/hero_skywrath_mage/skywrath_mage_arcane_bolt.vpcf';

  OnSpellStart() {
    const target = this.GetCursorTarget();
  }
}
```
1234567891011
## Checking Function's Arguments And Return Type ​

In VSCode and similar editors that support it, hovering over a function will show a short explanation about it. For example, if we hover over this.GetCursorTarget(), we'll see the following:

This lets us know that:

1. This function doesn't expect any arguments.
2. This function will return either a CDOTA_BaseNPC, or undefined.

In other words, target will either be assigned a CDOTA_BaseNPC, which usually corresponds to a unit or a hero, or, in the case it was called with the ability not being cast on any target, be assigned to undefined. This can occur, for example, if we try to use this.GetCursorTarget() on a No Target ability.

Typescript knows this, and will mark target as a potential undefined variable. Whenever we will try to use this variable, such as target.GetHealth(), it will warn us that target might be undefined, and therefore might not be able to call the function. The best practice is to use an if to check that target actually exists before any function that involves it.

INFO

If you're sure that variables that are potentially undefined will be assigned with a valid value, you can force Typescript to ignore the potential for undefined by adding "!" to the end of the assignment. For example, we can use const target = this.GetCursorTarget()!. However, this is not recommended, as it defeats the purpose of having types in the first place - to make sure you don't do something that you cannot.

## Coding The Ability: Firing a projectile ​

The next step would be to collect all remaining information for the projectile out of our ability definition. We want the projectile speed (bolt_speed) and vision range (bolt_vision). The rest will be collected on impact. Our function should now look like this:
ts
```javascript
@registerAbility()
export class typescript_skywrath_mage_arcane_bolt extends BaseAbility {
  sound_cast: string = 'Hero_SkywrathMage.ArcaneBolt.Cast';
  sound_impact: string = 'Hero_SkywrathMage.ArcaneBolt.Impact';
  projectile_arcane_bolt: string =
    'particles/units/heroes/hero_skywrath_mage/skywrath_mage_arcane_bolt.vpcf';

  OnSpellStart() {
    const target = this.GetCursorTarget();
    const bolt_speed = this.GetSpecialValueFor('bolt_speed');
    const bolt_vision = this.GetSpecialValueFor('bolt_vision');
  }
}
```
12345678910111213
INFO

Since GetSpecialValueFor always returns a number, it doesn't have a potential for undefined. However, it will still return 0 if the engine will not be able to find the string provided for the ability.

Next, we want to fire a tracking projectile at the target. The projectile cannot be dodged, and provides vision during its journey to the target, among other properties. Most of them have default values and can be omitted.

One of the great advantages of Typescript is that things like tracking projectiles have types. The editor immediately recognizes that we want properties for the tracking projectiles, and shows up possible properties for it when we go into it. Since this is a object full of properties, we need to open it with curly brackets:

INFO

In most editors, ctrl + spacebar is the hotkey to show auto-complete if it is not shown.

Let's fill it with properties we care about. The code will now look like this:
ts
```javascript
@registerAbility()
export class typescript_skywrath_mage_arcane_bolt extends BaseAbility {
  sound_cast: string = 'Hero_SkywrathMage.ArcaneBolt.Cast';
  sound_impact: string = 'Hero_SkywrathMage.ArcaneBolt.Impact';
  projectile_arcane_bolt: string =
    'particles/units/heroes/hero_skywrath_mage/skywrath_mage_arcane_bolt.vpcf';

  OnSpellStart() {
    const target = this.GetCursorTarget();
    const bolt_speed = this.GetSpecialValueFor('bolt_speed');
    const bolt_vision = this.GetSpecialValueFor('bolt_vision');

    ProjectileManager.CreateTrackingProjectile({
      Ability: this,
      EffectName: this.projectile_arcane_bolt,
      Source: this.GetCaster(),
      Target: target,
      bDodgeable: false,
      bProvidesVision: true,
      iMoveSpeed: bolt_speed,
      iVisionRadius: bolt_vision,
      iVisionTeamNumber: this.GetCaster().GetTeamNumber(),
    });
  }
}
```
12345678910111213141516171819202122232425
The above codes fires a projectile at the target. Note that Target expects either a CDOTA_BaseNPC or undefined, so Typescript doesn't complain about it. If it hits the target, it will trigger the OnProjectileHit event, so let's use this function as well.

## Coding The Ability: Projectile Impact ​

After creating the OnProjectileHit function, we might want to check if it comes with additional parameters that we can use. There are two ways to check for those additional parameters:

1. Navigating to moddota tools and searching for the function, which shows the parameters:

1. In VSCode, Highlighting OnProjectileHit and pressing F12, which shows all references to the OnProjectileHit. The one defined in api.generated.d.ts includes the parameters of the function:

We can see that OnProjectileHit comes with a target that is either CDOTA_BaseNPC or undefined, and a location that is a Vector. The location will never be undefined and therefore always supplied, though it can be a Vector of (0, 0, 0).

We need to make sure there's a target. If there's no target, it means that the projectile didn't hit anything and simply dissipated (the target died or became invisible, for instance), which mean we don't need to do anything else. We use the ! before the expression for negative testing, which will apply if target is either false or undefined.
ts
```javascript
@registerAbility()
export class typescript_skywrath_mage_arcane_bolt extends BaseAbility {
  sound_cast: string = 'Hero_SkywrathMage.ArcaneBolt.Cast';
  sound_impact: string = 'Hero_SkywrathMage.ArcaneBolt.Impact';
  projectile_arcane_bolt: string =
    'particles/units/heroes/hero_skywrath_mage/skywrath_mage_arcane_bolt.vpcf';

  OnSpellStart() {
    const target = this.GetCursorTarget();
    const bolt_speed = this.GetSpecialValueFor('bolt_speed');
    const bolt_vision = this.GetSpecialValueFor('bolt_vision');

    ProjectileManager.CreateTrackingProjectile({
      Ability: this,
      EffectName: this.projectile_arcane_bolt,
      Source: this.GetCaster(),
      Target: target,
      bDodgeable: false,
      bProvidesVision: true,
      iMoveSpeed: bolt_speed,
      iVisionRadius: bolt_vision,
      iVisionTeamNumber: this.GetCaster().GetTeamNumber(),
    });
  }

  OnProjectileHit(target: CDOTA_BaseNPC | undefined, location: Vector) {
    if (!target) return;
  }
}
```
1234567891011121314151617181920212223242526272829
Next, let's quickly collect the remaining information of the ability from the ability definition: we need base damage, intelligence multiplier, and the vision's radius and duration after impact:
ts
```javascript
@registerAbility()
export class typescript_skywrath_mage_arcane_bolt extends BaseAbility {
  sound_cast: string = 'Hero_SkywrathMage.ArcaneBolt.Cast';
  sound_impact: string = 'Hero_SkywrathMage.ArcaneBolt.Impact';
  projectile_arcane_bolt: string =
    'particles/units/heroes/hero_skywrath_mage/skywrath_mage_arcane_bolt.vpcf';

  OnSpellStart() {
    const target = this.GetCursorTarget();
    const bolt_speed = this.GetSpecialValueFor('bolt_speed');
    const bolt_vision = this.GetSpecialValueFor('bolt_vision');

    ProjectileManager.CreateTrackingProjectile({
      Ability: this,
      EffectName: this.projectile_arcane_bolt,
      Source: this.GetCaster(),
      Target: target,
      bDodgeable: false,
      bProvidesVision: true,
      iMoveSpeed: bolt_speed,
      iVisionRadius: bolt_vision,
      iVisionTeamNumber: this.GetCaster().GetTeamNumber(),
    });
  }

  OnProjectileHit(target: CDOTA_BaseNPC | undefined, location: Vector) {
    if (!target) return;

    const bolt_vision = this.GetSpecialValueFor('bolt_vision');
    const bolt_damage = this.GetSpecialValueFor('bolt_damage');
    const int_multiplier = this.GetSpecialValueFor('int_multiplier');
    const vision_duration = this.GetSpecialValueFor('vision_duration');
  }
}
```
12345678910111213141516171819202122232425262728293031323334
The last two things that we need to do is apply a AddFOWViewer, which shows an area of the map in fog of war, and apply damage to the target based on base damage plus a multiplier of the caster's intelligence. Adding the FOW Viewer is easy, so let's get it out of the way by adding the line:
ts
```javascript
AddFOWViewer(this.GetCaster().GetTeamNumber(), location, bolt_vision, vision_duration, false);
```
1
location is the parameter fetched from the function, while bolt_vision and vision_duration were retrieved from the ability definition. For damage, we have a small calculation. In order to do that calculation readable, let's make a damage variable. We want to assign it with the base damage, and then calculate the intelligence multiplier. Sounds like a good use case for a let variable initializer. We'll add the following line:
ts
```javascript
let damage = bolt_damage;
```
1
Now we want to add damage on top of the base damage. We can use the += operator to sum the value on the right with the value already stored in damage, so the plan is to do damage += this.GetCaster().GetIntellect() * int_multiplier. However, for some reason, GetIntellect() is not shown as a function.

## Coding The Ability: Final Push ​

So why isn't GetIntellect() showing up? The best way to do this is check which class GetIntellect() is under. Running a search in moddota tools will show us that the class GetIntellect() belongs to is CDOTA_BaseNPC_Hero, which makes sense: only heroes have intelligence; units, buildings, and other entities don't. But our caster is a hero, so what's the problem?

If we hover over this.GetCaster(), we'll see the following information on it:

According to the return type, GetCaster() returns a CDOTA_BaseNPC. But as we've established before, GetIntellect() only applies for the CDOTA_BaseNPC_Hero class. So we'll have to let Typescript know that our caster is a hero by casting. We cast by adding as classname; in this case, this.GetCaster() as CDOTA_BaseNPC_Hero. As the caster's type is now a hero, you can call hero related functions, such as GetIntellect().

INFO

Generally, casting is not considered a good practice as you force Typescript to assume you're absolutely sure that the type is correct. Typeguards, which will be covered in a later tutorial, are considered a good way to make sure you don't use a type that doesn't support it. For instance, imagine what happens if at some point in your custom game, you give this ability to a creep, which doesn't have any Intelligence stat.

We'll only increase the intelligence multiplier after we made sure the caster is a hero; otherwise, we'll only use the base damage. After the check and the cast, our code should look like this:
ts
```javascript
@registerAbility()
export class typescript_skywrath_mage_arcane_bolt extends BaseAbility {
  sound_cast: string = 'Hero_SkywrathMage.ArcaneBolt.Cast';
  sound_impact: string = 'Hero_SkywrathMage.ArcaneBolt.Impact';
  projectile_arcane_bolt: string =
    'particles/units/heroes/hero_skywrath_mage/skywrath_mage_arcane_bolt.vpcf';

  OnSpellStart() {
    const target = this.GetCursorTarget();
    const bolt_speed = this.GetSpecialValueFor('bolt_speed');
    const bolt_vision = this.GetSpecialValueFor('bolt_vision');

    ProjectileManager.CreateTrackingProjectile({
      Ability: this,
      EffectName: this.projectile_arcane_bolt,
      Source: this.GetCaster(),
      Target: target,
      bDodgeable: false,
      bProvidesVision: true,
      iMoveSpeed: bolt_speed,
      iVisionRadius: bolt_vision,
      iVisionTeamNumber: this.GetCaster().GetTeamNumber(),
    });
  }

  OnProjectileHit(target: CDOTA_BaseNPC | undefined, location: Vector) {
    if (!target) return;

    const bolt_vision = this.GetSpecialValueFor('bolt_vision');
    const bolt_damage = this.GetSpecialValueFor('bolt_damage');
    const int_multiplier = this.GetSpecialValueFor('int_multiplier');
    const vision_duration = this.GetSpecialValueFor('vision_duration');

    AddFOWViewer(this.GetCaster().GetTeamNumber(), location, bolt_vision, vision_duration, false);

    let damage = bolt_damage;
    if (this.GetCaster().IsHero()) {
      damage += (this.GetCaster() as CDOTA_BaseNPC_Hero).GetIntellect() * int_multiplier;
    }
  }
}
```
1234567891011121314151617181920212223242526272829303132333435363738394041
All that's left is to apply the damage on the target. Same as the CreateTrackingProjectile, ApplyDamage is also typed, and will automatically show us the options. Unlike CreateTrackingProjectile, none of those properties are optional and are all mandatory to make a proper damage instance. That means that Typescript will ensure you assign all the properties with valid values.

Our code should now look like this:
ts
```javascript
@registerAbility()
export class typescript_skywrath_mage_arcane_bolt extends BaseAbility {
  sound_cast: string = 'Hero_SkywrathMage.ArcaneBolt.Cast';
  sound_impact: string = 'Hero_SkywrathMage.ArcaneBolt.Impact';
  projectile_arcane_bolt: string =
    'particles/units/heroes/hero_skywrath_mage/skywrath_mage_arcane_bolt.vpcf';

  OnSpellStart() {
    const target = this.GetCursorTarget();
    const bolt_speed = this.GetSpecialValueFor('bolt_speed');
    const bolt_vision = this.GetSpecialValueFor('bolt_vision');

    ProjectileManager.CreateTrackingProjectile({
      Ability: this,
      EffectName: this.projectile_arcane_bolt,
      Source: this.GetCaster(),
      Target: target,
      bDodgeable: false,
      bProvidesVision: true,
      iMoveSpeed: bolt_speed,
      iVisionRadius: bolt_vision,
      iVisionTeamNumber: this.GetCaster().GetTeamNumber(),
    });
  }

  OnProjectileHit(target: CDOTA_BaseNPC | undefined, location: Vector) {
    if (!target) return;

    const bolt_vision = this.GetSpecialValueFor('bolt_vision');
    const bolt_damage = this.GetSpecialValueFor('bolt_damage');
    const int_multiplier = this.GetSpecialValueFor('int_multiplier');
    const vision_duration = this.GetSpecialValueFor('vision_duration');

    AddFOWViewer(this.GetCaster().GetTeamNumber(), location, bolt_vision, vision_duration, false);

    let damage = bolt_damage;
    if (this.GetCaster().IsHero()) {
      damage += (this.GetCaster() as CDOTA_BaseNPC_Hero).GetIntellect() * int_multiplier;
    }

    ApplyDamage({
      attacker: this.GetCaster(),
      damage: damage,
      damage_type: DamageTypes.MAGICAL,
      victim: target,
      ability: this,
      damage_flags: DamageFlag.NONE,
    });
  }
}
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647484950
Lastly, I forgot to include sounds, so let's go ahead and emit sounds for casting (sound_cast) and sound for impact (sound_impact). The final code should look like this:
ts
```javascript
@registerAbility()
export class typescript_skywrath_mage_arcane_bolt extends BaseAbility {
  sound_cast: string = 'Hero_SkywrathMage.ArcaneBolt.Cast';
  sound_impact: string = 'Hero_SkywrathMage.ArcaneBolt.Impact';
  projectile_arcane_bolt: string =
    'particles/units/heroes/hero_skywrath_mage/skywrath_mage_arcane_bolt.vpcf';

  OnSpellStart() {
    const target = this.GetCursorTarget();

    const bolt_speed = this.GetSpecialValueFor('bolt_speed');
    const bolt_vision = this.GetSpecialValueFor('bolt_vision');

    EmitSoundOn(this.sound_cast, this.GetCaster());

    ProjectileManager.CreateTrackingProjectile({
      Ability: this,
      EffectName: this.projectile_arcane_bolt,
      Source: this.GetCaster(),
      Target: target,
      bDodgeable: false,
      bProvidesVision: true,
      iMoveSpeed: bolt_speed,
      iVisionRadius: bolt_vision,
      iVisionTeamNumber: this.GetCaster().GetTeamNumber(),
    });
  }

  OnProjectileHit(target: CDOTA_BaseNPC | undefined, location: Vector) {
    if (!target) return;

    EmitSoundOn(this.sound_impact, target);

    const bolt_vision = this.GetSpecialValueFor('bolt_vision');
    const bolt_damage = this.GetSpecialValueFor('bolt_damage');
    const int_multiplier = this.GetSpecialValueFor('int_multiplier');
    const vision_duration = this.GetSpecialValueFor('vision_duration');

    AddFOWViewer(this.GetCaster().GetTeamNumber(), location, bolt_vision, vision_duration, false);

    let damage = bolt_damage;
    if (this.GetCaster().IsHero()) {
      damage += (this.GetCaster() as CDOTA_BaseNPC_Hero).GetIntellect() * int_multiplier;
    }

    ApplyDamage({
      attacker: this.GetCaster(),
      damage: damage,
      damage_type: DamageTypes.MAGICAL,
      victim: target,
      ability: this,
      damage_flags: DamageFlag.NONE,
    });
  }
}
```
12345678910111213141516171819202122232425262728293031323334353637383940414243444546474849505152535455
## Video Record ​

Below is a short video record that shows the application of Skywrath Mage's Arcane Bolt in TypeScript as explained in this section.

## What's Next? ​

The next tutorial Modifiers in Typescript explains how to create a basic modifier, and link the modifier to an ability via Typescript.


---

# Modifiers in Typescript | ModDota

**Source:** https://moddota.com/scripting/Typescript/typescript-modifier

---


# Modifiers in Typescript ​

Modifiers are an extremely important part of almost any Dota custom game. They allow you to modify certain properties of your hero, deal damage to it over time, or apply various effects on it. Like abilities, we'll also create them in Typescript.

We'll use an easy example which should cover a lot of common concepts for modifiers. This example is Skywrath's Ancient seal, which is an ability that simply applies a modifier to an enemy. The modifier applies the Silenced state on the enemy, and reduces its magic resist property by a percentage.

INFO

For simplicity's sake, assume the ability has no shard or talent upgrades.

## Defining The Ability ​

For starters, let's define the ability that applies the modifier. We'll begin with the KV, which is straightforward. Open /game/scripts/npc/npc_abilities_custom.txt and copy the following content inside the "DOTAAbilities" key.

```javascript
//=================================================================================================================
// Skywrath Mage: Ancient Seal
//=================================================================================================================
"typescript_skywrath_mage_ancient_seal"
{
    // General
    //-------------------------------------------------------------------------------------------------------------
    "BaseClass"             		"ability_lua"
    "AbilityTextureName"			"skywrath_mage_ancient_seal"
    "ScriptFile"				    "abilities/typescript_skywrath_mage_ancient_seal"
    "AbilityBehavior"				"DOTA_ABILITY_BEHAVIOR_UNIT_TARGET"
    "AbilityUnitTargetTeam"			"DOTA_UNIT_TARGET_TEAM_BOTH"
    "AbilityUnitTargetType"			"DOTA_UNIT_TARGET_HERO | DOTA_UNIT_TARGET_BASIC"
    "SpellImmunityType"				"SPELL_IMMUNITY_ENEMIES_NO"
    "SpellDispellableType"			"SPELL_DISPELLABLE_YES"
    "AbilitySound"					"Hero_SkywrathMage.AncientSeal.Target"

    // Casting
    //-------------------------------------------------------------------------------------------------------------
    "AbilityCastRange"				"700 750 800 850"
    "AbilityCastPoint"				"0.1 0.1 0.1 0.1"

    // Time
    //-------------------------------------------------------------------------------------------------------------
    "AbilityCooldown"				"14"

    // Cost
    //-------------------------------------------------------------------------------------------------------------
    "AbilityManaCost"				"80 90 100 110"

    // Special
    //-------------------------------------------------------------------------------------------------------------
    "AbilityValues"
    {
      "resist_debuff"			"30 35 40 45"
      "seal_duration"			"3.0 4.0 5.0 6.0"
    }
    "AbilityCastAnimation"		"ACT_DOTA_CAST_ABILITY_3"
}
```
123456789101112131415161718192021222324252627282930313233343536373839
As the ScriptFile denotes it, the lua file should be in vscripts/abilities/. To do so, we'll create our TS file in src/vscripts/abilities/, where it would be appropriately routed when compiled. Create the typescript_skywrath_mage_ancient_seal.ts file and open it.

## Coding The Ability ​

The ability itself is very straightforward, since all it does is apply a modifier on the target. For simplicity's sake, let's decide the modifier will be named modifier_typescript_ancient_seal. Following is the ability:
ts
```javascript
import { BaseAbility, registerAbility } from '../lib/dota_ts_adapter';

@registerAbility()
export class typescript_skywrath_mage_ancient_seal extends BaseAbility {
  sound_cast = 'Hero_SkywrathMage.AncientSeal.Target';

  OnSpellStart() {
    // Special values
    const seal_duration = this.GetSpecialValueFor('seal_duration');

    // Fetch target
    const target = this.GetCursorTarget()!;

    // Play sound
    target.EmitSound(this.sound_cast);

    // Add modifier
    target.AddNewModifier(this.GetCaster(), this, 'modifier_typescript_ancient_seal', {
      duration: seal_duration,
    });
  }
}
```
12345678910111213141516171819202122
Great! This applies the modifier on the target. The caster of the ability, denoted by this.GetCaster() in the first argument, is assigned to be modifier's associated caster, while the ability itself, denoted by this in the second argument, is assigned as the modifier's associated ability. We can get those by calling this.GetCaster() and this.GetAbility(), respectively from the modifier.

INFO

The unit we're adding the modifier to, in this case our target, becomes the parent of the modifier. We can get it from the modifier with this.GetParent(). This can be useful in various cases, such as when emitting sound from it, dealing damage to it, or placing particles on its current location.

Now let's create the modifier.

## Creating The Modifier ​

This part is absolutely up to you and your organizational preferences: some prefer to add the modifier as a separate file, while some prefer to have the ability and its associated modifiers in the same file. You could place the modifier file inside src/vscripts/modifiers, for instance. In order to keep the guide simple, let's make the modifier in the same file.

Very similar to an ability in TS, modifiers are also a class. We create a modifier with the following structure:
ts
```javascript
@registerModifier()
export class modifier_typescript_ancient_seal extends BaseModifier {}
```
12
As you can see, it's very similar to an ability, replacing @registerAbility() with @registerModifier(), and the BaseAbility extension with BaseModifier. Note that @registerModifier() takes care of LinkLuaModifier for you, so you don't need to call it on TS modifiers.

## Typechecking Modifier Calls ​

Before we continue, one thing we must do is link the ability to the modifier, which makes sure the modifier is registered. In addition, rather than relying on a string for the naming of the modifier, we'll link the class name.

To do so, simply remove the quotation marks around the modifier name, then add .name to it. See below the code before and after linking the class:
BeforeAfterts
```javascript
// Add modifier
target.AddNewModifier(this.GetCaster(), this, 'modifier_typescript_ancient_seal', {
  duration: seal_duration,
});
```
1234ts
```javascript
// Add modifier
target.AddNewModifier(this.GetCaster(), this, modifier_typescript_ancient_seal.name, {
  duration: seal_duration,
});
```
1234
This results at the exact name of the modifier as a string, which is enforced by Typescript.

INFO

If your modifier is in another file, you'll have to import it first before you can link it in the above fashion.

## Coding The Modifier ​

Alright. Let's set and apply the properties for the modifier such as the particle effect. In addition, let's set some useful properties via modifier functions. Also, this is my personal choice, but I usually put ability specials as a class property so they can be easily used everywhere in the modifier.
ts
```javascript
@registerModifier()
export class modifier_typescript_ancient_seal extends BaseModifier {
  particle_seal =
    'particles/units/heroes/hero_skywrath_mage/skywrath_mage_ancient_seal_debuff.vpcf';
  resist_debuff?: number;

  // When set to false, shows the modifier icon on the HUD. Otherwise, the modifier is hidden.
  IsHidden() {
    return false;
  }

  // When set to true, the outer circle of the modifier is red, indicating that the modifier is a debuff. Otherwise, the outer circle is green.
  IsDebuff() {
    return true;
  }

  // When set to true, the modifier can be purged by basic dispels.
  IsPurgable() {
    return true;
  }

  // Event call that is triggered when the modifier is created and attached to a unit.
  OnCreated() {
    // Get the ability and fetch ability specials from it
    const ability = this.GetAbility();
    if (ability) {
      this.resist_debuff = ability.GetSpecialValueFor('resist_debuff');
    }

    // Add particle effect
    const particle = ParticleManager.CreateParticle(
      this.particle_seal,
      ParticleAttachment.OVERHEAD_FOLLOW,
      this.GetParent(),
    );
    ParticleManager.SetParticleControlEnt(
      particle,
      1,
      this.GetParent(),
      ParticleAttachment.ABSORIGIN_FOLLOW,
      'hitloc',
      this.GetParent().GetAbsOrigin(),
      true,
    );
    this.AddParticle(particle, false, false, -1, false, true);
  }
}
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647
Okay, so the modifier is defined, but the main parts of it are not yet defined: the silence and the magic resistance reduction. Let's do those next.

## States ​

The CheckState function that modifiers have is called every frame and sets the state of the parent based on its modifiers. The function gets a bunch of states and pairs each of them with a boolean that decides whether the state should be applied.

We only need to silence the target, so that's the only state we require here. Add the following to the modifier:
ts
```javascript
CheckState() {
    return {[ModifierState.SILENCED]: true}
}
```
123
Note the syntax: the curly braces start a Record of states, each assigned a boolean. If you have multiple states - boolean pairs, separate each pair with a comma.

## Modifier Properties ​

The DeclareFunctions declares which function properties are included in this modifier. Since we need the property that modifies the magical resistance, let's call it here:
ts
```javascript
DeclareFunctions() {
    return [ModifierFunction.MAGICAL_RESISTANCE_BONUS];
}
```
123
Unlike states, DeclareFunctions expects an array of modifier functions. If you have multiple modifier functions, separate them with a comma.

INFO

When hovering over a modifier function's name (e.g. MAGICAL_RESISTANCE_BONUS), a tooltip appears, showing you the name of the linked property function call. Simply copy the function into the modifier. This also has auto complete, if you prefer to do so manually.

Now that we declared the magical resistance bonus, let's return a negative bonus so the enemy gets a negative magic resistance bonus from this modifier:
ts
```javascript
GetModifierMagicalResistanceBonus() {
    return this.resist_debuff ?? 0;
}
```
123
Note that this function expects a number - anything else is not accepted.

INFO

this.resist_debuff is supposedly a number that is fetched from the ability special value. However, if for some reason this.resist_debuff is not initialized, it would be undefined, which is not accepted by this function. Using Nullish Coalescing, the value is defaulted to 0 if this.resist_debuff is undefined.

That's it! A simple modifier is done with a bunch of simple lines, which are all typechecked for us.

## What's Next? ​

Next, you can learn about events in the next tutorial: Events and Timers in Typescript.


---

# Events and Timers in Typescript | ModDota

**Source:** https://moddota.com/scripting/Typescript/typescript-events

---


# Events and Timers in Typescript ​

As you may know, Dota has many events. While developing a custom game, listening to events is very useful, as it allows you to do something when something occurs. For example, listening to an event that triggers on death, whenever a hero, unit or building are killed. Events will supply some information about the instance of that event. For example, in the above event, the killer and the victim will be included in the parameters.

## Important Note Before We Begin ​

This section has many async functions that have callbacks as arguments. If you're not aware of what those are, W3Schools has great straightforward articles explaining callbacks and async functions on the subject.

This tutorial will reference and explain code written in the Typescript Template. If you do not have it, please read the Typescript Introduction article for instructions. Though this will use the written code as examples, feel free to play around with the template as practice and to really understand how it all ties together.

## Built-in Events ​

Built-in events, of which there are many, cannot be changed in terms of when they are triggered and what parameters are provided, so bear that in mind. However, you can add a listener to the event with a callback function - a function that will run when that event triggers.

Open the GameMode.ts file in the /src/vscripts folder of your project. There, you can find examples of events that we're listening to. For example, let's take the following event:
ts
```javascript
ListenToGameEvent('npc_spawned', (event) => this.OnNpcSpawned(event), undefined);
```
1
Calling the ListenToGameEvent creates a new listener to that event. In the first argument, a valid event's name must be provided. Typescript knows which event names are allowed and will refuse any other name that is not one of the known events. Not only that, it also knows what type of parameters each event pass along. You can use your IDE's intellisense (e.g. in VSCode it is ctrl + space by default) to show the name of all events, then simply select the event you want.

Then, the second argument is the callback function. Note that it has the event => SomeFunctionName(event) syntax, named the arrow function expression syntax. This is used to define a function that will run when the event triggers. Given an event object which describes the event, the function is called and run just like any other code.

The function can be an external function, like this.OnNpcSpawned in the example above where it is defined, or you can write out the function body right there. For example:
ts
```javascript
ListenToGameEvent(
  'npc_spawned',
  (event) => {
    print('we just fired npc spawned event!');
  },
  undefined,
);
```
1234567
INFO

I do not recommend writing function bodies in this manner unless it is a few lines at most, as the code can get messy and not very readable.

As was already stated, Typescript knows what are the parameters provided when an event is triggered. They are stored in an object that we call event. If we're using an external function, that function should expect that event, which makes sure it is only used when the appropriate event runs.

In the example of this.OnNpcSpawned(event), we defined an external function in the same class to call whenever the event triggers, which looks like this:
ts
```javascript
OnNpcSpawned(event: NpcSpawnedEvent) {
    // After a hero unit spawns, apply modifier_panic for 8 seconds
    const unit = EntIndexToHScript(event.entindex) as CDOTA_BaseNPC; // Cast to npc since this is the 'npc_spawned' event
    // Give all real heroes (not illusions) the meepo_earthbind_ts_example spell
    if (unit.IsRealHero()) {
        if (!unit.HasAbility("meepo_earthbind_ts_example")) {
            // Add lua ability to the unit
            unit.AddAbility("meepo_earthbind_ts_example");
        }
    }
}
```
1234567891011
There are a few things we can see here. First, the event: NpcSpawnedEvent, which describes the type of event this function requires. This has two advantages - first, if you use an incompatible event and callback, Typescript will notify you immediately. Second, that function knows which parameters are provided for you to use.

If you're unsure which type you should use, you can hover over event in the event listener call, and Typescript will let you know which type this event is. For example, hovering over the event of npc_spawned will show you the NpcSpawnedEvent type:

Since the event triggered, we know something spawned. In the function itself, we want to know what spawned and refer to it. If we check the properties of the NpcSpawnedEvent event, we can see that it has two properties: entindex, which is of type EntityIndex, and is_respawn, which is of type boolean.

INFO

You can look up types in the editor by clicking on a type and pressing F12.

The entindex refers to the Entity Index that maps to the entity that was spawned. If we wanted to get the entity itself, we would need to cast it to a handle, which can be done by calling EntIndexToHScript. Then, you can refer to that entity (usually a unit) and do whatever you need to happen when the unit spawns. You can also use the is_respawn property to determine if that unit has respawned if it was not its first time spawning.

## Custom Events ​

In the likely case where the built-in events do not cover a situation that you want to trigger an event on, Dota allows you to create custom events. As with built-in events, Typescript plays a big part in creating custom events and ensuring the types of those events make sense.

Before we begin, we must first define the event. For that, we use a .d.ts file. If you want, you can read more about .d.ts files here. The bottom line is, we use .d.ts files to describe to Typescript about types of things that are globally available.

Navigate to /src/common/events.d.ts. There you can use the CustomGameEventDeclarations interface to add as many custom events as you want. The template designed the custom events to be pulled from events shown in this interface. We can see that it already has the example_event event which will be used as its name, and a type of ExampleEventData, which is later defined as an object that has various properties, such as myNumber.

INFO

The /common folder is for all types shared by both serverside and panorama, such as events or nettables. This means that you can define the event once and both sides will be able to see and use that event.

When you want to fire a custom event, you can use the CustomGameEventManager.Send_ServerToPlayer function to do so. There are other variants of this function, but to put it simply, this variant sends an event to a specific player. In this case, the first argument defines which player to send the event to, and the second argument defines which event it should trigger for that player. Note that you can only use custom events that were defined in the CustomGameEventDeclarations interface - Typescript will throw an error otherwise. The third argument is shaped based on the selected event, and enforces that the event is sent with all the required information for that event.

You can find an example of the CustomGameEventManager.Send_ServerToPlayer function call in GameMode.ts, which will show how it all ties together.

## Timers ​

Timers is a library written in lua. We can use the Timers library to delay actions for a certain amount of time, after which a callback function is called. It can be used as a delay or as a repeat call that happens every few seconds, for example.

INFO

Timers is written in lua. Instead of converting it to Typescript, we use the file timers.d.ts to describe to Typescript how Timers is structured, allowing us to use the Timers library as is.

Going back to GameMode.ts, the file includes a couple of Timers examples. In both of them, the execution is simple. Let's inspect one of them:
ts
```javascript
// Automatically skip setup in tools
if (IsInToolsMode()) {
  Timers.CreateTimer(3, () => {
    GameRules.FinishCustomGameSetup();
  });
}
```
123456
This is a snippet of code that triggers when the game goes into the Custom Game Setup screen, where players can assign themselves to teams. In order for devs to not have to wait on this screen on every run, we added a check - if this is in tools mode (meaning, we're launching the game from the Dota Workshop Tools), then we create a timer. After 3 seconds, we run GameRules.FinishCustomGameSetup(); which skips to the next step.

Note that the code does not wait for the timer to finish. The timer is created and the code moves on to the next line immediately. When the provided amount of time passes in game, the timer resolves, executing the callback function provided to it.

Timers can be set to repeat by returning a numeric value representing seconds. For instance, we could create the following timer:
ts
```javascript
Timers.CreateTimer(5, () => {
  print(`The current time in dota is: ${GameRules.GetDOTATime()}`);
  return 1;
});
```
1234
Doing this will create a timer that initially takes 5 seconds to execute. Since we're returning 1, the timer will repeat every 1 second. In this example, on every execution, it will print the current time and message.

Note that you can return different values on each run to make the timer run with various delays on each repeat. Additionally, returning with no value or with undefined will make the timer no longer repeat, which can be used as a stop condition for a repeating timer.

INFO

Timers respect pauses. This means that they will not progress while the game is paused, postponing the code execution until the game is unpaused.

## Using Timers with Promises to delay code ​

Sometimes you want to make a sequence of effects that occur one after another, but rather than immediately, you want them to apply after a short period has passed. While you could do that in Timers, that would create a series of callbacks, which can make the code messy and hard to read.

Instead, we could wrap the timer in a Promise. In case you are not aware of Promises, you can read on Promises in W3Schools. We will also use promises with the async/await concept, which you can read on Async/Awaits in W3Schools. Those are somewhat complex subjects, so feel free to discuss with us in Moddota on it or seek additional articles or videos on it.

Let's make a sleep function that will return a Promise that resolves when the timer executes. I usually make all utility functions such as this in a different file, usually named utils.ts. Go to /src/vscripts/libs folder and create a file named utils.ts.

There, we want to create the sleep function, which looks like this:
ts
```javascript
export function sleep(duration: number) {
  return new Promise((resolve, reject) => {
    Timers.CreateTimer(duration, () => resolve(''));
  });
}
```
12345
As you can see, the function returns a Promise, which will resolve at some point in the future. You can wait then await for the promise to resolve using async/await. For the purposes of this example, let's look at the OnNpcSpawned function. It converts an entindex to a unit, then checks if it is a real hero (e.g. not an illusion). Then, if it doesn't have the ability, it gives him the ability immediately. Let's pretend that instead, we want to give it the ability after 5 seconds have passed.

First, since we want to use await, we must convert this function to an async function. Add the async keyword right before the function name:
ts
```javascript
private async OnNpcSpawned(event: NpcSpawnedEvent) {
```
1
Then, import sleep from utils.ts:
ts
```javascript
import { sleep } from './lib/util';
```
1
And now we can sleep for 5 seconds using await:
ts
```javascript
private async OnNpcSpawned(event: NpcSpawnedEvent) {
    // After a hero unit spawns, apply modifier_panic for 8 seconds
    const unit = EntIndexToHScript(event.entindex) as CDOTA_BaseNPC; // Cast to npc since this is the 'npc_spawned' event
    // Give all real heroes (not illusions) the meepo_earthbind_ts_example spell
    if (unit.IsRealHero()) {
        if (!unit.HasAbility("meepo_earthbind_ts_example")) {
            // Wait for 5 seconds before giving it the ability
            await sleep(5);

            // Add lua ability to the unit
            unit.AddAbility("meepo_earthbind_ts_example");
        }
    }
}
```
1234567891011121314
As you can see, this makes the code very clean and easy to use. Non-repeating Timers can be converted to sleep in this way to achieve the same result with a cleaner code flow.

There are many things that you can use async/await for, such as waiting for tracking projectiles to hit, waiting until an animation finishes and so on.


---

# Tooltip Generator | ModDota

**Source:** https://moddota.com/scripting/Typescript/tooltip-generator

---


# Tooltip Generator ​

Recently, the development of a new project that named the Tooltip Generator has been completed. This project was inspired by Ark's Eaglesong idea whose purpose was to make adding localization as easy as possible, while reducing the chance to make mistakes. This project includes a secondary part, completely optional, named the Tooltip Codemaker, which helps those that already have a working addon with a lot of localization.

## The Tooltip Generator ​

The tooltip generator creates predefined Typescript objects which fit into one of three categories: Standard Tooltips, Abilities, and Modifiers. The advantage to that is the ability to write a very easy to read object by code based on the group of tooltips you're making. Whenever you make a change to any of the files and save, the Tooltip Generator will immediately take the code you've created and make localization files (such as addon_english.txt) that the game can read. This can be expanded further to support an infinite array of languages as well using the same code with slight changes to the fields you want to change.

## Wait, Typescript? My setup is lua! ​

This project is designed to work on both lua and Typescript based addons. While you will have to use Typescript specifically to make the localization, the rest of your addon is completely unaffected by this.

INFO

Most editors have plugins that add Typescript support. VSCode has built-in Typescript support and requires no plugins. In order to view Typescript syntax, make sure that your editor has Typescript support installed or enabled.

## Why would I ever bother using that though? ​

There are a few reasons why I've started this project in the first place. I was getting frustrated by the "rules" of the KV, such as having to copy "DOTA_Tooltip_Ability_my_ability_name" over and over. I constantly mistyped "Description", and occasionally used only 2 percentages instead of 3 on "%something%%%" to show a variable with a percentage. And if I ever had a missing quote, the entire thing got broken, which is extremely annoying.

In addition, as I've developed my game, my addon file became HUGE. Because of the way Dota reads this file, you cannot use #base to split this into files, and some people have resorted to making a manual script that does that. It's a lot of hassle and wasted time for everyone involved.

This project attempts to solve all those problems:

- It makes sure you never do any formatting mistake.
- You only make a single object per ability or modifier and fill all the details for it.
- You can use predefined enums to call modifier properties correctly.
- You can split it to as many files as you want.
- You can easily use your own variables to use keywords that repeat.
- All languages are managed in a single location and are properly distributed to the appropriate files.

I encourage you to at least give this project a try. You won't be disappointed.

## What do I need in order to use it? ​

This project uses Typescript and npm packages to function. Both of those require NodeJS. If you don't have it installed, or have a really old version, download the latest stable version from NodeJS site and install it.

## The Tooltip Codemaker ​

When I was developing the tooltip Generator, I manually did every single localization I had to code, and when I was done, I thought to myself: why didn't I just do a script that does it for me?

This gave birth to the Tooltip Codemaker. The Tooltip Codemaker is the exact opposite of the Tooltip Generator: instead of turning code into localization KVs, it turns localization KVs into code! This is particularly useful if you already have a lot of localization done by KV.

Most of the time, you'll only use this tool no more than once, to turn your current KV into code. After that, the assumption is that you'll continue creating the rest of the tooltips using the Tooltip Generator. If your addon is completely empty, you don't need it at all.

Note that the Codemaker isn't, and cannot be perfect, due to the nature of how localization KVs are defined. It looks for keywords like _Description, _Lore, _Note etc. to pinpoint the actual ability name, then groups all similar KVs to that ability. Abilities that have very similar naming scheme can be mistakenly grouped together; for example, in vanilla Dota, the ice_blast and ice_blast_release abilities were grouped as one, since it thought _release was one of the ability specials of ice_blast. Just make sure to take a look at the code after running the script and fix the mistakes manually, if any.

The script assumes that everything that begins with Dota_Tooltip_Ability_... is an ability, and everything that begins with Dota_Tooltip_modifier_... is a modifier (case insensitive). Everything else is regarded as a Standard Tooltip. That means that depending on your KVs, you might have to make changes to the compiler before running it in order to have it work on your addon's localization files.

You can find the Tooltip Codemaker in this github repo. Follow the readme for instructions on how to use it.

## Installing the Tooltip Generator ​

In order to use the Tooltip Generator, you must install it. This only needs to be done once per project. Navigate to the game's root of your addon. For most projects, that would be in dota 2 beta/game/dota_addons/your_addon/. If you're using symlinks or a Typescript configuration, the symlinked folder is most likely to be the root of your folder.

Click on the path bar of the folder, type cmd and press enter. This should open the command line on the folder you're currently in. If you're not sure where the path bar is, press Alt+D to highlight it.

In the command line, type npm install @shushishtok/tooltip_generator. The installation should take a few seconds, which triggers an additional, "final" installation, which can take up to a few minutes. When the installation completes, it should show a success message and a few warnings - you can ignore those warnings. Keep the command line open for now.

After the installation is completed, a new file package.json is added to your addon's root, along with a node_modules folder. You can mostly ignore those files completely.

The installation assumes that your resource folder is located on your root, which should be the case for standard addons created by the Dota Workshop. If so, skip ahead. However, if this is not the case, open package.json and change "~resource": "resource", field to match the path from the root folder to that folder. For example, Typescript configurations using Moddota's Typescript Template will need to change it to "~resource": "game/resource",. Save the file and close it.

On the command line, type npm run init and press enter. This added a few files to your resource folder, which you can also ignore. You'll also see a new folder, localization, which is the core of all your Typescript-coded localization files.

DANGER

The next step activates the Tooltip Generator, which will completely erase all of your addon localization files (such as addon_english.txt) and replace them with your code. Make sure to back them up before proceeding!

## Testing the Tooltip Generator ​

Navigate to the localization folder inside your resource folder. In this folder you will find localizationData.ts. This is used as a sample for the tooltip generator. Open it to find the following code:
ts
```javascript
StandardTooltips.push({
  classname: 'Hello',
  name: 'test',
});
```
1234
This object is a Standard Tooltip, which is expected to be converted to "Hello" "test" in the KV. Let's test it to check if it works as expected.

Using the same command line as before, run npm run dev. If it works as expected, you should see it is watching a few files, and that it wrote a few localizations:

Check the addon_english.txt file. It should now have only one localization, as we only have the single test object.

INFO

While the command line is running the npm run dev command, a "watcher" process is running and is waiting for changes. Any changes done in files in the localization folder will immediately re-compile the files and re-create the addon_<language> files.

You might notice that there are other language files as well. By default, the English, Russian and Standard Chinese (SChinese) are enabled. Later in this guide, we'll discuss language control for those files. Right now, all files have exactly the same output, so you can ignore them for now.

Just to make sure that the watcher is working correctly, go back to localizationData.ts and make a new Standard Tooltip object as follows:
ts
```javascript
StandardTooltips.push({
  classname: 'watcher_test',
  name: 'This should be automatically added',
});
```
1234
Save your file. Your command line have refreshed (don't worry if you missed it). Check your addon_english.txt (you might have to close it and open it again to see changes). If you can now also see a second localization "watcher_test" "This should be automatically added", the test is successful.

INFO

You can activate the watcher in any editor that supports npm builds, like VSCode, by running the npm run dev in it. Sublime also has this support, but requires a short setup which you can find in the readme of the Tooltip Generator Github repo. Regardless, you can always use the command line to do so. The downside to it is needing to have the command line window open while the watcher is running, which isn't as fun.

## Localization Types ​

In the base form of the localization generator, each localization goes into one of three categories:

- Standard Tooltips: Everything that isn't an ability or a modifier. Has no predefined key structure, and can be everything. The above examples are Standard Tooltips. Those are the most simple types of KVs.
- Ability Tooltips: All abilities adhere to the key structure of DOTA_Tooltip_ability_abilityname. They also have predefined suffix keys such as _Description, _Lore, _Note0 etc. A single ability tooltip object can include many properties, as mentioned above, and supports all ability suffix keys.
- Modifier Tooltips: All modifiers adhere to the key structure of DOTA_Tooltip_modifiername. It is common to start every modifier's name with modifier_..., but those should work here even if you named your modifiers differently.

In my personal mod, Dota Reimagined, I've created two more Tooltip Localization types: Reimagined Tooltips and Talent Tooltips. Those are disabled (commented out) in the compiler because they do not work on standard modes (even talents, that system is custom made in my mod). However, they can be used as good reference to setting up additional localization types if you so desire. Feel free to check the compiler (found at node_modules/@shushishtok/tooltip_generator/localizationCompiler.ts) and tweak it as you see fit. The above Tooltips types should be sufficient for most modes.

## Standard Tooltip Example ​

Standard Tooltips are extremely straightforward and are very easy to make. They have the following fields:

- Classname: string
- Name: string

Classname is the left side of the KV and Name is on the right. For instance, the following tooltip object:
ts
```javascript
StandardTooltips.push({
  classname: 'standard_tooltip_example',
  name: 'Tooltip Example',
});
```
1234
Will produce the following KV:
txt
```javascript
"standard_tooltip_example"      "Tooltip Example"
```
1
As you can see, it produces exactly the class-name relationship of an object, with no other logic applied.

## Ability Localization Example ​

Ability Tooltips probably have the biggest objects, because abilities can include a lot of properties. Each property has an expected type (explained later). Ability Tooltips have the following fields:

- Ability Classname: string
- Name: string
- Description: string
- Lore: string
- Notes: Array of strings
- Scepter description: string
- Shard description: string
- Ability specials: Array of Ability special objects.

You may notice that notes and ability specials are arrays. This is because an ability can (technically) have an indefinite amount of notes and ability specials, those are defined here. Let's begin with a simple ability example:
ts
```javascript
Abilities.push({
  ability_classname: 'aghanims_shard_explosion',
  name: 'Shard Explosion',
  description: 'Fires a shard at the target point which deals damage on impact.',
  lore: "Aghanims' signature move, firing shards of arcane energy.",
});
```
123456
This is straightforward, and will create the following ability KV:
txt
```javascript
"DOTA_Tooltip_Ability_aghanims_shard_explosion"    "Shard Explosion"
"DOTA_Tooltip_Ability_aghanims_shard_explosion_description"    "Fires a shard at the target point which deals damage on impact."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_Lore"    "Aghanims' signature move, firing shards of arcane energy."
```
123
Pretty nifty, right? Let's add scepter and shards effects to the ability:
ts
```javascript
Abilities.push({
  ability_classname: 'aghanims_shard_explosion',
  name: 'Shard Explosion',
  description: 'Fires a shard at the target point which deals damage to all enemies on impact.',
  lore: "Aghanims' signature move, firing shards of arcane energy.",
  scepter_description: 'Increases damage and explosion range.',
  shard_description: 'Decreases cooldown of the ability.',
});
```
12345678
After saving, those are immediately added to the localization:
txt
```javascript
"DOTA_Tooltip_Ability_aghanims_shard_explosion"    "Shard Explosion"
"DOTA_Tooltip_Ability_aghanims_shard_explosion_description"    "Fires a shard at the target point which deals damage to all enemies on impact."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_Lore"    "Aghanims' signature move, firing shards of arcane energy."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_scepter_description"    "Increases damage and explosion range."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_shard_description"    "Decreases cooldown of the ability."
```
12345
You may have noticed that I didn't use any number or ability special variable on the ability, so let's discuss that. Most ability fields supports using variables to be replaced as numbers in the game based on the value of an ability special. In KV, it is usually done by the format of %something%, where something reflecting an ability special value. The use of percentages as a delimiter always seemed flawed to me. Instead we use the {something} delimiter. Variables defined this way will be correctly processed to the format expected by KV. An advantage of that is the addition to percentages: if you wanted to show 20% in game, where 20 is your ability special, all you have to do is {something}%. Let's make an example of that in our ability:
ts
```javascript
Abilities.push({
  ability_classname: 'aghanims_shard_explosion',
  name: 'Shard Explosion',
  description:
    'Fires a shard at the target point which deals {damage} damage to all enemies on impact.',
  lore: "Aghanims' signature move, firing shards of arcane energy.",
  scepter_description:
    'Increases damage by {scepter_damage} and explosion range by {scepter_aoe_bonus}.',
  shard_description: 'Decreases cooldown of the ability by {shard_cd_pct}%.',
});
```
12345678910
This translates into proper KV:
txt
```javascript
"DOTA_Tooltip_Ability_aghanims_shard_explosion"    "Shard Explosion"
"DOTA_Tooltip_Ability_aghanims_shard_explosion_description"    "Fires a shard at the target point which deals %damage% damage to all enemies on impact."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_Lore"    "Aghanims' signature move, firing shards of arcane energy."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_scepter_description"    "Increases damage by %scepter_damage% and explosion range by %scepter_aoe_bonus%."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_shard_description"    "Decreases cooldown of the ability by %shard_cd_pct%%%."
```
12345
Finally, let's talk about notes and ability specials. Notes are arrays of strings, with each string reflecting a note about the ability. The compiler will properly compile them into Note0, Note1, Note2 etc. that the game expects.

Ability specials are slightly more complex. Those are arrays of ability special objects. Each object expects, at the very least, the ability special name and its ingame text, like "shard_damage" and "DAMAGE". It expects nothing else except the text. However, it supports two optional fields:

- Percentage
- Item stat

Those are both booleans that default to false if omitted, and would only be included if you want to specifically enable them. The percentage field adds a % to the beginning of the text, while the item stat adds +$ instead. Let's make our complete ability tooltip by integrating those into our example above:
ts
```javascript
Abilities.push({
  ability_classname: 'aghanims_shard_explosion',
  name: 'Shard Explosion',
  description:
    'Fires a shard at the target point which deals {damage} damage to all enemies on impact.',
  lore: "Aghanims' signature move, firing shards of arcane energy.",
  scepter_description:
    'Increases damage by {scepter_damage} and explosion range by {scepter_aoe_bonus}.',
  shard_description: 'Decreases cooldown of the ability by {shard_cd_pct}%.',
  notes: [
    'The projectile moves at {projectile_speed} speed.',
    'Despite the visual effect, all enemies in range immediately take damage upon impact.',
    'Can be disjointed.',
  ],

  ability_specials: [
    {
      ability_special: 'damage',
      text: 'DAMAGE',
    },

    {
      ability_special: 'radius',
      text: 'EXPLOSION RADIUS',
    },

    {
      ability_special: 'scepter_cd_reduction',
      text: 'COOLDOWN REDUCTION',
      percentage: true,
    },
  ],
});
```
123456789101112131415161718192021222324252627282930313233
The Ability Tooltip object looks bigger because of the spaces between each ability special object, but honestly that's my own coding preference - as long as you adhere to the structure of objects inside an array, it would still process the information just as well.

This is processed to the final KV that the game reads perfectly:
txt
```javascript
"DOTA_Tooltip_Ability_aghanims_shard_explosion"    "Shard Explosion"
"DOTA_Tooltip_Ability_aghanims_shard_explosion_description"    "Fires a shard at the target point which deals %damage% damage to all enemies on impact."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_Lore"    "Aghanims' signature move, firing shards of arcane energy."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_Note0"    "The projectile moves at %projectile_speed% speed."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_Note1"    "Despite the visual effect, all enemies in range immediately take damage upon impact."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_Note2"    "Can be disjointed."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_scepter_description"    "Increases damage by %scepter_damage% and explosion range by %scepter_aoe_bonus%."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_shard_description"    "Decreases cooldown of the ability by %shard_cd_pct%%%."
"DOTA_Tooltip_Ability_aghanims_shard_explosion_damage"    "DAMAGE"
"DOTA_Tooltip_Ability_aghanims_shard_explosion_radius"    "EXPLOSION RADIUS"
"DOTA_Tooltip_Ability_aghanims_shard_explosion_scepter_cd_reduction"    "%COOLDOWN REDUCTION"
```
1234567891011
## Modifier Localization Example ​

The last group is a Modifier Tooltip. Unlike abilities, modifiers only have a classname, a name and a description. However, they also have an element of their own: they can present dynamic values by using modifier properties. I've always incorrectly used them, so I've taken an extra step to fix this. For now, let's make a simple modifier:
ts
```javascript
Modifiers.push({
  modifier_classname: 'modifier_greater_power',
  name: 'Greater Power',
  description: 'Increases your base damage and your move speed.',
});
```
12345
It is very quickly processed to the following KV:
txt
```javascript
"DOTA_Tooltip_modifier_greater_power"    "Greater Power"
"DOTA_Tooltip_modifier_greater_power_description"    "Increases your base damage and your move speed."
```
12
This time, we want to also include the exact bonus to the base damage and the move speed bonus that you get from this modifier. Assuming you increase your base damage by using the MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE modifier property, we can use an enum to use it. Note that in order to be able to insert variables into strings, we need to use string interpolation, which is done by encasing the string with with backticks (see example if this isn't clear). In addition, we must adhere to the following structure: {${LocalizationModifierProperty.SOME_PROPERTY}}. When using string interpolation, ${variable} convert during compilation to the actual variable's value. This allows us to use enums for those modifier properties.

INFO

When calling enums, you only need to specify the property's name, not the entire string. For instance, MODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE will be called by simply typing PREATTACK_BONUS_DAMAGE. This will still be correctly processed by the compiler to the form the game expects.

Let's improve the above example with dynamic variables. The move speed bonus is a percentage bonus, so we'll also add a % sign to it.
ts
```javascript
Modifiers.push({
  modifier_classname: 'modifier_greater_power',
  name: 'Greater Power',
  description: `Increases your base damage by {${LocalizationModifierProperty.PREATTACK_BONUS_DAMAGE}} and your move speed by {${LocalizationModifierProperty.MOVESPEED_BONUS_PERCENTAGE}}%.`,
});
```
12345
Those values are enums, so the compiler makes sure those are typed correctly, and assuming they're surrounded by {}, they should be properly processed. This is processed into KV like this:
txt
```javascript
"DOTA_Tooltip_modifier_greater_power"    "Greater Power"
"DOTA_Tooltip_modifier_greater_power_description"    "Increases your base damage by %dMODIFIER_PROPERTY_PREATTACK_BONUS_DAMAGE% and your move speed by %dMODIFIER_PROPERTY_MOVESPEED_BONUS_PERCENTAGE%%%."
```
12
This works for all modifier properties.

INFO

The property assumes the d (integer) prefix. If you want to use f (float) prefix instead, you can call it with {f${LocalizationModifierProperty.PREATTACK_BONUS_DAMAGE}}. Right now, f is the only additional supported keyword.

## Language Control ​

Every tooltip can have different values based on the client's language, which is why we have many addon_<language>.txt files, one for each language. Different mods have different language supports, based on the primary language of the mode and additional translations. This has introduced the need for language control.

On the top of the .TS file, you can see an import for Language. This enum controls which languages are enabled; each enabled language will produce its addon_<language>.txt file. By default, the English, Russian and Standard Chinese languages are enabled. In addition, the None "language" is also enabled - it is only used for compilation, and should not be disabled or used.

In order to enable or disable a language, navigate to /game/resource/languages.ts. Inside it, you should see export enum Language, which has a list of languages. Simply comment or uncomment a language to disable or enable it. This needs to be compiled and refreshed for the changes to take effects, so restart your terminal with npm run dev and you should see the added/removed languages in the output.

## Language Override Example ​

By default, all language files will have the same KVs. You can, however, override a specific language's field to make the compiler use a different string for that language. This is done by the language_override property which is available to all tooltip objects. Let's make an example utilizing the language override:
ts
```javascript
StandardTooltips.push({
  classname: 'standard_tooltip_example',
  name: 'Tooltip Example',
  language_overrides: [
    {
      language: Language.Russian,
      name_override: 'Пример всплывающей подсказки',
    },
  ],
});
```
12345678910
As the example shows, we're overriding the name field of the standard_tooltip_example classname with a different text. This is done specifically for the Russian language using a language override object for the Standard Tooltip. Additional objects can be added for every language that we want to have a different text for. This results in the following KVs:
EnglishRussianStandard Chinese
```javascript
"standard_tooltip_example"    "Tooltip Example"
```
1
```javascript
"standard_tooltip_example"    "Пример всплывающей подсказки"
```
1
```javascript
"standard_tooltip_example"    "Tooltip Example"
```
1
If you checked the Standard Chinese KV, you probably saw that it retains its English language. Because it was not overridden, it still used the "main" value provided by the name property of the Standard Tooltip object.

## Splitting Files and Folders ​

One of the biggest annoyances with the localization files is the inability to split them to different files without using a script. The tooltip generator allows you to split your tooltips to as many files and folders as you need, as long as those files and folders are created inside the resource/localization directory.

For a tooltip file to also properly be watched and processed, it must have the following code:
ts
```javascript
import {
  AbilityLocalization,
  Language,
  LocalizationData,
  ModifierLocalization,
  StandardLocalization,
} from '~generator/localizationInterfaces';

export function GenerateLocalizationData(): LocalizationData {
  // This section can be safely ignored, as it is only logic.
  //#region Localization logic
  // Arrays
  const Abilities: Array<AbilityLocalization> = new Array<AbilityLocalization>();
  const Modifiers: Array<ModifierLocalization> = new Array<ModifierLocalization>();
  const StandardTooltips: Array<StandardLocalization> = new Array<StandardLocalization>();

  // Create object of arrays
  const localization_info: LocalizationData = {
    AbilityArray: Abilities,
    ModifierArray: Modifiers,
    StandardArray: StandardTooltips,
  };
  //#endregion

  // Enter localization data below!

  // Return data to compiler
  return localization_info;
}
```
1234567891011121314151617181920212223242526272829
It doesn't matter what name it has, as long as it has the .ts extension. The tooltips go between the Enter localization data below! comment and the Return data to compiler comment.

INFO

I recommend making it into a snippet for easy creation of this signature for every file created. You can copy it from sample file localizationData.ts for every file that you need it.

## Dota Reimagined as examples (Talents, Reimagined Effects) ​

You can check out Dota Reimagined's github, which I originally developed this project for, to see how it looks in terms of folders and files. Each hero has its own file in the heroes folder, and each item has its own file in the items folder. generic folder has files for things like addon_game_mode.

Also, this uses Reimagined Effects and Talents on hero files, which are also processed into unique KVs that my game specifically has been designed to look for in panorama. You can check out how it exactly works and make your own changes to the compiler to support your unique KVs.


---

