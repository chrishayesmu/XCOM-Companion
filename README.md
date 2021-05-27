## Overview

**XCOM Companion** is a standalone desktop application, intended to be used while playing the [Long War 1.0](https://www.pavonisinteractive.com/xcomlongwareuew.htm) mod for 2013's [XCOM: Enemy Within](https://en.wikipedia.org/wiki/XCOM:_Enemy_Within). Long War adds new mechanics, items, abilities, and much more to the game. While this makes a great game, it can be a lot to keep track of at time, and being able to plan ahead is vitally important in Long War campaigns. The goal of XCOM Companion is to help keep all of that information organized, letting the player easily answer questions like "how many Muton corpses do I really need, and how many can I sell?".

Note that XCOM Companion is **not accurate** for any other version of the game, including the base XCOM: Enemy Within, the Long War Rebalanced mod, or earlier versions of Long War. Furthermore, any data which is difficulty-dependent is based on **Impossible** difficulty.

At this time, XCOM Companion contains enough data to replace various XCOM wikis for most scenarios, but there are still gaps being worked on. Check out the [current](#current-features) and [upcoming](#upcoming-features) features for details.

## Installation

Just head over to the [Releases](https://github.com/chrishayesmu/XCOM-Companion/releases/latest) here on GitHub and grab the latest `XCOM Companion Setup {version}.exe`. Run the quick install wizard and you're good to go.

Note that you may receive warnings from your browser and/or from Windows while downloading or installing. That's because this executable is unsigned, because I don't want to spend $500+ per year on this. If you're paranoid, feel free to clone the repo and run from source.

> :warning: At this time, XCOM Companion is only available as a standalone installer for Windows. This is mainly because I don't have Mac or Linux machines to test on. If you're on another OS and still want to use XCOM Companion, you can install [Node Package Manager](https://www.npmjs.com/), [clone this repository](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository), and run `npm install` followed by `npm start`. In theory that should work on any OS, but again, I haven't tested it.

### Updates

When you start XCOM Companion, it will automatically check for updates and notify you if there are any. It will also check again every 30 minutes afterwards. If for some reason this doesn't seem to be working, you can always return here and download the latest release manually.

## Current features

* **Navigatable research tree:** Pan and zoom around Long War's [research tree](screenshots/research_tree_full.png), laid out by hand to help convey its complexities at a glance.
* **All-in-one research, Foundry, and item details:** No more clicking around trying to figure out exactly what good something is; XCOM Companion combines all of the relevant information into a single page for [research](screenshots/research_alien_materials.png), [Foundry projects](screenshots/foundry_enhanced_plasma.png), and [items](screenshots/item_laser_rifle.png).
* **Cross-content searching:** Press Ctrl+F at any time and you're searching instantly across everything that's in the app - research, Foundry projects, items, perks, and more.
* **Fully local:** Everything in XCOM Companion is local to your machine, making it instantly responsive.
* **Rich tooltips and links:** References to other game terms are links that you can click to view them instantly, and mousing over those links [shows you tooltips](screenshots/tooltip_perk_body_shield.png) in case you just need a quick refresher.
* **Perk trees, gene mods, and psionics:** View what will be available to your soldiers and MECs before unlocking them.
* **Enemy database:** Long War makes a number of changes to enemies, including introducing Leaders and Navigators with access to many more perks than before. A proper enemy database will help you find out if it's possible for that Floater to have Covering Fire before you take the shot.
* **Map database:** Put in your mission type and area of operations (e.g. Urban Block) and get back a list of the maps you might be about to embark on.
* **UFO database:** With maintaining a healthy Interceptor fleet being so important in Long War, the UFO database makes it easier to tell if it's worthwhile scrambling someone to shoot at that Raider, or if you're just adding more repair time to your fleet. Tells you how a UFO performs in the air, what to expect when assaulting one on the ground, and what missions they might be performing in your airspace.
* **Automatic updates:** As more functionality is added to XCOM Companion, you can install it with a single click.

## Upcoming features

Disclaimer: None of these features are guaranteed to be added; they all depend on how much free time I have to work on the app, and the availability of the data needed to make them work properly. They are listed here roughly in their order of likelihood to happen (most likely at top).

* **Enemy tracker:** In extended engagements, it's easy to lose track of how many enemies you've revealed versus how many you've killed. The enemy tracker will make it easy to update the count as you run into them, with an optional streamer overlay mode so your viewers can follow along.
* **Air combat simulator:** A hopeful extension of the UFO database, simply choose your Interceptor's loadout (including Foundry project completion) and which UFO type you're up against. A [Monte Carlo simulation](https://en.wikipedia.org/wiki/Monte_Carlo_method) will show you the probability of different outcomes.
* **Campaign planner:** With planning ahead being so critical in Long War, this tool will help you map out your research trajectory alongside your base facilities and item production.
* **Save file integration:** Let XCOM Companion load your campaign data to make your experience more contextual. For example, instead of seeing how long a research takes under hypothetical conditions, check out how long it'll be for your exact crew.

## Known issues

* Some items and Foundry Projects have intentionally vague wording due to lack of clarity around how they function. For example, it's not clear if the dodge chance granted by UFO Countermeasures is a flat chance on any shot, a flat decrease to enemy aim, or something else. I will fill these in if and when I learn more.
* Some specific pieces of data are missing for UFOs, especially the Overseer and the Assault Carrier.
* If you open the app and very quickly switch to the Research Tree and mouse over something, you might see the entire tree scramble. This is a really low priority to fix; just don't do that. If it does happen, close and reopen XCOM Companion.

## Feedback, bug reports, feature requests

The best way to contact me is by [creating an issue](https://github.com/chrishayesmu/XCOM-Companion/issues/new) on GitHub, but if you don't have a GitHub account, I can also be reached via Discord DM at SwfDelicious#4905.