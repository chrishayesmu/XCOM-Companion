## Overview

**XCOM Companion** is a standalone desktop application, intended to be used while playing the [Long War 1.0](https://www.pavonisinteractive.com/xcomlongwareuew.htm) mod for 2013's [XCOM: Enemy Within](https://en.wikipedia.org/wiki/XCOM:_Enemy_Within). Long War adds new mechanics, items, abilities, and much more to the game. While this makes a great game, it can be a lot to keep track of at time, and being able to plan ahead is vitally important in Long War campaigns. The goal of XCOM Companion is to help keep all of that information organized, letting the player easily answer questions like "how many Muton corpses do I really need, and how many can I sell?".

Note that XCOM Companion is **not accurate** for any other version of the game, including the base XCOM: Enemy Within, or the Long War Rebalanced mod.

## Installation

TBD

### Updates

TBD

## Current features

* **Navigatable research tree:** Pan and zoom around Long War's [research tree](screenshots/research_tree_full.png), laid out by hand to help convey its complexities at a glance.
* **All-in-one research, Foundry, and item details:** No more clicking around trying to figure out exactly what good something is; XCOM Companion combines all of the relevant information into a single page for [research](screenshots/research_alien_materials.png), [Foundry projects](screenshots/foundry_enhanced_plasma.png), and [items](screenshots/item_laser_rifle.png).
* **Cross-content searching:** Press Ctrl+F at any time and you're searching instantly across everything that's in the app - research, Foundry projects, items, perks, and more.
* **Fully local:** Everything in XCOM Companion is local to your machine, making it instantly responsive.
* **Rich tooltips and links:** References to other game terms are links that you can click to view them instantly, and mousing over those links [shows you tooltips](screenshots/tooltip_perk_body_shield.png) in case you just need a quick refresher.
* **Perk trees, gene mods, and psionics:** View what will be available to your soldiers and MECs before unlocking them.

## Upcoming features

Disclaimer: None of these features are guaranteed to be added; they all depend on how much free time I have to work on the app, and the availability of the data needed to make them work properly.

* **Page history:** Navigate backwards and forwards between pages like in a browser, making it easier to keep your place.
* **Enemy database:** Long War makes a number of changes to enemies, including introducing Leaders and Navigators with access to many more perks than before. A proper enemy database will help you find out if it's possible for that Floater to have Covering Fire before you take the shot.
* **Enemy tracker:** In extended engagements, it's easy to lose track of how many enemies you've revealed versus how many you've killed. The enemy tracker will make it easy to update the count as you run into them, with an optional streamer overlay mode so your viewers can follow along.
* **UFO database:** With maintaining a healthy Interceptor fleet being so important in Long War, the UFO database will make it easier to tell if it's worthwhile scrambling someone to shoot at that Raider, or if you're just adding more repair time to your fleet.
* **Air combat simulator:** A hopeful extension of the UFO database, simply choose your Interceptor's loadout (including Foundry project completion) and which UFO type you're up against. A [Monte Carlo simulation](https://en.wikipedia.org/wiki/Monte_Carlo_method) will show you the probability of different outcomes.
* **Campaign planner:** With planning ahead being so critical in Long War, this tool will help you map out your research trajectory alongside your base facilities and item production.

## Known issues

* Some items and Foundry Projects have intentionally vague wording due to lack of clarity around how they function. For example, it's not clear if the dodge chance granted by UFO Countermeasures is a flat chance on any shot, a flat decrease to enemy aim, or something else.
* If you open the app and very quickly switch to the Research Tree and mouse over something, you might see the entire tree scramble. This is a really low priority to fix; just don't do that.