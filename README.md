## Overview

**XCOM Companion** is a standalone desktop application, intended to be used while playing the [Long War 1.0](https://www.pavonisinteractive.com/xcomlongwareuew.htm) mod for 2013's [XCOM: Enemy Within](https://en.wikipedia.org/wiki/XCOM:_Enemy_Within). Long War adds new mechanics, items, abilities, and much more to the game. While this makes a great game, it can be a lot to keep track of at time, and being able to plan ahead is vitally important in Long War campaigns. The goal of XCOM Companion is to help keep all of that information organized, letting the player easily answer questions like "how many Muton corpses do I really need, and how many can I sell?".

Note that XCOM Companion is **not accurate** for any other version of the game, including the base XCOM: Enemy Within, the Long War Rebalanced mod, or earlier versions of Long War. Furthermore, any data which is difficulty-dependent is based on **Impossible** difficulty, unless a difficulty selector is available on that page.

At this time, XCOM Companion contains enough data to replace various XCOM wikis for most scenarios, but there are still gaps being worked on. Check out the [current](#current-features) and [upcoming](#upcoming-features) features for details.

## Installation

## Windows

Just head over to the [Releases](https://github.com/chrishayesmu/XCOM-Companion/releases/latest) here on GitHub and grab the latest `XCOM Companion Setup {version}.exe`. Run the quick install wizard and you're good to go.

Note that you may receive warnings from your browser and/or from Windows while downloading or installing. That's because this executable is unsigned, because I don't want to spend $500+ per year on this. If you're paranoid, feel free to clone the repo and run from source.

## OSX/Linux

> :warning: The native installer only works on Windows, so in the event that you want to use XCOM-Companion on OSX or Linux, it must be manually cloned and installed with NPM. The following instructions will step you through the process.

### Cloning the Repository

To clone this repository, you must first install Git. Git will allow you to make a local copy of this code, allowing you to manually install XCOM-Companion. If you are on Linux, it is likely already installed on your machine. Otherwise, you can use your package manager to install it. For example, on Debian based distros such as Ubuntu you would do this by running `sudo apt-get git`. Once Git is installed, use the terminal to navigate into the repository you would like to clone into and run `git clone https://github.com/chrishayesmu/XCOM-Companion.git`. To install Git on OSX, please see the [Git website](https://git-scm.com/download/mac). For more detailed instructions on cloniing the repository, see [here](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository-from-github/cloning-a-repository).

### Installing NPM

Node Package Manger, or NPM, can be installed similarly to git. On Linux it can simply be installed with your package manager, again using a command such as `sudo apt-get npm` or your distros equivalent. To install on OSX, see the NPM [download page](https://nodejs.org/en/download/). For more detailed instructions on NPM installation, see the [documentation](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

### Installing and Running XCOM-Companion

Once you have cloned the repository and installed npm, you can install and run XCOM-Companion. To do this, first navigate into the cloned repository. This can be done using the `cd` command, in our case `cd XCOM-Companion`. Once you are inside the `XCOM-Companion` directory, run `npm install`. This will install the program. To start the program simply run `npm run`. From this point on, anytime you want to run XCOM-Companion, it must be done by navigating into the directory and running `npm run`.

### Updates

When you start XCOM Companion, it will automatically check for updates and notify you if there are any. It will also check again every 30 minutes afterwards. If for some reason this doesn't seem to be working, you can always return here and download the latest release manually.

## Current features

* **Navigatable research tree:** Pan and zoom around Long War's [research tree](screenshots/research_tree_full.png), laid out by hand to help convey its complexities at a glance.
* **All-in-one research, Foundry, and item details:** No more clicking around trying to figure out exactly what good something is; XCOM Companion combines all of the relevant information into a single page for [research](screenshots/research_alien_materials.png), [Foundry projects](screenshots/foundry_enhanced_plasma.png), and [items](screenshots/item_laser_rifle.png).
* **Cross-content searching:** Press Ctrl+F at any time and you're [searching instantly across everything](screenshots/search_results_laser.png) that's in the app - research, Foundry projects, items, perks, and more. Also features [an auto-suggestion list](screenshots/search_autosuggest_plasma.png), in case you can't remember how to spell Chryssalid.
* **Fully local:** Everything in XCOM Companion is local to your machine, making it instantly responsive and usable offline.
* **Rich tooltips and links:** References to other game terms are links that you can click to view them instantly, and mousing over those links [shows you tooltips](screenshots/tooltip_perk_body_shield.png) in case you just need a quick refresher.
* **Perk trees, gene mods, and psionics:** View what will be available to your soldiers and MECs before unlocking them.
* **Enemy database:** Long War makes a number of changes to enemies, including introducing Leaders and Navigators with access to many more perks than before. A proper enemy database will help you find out if it's possible for [that Floater to have Covering Fire](screenshots/enemy_floater_overview.png) before you take the shot. A [point-in-time view](screenshots/enemy_floater_point_in_time.png) lets you view the most appropriate results for your campaign, too.
* **Map database:** Put in your mission type and area of operations (e.g. Urban Block) and get back [a list of the maps](screenshots/map_possibilities_page.png) you might be about to embark on.
* **UFO database:** With maintaining a healthy Interceptor fleet being so important in Long War, the UFO database makes it easier to tell if it's worthwhile scrambling someone to shoot at that Raider, or if you're just adding more repair time to your fleet. Tells you [how a UFO performs in the air](screenshots/ufo_details_air_combat.png), what to expect [when assaulting one on the ground](screenshots/ufo_details_ground_assault.png), and [what missions they might be performing](screenshots/ufo_details_missions.png) in your airspace.
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