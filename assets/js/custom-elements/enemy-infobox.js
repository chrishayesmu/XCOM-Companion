import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";
import * as Widgets from "../widgets.js";

class EnemyInfobox extends HTMLElement {

    #enemy = null;

    static get observedAttributes() {
        return [ "alienresearch", "difficulty", "enemyid", "hidebaseperks", "leaderrank", "mini" ];
    }

    attributeChangedCallback() {
        this._recreateContents();
    }

    _createPerkIcon(perk) {
        const div = document.createElement("div");
        div.classList.add("enemy-perk-icon");
        div.setAttribute("data-page-on-click", "perk-tree-display-page");
        div.setAttribute("data-pagearg-item-id", perk.id);
        div.setAttribute("data-pagearg-display-mode", "single-perk");

        const img = Utils.appendElement(div, "img", "", { attributes: { src: perk.icon } })

        if (perk.id.startsWith("psi")) {
            img.classList.add("enemy-perk-icon-psionic");
        }

        Utils.appendElement(div, "div", perk.name);

        return div;
    }

    _getResearchForLeaderLevel(level) {
        if (!level) {
            return 0;
        }

        const leaderRank = this.#enemy.leader_ranks.find(r => r.level === level);

        return leaderRank.threshold;
    }

    _getStats(enemy) {
        // TODO: need to differentiate hp_regen granted by perks and not double grant for the same perk
        // ex: sectoids get Adaptive Bone Marrow but so do sectoid leaders
        const baseStats = enemy.base_stats[this.difficulty];
        const stats = {};

        // Almost nothing has these stats so just set it to 0 here instead of putting it in all the data files
        stats.hp_regen = stats.hp_regen || 0;
        stats.shield_hp = stats.shield_hp || 0;

        // Copy out of baseStats object so we don't overwrite anything
        for (const [key, value] of Object.entries(baseStats)) {
            stats[key] = value;
        }

        stats.perks = enemy.base_perks ? [...enemy.base_perks] : [];

        for (const upgrade of enemy.research_upgrades) {
            if (upgrade.threshold > this.alienResearch) {
                continue;
            }

            // Ignore optional navigator upgrades for now
            if (upgrade.chance && upgrade.chance !== 100) {
                continue;
            }

            stats.aim += (upgrade.aim || 0);
            stats.crit_chance += (upgrade.crit_chance || 0);
            stats.damage += (upgrade.damage || 0);
            stats.damage_reduction += (upgrade.damage_reduction || 0);
            stats.defense += (upgrade.defense || 0);
            stats.hp += (upgrade.hp || 0);
            stats.hp_regen += (upgrade.hp_regen || 0);
            stats.mobility += (upgrade.mobility || 0);
            stats.shield_hp += (upgrade.shield_hp || 0);
            stats.will += (upgrade.will || 0);

            if (upgrade.perk) {
                stats.perks.push(upgrade.perk);
            }
        }

        if (Number.isFinite(this.leaderRank)) {
            for (const rank of enemy.leader_ranks) {
                if (rank.level > this.leaderRank) {
                    continue;
                }

                stats.aim += (rank.aim || 0);
                stats.crit_chance += (rank.crit_chance || 0);
                stats.damage += (rank.damage || 0);
                stats.damage_reduction += (rank.damage_reduction || 0);
                stats.defense += (rank.defense || 0);
                stats.hp += (rank.hp || 0);
                stats.hp_regen += (rank.hp_regen || 0);
                stats.mobility += (rank.mobility || 0);
                stats.shield_hp += (rank.shield_hp || 0);
                stats.will += (rank.will || 0);

                if (rank.perks) {
                    stats.perks.push(...rank.perks);
                }

                if (rank.name) {
                    // Let the highest rank name apply
                    stats.name = rank.name;
                }
            }
        }

        // Need to round DR to 1 decimal, or else floating point imprecisions might give us long values
        stats.damage_reduction = (Math.ceil(stats.damage_reduction * 10) / 10).toFixed(1);

        // Sort perks by ID, not name, so that psi abilities always end up in the back
        stats.perks.sort( (a, b) => a.id.localeCompare(b.id) );

        return stats;
    }

    _populateAppearances(template, enemy) {
        const landedUfoContainer = template.querySelector("#research-needed-landed-ufo");
        const normalContainer = template.querySelector("#research-needed-normal");
        const terrorContainer = template.querySelector("#research-needed-terror");

        if ("normal" in enemy.appearances) {
            normalContainer.amount = enemy.appearances.normal;
        }
        else {
            const div = document.createElement("div");
            div.classList.add("enemy-infobox-column-right");
            div.textContent = "Never";

            normalContainer.replaceWith(div);
        }

        if ("terror" in enemy.appearances) {
            terrorContainer.amount = enemy.appearances.terror;
        }
        else {
            const div = document.createElement("div");
            div.classList.add("enemy-infobox-column-right");
            div.textContent = "Never";

            terrorContainer.replaceWith(div);
        }

        if ("normal" in enemy.appearances || "terror" in enemy.appearances) {
            const landedUfoThreshold = Math.max(Math.min(enemy.appearances.normal || 0, enemy.appearances.terror || 0) - 28, 0);
            landedUfoContainer.amount = landedUfoThreshold;
        }
        else {
            const div = document.createElement("div");
            div.classList.add("enemy-infobox-column-right");
            div.textContent = "Never";

            landedUfoContainer.replaceWith(div);
        }
    }

    _populatePerks(template, enemy, stats) {
        const perksContainer = template.querySelector("#enemy-infobox-perks-container");

        let perks = stats.perks;

        if (this.hideBasePerks) {
            perks = perks && perks.filter(p => !enemy.base_perks.includes(p));

            template.querySelector("#enemy-infobox-perks-heading").textContent = "Additional Perks";
        }

        if (!perks || perks.length === 0) {
            const div = document.createElement("div");
            div.classList.add("enemy-infobox-column-body");
            div.textContent = "None";
            perksContainer.replaceWith(div);
        }
        else {
            for (const perk of perks) {
                perksContainer.appendChild(this._createPerkIcon(perk));
            }
        }
    }

    _populateResearch(template, enemy) {
        const autopsyContainer = template.querySelector("#enemy-infobox-autopsy");
        const interrogationContainer = template.querySelector("#enemy-infobox-interrogation");

        if (enemy.autopsy) {
            autopsyContainer.appendChild(Widgets.createInAppLink(enemy.autopsy, { linkText: "Yes" }));
        }
        else {
            autopsyContainer.textContent = "No";
        }

        if (enemy.interrogation) {
            interrogationContainer.appendChild(Widgets.createInAppLink(enemy.interrogation, { linkText: "Yes" }));
        }
        else {
            interrogationContainer.textContent = "No";
        }
    }

    _populateRewards(template, enemy) {
        const captureRewardsContainer = template.querySelector("#capture-rewards");
        const killRewardsContainer = template.querySelector("#kill-rewards");

        if (enemy.capture_rewards) {
            captureRewardsContainer.innerHTML = "";

            for (const [itemId, quantity] of Object.entries(enemy.capture_rewards)) {
                const quantityStr = quantity > 0 ? quantity + "x " : "?? ";

                const itemLink = Widgets.createInAppLink(itemId, { prefixText: quantityStr });
                captureRewardsContainer.appendChild(itemLink);
            }
        }
        else {
            captureRewardsContainer.textContent = "This enemy cannot be captured.";
        }

        if (enemy.kill_rewards) {
            killRewardsContainer.innerHTML = "";

            for (const [itemId, quantity] of Object.entries(enemy.kill_rewards)) {
                const quantityStr = quantity > 0 ? quantity + "x " : "?? ";

                const itemLink = Widgets.createInAppLink(itemId, { prefixText: quantityStr });
                killRewardsContainer.appendChild(itemLink);
            }
        }
        else {
            killRewardsContainer.textContent = "This enemy drops nothing.";
        }
    }

    _populateStats(template, stats) {
        if (stats.aim) {
            template.querySelector("#stat-aim").textContent = stats.aim;
        }
        else {
            template.querySelector("#stat-aim").innerHTML = "<span style='font-size: 0.95em'>N/A</span>";
        }

        if (!stats.shield_hp) {
            template.querySelector("#enemy-infobox-shield-hp-block").classList.add("hidden-collapse");
        }

        template.querySelector("#stat-crit-chance").textContent = stats.crit_chance;
        template.querySelector("#stat-damage").textContent = stats.damage;
        template.querySelector("#stat-defense").textContent = stats.defense;
        template.querySelector("#stat-dr").textContent = stats.damage_reduction;
        template.querySelector("#stat-hp").textContent = stats.hp;
        template.querySelector("#stat-mobility").textContent = stats.mobility;
        template.querySelector("#stat-regen").textContent = stats.hp_regen;
        template.querySelector("#stat-shield-hp").textContent = stats.shield_hp;
        template.querySelector("#stat-will").textContent = stats.will;
    }

    _populateUnitTypes(template, enemy) {
        const unitTypesContainer = template.querySelector("#enemy-infobox-unit-types");

        const team = enemy.team === "alien" ? "Alien" : "EXALT";
        const creatureType = Utils.capitalizeEachWord(enemy.creature_type);

        const types = [ team, creatureType ];

        if (enemy.is_psionic) {
            types.push("Psionic");
        }

        unitTypesContainer.textContent = types.join(", ");
    }

    _recreateContents() {
        Templates.instantiateTemplate("assets/html/templates/pages/enemy-display-page.html", "template-enemy-infobox").then(template => {
            this.innerHTML = "";

            this.#enemy = DataHelper.enemies[this.enemyId];
            const enemyStats = this._getStats(this.#enemy);
            const damageRange = DataHelper.enemyDamageRanges[enemyStats.damage];

            template.querySelector(".enemy-infobox-title").textContent = enemyStats.name || this.#enemy.name;
            template.querySelector(".enemy-infobox-subtitle").textContent = Number.isFinite(this.leaderRank) ? "Leader Level " + this.leaderRank : "Base Unit";
            template.querySelector(".enemy-infobox-description").textContent = this.#enemy.description;
            template.querySelector(".enemy-infobox-img").src = this.#enemy.icon;

            template.querySelector("#enemy-infobox-damage-range").textContent = `${damageRange.normal_min} - ${damageRange.normal_max}`;
            template.querySelector("#enemy-infobox-crit-range").textContent = `${damageRange.crit_min} - ${damageRange.crit_max}`;

            this._populateAppearances(template, this.#enemy);
            this._populatePerks(template, this.#enemy, enemyStats);
            this._populateStats(template, enemyStats);
            this._populateResearch(template, this.#enemy);
            this._populateRewards(template, this.#enemy);
            this._populateUnitTypes(template, this.#enemy);
            this._showHideMiniFields(template);

            this.appendChild(template);
        });
    }

    _showHideMiniFields(template) {
        const elements = [
            template.querySelector(".enemy-infobox-img"),
            template.querySelector("#enemy-infobox-unit-types"),
            template.querySelector("#enemy-infobox-appearance-heading"),
            template.querySelector("#enemy-infobox-appearance-body"),
            template.querySelector("#kill-rewards-heading"),
            template.querySelector("#kill-rewards"),
            template.querySelector("#capture-rewards-heading"),
            template.querySelector("#capture-rewards")
        ];

        for (const elem of elements) {
            if (this.mini) {
                elem.classList.add("hidden-collapse");
            }
            else {
                elem.classList.remove("hidden-collapse");
            }
        }
    }

    get alienResearch() {
        return Math.max(this.getAttribute("alienResearch") || 0, this._getResearchForLeaderLevel(this.leaderRank));
    }

    set alienResearch(alienResearch) {
        this.setAttribute("alienResearch", alienResearch);
    }

    get difficulty() {
        return this.getAttribute("difficulty") || "impossible";
    }

    set difficulty(difficulty) {
        this.setAttribute("difficulty", difficulty);
    }

    get enemyId() {
        return this.getAttribute("enemyId") || "impossible";
    }

    set enemyId(enemyId) {
        this.setAttribute("enemyId", enemyId);
    }

    get hideBasePerks() {
        return this.hasAttribute("hideBasePerks");
    }

    set hideBasePerks(hideBasePerks) {
        if (hideBasePerks) {
            this.setAttribute("hideBasePerks", "");
        }
        else {
            this.removeAttribute("hideBasePerks");
        }
    }

    get leaderRank() {
        const rank = this.getAttribute("leaderRank");
        return rank ? +rank : null;
    }

    set leaderRank(leaderRank) {
        this.setAttribute("leaderRank", leaderRank);
    }

    get mini() {
        return this.hasAttribute("mini");
    }

    set mini(mini) {
        if (mini) {
            this.setAttribute("mini", "");
        }
        else {
            this.removeAttribute("mini");
        }
    }
}

customElements.define("enemy-infobox", EnemyInfobox);