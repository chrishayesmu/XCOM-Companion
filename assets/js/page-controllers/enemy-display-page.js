import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Settings from "../settings.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";
import * as Utils from "../utils.js";

const difficulty = await Settings.get("enemy.difficulty") || "Impossible";
const research = await Settings.get("enemy.currentResearch") || 0;

class EnemyDisplayPage extends AppPage {

    static pageId = "enemy-display-page";

    static currentResearch = research;
    static difficulty = difficulty;

    #difficultySelector = null;
    #enemyId = null;
    #overviewInfobox = null;
    #overviewSection = null;
    #pageModeSelector = null;
    #pointInTimeInfobox = null;
    #pointInTimeSection = null;

    static async generatePreview(data) {
        if (!data.enemyId) {
            return null;
        }

        const enemy = DataHelper.enemies[data.enemyId];

        if (!enemy) {
            return null;
        }

        // TODO: make a real tooltip; disabled for now
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/enemy-display-page.html", "template-enemy-display-preview");
        template.querySelector(".preview-img-schematic").src = enemy.icon;
        template.querySelector(".preview-title").textContent = enemy.name;
        template.querySelector(".preview-description").textContent = Utils.truncateText(enemy.description, 300);

        return null;
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

        this.#overviewSection = template.querySelector("#enemy-overview");
        this.#pointInTimeSection = template.querySelector("#enemy-point-in-time");

        this.#overviewInfobox = template.querySelector("#enemy-overview-base-infobox");
        this.#overviewInfobox.enemyId = this.#enemyId;
        this.#overviewInfobox.difficulty = this.difficulty;
        this.#overviewInfobox.alienResearch = 0;

        this.#pointInTimeInfobox = template.querySelector("#enemy-pit-infobox");
        this.#pointInTimeInfobox.enemyId = this.#enemyId;
        this.#pointInTimeInfobox.difficulty = this.difficulty;
        this.#pointInTimeInfobox.alienResearch = EnemyDisplayPage.currentResearch;

        this.#difficultySelector = template.querySelector("#enemy-difficulty-toggle-group");
        this.#difficultySelector.selectedOption = EnemyDisplayPage.difficulty;
        this.#difficultySelector.addEventListener("selectedOptionChanged", this._onSelectedDifficultyChanged.bind(this));

        template.querySelector("#enemy-pit-campaign-date-input").addEventListener("change", this._onCampaignDateChanged.bind(this));

        this.#pageModeSelector = template.querySelector("#enemy-page-mode-toggle-group");
        this.#pageModeSelector.addEventListener("selectedOptionChanged", this._onSelectedPageModeChanged.bind(this));

        const currentResearchInput = template.querySelector("#enemy-pit-ar-input");
        currentResearchInput.value = EnemyDisplayPage.currentResearch;
        currentResearchInput.addEventListener("change", this._onCurrentResearchChanged.bind(this));

        const enemyDescription = await Templates.instantiateTemplate("assets/html/templates/pages/enemy-display-page.html", "template-enemy-description-" + enemy.id.replace("_", "-").replace("enemy-", ""));

        if (enemyDescription) {
            template.querySelector("#enemy-description").appendChild(enemyDescription);
        }

        this._populateGrids(template);

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

    _generateUpgradesGrid(template, enemy, upgradeType, isPointInTimeView) {
        const useChanceBasedUpgrades = upgradeType === "navigator";

        const latestDateHeader = document.createElement("span");
        latestDateHeader.textContent = "Latest Date";
        latestDateHeader.setAttribute("data-tooltip-template-file", "assets/html/templates/custom-elements/alien-research.html");
        latestDateHeader.setAttribute("data-tooltip-template-id", "template-ar-tooltip-max-date");

        let allBoxesChecked = true;
        const useCheckboxHeader = upgradeType === "navigator" && isPointInTimeView;
        const checkboxHeader = document.createElement("div");
        Utils.appendElement(checkboxHeader, "div", "Apply");
        const checkbox = Utils.appendElement(checkboxHeader, "input", "", { attributes: { id: "enemy-pit-apply-all", type: "checkbox" }});
        checkbox.addEventListener("change", this._onApplyAllCheckboxChanged.bind(this));

        const radioButtonHeader = document.createElement("div");
        Utils.appendElement(radioButtonHeader, "div", "Apply");
        const deactivateLink = Utils.appendElement(radioButtonHeader, "a", "Clear");
        deactivateLink.addEventListener("click", event => {
            this.#pointInTimeInfobox.leaderRank = null;
            const radioButtons = [...document.querySelectorAll("input[type=radio][name=leaderRank]")];
            radioButtons.forEach(btn => btn.checked = false);
        });

        const columns = [
            {
                key: "checkbox",
                header: checkboxHeader,
                isUsed: useCheckboxHeader
            },
            {
                key: "radioButton",
                header: radioButtonHeader,
                isUsed: upgradeType === "leader" && isPointInTimeView
            },
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

        let upgradePool = upgradeType === "leader" ? enemy.leader_ranks : enemy.research_upgrades;
        upgradePool = upgradePool.filter(upgrade => {
            const isChanceBasedUpgrade = !!upgrade.chance;
            return isChanceBasedUpgrade === useChanceBasedUpgrades;
        });

        // In point-in-time view, filter out upgrades that come later in research
        if (isPointInTimeView) {
            upgradePool = upgradePool.filter(upgrade => {
                const threshold = upgradeType === "general" ? Utils.researchThresholdByDifficulty(upgrade.threshold, this.difficulty) : upgrade.threshold;
                return threshold <= EnemyDisplayPage.currentResearch;
            });
        }

        // Figure out which keys we actually need
        for (const upgrade of upgradePool) {
            for (const column of columns) {
                if (upgrade[column.key]) {
                    column.isUsed = true;
                }
            }
        }

        const usedColumns = columns.filter(c => c.isUsed);

        // Get values for the header row and column sizes
        const headers = [], sizes = [];
        for (const column of usedColumns) {
            headers.push(column.header);
            sizes.push(column.size || "50px");
        }

        // Get the main body of the grid
        let checkboxIndex = 0;
        const values = [];
        for (const upgrade of upgradePool) {
            for (const column of usedColumns) {
                let value = null;

                if (column.key === "checkbox" && upgrade.chance) {
                    value = document.createElement("input");
                    value.type = "checkbox";
                    value.checked = upgrade.chance === 100 || this.#pointInTimeInfobox.navigatorUpgrades.includes(String(checkboxIndex));
                    value.disabled = upgrade.chance === 100;

                    value.addEventListener("change", this._onNavigatorCheckboxChanged.bind(this));

                    allBoxesChecked = allBoxesChecked && value.checked;
                }
                else if (column.key === "latest_date") {
                    const researchAmount = upgradeType === "general" ? Utils.researchThresholdByDifficulty(upgrade.threshold, this.difficulty) : upgrade.threshold;
                    value = researchAmount === 0 ? "Campaign Start" : Utils.formatCampaignDate(Utils.dateByDaysPassed(researchAmount));
                }
                else if (column.key === "notes" && upgrade.notes) {
                    value = document.createElement("span");
                    value.innerHTML = upgrade.notes;
                }
                else if (column.key === "radioButton") {
                    value = document.createElement("input");
                    value.name = "leaderRank";
                    value.type = "radio";
                    value.value = upgrade.level;
                    value.checked = this.#pointInTimeInfobox.leaderRank >= upgrade.level;

                    value.addEventListener("change", this._onLeaderRankRadioButtonChanged.bind(this));
                }
                else if (column.key === "threshold" && upgradeType === "general") {
                    value = Utils.researchThresholdByDifficulty(upgrade.threshold, this.difficulty);
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

            checkboxIndex++;
        }

        checkbox.checked = allBoxesChecked;

        const grid = Utils.createGrid(headers, sizes, values);
        grid.classList.add("enemy-upgrades-container");

        const containerSelector = isPointInTimeView ? `#enemy-pit-${upgradeType}-upgrades-container` : `#enemy-${upgradeType}-upgrades-container`;
        const gridContainer = template.querySelector(containerSelector);
        gridContainer.replaceChildren(grid);
    }

    _onApplyAllCheckboxChanged(_event) {
        const checkboxesNodeList = document.getElementById("enemy-pit-navigator-upgrades-container").querySelectorAll("input[type=checkbox]:not([disabled]):not(#enemy-pit-apply-all)");
        const checkboxes = [...checkboxesNodeList];

        const shouldApplyAll = checkboxes.some(elem => !elem.checked);
        checkboxes.forEach(elem => elem.checked = shouldApplyAll);

        const applyAllCheckbox = document.getElementById("enemy-pit-apply-all");
        applyAllCheckbox.checked = shouldApplyAll;

        // Sync the selected options to the infobox
        const selectedIndices = checkboxes.map( (_elem, index) => index ).filter( boxIndex => checkboxes[boxIndex].checked );
        this.#pointInTimeInfobox.navigatorUpgrades = selectedIndices;
    }

    _onCampaignDateChanged(event) {
        const campaignDate = new Date(event.target.value + "T00:00:00");
        const minResearch = Utils.minResearchByDate(campaignDate);
        document.getElementById("enemy-pit-min-research-by-date").textContent = minResearch;
    }

    _onCurrentResearchChanged(event) {
        // Persist the value and then sync it throughout the page
        const currentResearch = event.target.value;
        Settings.set("enemy.currentResearch", currentResearch);

        EnemyDisplayPage.currentResearch = currentResearch;
        this.#pointInTimeInfobox.alienResearch = EnemyDisplayPage.currentResearch;
        this.#pointInTimeInfobox.leaderRank = null;
        this.#pointInTimeInfobox.navigatorUpgrades = [];

        this._populateGrids(document.body);
    }

    _onLeaderRankRadioButtonChanged(_event) {
        const radioButtons = [...document.querySelectorAll("input[type=radio][name=leaderRank]")];
        const selected = radioButtons.find(btn => btn.checked);

        const leaderRank = selected ? selected.value : null;
        this.#pointInTimeInfobox.leaderRank = leaderRank;
    }

    _onNavigatorCheckboxChanged(_event) {
        const applyAllCheckbox = document.getElementById("enemy-pit-apply-all");

        const checkboxesNodeList = document.getElementById("enemy-pit-navigator-upgrades-container").querySelectorAll("input[type=checkbox]:not([id=enemy-pit-apply-all])");
        const checkboxes = [...checkboxesNodeList];

        const allAreApplied = !checkboxes.some(elem => !elem.checked);
        applyAllCheckbox.checked = allAreApplied;

        // Sync the selected options to the infobox
        const selectedIndices = checkboxes.map( (_elem, index) => index ).filter( boxIndex => checkboxes[boxIndex].checked );
        this.#pointInTimeInfobox.navigatorUpgrades = selectedIndices;
    }

    _onSelectedDifficultyChanged(event) {
        const difficulty = event.detail.selectedOption;
        Settings.set("enemy.difficulty", difficulty);

        EnemyDisplayPage.difficulty = difficulty;

        this.#overviewInfobox.difficulty = this.difficulty;
        this.#pointInTimeInfobox.difficulty = this.difficulty;

        const enemy = DataHelper.enemies[this.#enemyId];

        this._generateUpgradesGrid(document.body, enemy, "general");
        this._generateUpgradesGrid(document.body, enemy, "general", true);

        this._generateUpgradesGrid(document.body, enemy, "navigator");
        this._generateUpgradesGrid(document.body, enemy, "navigator", true);

        if (enemy.leader_ranks) {
            this._generateUpgradesGrid(document.body, enemy, "leader");
            this._generateUpgradesGrid(document.body, enemy, "leader", true);
        }
    }

    _onSelectedPageModeChanged(event) {
        const pageMode = event.detail.selectedOption.toLowerCase();

        if (pageMode === "overview") {
            this.#overviewSection.classList.remove("hidden-collapse");
            this.#pointInTimeSection.classList.add("hidden-collapse");
        }
        else {
            this.#overviewSection.classList.add("hidden-collapse");
            this.#pointInTimeSection.classList.remove("hidden-collapse");
        }
    }

    _populateGrids(container) {
        const enemy = DataHelper.enemies[this.#enemyId];

        // Overview page
        this._generateUpgradesGrid(container, enemy, "general");

        if (enemy.hasNavigationUpgrades) {
            this._generateUpgradesGrid(container, enemy, "navigator");
        }
        else {
            container.querySelector("#enemy-navigator-upgrade-section").classList.add("hidden-collapse");
            container.querySelector("#enemy-navigator-not-available").classList.remove("hidden-collapse");
        }

        if (enemy.leader_ranks) {
            this._generateUpgradesGrid(container, enemy, "leader");
        }
        else {
            container.querySelector("#enemy-leader-upgrade-section").classList.add("hidden-collapse");
            container.querySelector("#enemy-leader-not-available").classList.remove("hidden-collapse");
        }

        // Point-in-time view: need to take current research level into account
        const pointInTimeLeaderRanks = this._leaderRanksAvailable(enemy);
        const pointInTimeResearchUpgrades = this._researchUpgradesAvailable(enemy);
        const pointInTimeNavigatorUpgrades = this._navigatorUpgradesAvailable(enemy);

        if (pointInTimeResearchUpgrades.length > 0) {
            this._generateUpgradesGrid(container, enemy, "general", true);
            container.querySelector("#enemy-pit-general-upgrades-not-available").classList.add("hidden-collapse");
            container.querySelector("#enemy-pit-general-upgrades-info").classList.remove("hidden-collapse");
        }
        else {
            container.querySelector("#enemy-pit-general-upgrades-not-available").classList.remove("hidden-collapse");
            container.querySelector("#enemy-pit-general-upgrades-info").classList.add("hidden-collapse");
        }

        if (pointInTimeNavigatorUpgrades.length > 0) {
            this._generateUpgradesGrid(container, enemy, "navigator", true);
            container.querySelector("#enemy-pit-navigator-upgrades-not-available").classList.add("hidden-collapse");
            container.querySelector("#enemy-pit-navigator-upgrades-info").classList.remove("hidden-collapse");
        }
        else {
            container.querySelector("#enemy-pit-navigator-upgrades-not-available").classList.remove("hidden-collapse");
            container.querySelector("#enemy-pit-navigator-upgrades-info").classList.add("hidden-collapse");
        }

        // Sectoids are the only enemy where there's a reason to show the rank 0 leader
        if (pointInTimeLeaderRanks.length > 1 || enemy.id === "enemy_sectoid") {
            this._generateUpgradesGrid(container, enemy, "leader", true);
            container.querySelector("#enemy-pit-leader-upgrades-not-available").classList.add("hidden-collapse");
            container.querySelector("#enemy-pit-leader-upgrades-info").classList.remove("hidden-collapse");
        }
        else {
            container.querySelector("#enemy-pit-leader-upgrades-not-available").classList.remove("hidden-collapse");
            container.querySelector("#enemy-pit-leader-upgrades-info").classList.add("hidden-collapse");
        }
    }

    _leaderRanksAvailable(enemy) {
        if (!enemy.hasLeaderRanks) {
            return [];
        }

        return enemy.leader_ranks.filter(rank => rank.threshold <= EnemyDisplayPage.currentResearch);
    }

    _navigatorUpgradesAvailable(enemy) {
        return enemy.research_upgrades.filter(upgrade => upgrade.chance && upgrade.threshold <= EnemyDisplayPage.currentResearch);
    }

    _researchUpgradesAvailable(enemy) {
        return enemy.research_upgrades.filter(upgrade => !upgrade.chance && Utils.researchThresholdByDifficulty(upgrade.threshold, this.difficulty) <= EnemyDisplayPage.currentResearch);
    }

    get difficulty() {
        return EnemyDisplayPage.difficulty.toLowerCase();
    }
}

export default EnemyDisplayPage;