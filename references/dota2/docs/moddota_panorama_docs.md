# ModDota Panorama 文档合集

> 本文档爬取自 https://moddota.com/panorama/ 及其子页面
> 生成日期: 2024年

---

## 目录

1. [Inclusive Panorama UI](#inclusive-panorama-ui)
2. [Introduction to Panorama UI with TypeScript](#introduction-to-panorama-ui-with-typescript)
3. [Keybindings](#keybindings)
4. [DOTAScenePanel](#dotascenepanel)
5. [Button Examples](#button-examples)
6. [Hiding HUD with SetHUDVisible](#hiding-hud-with-sethudvisible)
7. [Webpack](#webpack)
8. [React](#react)

---

# Inclusive Panorama UI | ModDota

**Source:** https://moddota.com/panorama/inclusive-panorama-ui

---


# Inclusive Panorama UI ​


---

# Introduction to Panorama UI with TypeScript | ModDota

**Source:** https://moddota.com/panorama/introduction-to-panorama-ui-with-typescript

---


# Introduction to Panorama UI with TypeScript ​

## What is TypeScript and why should I use it ​

TypeScript is a language created by and for people that were unhappy with Javascript and all of its quirks and flaws. TypeScript is a language with its own syntax (although similar to Javascript) that compiles to Javascript in a way that avoids a lot of Javascript's issues.

The name TypeScript comes from the fact that the language is basically Javascript with type checking, but on top of that it supports all of the newest Javascript language construct that are not supported by Panorama.

Pros of using TypeScript:

- Type checking
- Code completion based on type (also for API!)
- Prevents scoping issues
- Proper OOP constructs (such as classes, interfaces, inheritance...)

Cons of using TypeScript:

- Requires some setup
- Remember to compile
- Requires good definitions for Panorama

## How to install TypeScript ​

1. Install Node.js which is used to compile TypeScript.
2. Create a package.json file in the root directory of your project with at least {} content.
3. Install required dependencies by opening a command prompt and executing npm install -D typescript panorama-types.

That's it, after these three steps you are ready to start using TypeScript.

Visual Studio Code supports TypeScript out of the box. For other editors you might have to install a plugin to get language features (for example Sublime TypeScript plugin, available through Sublime Text package manager).

## How to set up TypeScript for your dota addon ​

TypeScript requires a tsconfig.json used to configure it for your project. Put it in your addon's content/panorama directory. You can adjust all settings yourself, but I usually have this set to the most strict settings. My preferred configuration:
json
```javascript
{
  "compilerOptions": {
    "target": "es2017",
    "lib": ["es2017"],
    "types": ["panorama-types"],
    "strict": true
  }
}
```
12345678
Your addon's content directory structure should be something like this:

```javascript
content/dota_addons/[addon]/
    ...
    panorama/
        layout/
        scripts/
        styles/
        tsconfig.json
```
1234567
## Your first TypeScript UI ​

To illustrate why I like using TypeScript for modular UI I will walk through a small example. We will be making some hero portraits with player name and a health bar:

Since this tutorial is about TypeScript I will just quickly give the xml and css, this is standard stuff:
xml
```javascript
<root>
    <styles>
        <include src="file://{resources}/styles/custom_game/example.css" />
    </styles>

    <scripts>
        <include src="file://{resources}/scripts/custom_game/PlayerPortrait.js" />
        <include src="file://{resources}/scripts/custom_game/ExampleUI.js" />
    </scripts>

    <snippets>
        <snippet name="PlayerPortrait">
            <Panel class="PlayerPortrait" hittest="false">
                <Image id="HeroImage" hittest="false" />
                <Label id="PlayerName" />
                <Panel class="HealthContainer">
                    <Panel id="HealthBar" />
                </Panel>
            </Panel>
        </snippet>
    </snippets>

    <Panel hittest="false" style="width: 100%; height: 100%;">
        <Panel id="HeroPortraits" />
    </Panel>
</root>
```
1234567891011121314151617181920212223242526
CSS:
css
```javascript
#HeroPortraits {
  width: 300px;
  height: 650px;
  margin-top: 150px;
  flow-children: down;
}
.PlayerPortrait {
  background-color: blue;
  height: 80px;
  width: 300px;
  margin-bottom: 10px;
}
#HeroImage {
  width: 80px;
  height: 80px;
  background-color: black;
}
#PlayerName {
  color: white;
  font-size: 25px;
  margin-top: 10px;
  margin-left: 90px;
}
.HealthContainer {
  width: 200px;
  height: 20px;
  x: 90px;
  y: 50px;
  background-color: black;
}
#HealthBar {
  height: 20px;
  width: 50%;

  background-color: green;
}
```
123456789101112131415161718192021222324252627282930313233343536
As you can see the XML of this part of the UI has a snippet containing the XML of a player portrait containing a hero image, a label for the player name and a health container and health bar inside that container. The CSS applies some simple layout to this.

## Writing TypeScript for your UI ​

First we want to define a class of our UI and to link that to the XML. We do this by taking an existing panel and wrapping it into a typescript class, as follows:
typescript
```javascript
class ExampleUI {
  // Instance variables
  panel: Panel;

  // ExampleUI constructor
  constructor(panel: Panel) {
    this.panel = panel;
    $.Msg(panel); // Print the panel
  }
}

let ui = new ExampleUI($.GetContextPanel());
```
123456789101112
Nothing too exciting, we basically create a new ExampleUI object in ExampleUI.ts from the context panel, so this entire XML file is now an instance of the ExampleUI class. If you build this by pressing ctrl+b in Sublime, you will see it creates a new compiled ExampleUI.js file with the same name. This compiled file is loaded by Panorama. If you load your game mode at this point you should see a print in console printing your UI panel.

Now let's create a class for a hero portrait. In this case we do not wrap an existing element, but instead create a panel in the constructor. To do this we do still need a parent panel, so we require that as parameter for the constructor, as well as the hero name and player name. After creating a panel and loading the snippet into it we look up some of its child elements and store them for later.
typescript
```javascript
class PlayerPortrait {
  // Instance variables
  panel: Panel;
  heroImage: ImagePanel;
  playerLabel: LabelPanel;
  hpBar: Panel;

  constructor(parent: Panel, heroName: string, playerName: string) {
    // Create new panel
    const panel = $.CreatePanel('Panel', parent, '');
    this.panel = panel;

    // Load snippet into panel
    panel.BLoadLayoutSnippet('PlayerPortrait');

    // Find components
    this.heroImage = panel.FindChildTraverse('HeroImage') as ImagePanel;
    this.playerLabel = panel.FindChildTraverse('PlayerName') as LabelPanel;
    this.hpBar = panel.FindChildTraverse('HealthBar')!;

    // Set player name label
    this.playerLabel.text = playerName;

    // Set hero image
    this.heroImage.SetImage('s2r://panorama/images/heroes/' + heroName + '_png.vtex');

    // Initialise health at 100%
    this.SetHealthPercent(100);
  }

  // Set the health bar to a certain percentage (0-100)
  SetHealthPercent(percentage: number) {
    this.hpBar.style.width = Math.floor(percentage) + '%';
  }
}
```
1234567891011121314151617181920212223242526272829303132333435
This is saved in a second file PlayerPortrait.ts which compiles to PlayerPortrait.js. Therefore this file is also included in the scripts section of the xml (see above).

The constructor simply creates a new panel and loads a snippet into it, and then sets some default values. The class also defines a SetHealthPercent function that manipulates the health bar.

Now we go back to the ExampleUI class and make a couple PlayerPortrait instances to the PlayerPortraits element:
typescript
```javascript
class ExampleUI {
  // Instance variables
  panel: Panel;

  // ExampleUI constructor
  constructor(panel: Panel) {
    this.panel = panel;

    // Find container element
    const container = this.panel.FindChild('HeroPortraits')!;

    // Create portrait for player 0, 1 and 2
    const portrait0 = new PlayerPortrait(container, 'npc_dota_hero_juggernaut', 'Player0');
    const portrait1 = new PlayerPortrait(container, 'npc_dota_hero_omniknight', 'Player1');
    const portrait2 = new PlayerPortrait(container, 'npc_dota_hero_invoker', 'Player2');

    // Set HP of player 1 and 2 to a different value
    portrait0.SetHealthPercent(80);
    portrait2.SetHealthPercent(20);
  }
}

let ui = new ExampleUI($.GetContextPanel());
```
1234567891011121314151617181920212223
Your UI should now look like the screenshot we set out to make at the start.

## Advanced TypeScripting ​

Now this UI is not very useful for an actual game, so let's do something a bit more complicated. We want to save the player portraits and then whenever we receive an event that a player's HP has changed we want to retrieve the proper PlayerPortrait instance.

We do this by adding another instance variable to the ExampleUI, a map that maps playerIDs to the correct PlayerPortrait instance. When creating PlayerPortrait instances we put them in the map. When we get an hp_changed event we update the proper panel. The type of this map can be expressed in TypeScript as {[playerID: number]: PlayerPortrait}.

One of the advantages of TypeScript is that you can explicitly define which events you receive and what their contents are. We define the HPChanged event as follows:
typescript
```javascript
interface HPChangedEvent {
  playerID: PlayerID;
  hpPercentage: number;
}
```
1234
Putting these together our ExampleUI.ts file now looks as follows:
typescript
```javascript
interface HPChangedEvent {
  playerID: PlayerID;
  hpPercentage: number;
}

class ExampleUI {
  // Instance variables
  panel: Panel;
  playerPanels: Partial<Record<PlayerID, PlayerPortrait>> = {}; // A map with number keys and PlayerPortrait values

  // ExampleUI constructor
  constructor(panel: Panel) {
    this.panel = panel;

    const container = this.panel.FindChild('HeroPortraits')!;
    container.RemoveAndDeleteChildren();

    // Create portrait for player 0, 1 and 2
    this.playerPanels[0] = new PlayerPortrait(container, 'npc_dota_hero_juggernaut', 'Player0');
    this.playerPanels[1] = new PlayerPortrait(container, 'npc_dota_hero_omniknight', 'Player1');
    this.playerPanels[2] = new PlayerPortrait(container, 'npc_dota_hero_invoker', 'Player2');

    // Listen for health changed event, when it fires, handle it with this.OnHPChanged
    GameEvents.Subscribe<HPChangedEvent>('hp_changed', (event) => this.OnHPChanged(event));
  }

  // Event handler for HP Changed event
  OnHPChanged(event: HPChangedEvent) {
    // Get portrait for this player
    const playerPortrait = this.playerPanels[event.playerID];

    // Set HP on the player panel
    playerPortrait.SetHealthPercent(event.hpPercentage);
  }
}

let ui = new ExampleUI($.GetContextPanel());
```
12345678910111213141516171819202122232425262728293031323334353637
We simply bound a handler for the hp_changed event in the constructor of our ExampleUI, and whenever that happens OnHPChanged is called, which looks up the player portrait in the map and calls SetHealthPercent on the portrait.

## Summary ​

To conclude, I hope to have convinced you TypeScript helps to write readable, modular UI scripts in Panorama. TypeScript helps you by finding typing errors before you compile, and even prevents errors by taking scoping into account. On top of that the code completion for the panorama API is very useful. The more I use TypeScript to write Panorama, the more I am impressed by how useful it is. Hopefully you give it a try and discover for yourself.


---

# Keybindings | ModDota

**Source:** https://moddota.com/panorama/keybindings

---


# Keybindings ​

## Introduction ​

With the recent update (20th of July) Valve added support for custom keybindings. That is, you can bind keys to fire a custom command.

The technique used is derived from rpg_example.

Although this method is not necessarily limited to panorama this tutorial will focus on using them within panorama.

## Setup ​

Start by adding a couple of lines to your addoninfo.txt file located in /game/<your addon>/addoninfo.txt

```javascript
"AddonInfo"
{
  "TeamCount" "10"
  "maps"      "your_map"
  "IsPlayable"  "1"
  "your_map"
  {
          "MaxPlayers"                    "10"
  }
  "Default_Keys"
    {
        "01"
        {
            "Key"       "S"
            "Command"   "CustomGameExecuteAbility1"
            "Name"      "Execute Ability 1"
        }
        "02"
        {
            "Key"       "Z"
            "Command"   "+CustomGameTestButton"
            "Name"      "Example"
        }
    }
}
```
12345678910111213141516171819202122232425
The important parts are of course what is defined in "Default_Keys"

"Key" is the key you want to bind, use capital letters here

"Command" is the command to fire, make sure the command name is unique. The prefix of the command defines when the command will trigger.

"Name" Name of the command, used for debugging purposes.

#### Command Prefixes ​

| Prefix | Example | Description |
| --- | --- | --- |
| (nothing) | command | Command will trigger on press and release |
| + | +command | Trigger when key is pressed (used for normal key press) |
| - | -command | Command will trigger when key is released |

The prefixes do not lock the command to be triggered only in that event. But is a good self-reference for what you want the keybind to do.

## Panorama ​

Catching the keybind commands in Panorama is easy:
js
```javascript
function OnExecuteAbility1ButtonPressed() {
  $.Msg("'S' Pressed or Released");
}

function OnTestButtonPressed() {
  $.Msg("'Z' Pressed");
}

function OnTestButtonReleased() {
  $.Msg("'Z' Released");
}

(function () {
  Game.AddCommand('CustomGameExecuteAbility1', OnExecuteAbility1ButtonPressed, '', 0);
  Game.AddCommand('+CustomGameTestButton', OnTestButtonPressed, '', 0);
  Game.AddCommand('-CustomGameTestButton', OnTestButtonReleased, '', 0);
})();
```
1234567891011121314151617
Note how the prefixes are used again. Even though we only defined CustomGameTestButton to be fired on key down, we can easily catch the release event in our JS as well.


---

# DOTAScenePanel | ModDota

**Source:** https://moddota.com/panorama/dotascenepanel

---


# DOTAScenePanel ​

In this tutorial we'll go through the tricks you can do with the undocumented DOTAScenePanel class in panorama.

Now, you might have seen its usage if you looked through the sources in the main menu. This panel allows us to display 3D content in panorama. You might have tried using it yourself. It's pretty easy to setup a simple panel to display a unit, with code like

<DOTAScenePanel style="width:400px;height:400px;" unit="npc_dota_hero_sven" particleonly="false"/>

Please note particleonly='false' is required for DOTAScenePanel to display anything other than particles properly.

Code like this is used to display heroes in the armory. This panel also has no custom dynamic properties, meaning that we can't change the unit after creating a panel.

In armory, heroes models can be rotated, and this behaviour can be enabled with allowrotation="true" set. However, this parameter is not compatible with custom background maps.

## Background maps ​

But wait, there's more! DOTAScenePanel accepts the "map" parameter, which points to a specific type of vmaps - background maps. You can find them in asset browser in background folder. Those vmaps only accept a specific set of entities and are shown in panorama using cameras. Let's follow up by creating a simple background map.

### Setting up the map ​

Start up hammer editor and create a new map. Save it in your maps folder as background.vmap. Go to Map -> Map Properties (Ctrl-Shift-P) and check the 'Compile as background map' checkbox.

Use the Entity Tool (Shift-E) and choose the prop_dynamic entity, then click somewhere in the world to place it.

Select that newly placed entity in the outliner and change its World Model property to models/courier/donkey_unicorn/donkey_unicorn.vmdl.

Now you've got your movie star ready to be displayed. You can also change the Default Animation field to idle or any string from its model entries.

Now we've got action, but still missing lights and camera. Let's begin with light - with the Entity Tool (Shift-E), create a env_global_light entity. Change its name to light, for example.

Same as env_global_light, create a point_camera entity. Select your newly created camera, move your hammer camera in such way that you can see the donkey and click View - Align Selection to Active Camera.

As the last step select your camera and give it a name in the properties, like camera1.

Save your map and build it (F9).

### Setting up panorama ​

I won't describe how to set up a basic panorama environment, if you are having issues with displaying simple panels, refer to https://developer.valvesoftware.com/wiki/Dota_2_Workshop_Tools/Panorama Once you've ready to go, simply add <DOTAScenePanel style="width:400px;height:400px;" map="background" light="light" camera="camera1" particleonly="false"/> to your XML, you should see your donkey movie star in its full glory. Shouldn't take you more than 10 minutes.

Now let's get to the advanced part.

## The part where magic gets real ​

### Units with cosmetics ​

We can easily build up a "unit" like scene, using the portrait_world_unit entity type. This entity supports all kinds of units and also cosmetic item definitions. The quirk here is that you have to enter the raw properties editing mode to set displayed entity to a hero. Item definitions property all refer to different loadout slots and accept item IDs. Item ID list can be found here.

### Multiple cameras ​

This is pretty straightforward, DOTAScenePanel also accepts the camera parameter in the definition, which will try to find the camera with the provided name.

Important to note, compiling the map again does change the look of the panorama panel without restarting the map, but you can't change it at runtime. You'll understand how to achieve the same result in the following parts.

### Dynamic layout loading ​

Since the only thing DOTAScenePanel respects is its own layout definition, we will have to provide it from the start. Fortunately we can load layout from string, while altering the definition.
js
```javascript
var camera = "camera1";
var style = "width:400px;height:400px;";
if (someCondition) {
    camera = "camera2";
}

var sceneContainer = $("#SomeContainer");
sceneContainer.BCreateChildren("<DOTAScenePanel style='" + style + "' map='background' particleonly='false' light='light' camera='" + camera + "'"/>");
```
12345678
As you might have noticed, you have to wrap the whole thing in '', while also providing the initial container for the layout. Pretty terrible, but for now it seems like the only way.

### Firing IO events ​

#### Animation ​

Now the REAL fun starts. Dashboard source code uses the DOTAGlobalSceneFireEntityInput event which starts the particles on the home button, for example. This event is basically a DoEntFire specifically for DOTAScenePanel.

For example usage, set up a simple <DOTAScenePanel id="scene" style="width:400px;height:400px;" map="background"/> (notice the id, it's very important!) once again. But this time, alter the map and change the donkey Name property to donkey, don't forget to rebuild the map.

Now make a basic panorama button, and give it onactivate="DOTAGlobalSceneFireEntityInput(scene, donkey, SetAnimation, death)".

Now if you've done everything correctly, your donkey should play his death animation every time you press the button. How? Magic. But really though, refer to the Inputs part of this page. Notice the SetAnimation input.

Also notice how we've used DOTAGlobalSceneFireEntityInput in onactivate as if it were a real function, which it isn't. That's because panel events are special cornflakes. In panorama javascript you have to use $.DispatchEvent("DOTAGlobalSceneFireEntityInput", arguments) to achieve the same result.

Example
js
```javascript
$.DispatchEvent(
  'DOTAGlobalSceneFireEntityInput',
  'LightBuilder',
  'donkey',
  'SetAnimation',
  'spawn',
);
```
1234567
#### Scripts? Scripts! ​

If you were a good boy, you might have noticed the RunScriptFile and RunScriptCode inputs.

Now make a donkey.lua file in your vscripts folder and put a simple print("Onions have layers, donkey") in it.

Now set your button onactivate to DOTAGlobalSceneFireEntityInput(scene, donkey, RunScriptFile, donkey).

Notice the lack of file extension. Press the button again. You should see the message in the console. Congratulations!

But don't get too excited. Yes, you can execute lua from panorama. But it's clientside-lua and it's very limited. You can't even move things there. The only good thing I could think to do is particles. A recent patch added ParticleManager support to clientside lua. So theoretically you can create, destroy and move different particles there, and particles are very powerful.

#### Entity parenting ​

The way cosmetics in dota works is that every cosmetic item is a separate entity which is parented to a hero, attached to a specific attach point with specific offsets and offset angles. And we can do that too! (Well, partly, at least)

The way that works is you select a prop_dynamic, in object properties put up a parent entity name, put in the Parent Model Bone/Attachment Name (you can look up attachment names in the model editor), check the Use Model Attachment Offset checkbox and then realize that changing attachment offset doesn't work. At least for now. Changing angles works though so there is hope that offset will be fixed someday.

That's it!


---

# Button Examples | ModDota

**Source:** https://moddota.com/panorama/button-examples

---


# Button Examples ​

Here are some button examples that you can use in your custom games.

## Example 1 - Default Valve Button ​

Here is the button that valve mostly uses for Dota 2. (Valve mostly recolor them for different uses: Green for Store, Gold-ish for Dotaplus etc.)

XML:
xml
```javascript
<TextButton id="DefaultValveButtonID" class="DefaultValveButtonClass" text="#DefaultValveButton"/>
```
1
CSS:
css
```javascript
#DefaultValveButtonID {
  horizontal-align: center;
  vertical-align: bottom;
  margin-bottom: 20px;
  box-shadow: black -4px -4px 8px 8px;
  margin-top: 20px;
}
.DefaultValveButtonClass {
  width: 270px;

  min-width: 192px;
  min-height: 36px;

  background-color: gradient(linear, 0% 0%, 0% 100%, from(#373d45), to(#4d5860));
  border-style: solid;
  border-width: 1px;

  padding: 4px 10px;

  border-top-color: #555555;
  border-left-color: #494949;
  border-bottom-color: #333333;
  border-right-color: #404040;

  transition-property: background-color;
  transition-duration: 0.05s;
  transition-timing-function: linear;
}
.DefaultValveButtonClass Label {
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 2px;
  color: #ffffff;
  text-align: center;
  horizontal-align: center;
  vertical-align: middle;
  text-shadow: 2px 2px 0px 1 #000000;

  transition-property: color;
  transition-duration: 0.35s;
  transition-timing-function: ease-in-out;

  font-size: 18px;
  font-family: defaultFont;
}
.DefaultValveButtonClass:hover {
  background-color: gradient(linear, 0% 0%, 0% 100%, from(#4c5561), to(#6c7d88));
  border-top-color: #aaaaaa77;
  border-left-color: #aaaaaa33;
  border-bottom-color: #333333;
  border-right-color: #404040;
}
.DefaultValveButtonClass:active {
  background-color: gradient(linear, 0% 0%, 0% 100%, from(#393939), to(#555555));
  border-top-color: #222222;
  border-left-color: #303030;
  border-bottom-color: #666666;
  border-right-color: #444444;
  sound: 'ui_generic_button_click';
}
```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960
## Example 2 - Purple Button ​

XML:
xml
```javascript
<Button id="ExampleButton1">
  <Label class="ExampleButton1Label" text="#Click"/>
</Button>
```
123
CSS:
css
```javascript
#ExampleButton1 {
  width: 330px;
  min-height: 36px;
  box-shadow: #f78f9015 -4px -4px 8px 8px;
  background-color: black;
  border: 1px solid #aaaaaa;
  horizontal-align: right;
  vertical-align: bottom;
  margin-bottom: 20px;
  margin-top: 8px;
  margin-left: 32px;
  margin-right: 32px;
  padding: 0px;
  flow-children: down;
  background-image: url('s2r://panorama/images/textures/glassbutton_darkmoon_hover_psd.vtex');
  background-size: 100%;
  background-position: 50% 50%;
  background-repeat: no-repeat;
  transition-property: box-shadow, background-image, background-color;
  transition-duration: 0.16s;
  transition-timing-function: ease-in-out;
  border-radius: 6px;
}
#ExampleButton1:hover {
  background-image: url('s2r://panorama/images/textures/glassbutton_darkmoon_psd.vtex');
  box-shadow: fill transparent 0px 0px 0px 0px;
  border: 1px solid #555555;
}
.ExampleButton1Label {
  width: 100%;
  text-align: center;
  margin-top: 3px;
  font-size: 20px;
  font-weight: thin;
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 22px;
  color: grey;
}
```
123456789101112131415161718192021222324252627282930313233343536373839
## Example 3 - Text Button with Icon ​

You can add an icon to your button -in this case, it is sized 26x26px default dota 2 logo- to make it look better.

XML:
xml
```javascript
<Button id="ExampleButton2ID" class="ExampleButton2Class">
  <Panel class="Contents">
    <Panel class="CustomIcon"/>
    <Label id="ExampleButton2Label" text="#ExampleButton"/>
  </Panel>
</Button>
```
123456
CSS:
css
```javascript
#ExampleButton2ID {
  horizontal-align: center;
  vertical-align: bottom;
  margin-bottom: 22px;
}
.ExampleButton2Class {
  background-color: gradient(linear, 0% 0%, 0% 100%, from(#6b211c), to(#8e2b19));
  border: 1px solid #bc4539;

  transition-property: border, brightness;
  transition-duration: 0.1s;
  transition-timing-function: linear;
  overflow: noclip;
  min-width: 300px;
  min-height: 45px;
}
.Contents {
  horizontal-align: center;
  vertical-align: middle;
  flow-children: right;
  margin: 0px 20px;
}
.CustomIcon {
  background-image: url('s2r://panorama/images/control_icons/dota_logo_white_png.vtex');
  background-size: contain;
  width: 26px;
  height: 26px;
  margin-top: 4px;
  margin-right: 4px;
  horizontal-align: center;
  vertical-align: middle;
}
.ExampleButton2Class:hover {
  brightness: 2;
}
.ExampleButton2Class:hover Label {
  color: white;
}
.ExampleButton2Class:active {
  brightness: 3;
  border: 1px solid #501f18;

  sound: 'ui_generic_button_click';
}
.ExampleButton2Class Label {
  margin-top: 2px;
  text-transform: uppercase;
  color: white;
  horizontal-align: center;
  font-weight: bold;
  font-size: 24px;
  letter-spacing: 2px;
  text-align: center;
  vertical-align: middle;
  text-shadow: 0px 0px 6px 1 #000000;
  padding-left: 8px;
  padding-right: 8px;
  padding-top: 2px;

  transition-property: color;
  transition-duration: 0.1s;
  transition-timing-function: linear;
}
.ExampleButton2Class:active Label {
  transform: translateY(1px);
}
```
123456789101112131415161718192021222324252627282930313233343536373839404142434445464748495051525354555657585960616263646566
## Example 4 - Popup ESC Menu Buttons ​

XML:
xml
```javascript
<Panel id="PopupESCMenu">
  <Panel id="ESCActionButtons">
    <Button id="ESCResumeButton" class="ButtonBevel ESCMenuButton">
      <Label text="RESUME" />
    </Button>
    <Button id="ESCOptionsButton" class="ButtonBevel ESCMenuButton">
      <Label text="OPTIONS" />
    </Button>
    <Button id="ESCTestButton" class="ButtonBevel ESCMenuButton">
      <Label text="TEST" />
    </Button>
    <Button id="ESCExitButton" class="ButtonBevel ESCMenuButton">
      <Label text="EXIT" />
    </Button>
  </Panel>
</Panel>
```
12345678910111213141516
CSS:
css
```javascript
#PopupESCMenu {
  width: 350px;
  vertical-align: center;
  horizontal-align: center;
  opacity: 1;
  transform: none;

  transition-property: opacity, transform, pre-transform-scale2d, wash-color;
  transition-duration: 0.4s;
  transition-delay: 0s;
  transition-timing-function: ease-in-out;
  box-shadow: #00000099 -4px -4px 8px 8px;
  flow-children: down;
  padding: 2px;
  background-image: url('file://{images}/custom_game/interface/esc_bg_psd.png');
  background-position: center top;
  background-color: none;
}
#ESCActionButtons {
  flow-children: down;
  width: fit-children;
  horizontal-align: center;
}
.ButtonBevel {
  width: 270px;
  min-width: 192px;
  min-height: 36px;

  margin-top: 8px;
  margin-bottom: 6px;

  background-color: gradient(linear, 0% 0%, 0% 100%, from(#373d45), to(#4d5860));
  border-style: solid;
  border-width: 1px;

  padding: 4px 10px;

  border-top-color: #555555;
  border-left-color: #494949;
  border-bottom-color: #333333;
  border-right-color: #404040;

  transition-property: background-color;
  transition-duration: 0.05s;
  transition-timing-function: linear;
  box-shadow: #00000055 -2px -2px 4px 4px;
}
.ESCMenuButton {
  margin-top: 8px;
  margin-bottom: 6px;
  width: 270px;
}
#ESCResumeButton {
  background-color: #589c5e33;
}
#ESCResumeButton:hover {
  opacity: 1.3;
}
.ESCMenuButton Label {
  font-weight: normal;
  color: gradient(linear, 0% 0%, 0% 100%, from(#eaeaea), to(#ababab));
}
```
1234567891011121314151617181920212223242526272829303132333435363738394041424344454647484950515253545556575859606162

---

# Hiding HUD with SetHUDVisible | ModDota

**Source:** https://moddota.com/panorama/hiding-hud-with-sethudvisible

---


# Hiding HUD with SetHUDVisible ​

DANGER

This tutorial is outdated. It's recommended to use Panorama for UI manipulation now.

Example:
js
```javascript
GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_TOP_TIMEOFDAY, false);
```
1
There's a function currently missing from the API page: SetHUDVisible(int, bool) which I want to document here.

Credits to BMD for this list:

| HUD Component | int value |
| --- | --- |
| DOTA_HUD_VISIBILITY_TOP_TIMEOFDAY | 0 |
| DOTA_HUD_VISIBILITY_TOP_HEROES | 1 |
| DOTA_HUD_VISIBILITY_TOP_SCOREBOARD | 2 |
| DOTA_HUD_VISIBILITY_ACTION_PANEL | 3 |
| DOTA_HUD_VISIBILITY_ACTION_MINIMAP | 4 |
| DOTA_HUD_VISIBILITY_INVENTORY_PANEL | 5 |
| DOTA_HUD_VISIBILITY_INVENTORY_SHOP | 6 |
| DOTA_HUD_VISIBILITY_INVENTORY_ITEMS | 7 |
| DOTA_HUD_VISIBILITY_INVENTORY_QUICKBUY | 8 |
| DOTA_HUD_VISIBILITY_INVENTORY_COURIER | 9 |
| DOTA_HUD_VISIBILITY_INVENTORY_PROTECT | 10 |
| DOTA_HUD_VISIBILITY_INVENTORY_GOLD | 11 |
| DOTA_HUD_VISIBILITY_SHOP_SUGGESTEDITEMS | 12 |

Note that changing it once doesn't let you change it back without restarting tools, so this shouldn't be used to manipulate the HUD after the game loads.

Usage

Somewhere in a game started event, I used player_connect_full
lua
```javascript
mode = GameRules:GetGameModeEntity()
mode:SetHUDVisible(hud_component_value, false)
```
12

---

# Bundling scripts with webpack | ModDota

**Source:** https://moddota.com/panorama/webpack

---


# Bundling scripts with webpack ​

## What is webpack and why should I use it? ​

Working on a large codebase there are two ways to organize your code. The first is just keeping all logic in a single .js file, which quickly becomes hard to change and comprehend. The second approach is splitting code by functionality, creating multiple .js files and including all of them in the layout file.

While the second approach is preferred it also has some problems. Lack of explicit references to value definitions makes it hard to track where a certain value comes from, and, since all files use a single shared scope, naming conflicts can arise.

In Lua these problems are solved with require function, which allows one script to include another. JavaScript also got an official solution to this problem in EcmaScript 2015 - modules.

The concept of modules is pretty simple. First you need to mark things that you want to expose from a file with export keyword:
ts
```javascript
export function sayHello() {
  $.Msg('Hello, world!');
}
```
123
And then you can import it in other file:
ts
```javascript
import { sayHello } from './utils';

sayHello();
```
123
However there's a catch: even though modules have been a part of JavaScript for a while, a lot of integrations (including Panorama) don't support it yet.

That's where webpack is useful. webpack takes your modules, resolves dependencies and merges them into a single plain .js file, that can be used in Panorama.

In addition, webpack:

- Gives you an access to a large ecosystem of JavaScript packages
- Makes it easier to share code with other custom games, using custom packages and npm
- Makes it possible to share code with other environments, such as Node.js-based web servers, or Lua side of your custom game built with TypeScriptToLua
- Consolidates all your Panorama code transformation tools, such as TypeScript, Sass, and code generators

## Getting Started ​

INFO

You can skip most of the manual configuration in this guide by using a JavaScript or TypeScript templates.

### Installation ​

1. Install Node.js.
2. Create a package.json file in the root directory of your project with this content:
json
```javascript
{
  "scripts": {
    "build": "node --preserve-symlinks node_modules/webpack/bin/webpack.js --config content/panorama/webpack.config.js",
    "dev": "node --preserve-symlinks node_modules/webpack/bin/webpack.js --config content/panorama/webpack.config.js --watch"
  }
}
```
123456
INFO

We have to use node --preserve-symlinks node_modules/webpack/bin/webpack.js instead of just webpack because of reverse symlinking.

1. Install dependencies by opening a command prompt and executing npm install -D webpack@next webpack-cli webpack-panorama.

### Basic Configuration ​

webpack requires you to pass a configuration file, telling it how to transform your files. As you might have noticed in the previous step, in this tutorial we'll store it in content/panorama/webpack.config.js.

Here's a basic configuration:
js
```javascript
const path = require('path');
const { PanoramaTargetPlugin } = require('webpack-panorama');

/** @type {import('webpack').Configuration} */
module.exports = {
  entry: {
    hud: './hud/script.js',
  },

  mode: 'development',
  context: path.resolve(__dirname, 'src'),
  output: {
    path: path.resolve(__dirname, 'scripts/custom_game'),
  },

  resolve: {
    // Required because of reverse symlinking
    symlinks: false,
  },

  plugins: [new PanoramaTargetPlugin()],
};
```
12345678910111213141516171819202122
Now let's create a few files for webpack to work on:
js
```javascript
import { sayHello } from '../utils';

sayHello();
```
123js
```javascript
export function sayHello() {
  $.Msg('Hello, world!');
}
```
123
And layout files to make Panorama run our script:
xml
```javascript
<root>
  <scripts>

    <include src="file://{resources}/scripts/custom_game/hud.js" />
  </scripts>
  <Panel />
</root>
```
1234567xml
```javascript
<root>
  <Panel>

    <CustomUIElement type="Hud" layoutfile="file://{resources}/layout/custom_game/hud.xml" />
  </Panel>
</root>
```
123456
Now you can run npm run build in your terminal to build the project once, or npm run dev to make it rebuild the project every time you change your scripts.

After building the project, webpack would output a content/panorama/scripts/custom_game/hud.js bundle.

### Using external packages ​

Besides local script files, modules allow you to use code written by other developers.

For example, let's add a popular utility library lodash.

First, you need to add it to your project using npm:
shell
```javascript
npm install lodash
```
1
And then you can import it like any other module:
js
```javascript
import * as _ from 'lodash';

$.Msg(_.uniq([1, 2, 1, 3, 1, 2])); // => [1,2,3]
```
123
Similarly you can use packages created specifically for Panorama, for example react-panorama or panorama-polyfill.

You can find more packages built for Panorama using this search query: keywords:dota, panorama.

## Loaders and TypeScript ​

webpack loaders are packages that process your files before webpack puts them into a bundle.

One good example of a loader is babel-loader, which processes your code with Babel, allowing you to use newer JavaScript features, and non-standard syntax extensions, such as JSX.

First you need to install a few dependencies:
shell
```javascript
npm install -D babel-loader @babel/core @babel/preset-react
```
1
Now you need to tell webpack when and how to use this loader, using module.rules configuration section:
diff
```javascript
resolve: {
    symlinks: false,
  },

+ module: {
+   rules: [
+     { test: /\.js$/, loader: 'babel-loader', options: { presets: ['@babel/preset-react'] } },
+   ],
+ },

  plugins: [new PanoramaTargetPlugin()],
```
1234567891011
### TypeScript ​

Currently support for TypeScript for Panorama cannot be provided just with a loader, because of a way referenced script files are processed. To resolve this you also need to use fork-ts-checker-webpack-plugin.
shell
```javascript
npm install -D typescript ts-loader fork-ts-checker-webpack-plugin
npm install panorama-types
```
12diff
```javascript
+const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = {
  entry: {
-   hud: './hud/script.js',
+   hud: './hud/script.ts',
  },

  resolve: {
+   extensions: ['.ts', '.tsx', '...'],
    symlinks: false,
  },

+ module: {
+   rules: [
+     { test: /\.tsx?$/, loader: 'ts-loader', options: { transpileOnly: true } },
+   ],
+ },

  plugins: [
    new PanoramaTargetPlugin(),
+   new ForkTsCheckerWebpackPlugin({
+     typescript: {
+       configFile: path.resolve(__dirname, "tsconfig.json"),
+     },
+   }),
  ],
};
```
12345678910111213141516171819202122232425262728json
```javascript
{
  "include": ["src"],
  "compilerOptions": {
    "target": "es2017",
    "lib": ["es2017"],
    "types": ["panorama-types"],
    "moduleResolution": "node",
    "strict": true
  }
}
```
12345678910
## XML layout files ​

In the previous steps webpack have been used only for script assets. This isn't perfect, because you have to manually keep entry points in sync, directory structure isn't centralized, and you can't use webpack for .css asset processing.

The solution is to let webpack take care of all your Panorama files.

And modify webpack.config.js like that:
diff
```javascript
const path = require('path');
const { PanoramaTargetPlugin } = require('webpack-panorama');

/** @type {import('webpack').Configuration} */
module.exports = {
  entry: {
-   hud: './hud/script.js',
+   hud: { filename: 'hud/layout.xml', import: './hud/layout.xml' },
  },

  mode: 'development',
  context: path.resolve(__dirname, 'src'),
  output: {
    path: path.resolve(__dirname, 'layout/custom_game'),
+   publicPath: 'file://{resources}/layout/custom_game/',
  },

  resolve: {
    symlinks: false,
  },

+ module: {
+   rules: [
+     { test: /\.xml$/, loader: 'webpack-panorama/lib/layout-loader' },
+     { test: /\.js$/, issuer: /\.xml$/, loader: 'webpack-panorama/lib/entry-loader' },
+   ],
+ },

  plugins: [new PanoramaTargetPlugin()],
};
```
123456789101112131415161718192021222324252627282930
Now you need to move layout file to the source directory, and use relative script path:
xml
```javascript
<root>
  <scripts>

    <include src="./script.js" />
  </scripts>
  <Panel />
</root>
```
1234567
## Custom UI Manifest ​

Now you don't need to synchronize your script entrypoints and layout script references, however you still have to do this for custom_ui_manifest.xml. PanoramaManifestPlugin allows you to define your entrypoints in a simple format, and generates custom_ui_manifest.xml including them.
diff
```javascript
const path = require('path');
-const { PanoramaTargetPlugin } = require('webpack-panorama');
+const { PanoramaManifestPlugin, PanoramaTargetPlugin } = require('webpack-panorama');

/** @type {import('webpack').Configuration} */
module.exports = {
- entry: {
-   hud: { filename: 'hud/layout.xml', import: './hud/layout.xml' },
- },

  mode: 'development',
  context: path.resolve(__dirname, 'src'),
  output: {
    path: path.resolve(__dirname, 'layout/custom_game'),
    publicPath: 'file://{resources}/layout/custom_game/',
  },

  module: ...,

  plugins: [
    new PanoramaTargetPlugin(),
+   new PanoramaManifestPlugin({
+     entries: [{ import: './hud/layout.xml', type: 'Hud' }]
+   }),
  ],
};
```
1234567891011121314151617181920212223242526
INFO

Since webpack 5 is currently in beta, some transitive dependencies might yield deprecation warnings. They can be safely ignored.

entries option of PanoramaManifestPlugin accepts a list of entrypoints following this schema:
ts
```javascript
interface ManifestEntry {
  /**
   * Module(s) that are loaded upon startup.
   */
  import: string;

  /**
   * Specifies the name of the output file on disk.
   *
   * @example
   * { import: './loading-screen/layout.xml', filename: 'custom_loading_screen.xml' }
   */
  filename?: string | null;

  /**
   * Type of a Custom UI.
   *
   * When not provided, this entry would be omitted from `custom_ui_manifest.xml` file.
   *
   * Can be defined only for XML entrypoints.
   */
  type?: ManifestEntryType | null;
}

type ManifestEntryType =
  | 'GameSetup'
  | 'HeroSelection'
  | 'Hud'
  | 'HudTopBar'
  | 'FlyoutScoreboard'
  | 'GameInfo'
  | 'EndScreen';
```
1234567891011121314151617181920212223242526272829303132
## CSS ​

Since now all layout files are processed with webpack, adding a new resource type isn't any different from adding a new resource type for JavaScript.
shell
```javascript
npm install -D file-loader
```
1diff
```javascript
module: {
    rules: [
      { test: /\.xml$/, loader: 'webpack-panorama/lib/layout-loader' },
      { test: /\.js$/, issuer: /\.xml$/, loader: 'webpack-panorama/lib/entry-loader' },
+     {
+       test: /\.css$/,
+       issuer: /\.xml$/,
+       loader: 'file-loader',
+       options: { name: '[path][name].css', esModule: false },
+     },
    ],
  },
```
123456789101112
### SASS ​
shell
```javascript
npm install -D sass-loader sass
```
1diff
```javascript
module: {
    rules: [
      { test: /\.xml$/, loader: 'webpack-panorama/lib/layout-loader' },
      { test: /\.js$/, issuer: /\.xml$/, loader: 'webpack-panorama/lib/entry-loader' },
      {
-       test: /\.css$/,
+       test: /\.(css|s[ac]ss)$/,
        issuer: /\.xml$/,
        loader: 'file-loader',
        options: { name: '[path][name].css', esModule: false },
      },
+     { test: /\.s[ac]ss$/, loader: 'sass-loader' }
    ],
  },
```
1234567891011121314

---

# React in Panorama | ModDota

**Source:** https://moddota.com/panorama/react

---


# React in Panorama ​

React is a JavaScript library for building user interfaces. It allows you to break down UI into small reusable building blocks (components) and simplifies state management.

Usually React is used for building websites and web applications, but react-panorama allows you to use the power of React in Dota 2.

## Installation ​

To avoid wasting time on configuration, it's recommended to start with the JavaScript or TypeScript templates, even if you're integrating it into an existing project.

Alternatively, if you want to configure build tools yourself, or you want to use it without any build steps (UMD), you can check out react-panorama installation guide.

## JSX ​

Here's a basic hello-world application built with React:
jsx
```javascript
import React from 'react';
import { render } from 'react-panorama';

render(<Label text="Hello, world!" />, $.GetContextPanel());
```
1234
The first parameter that gets passed to the render function is a tree of components constructed using JSX - an extension to the JavaScript syntax.

JSX tree is a regular JavaScript expression, just like a string, or object literal. That means you can manipulate it like any regular JS value - store it in variables, use it in conditions, or return it from functions.

For more information about JSX you can check out official React documentation.

## Components ​

Instead of having all your UI in a monolithic XML file, React encourages you to split functionality into small building blocks - components.

In React, components are simple functions that return JSX:
jsx
```javascript
import React from 'react';
import { render } from 'react-panorama';

function App() {
  return <Label text="Hello, world!" />;
}

render(<App />, $.GetContextPanel());
```
12345678
Components can accept parameters as a function argument:
tsx
```javascript
import React from 'react';
import { render } from 'react-panorama';

function HeroRow({ heroName }: { heroName: string }) {
  return (
    <Panel style={{ flowChildren: 'right' }}>
      <DOTAHeroImage heroimagestyle="icon" heroname={heroName} />
      <Label style={{ marginLeft: '5px' }} localizedText={heroName} />
    </Panel>
  );
}

function HeroList() {
  return (
    <Panel style={{ flowChildren: 'down' }}>
      <HeroRow heroName="npc_dota_hero_abaddon" />
      <HeroRow heroName="npc_dota_hero_abyssal_underlord" />
      <HeroRow heroName="npc_dota_hero_alchemist" />
    </Panel>
  );
}

render(<HeroList />, $.GetContextPanel());
```
1234567891011121314151617181920212223
## State ​

In modern React applications, state is usually managed using hooks. One of the basic hooks, useState, allows you to declare a component-scoped variable, which re-renders the component every time its value gets changed. Here's a basic counter example:
jsx
```javascript
import React, { useState } from 'react';
import { render } from 'react-panorama';

function Counter() {
  const [count, setCount] = useState(0);
  const increment = () => setCount(count + 1);

  return (
    <Panel style={{ flowChildren: 'down' }}>
      <Label text={`Count: ${count}`} />
      <TextButton className="ButtonBevel" text="Increment" onactivate={increment} />
    </Panel>
  );
}

render(<Counter />, $.GetContextPanel());
```
12345678910111213141516
Similarly, you can use useState to bind state to input elements:
ToggleButtonSliderTextEntryjsx
```javascript
import React, { useState } from 'react';
import { render } from 'react-panorama';

function ConditionalRendering() {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Panel style={{ flowChildren: 'down' }}>
      <ToggleButton
        text="Show details"
        selected={showDetails}
        onactivate={() => setShowDetails(!showDetails)}
      />

      {showDetails && <Label text="Details!" />}
    </Panel>
  );
}

render(<ConditionalRendering />, $.GetContextPanel());
```
1234567891011121314151617181920jsx
```javascript
import React, { useState } from 'react';
import { render } from 'react-panorama';

function ColorPicker() {
  const [red, setRed] = useState(0.5);
  const [green, setGreen] = useState(0.5);
  const [blue, setBlue] = useState(0.5);

  return (
    <Panel style={{ flowChildren: 'right' }}>
      <Slider value={red} onvaluechanged={(p) => setRed(p.value)} />
      <Slider value={green} onvaluechanged={(p) => setGreen(p.value)} />
      <Slider value={blue} onvaluechanged={(p) => setBlue(p.value)} />
      <Panel
        style={{
          backgroundColor: `rgb(${red * 255}, ${green * 255}, ${blue * 255})`,
          width: '125px',
          height: '125px',
        }}
      />
    </Panel>
  );
}

render(<ColorPicker />, $.GetContextPanel());
```
12345678910111213141516171819202122232425jsx
```javascript
import React, { useState } from 'react';
import { render } from 'react-panorama';

function ReservedText() {
  const [text, setText] = useState('');

  return (
    <Panel style={{ flowChildren: 'down' }}>
      <TextEntry text={text} ontextentrychange={(p) => setText(p.text)} />
      <Label text={`Reversed text: ${[...text].reverse().join('')}`} />
    </Panel>
  );
}

render(<ReservedText />, $.GetContextPanel());
```
123456789101112131415
## Listening to events ​

In React, the only things that should affect what component shows are its props and state. So, in order to make component update data when a certain game event happens, you need to make event listener update component's state.

Since we can update component state only within the component itself, we also have to put our GameEvents.Subscribe call inside the component. However you can't register it in the render function itself, because it gets executed more often than we need to, since we need to register our listener only when the component gets mounted for the first time. That's when we have to use another builtin hook - useEffect.

useEffect hook is a function that usually gets called with 2 parameters. First one is the callback we want to execute, which would register our listener. The second is the list of state variables that our listener depends on. Since we don't use any state for our listener, we can just use an empty array ([]). Also, optionally our callback can return a cleanup function, which is called either when one of dependencies changes, or when component gets unmounted.
jsx
```javascript
import React, { useEffect, useState } from 'react';
import { render } from 'react-panorama';

function KDA() {
  const [kills, setKills] = useState(() => Game.GetLocalPlayerInfo().player_kills);
  const [deaths, setDeaths] = useState(() => Game.GetLocalPlayerInfo().player_deaths);
  const [assists, setAssists] = useState(() => Game.GetLocalPlayerInfo().player_assists);

  useEffect(() => {
    const handle = GameEvents.Subscribe('dota_player_kill', () => {
      const playerInfo = Game.GetLocalPlayerInfo(); 
      setKills(playerInfo.player_kills); 
      setDeaths(playerInfo.player_deaths); 
      setAssists(playerInfo.player_assists); 
    }); 
    return () => GameEvents.Unsubscribe(handle); 
  }, []); 

  return <Label style={{ color: 'white' }} text={`KDA: ${kills}/${deaths}/${assists}`} />;
}

render(<KDA />, $.GetContextPanel());
```
12345678910111213141516171819202122
react-panorama provides a custom hook that makes listening to game events a little easier:
jsx
```javascript
import React, { useState } from 'react';
import { render, useGameEvent } from 'react-panorama';

function KDA() {
  const [kills, setKills] = useState(() => Game.GetLocalPlayerInfo().player_kills);
  const [deaths, setDeaths] = useState(() => Game.GetLocalPlayerInfo().player_deaths);
  const [assists, setAssists] = useState(() => Game.GetLocalPlayerInfo().player_assists);

  useGameEvent(
    'dota_player_kill',
    () => {
      const playerInfo = Game.GetLocalPlayerInfo(); 
      setKills(playerInfo.player_kills); 
      setDeaths(playerInfo.player_deaths); 
      setAssists(playerInfo.player_assists); 
    },
    [],
  ); 

  return <Label style={{ color: 'white' }} text={`KDA: ${kills}/${deaths}/${assists}`} />;
}

render(<KDA />, $.GetContextPanel());
```
1234567891011121314151617181920212223
Just like that, you can listen to UI events, custom net table updates, or just time passing. react-panorama provides a few more custom hooks for common use cases.

### Custom hooks ​

One of things that React Hooks make easier is code reuse. For example, we can extract logic used to listen to KDA changes into a custom useKDA hook.
jsx
```javascript
import React, { useState } from 'react';
import { render, useGameEvent } from 'react-panorama';

function useKDA() {
  // Since both initializing and updating state is the same process,
  // we can extract it into a regular function
  function getKDA() {
    const playerInfo = Game.GetLocalPlayerInfo();
    return {
      kills: playerInfo.player_kills,
      deaths: playerInfo.player_deaths,
      assists: playerInfo.player_assists,
    };
  }

  const [kda, setKDA] = useState(getKDA);

  useGameEvent('dota_player_kill', () => setKDA(getKDA()), []);

  return kda;
}

function KDA() {
  const { kills, deaths, assists } = useKDA(); 

  return <Label style={{ color: 'white' }} text={`KDA: ${kills}/${deaths}/${assists}`} />;
}

function KDARatio() {
  const { kills, deaths, assists } = useKDA(); 
  const ratio = (kills + assists) / (deaths || 1);

  return <Label style={{ color: 'white' }} text={`KDA Ratio: ${ratio}`} />;
}

function App() {
  return (
    <Panel style={{ flowChildren: 'down' }}>
      <KDA />
      <KDARatio />
    </Panel>
  );
}

render(<App />, $.GetContextPanel());
```
123456789101112131415161718192021222324252627282930313233343536373839404142434445
## Next Steps ​

This tutorial has covered only the basics of React. React has a large ecosystem of libraries, patterns and articles, lots of which would apply to Panorama. As a starting point you can check out the official React website (although some parts of it are a little outdated).


---

