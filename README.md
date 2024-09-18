# Overview

**XCOM Companion** is a standalone desktop application, intended to be used while playing the [Long War 1.0](https://www.pavonisinteractive.com/xcomlongwareuew.htm) mod for 2013's [XCOM: Enemy Within](https://en.wikipedia.org/wiki/XCOM:_Enemy_Within). Long War adds new mechanics, items, abilities, and much more to the game. While this makes a great game, it can be a lot to keep track of at time, and being able to plan ahead is vitally important in Long War campaigns. The goal of XCOM Companion is to help keep all of that information organized, letting the player easily answer questions like "how many Muton corpses do I really need, and how many can I sell?".

Note that XCOM Companion is **not accurate** for any other version of the game, including the base XCOM: Enemy Within, the Long War Rebalanced mod, or earlier versions of Long War. Furthermore, any data which is difficulty-dependent is based on **Impossible** difficulty, unless a difficulty selector is available on that page.

At this time, XCOM Companion contains enough data to replace various XCOM wikis for most scenarios, but there are still gaps being worked on. Check out the [current](#current-features) and [upcoming](#upcoming-features) features for details.

# Installation

## Windows

Just head over to the [Releases](https://github.com/chrishayesmu/XCOM-Companion/releases/latest) here on GitHub and grab the latest `XCOM Companion Setup {version}.exe`. Run the quick install wizard and you're good to go.

Note that you may receive warnings from your browser and/or from Windows while downloading or installing. That's because this executable is unsigned, because I don't want to spend $500+ per year on this. If you're paranoid, feel free to clone the repo and run from source.

## OSX/Linux

> :warning: The native installer only works on Windows, so in the event that you want to use XCOM Companion on OSX or Linux, it must be manually cloned and installed with NPM. The following instructions will step you through the process.

<details>
<summary>Installation instructions</summary>

### Cloning the repository

To clone this repository, you must first install Git. Git will allow you to make a local copy of this code, allowing you to manually install XCOM Companion. If you are on Linux, it is likely already installed on your machine. Otherwise, you can use your package manager to install it. For example, on Debian-based distros such as Ubuntu you would do this by running `sudo apt-get git`. Once Git is installed, use the terminal to navigate into the repository you would like to clone into and run `git clone https://github.com/chrishayesmu/XCOM-Companion.git`. To install Git on OSX, please see the [Git website](https://git-scm.com/download/mac). For more detailed instructions on cloniing the repository, see [here](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/cloning-a-repository-from-github/cloning-a-repository).

### Installing NPM

Node Package Manager, or NPM, can be installed similarly to git. On Linux it can simply be installed with your package manager, again using a command such as `sudo apt-get npm` or your distro's equivalent. To install on OSX, see the [NPM download page](https://nodejs.org/en/download/). For more detailed instructions on NPM installation, see the [documentation](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

### Installing and running XCOM Companion

Once you have cloned the repository and installed npm, you can install and run XCOM Companion. To do this, first navigate into the cloned repository. This can be done using the `cd` command, in our case `cd XCOM-Companion`. Once you are inside the `XCOM-Companion` directory, run `npm install`. This will install the program. To start the program simply run `npm start`. From this point on, any time you want to run XCOM Companion, it must be done by navigating into the directory and running `npm start`.
</details>

<br/>

# Updates

**Windows:** When you start XCOM Companion, it will automatically check for updates and notify you if there are any. It will also check again every 30 minutes afterwards. If for some reason this doesn't seem to be working, you can always return here and download the latest release manually.

**OSX/Linux:** You will need to use git to get the latest version; see below.

<details>
<summary>Update instructions</summary>

Close XCOM Companion and run `git pull && git fetch --tags` in its directory. This will get you the very latest code, which may not be in the most functional state. To match the latest release, run `git tag` to see a list of tags such as this:

```
v0.1.0
v0.1.1
v0.2.0
v0.3.0
v0.4.0
v0.4.1
v0.4.2
v0.4.3
```

Then run `git checkout <tag>` to access a specific version, e.g. `git checkout v0.4.3` would load the latest version from the list above. You can then run `npm start` as normal to run XCOM Companion.

From time to time, you may receive an error message when running `npm start` stating that you are missing some dependency. You will need to run `npm install` again if this happens.
</details>

<br/>

# Current features

* **Navigatable research tree:** Pan and zoom around Long War's [research tree](screenshots/research_tree_full.png), laid out by hand to help convey its complexities at a glance.
* **All-in-one research, Foundry, and item details:** No more clicking around trying to figure out exactly what good something is; XCOM Companion combines all of the relevant information into a single page for [research](screenshots/research_alien_materials.png), [Foundry projects](screenshots/foundry_enhanced_plasma.png), and [items](screenshots/item_laser_rifle.png).
* **Cross-content searching:** Press Ctrl+F at any time and you're [searching instantly across everything](screenshots/search_results_laser.png) that's in the app - research, Foundry projects, items, perks, and more. Also features [an auto-suggestion list](screenshots/search_autosuggest_plasma.png), in case you can't remember how to spell Chryssalid.
* **Fully local:** Everything in XCOM Companion is local to your machine, making it instantly responsive and usable offline.
* **Rich tooltips and links:** References to other game terms are links that you can click to view them instantly, and mousing over those links [shows you tooltips](screenshots/tooltip_perk_body_shield.png) in case you just need a quick refresher.
* **Perk trees, gene mods, and psionics:** View what will be available to your soldiers and MECs before unlocking them.
* **Enemy database:** Long War makes a number of changes to enemies, including introducing Leaders and Navigators with access to many more perks than before. A proper enemy database will help you find out if it's possible for [that Floater to have Covering Fire](screenshots/enemy_floater_overview.png) before you take the shot. A [point-in-time view](screenshots/enemy_floater_point_in_time.png) lets you view the most appropriate results for your campaign, too.
* **Map database:** Put in your mission type and area of operations (e.g. Urban Block) and get back [a list of the maps](screenshots/map_possibilities_page.png) you might be about to embark on.
* **UFO database:** With maintaining a healthy Interceptor fleet being so important in Long War, the UFO database makes it easier to tell if it's worthwhile scrambling someone to shoot at that Raider, or if you're just adding more repair time to your fleet. Tells you [how a UFO performs in the air](screenshots/ufo_details_air_combat.png), what to expect [when assaulting one on the ground](screenshots/ufo_details_ground_assault.png), and [what missions they might be performing](screenshots/ufo_details_missions.png) in your airspace.
* **Build manager:** For soldiers, MECs, and SHIVs, build out their perks, equipment, and more in order to see their final stats without having to invest in-game. You can even export and import builds to share with others.
* **Campaign planner:** With planning ahead being so critical in Long War, this tool will help you map out your research trajectory alongside your base facilities (and potentially more in future updates).
* **Automatic updates:** As more functionality is added to XCOM Companion, you can install it with a single click.

# Upcoming features

Disclaimer: None of these features are guaranteed to be added; they all depend on how much free time I have to work on the app, and the availability of the data needed to make them work properly. They are listed here roughly in their order of likelihood to happen (most likely at top).

* **Enemy tracker:** In extended engagements, it's easy to lose track of how many enemies you've revealed versus how many you've killed. The enemy tracker will make it easy to update the count as you run into them, with an optional streamer overlay mode so your viewers can follow along.
* **Air combat simulator:** A hopeful extension of the UFO database, simply choose your Interceptor's loadout (including Foundry project completion) and which UFO type you're up against. A [Monte Carlo simulation](https://en.wikipedia.org/wiki/Monte_Carlo_method) will show you the probability of different outcomes.
* **Save file integration:** Let XCOM Companion load your campaign data to make your experience more contextual. For example, instead of seeing how long a research takes under hypothetical conditions, check out how long it'll be for your exact crew.

# Known issues

* Some items and Foundry Projects have intentionally vague wording due to lack of clarity around how they function. I will fill these in if and when I learn more.
* Some specific pieces of data are missing for UFOs, especially the Overseer and the Assault Carrier.
* If you open the app and very quickly switch to the Research Tree and mouse over something, you might see the entire tree scramble. This is a really low priority to fix; just don't do that. If it does happen, close and reopen XCOM Companion.

# Feedback, bug reports, feature requests

The best way to contact me is by [creating an issue](https://github.com/chrishayesmu/XCOM-Companion/issues/new) on GitHub, but if you don't have a GitHub account, I can also be reached via Discord DM at SwfDelicious.

# FAQ

## Will XCOM Companion really never support anything but Long War 1.0?

Yes, I'm afraid so. I don't feel like there's any point in supporting the base Enemy Unknown/Enemy Within, as frankly, those games aren't complex enough to need something like this. For other popular mods, such as Long War Rebalanced and Long War 1.1, there are two main problems:

1. **They're still being updated.** All of my data entry into the app is annoyingly manual. Every piece of information you see, from enemy names and stats to item costs, as well as all of the images, were manually entered. This makes XCOM Companion simpler, in that it doesn't have to find your game's files and parse them, but also means supporting any other version is a lot of work. If those versions are still changing, that work has to be repeated often.
2. **XCOM Companion's architecture.** A lot of the data that differs between mods, such as item costs, would be straightforward to swap in and out. However, much of the content is not designed in this way; for example, all of the information on enemy pages about how navigators and leaders work is written directly into the page. If any of these mechanics differ between versions, there's no easy way to reflect that in XCOM Companion.

## What if I really want something like XCOM Companion for a different mod?

XCOM Companion is open source, so feel free to fork it and make a version targeting your preferred mod set. As long as the scope is constrained to one specific mod or set of mods, it should be relatively easy for someone to change around the app to fit that.

## What about different difficulties than Impossible?

I do eventually intend to support all difficulties on every page where it's relevant, using a single difficulty selection that is active throughout the entire app. It's going to take a while, though, especially as not all of the differences between difficulties may be fully documented.

## Can I contribute to XCOM Companion?

Feel free! But keep in mind that this is a hobbyist project, and I'm not looking to professionalize it. If you submit a pull request adding a bunch of unit tests that I have to maintain, it's probably going to get turned down. XCOM Companion is a just-for-fun side deal for me, and I get enough of those things at my day job.

If you have a major feature or change in mind, open an issue to discuss it first. I have a lot of things I'm considering adding, and others I've decided not to. You don't want to invest a bunch of effort only to get turned down.

If you're not a programmer, the best way to contribute is with feedback, and especially corrections. If you see something wrong in the app, let me know!