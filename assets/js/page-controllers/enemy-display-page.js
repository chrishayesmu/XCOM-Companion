import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";
import * as Utils from "../utils.js";

class EnemyDisplayPage extends AppPage {

    static pageId = "enemy-display-page";

    #difficultySelector = null;
    #enemyId = null;

    constructor() {
        super();
    }

    static async generatePreview(data) {
        if (!data.enemyId) {
            return null;
        }

        this.#enemyId = data.enemyId;
        const enemy = DataHelper.enemies[data.enemyId];

        if (!enemy) {
            return null;
        }

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/enemy-display-page.html", "template-enemy-display-preview");
        template.querySelector(".preview-img-schematic").src = enemy.icon;
        template.querySelector(".preview-title").textContent = enemy.name;
        template.querySelector(".preview-description").textContent = Utils.truncateText(enemy.description, 300);

        return template;
    }

    static ownsDataObject(dataObj) {
        return dataObj.id.startsWith("enemy_");
    }

    async load(data) {
        const enemy = DataHelper.enemies[data.enemyId];

        return this.loadFromDataObject(enemy);
    }

    async loadFromDataObject(enemy) {
        // For future reference, boss monster mechanics: https://www.reddit.com/r/Xcom/comments/30sm2z/lw_alien_leader_mechanics/
        this.#enemyId = enemy.id;

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/enemy-display-page.html", "template-enemy-display-page");
        const baseInfobox = template.querySelector("#enemy-base-infobox");

        baseInfobox.enemyId = this.#enemyId;
        baseInfobox.alienResearch = 0;

        this.#difficultySelector = template.querySelector("#enemy-difficulty-toggle-group");
        this.#difficultySelector.addEventListener("selectedOptionChanged", event => {
            baseInfobox.difficulty = event.detail.selectedOption.toLowerCase();
            this._generateUpgradesGrid(template, enemy, "general");
            this._generateUpgradesGrid(template, enemy, "navigator");

            if (enemy.leader_ranks) {
                this._generateUpgradesGrid(template, enemy, "leader");
            }
        });

        this._generateUpgradesGrid(template, enemy, "general");

        if (enemy.hasNavigationUpgrades) {
            this._generateUpgradesGrid(template, enemy, "navigator");
        }
        else {
            template.querySelector("#enemy-navigator-upgrade-section").classList.add("hidden-collapse");
            template.querySelector("#enemy-navigator-not-available").classList.remove("hidden-collapse");
        }

        if (enemy.leader_ranks) {
            this._generateUpgradesGrid(template, enemy, "leader");
        }
        else {
            template.querySelector("#enemy-leader-upgrade-section").classList.add("hidden-collapse");
            template.querySelector("#enemy-leader-not-available").classList.remove("hidden-collapse");
        }

        const enemyDescription = await Templates.instantiateTemplate("assets/html/templates/pages/enemy-display-page.html", "template-enemy-description-" + enemy.id.replace("_", "-").replace("enemy-", ""));

        if (enemyDescription) {
            template.querySelector("#enemy-description").appendChild(enemyDescription);
        }

        return {
            body: template,
            title: {
                icon: enemy.team === "alien" ? "assets/img/misc-icons/alien.png" : "assets/img/misc-icons/exalt.png",
                text: "Enemy Details - " + enemy.name
            }
        };
    }

    makeHistoryState() {
        return new PageHistoryState(this, { enemyId: this.#enemyId });
    }

    _generateUpgradesGrid(template, enemy, upgradeType) {
        const useChanceBasedUpgrades = upgradeType === "navigator";
        const difficultyFactors = {
            "normal": 0.7,
            "classic": 1,
            "brutal": 1.1,
            "impossible": 1.3
        };

        // Only general upgrades are subject to difficulty-based research threshold adjustments
        const researchFactor = upgradeType === "general" ? difficultyFactors[this.#difficultySelector.selectedOption.toLowerCase()] : 1;

        const latestDateHeader = document.createElement("span");
        latestDateHeader.textContent = "Latest Date";
        latestDateHeader.setAttribute("data-tooltip-template-file", "assets/html/templates/custom-elements/alien-research.html");
        latestDateHeader.setAttribute("data-tooltip-template-id", "template-ar-tooltip-max-date");

        const columns = [
            {
                key: "threshold",
                header: "Research",
                size: "85px",
                isUsed: true
            },
            {
                key: "latest_date", // not a real key; forced in later
                header: latestDateHeader,
                size: "150px",
                isUsed: true
            },
            {
                key: "level",
                header: "Leader Rank",
                size: "120px"
            },
            {
                key: "chance",
                header: "Chance",
                size: "70px"
            },
            {
                key: "damage",
                header: Utils.createImg("assets/img/item-stat-icons/damage.png", { "data-tooltip-text": "Base Damage" })
            },
            {
                key: "hp",
                header: Utils.createImg("assets/img/item-stat-icons/hp.png", { "data-tooltip-text": "HP" })
            },
            {
                key: "shield_hp",
                header: Utils.createImg("assets/img/item-stat-icons/shield_hp.png", { "data-tooltip-text": "Shield HP<br/><br/>This is the HP of the shield this unit gains when targeted by Mind Merge." })
            },
            {
                key: "hp_regen",
                header: Utils.createImg("assets/img/item-stat-icons/healing.png", { "data-tooltip-text": "HP Regen Per Turn<br/><br/>This regen will only be applied if this unit has the Adaptive Bone Marrow perk. The +2 regen from that perk <strong>is</strong> included in this number." })
            },
            {
                key: "mobility",
                header: Utils.createImg("assets/img/item-stat-icons/mobility.png", { "data-tooltip-text": "Mobility<br /><br />If the unit is gaining the Sprinter perk, that +4 mobility <strong>is</strong> reflected in this column." })
            },
            {
                key: "defense",
                header: Utils.createImg("assets/img/item-stat-icons/defense.png", { "data-tooltip-text": "Defense" })
            },
            {
                key: "damage_reduction",
                header: Utils.createImg("assets/img/item-stat-icons/damage_reduction.png", { "data-tooltip-text": "Damage Reduction" })
            },
            {
                key: "aim",
                header: Utils.createImg("assets/img/item-stat-icons/aim.png", { "data-tooltip-text": "Aim" })
            },
            {
                key: "crit_chance",
                header: Utils.createImg("assets/img/item-stat-icons/crit_chance.png", { "data-tooltip-text": "Crit Chance<br /><br />If the unit is gaining the Sharpshooter perk, its +10 crit chance <strong>is</strong> reflected in this column." })
            },
            {
                key: "will",
                header: Utils.createImg("assets/img/item-stat-icons/will.png", { "data-tooltip-text": "Will" })
            },
            {
                key: "perk",
                header: "Perk",
                size: "minmax(120px, max-content)"
            },
            {
                key: "perks",
                header: "Perks",
                size: "minmax(120px, max-content)"
            },
            {
                key: "name",
                header: "Unit Name",
                size: "175px"
            },
            {
                key: "notes",
                header: "Notes",
                size: "minmax(auto, max-content)"
            }
        ];

        const upgradePool = upgradeType === "leader" ? enemy.leader_ranks : enemy.research_upgrades;

        // Figure out which keys we actually need
        for (const upgrade of upgradePool) {
            const isChanceBasedUpgrade = !!upgrade.chance;
            if (isChanceBasedUpgrade !== useChanceBasedUpgrades) {
                continue;
            }

            for (const column of columns) {
                if (upgrade[column.key]) {
                    column.isUsed = true;
                }
            }
        }

        // Get values for the header row and column sizes
        const headers = [], sizes = [];
        for (const column of columns) {
            if (!column.isUsed) {
                continue;
            }

            headers.push(column.header);
            sizes.push(column.size || "50px");
        }

        // Get the main body of the grid
        const values = [];
        for (const upgrade of upgradePool) {
            const isChanceBasedUpgrade = !!upgrade.chance;
            if (isChanceBasedUpgrade !== useChanceBasedUpgrades) {
                continue;
            }

            for (const column of columns) {
                if (!column.isUsed) {
                    continue;
                }

                let value = null;
                if (column.key === "latest_date") {
                    const researchAmount = Math.ceil(upgrade.threshold / researchFactor);
                    value = researchAmount === 0 ? "Campaign Start" : Utils.formatCampaignDate(Utils.dateByDaysPassed(researchAmount));
                }
                else if (column.key === "notes" && upgrade.notes) {
                    value = document.createElement("span");
                    value.innerHTML = upgrade.notes;
                }
                else if (column.key === "threshold") {
                    value = Math.ceil(upgrade.threshold / researchFactor);
                }
                else if (column.key === "perk") {
                    const perk = upgrade[column.key];

                    if (perk) {
                        value = Widgets.createInAppLink(perk);
                    }
                }
                else if (column.key === "perks") {
                    const perks = upgrade[column.key];

                    if (perks) {
                        const links = perks.map(perk => Widgets.createInAppLink(perk));
                        value = document.createElement("div");

                        links.forEach(link => { value.appendChild(link); value.append(document.createElement("br")); });
                    }
                }
                else {
                    value = upgrade[column.key];

                    if (column.key === "chance") {
                        value += "%";
                    }
                }

                if (Number.isFinite(value) && value > 0 && column.key !== "level" && column.key !== "threshold") {
                    value = "+" + value;
                }

                if (value === null || value === undefined || value === "") {
                    value = "-";
                }

                values.push(value);
            }
        }

        const grid = Utils.createGrid(headers, sizes, values);
        grid.classList.add("enemy-upgrades-container");

        const gridContainer = template.querySelector(`#enemy-${upgradeType}-upgrades-container`);
        gridContainer.replaceChildren(grid);
    }
}

export default EnemyDisplayPage;