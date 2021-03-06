import * as DataHelper from "../data-helper.js";
import * as Loadouts from "../loadouts.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";

class LoadoutSummary extends HTMLElement {

    #loadout = null;
    #stats = null;

    async render(loadout) {
        this.#loadout = loadout;

        if (!this.#loadout) {
            this.innerHTML = "";
            return;
        }

        const isMec = this.#loadout.classId.startsWith("mec");
        const isShiv = this.#loadout.classId.startsWith("shiv");

        const template = await Templates.instantiateTemplate("assets/html/templates/custom-elements/loadout-summary.html", "template-loadout-summary");
        const perksContainer = template.querySelector("#loadout-summary-perks");

        template.querySelector("#loadout-summary-name").textContent = this.#loadout.name;
        template.querySelector("#loadout-summary-notes").textContent = this.#loadout.notes || "No notes provided.";

        this._populateEquipment(template);

        // Don't want to put "None" in the perks area for SHIVs since they have some that aren't in the usual spot
        if (!isShiv) {
            this._populatePerkArea(perksContainer, this.#loadout.perks, "None");
            this._populatePerkArea(template.querySelector("#loadout-summary-gene-mods"), this.#loadout.geneMods, "None");
            this._populatePerkArea(template.querySelector("#loadout-summary-officer-abilities"), this.#loadout.officerAbilities, "None");
            this._populatePerkArea(template.querySelector("#loadout-summary-psi-abilities"), this.#loadout.psiAbilities, "None");
        }

        this._populateBaseOfficerAbilities(template); // has to be after populating the perk area
        this._populateHeader(template);
        this._populateStats(template);
        this._populateDamageHelpText(template);
        this._populateWillHelpText(template);

        this._addPerksFromEquipment(template);
        this._addPerksFromFoundry(template);

        if (isMec || isShiv) {
            // Add perks that all MECs/SHIVs get
            perksContainer.append(this._createPerkIcon("perk_hardened"));

            if (isMec) {
                perksContainer.append(this._createPerkIcon("perk_robotic_mec"));
                perksContainer.append(this._createPerkIcon("perk_one_for_all"));
            }

            if (isShiv) {
                perksContainer.append(this._createPerkIcon("perk_robotic"));

                // TODO: give Alloy SHIV a perk showing that it acts as low cover
            }

            // Hide areas that are irrelevant to MECs/SHIVs
            template.querySelector("#loadout-summary-gene-mods").parentNode.classList.add("hidden-collapse");
            template.querySelector("#loadout-summary-officer-abilities").parentNode.classList.add("hidden-collapse");
            template.querySelector("#loadout-summary-psi-abilities").parentNode.classList.add("hidden-collapse");
        }

        if (this.#stats.fuel) {
            perksContainer.append(this._createPerkIcon("perk_flight"));
        }

        this.replaceChildren(template);
    }

    _addPerksFromEquipment(template) {
        const perksContainer = template.querySelector("#loadout-summary-perks");
        const equippedItems = this.#loadout.equipment.filter(itemId => !!itemId).map(itemId => DataHelper.items[itemId]);

        for (const item of equippedItems) {
            if (!item.type_specific_data || !item.type_specific_data.grants_perks) {
                continue;
            }

            for (const perk of item.type_specific_data.grants_perks) {
                perksContainer.append(this._createPerkIcon(perk.id));
            }
        }
    }

    _addPerksFromFoundry(template) {
        const foundryProjects = this.#loadout.foundryProjects || [];
        const isMec = this.#loadout.classId.startsWith("mec");
        const isShiv = this.#loadout.classId.startsWith("shiv");
        const perksContainer = template.querySelector("#loadout-summary-perks");

        // Regular soldiers never gain perks from Foundry projects
        if (!isMec && !isShiv) {
            return;
        }

        if (foundryProjects.includes("foundry_advanced_servomotors")) {
            perksContainer.append(this._createPerkIcon("perk_sprinter"));
        }

        if (isShiv && foundryProjects.includes("foundry_sentinel_drone")) {
            perksContainer.append(this._createPerkIcon("perk_close_combat_specialist"));
            perksContainer.append(this._createPerkIcon("perk_repair_servos"));
        }

        if (isShiv && foundryProjects.includes("foundry_shiv_suppression")) {
            perksContainer.append(this._createPerkIcon("perk_suppression"));
        }
    }

    _createPerkIcon(perkId) {
        const icon = document.createElement("perk-icon");
        icon.perkId = perkId;
        icon.setAttribute("hideName", "");
        icon.setAttribute("selected", "");

        return icon;
    }

    _populateBaseOfficerAbilities(template) {
        const officerPerks = this.#loadout.officerAbilities;

        if (officerPerks.length === 0) {
            return;
        }

        const container = template.querySelector("#loadout-summary-officer-abilities");

        if (!officerPerks.includes("perk_command")) {
            container.prepend(this._createPerkIcon("perk_command"));
        }

        if (!officerPerks.includes("perk_lead_by_example")) {
            container.prepend(this._createPerkIcon("perk_lead_by_example"));
        }
    }

    _populateDamageHelpText(template) {
        // Damage info lives in enemy data right now (oops)
        const damageRange = DataHelper.enemyDamageRanges[this.#stats.damage];
        const damageHelp = template.querySelector(".stat-block #stat-damage + help-icon");

        const damageRangeStr = `With a base damage of ${this.#stats.damage}, a normal hit will deal ${damageRange.normal_min} to ${damageRange.normal_max}, and a critical hit will deal ${damageRange.crit_min} to ${damageRange.crit_max}.`;
        const damageDisclaimerStr = "Neither the base damage or the ranges include conditional perks such as Vital Point Targeting. Critical damage ranges do not include special conditions like Targeting Modules, or plasma weapons with bonus crit damage.";
        damageHelp.innerHTML = `${damageRangeStr}<br/><br/>${damageDisclaimerStr}`;
    }

    _populateEquipment(template) {
        const equipmentContainer = template.querySelector("#loadout-summary-equipment");

        for (const itemId of this.#loadout.equipment) {
            if (!itemId) {
                continue;
            }

            equipmentContainer.append(Widgets.createInAppLink(itemId));
        }
    }

    _populateHeader(template) {
        template.querySelector("#loadout-summary-name").textContent = this.#loadout.name;

        // Soldier class
        const soldierClass = DataHelper.soldierClasses[this.#loadout.classId];
        let classImgUrl = soldierClass.icon.replace(".png", ""); // remove extension

        if (this.#loadout.psiAbilities.length > 0) {
            classImgUrl += "_psi";
        }

        if (this.#loadout.geneMods.length > 0) {
            classImgUrl += "_gene";
        }

        classImgUrl += ".png";

        const classImage = document.createElement("img");
        classImage.src = classImgUrl;

        const classContainer = template.querySelector("#loadout-summary-class");
        classContainer.innerHTML = soldierClass.name.replace(" ", "<br/>");
        classContainer.prepend(classImage);

        // Soldier rank
        if (!this.#loadout.classId.startsWith("shiv")) {
            const rankInfo = Loadouts.getLoadoutRank(this.#loadout);
            const rankName = rankInfo.name.replace(" ", "<br/>"); // force names to line break

            const rankImage = document.createElement("img");
            rankImage.src = rankInfo.icon;

            const rankContainer = template.querySelector("#loadout-summary-rank");
            rankContainer.innerHTML = rankName;
            rankContainer.prepend(rankImage);
        }

        // Officer rank
        if (this.#loadout.officerAbilities.length > 0) {
            const officerRank = Loadouts.getLoadoutOfficerRank(this.#loadout);

            const officerRankImage = document.createElement("img");
            officerRankImage.src = officerRank.icon;

            const officerRankContainer = template.querySelector("#loadout-summary-officer-rank");
            officerRankContainer.classList.remove("hidden-collapse");

            officerRankContainer.innerHTML = officerRank.name.replace(" ", "<br/>");
            officerRankContainer.prepend(officerRankImage);
        }
    }

    _populatePerkArea(container, perks, textIfNone) {
        if (!perks || !perks.length) {
            container.textContent = textIfNone;
            return;
        }

        for (const perk of perks) {
            container.append(this._createPerkIcon(perk));
        }
    }

    _populateStats(template) {
        const stats = Loadouts.calculateStatsForPrimary(this.#loadout);
        this.#stats = stats;

        const addStatText = function(container, stat) {
            let innerHTML = stat.base;

            if (stat.fromItems !== 0) {
                const cssClass = stat.fromItems > 0 ? "stat-from-items-bonus" : "stat-from-items-malus";
                const sign = stat.fromItems > 0 ? "+" : "-";
                innerHTML += `<span class="${cssClass}">${sign}${Math.abs(stat.fromItems)}</span>`;
            }

            container.innerHTML = innerHTML;
        };

        addStatText(template.querySelector("#stat-aim"), stats.aim);
        addStatText(template.querySelector("#stat-ammo"), stats.ammo);
        addStatText(template.querySelector("#stat-crit-chance"), stats.crit_chance);
        addStatText(template.querySelector("#stat-dr"), stats.damage_reduction);
        addStatText(template.querySelector("#stat-defense"), stats.defense);
        addStatText(template.querySelector("#stat-hp"), stats.hp);
        addStatText(template.querySelector("#stat-mobility"), stats.mobility);
        addStatText(template.querySelector("#stat-will"), stats.will);

        // Don't show fuel if it isn't relevant
        if (stats.fuel) {
            template.querySelector("#stat-fuel").textContent = stats.fuel;
        }
        else {
            template.querySelector("#stat-fuel").parentElement.classList.add("hidden-collapse");
        }

        // Likewise, don't show fatigue for SHIVs
        if (this.#loadout.classId.startsWith("shiv")) {
            template.querySelector("#stat-additional-fatigue").parentElement.classList.add("hidden-collapse");
        }
        else {
            // Fatigue time can't be affected by items
            template.querySelector("#stat-additional-fatigue").textContent = stats.fatigue_extra_time_hours;
        }

        // damage is inherently from items
        template.querySelector("#stat-damage").textContent = stats.damage;
    }

    _populateWillHelpText(template) {
        const maxWill = this.#stats.maxPossibleWill;
        const willHelp = template.querySelector(".stat-block #stat-will + help-icon");

        if (this.#loadout.classId.startsWith("shiv")) {
            willHelp.innerHTML = `SHIVs always have 0 will. Since they are immune to panic and most psionic attacks, this usually doesn't matter. However, the Psi Lance and Rift attacks used by Ethereals can target
                                  SHIVs, and they deal 1 bonus damage for each 10 will more that the attacker has than the target. This makes SHIVs extremely susceptible to those attacks.`;
        }
        else {
            willHelp.innerHTML = `The base will shown here (${this.#stats.will.base}) is the minimum possible value. At each soldier rank up, the soldier may randomly receive +1 will, even without Hidden Potential turned on.
                                Additionally, each rank of psi training gives between 1 and 6 bonus will, chosen randomly.
                                <br/><br/>
                                Based on this, the maximum will this character could have is <strong>${maxWill}</strong>, not including any equipment bonuses.`;
        }
    }
}

customElements.define("loadout-summary", LoadoutSummary);