import * as DataHelper from "../data-helper.js";
import PageManager from "../page-manager.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";
import * as Widgets from "../widgets.js";

class EnemyInfobox extends HTMLElement {

    #enemy = null;

    static get observedAttributes() {
        return [ "alienresearch", "difficulty", "enemyid", "hidebaseperks", "leaderrank", "mini", "navigatorupgrades", "rankselect", "tiny" ];
    }

    constructor() {
        super();

        this.addEventListener("click", this._onInfoboxClicked);
    }

    attributeChangedCallback() {
        this._recreateContents();
    }

    _createPerkIcon(perk) {
        const div = document.createElement("div");
        div.classList.add("enemy-infobox-perk-icon");
        div.setAttribute("data-page-on-click", "perk-tree-display-page");
        div.setAttribute("data-pagearg-item-id", perk.id);
        div.setAttribute("data-pagearg-display-mode", "single-perk");

        const img = Utils.appendElement(div, "img", "", { attributes: { src: perk.icon } })

        if (perk.id.startsWith("psi")) {
            img.classList.add("enemy-infobox-perk-icon-psionic");
        }

        Utils.appendElement(div, "div", perk.name, { attributes: { class: "enemy-infobox-perk-name" } });

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
        const statPerks = {
            perk_adaptive_bone_marrow: {
                stat: "hp_regen",
                value: 2
            },
            perk_sharpshooter: {
                stat: "crit_chance",
                value: 10
            },
            perk_sprinter: {
                stat: "mobility",
                value: 4
            }
        };

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

        const addUpgrade = function(upgrade) {
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

                if (upgrade.perk.id in statPerks) {
                    const perkStats = statPerks[upgrade.perk.id];
                    stats[perkStats.stat] -= perkStats.value;
                }
            }

            if (upgrade.perks) {
                for (const perk of upgrade.perks) {
                    if (perk.id in statPerks) {
                        const perkStats = statPerks[perk.id];
                        stats[perkStats.stat] -= perkStats.value;
                    }

                    if (!stats.perks.includes(perk)) {
                        stats.perks.push(perk);
                    }
                }
            }

            if (upgrade.name) {
                // Let the last name encountered apply; it will end up being the highest rank
                stats.name = upgrade.name;
            }
        };

        for (const upgrade of enemy.research_upgrades) {
            // Research upgrades only: adjust threshold based on difficulty
            if (Utils.researchThresholdByDifficulty(upgrade.threshold, this.difficulty) > this.alienResearch) {
                continue;
            }

            // Ignore optional navigator upgrades for now
            if (upgrade.chance && upgrade.chance !== 100) {
                continue;
            }

            addUpgrade(upgrade);
        }

        const navigatorUpgrades = enemy.research_upgrades.filter(upgrade => upgrade.chance);
        for (const index of this.navigatorUpgrades) {
            const upgrade = navigatorUpgrades[index];

            // 100% upgrades are already accounted for
            if (upgrade.chance === 100) {
                continue;
            }

            addUpgrade(upgrade);
        }

        if (Number.isFinite(this.leaderRank)) {
            for (const rank of enemy.leader_ranks) {
                if (rank.level > this.leaderRank) {
                    continue;
                }

                addUpgrade(rank);
            }
        }

        for (const [perkId, config] of Object.entries(statPerks)) {
            if (stats.perks.find(perk => perk.id === perkId)) {
                stats[config.stat] += config.value;
            }
            else if (perkId === "perk_adaptive_bone_marrow") {
                // hp_regen is a meaningless stat if you don't have Adaptive Bone Marrow
                stats.hp_regen = 0;
            }
        }

        // Need to round DR to 1 decimal, or else floating point imprecisions might give us long values
        stats.damage_reduction = (Math.ceil(stats.damage_reduction * 10) / 10).toFixed(1);

        // Sort perks by ID, not name, so that psi abilities always end up in the back
        stats.perks.sort( (a, b) => a.id.localeCompare(b.id) );

        return stats;
    }

    _onInfoboxClicked() {
        if (this.tiny) {
            PageManager.instance.loadPageForData(this.#enemy);
        }
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

            // Need to override grid display so text is centered
            perksContainer.style = "display: unset";
            perksContainer.appendChild(div);
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

    _populateSubtitle(template, enemy) {
        if (this.rankSelect) {
            const select = Utils.createSelect([
                { content: "Base Unit", value: "base" },
                { content: "Leader Rank 0", value: 0 },
                { content: "Leader Rank 1", value: 1 },
                { content: "Leader Rank 2", value: 2 },
                { content: "Leader Rank 3", value: 3 },
                { content: "Leader Rank 4", value: 4 },
                { content: "Leader Rank 5", value: 5 },
                { content: "Leader Rank 6", value: 6 },
                { content: "Leader Rank 7", value: 7 },
                { content: "Leader Rank 8", value: 8 },
                { content: "Leader Rank 9", value: 9 }
            ], this.leaderRank);

            select.addEventListener("change", event => {
                const value = event.target.value;

                if (value === "base") {
                    this.removeAttribute("leaderRank");
                }
                else {
                    this.leaderRank = value;
                }
            });

            template.querySelector(".enemy-infobox-subtitle").appendChild(select);
        }
        else {
            template.querySelector(".enemy-infobox-subtitle").textContent = Number.isFinite(this.leaderRank) ? "Leader Level " + this.leaderRank : "Base Unit";
        }
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
        if (!this.enemyId) {
            this.innerHTML = "";
            return;
        }

        Templates.instantiateTemplate("assets/html/templates/custom-elements/enemy-infobox.html", "template-enemy-infobox").then(template => {
            this.innerHTML = "";

            this.#enemy = DataHelper.enemies[this.enemyId];
            const enemyStats = this._getStats(this.#enemy);
            const damageRange = DataHelper.enemyDamageRanges[enemyStats.damage];

            template.querySelector(".enemy-infobox-title").textContent = enemyStats.name || this.#enemy.name;
            template.querySelector(".enemy-infobox-description").textContent = this.#enemy.description;
            template.querySelector(".enemy-infobox-img").src = this.#enemy.icon;

            template.querySelector("#enemy-infobox-damage-range").textContent = `${damageRange.normal_min} - ${damageRange.normal_max}`;
            template.querySelector("#enemy-infobox-crit-range").textContent = `${damageRange.crit_min} - ${damageRange.crit_max}`;

            this._populateAppearances(template, this.#enemy);
            this._populatePerks(template, this.#enemy, enemyStats);
            this._populateResearch(template, this.#enemy);
            this._populateRewards(template, this.#enemy);
            this._populateStats(template, enemyStats);
            this._populateSubtitle(template, this.#enemy);
            this._populateUnitTypes(template, this.#enemy);

            this._showHideMiniFields(template);

            this.appendChild(template);
        });
    }

    _showHideMiniFields(template) {
        const hideInMini = [
            template.querySelector("#enemy-infobox-appearance-heading"),
            template.querySelector("#enemy-infobox-appearance-body"),
            template.querySelector("#enemy-infobox-research-info"),
            template.querySelector("#kill-rewards-heading"),
            template.querySelector("#kill-rewards"),
            template.querySelector("#capture-rewards-heading"),
            template.querySelector("#capture-rewards")
        ];

        const hideInTiny = [
            template.querySelector(".enemy-infobox-subtitle"),
            template.querySelector("#enemy-infobox-damage-range-container"),
            template.querySelector("#enemy-infobox-unit-types"),
            template.querySelector("#enemy-infobox-perks-container"),
            template.querySelector("#enemy-infobox-perks-heading"),
            template.querySelector(".enemy-infobox-stats-container"),
            template.querySelector("#enemy-infobox-stats-heading")
        ]

        for (const elem of hideInMini) {
            if (this.mini || this.tiny) {
                elem.classList.add("hidden-collapse");
            }
            else {
                elem.classList.remove("hidden-collapse");
            }
        }

        for (const elem of hideInTiny) {
            if (this.tiny) {
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
        return this.getAttribute("enemyId");
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
        return this.hasAttribute("leaderRank") ? +rank : null;
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

    get navigatorUpgrades() {
        if (!this.hasAttribute("navigatorUpgrades")) {
            return [];
        }

        return this.getAttribute("navigatorUpgrades").split(",");
    }

    set navigatorUpgrades(navigatorUpgrades) {
        if (!navigatorUpgrades || navigatorUpgrades.length === 0) {
            this.removeAttribute("navigatorUpgrades");
        }
        else {
            this.setAttribute("navigatorUpgrades", navigatorUpgrades.join(","));
        }
    }

    get rankSelect() {
        return this.hasAttribute("rankSelect");
    }

    set rankSelect(rankSelect) {
        if (rankSelect) {
            this.setAttribute("rankSelect", "");
        }
        else {
            this.removeAttribute("rankSelect");
        }
    }

    get tiny() {
        return this.hasAttribute("tiny");
    }

    set tiny(tiny) {
        if (tiny) {
            this.setAttribute("tiny", "");
        }
        else {
            this.removeAttribute("tiny");
        }
    }
}

customElements.define("enemy-infobox", EnemyInfobox);