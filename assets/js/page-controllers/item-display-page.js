import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Modal from "../modal.js";
import * as Settings from "../settings.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";
import * as Widgets from "../widgets.js";

class ItemDisplayPage extends AppPage {

    static pageId = "item-display-page";

    #itemId = null;

    #configurationByItemType = {
        aircraft: {
            friendlyName: "Aircraft",
            showTacticalText: true
        },
        aircraft_module: {
            friendlyName: "Interceptor Module",
            showTacticalText: true
        },
        aircraft_weapon: {
            friendlyName: "Interceptor Weapon",
            showTacticalText: true
        },
        alien_device: {
            friendlyName: "Alien Device",
            showTacticalText: true
        },
        alien_weapon: {
            friendlyName: "Recovered Alien Weapon"
        },
        captive: {
            friendlyName: "Captured Alien"
        },
        corpse: {
            friendlyName: "Alien Corpse"
        },
        loadout_armor: {
            friendlyName: "Loadout: Armor",
            showTacticalText: true
        },
        loadout_equipment: {
            friendlyName: "Loadout: Equipment",
            showTacticalText: true
        },
        loadout_mec_exoskeleton: {
            friendlyName: "Loadout: MEC Exoskeleton",
            showTacticalText: true
        },
        loadout_primary: {
            friendlyName: "Loadout: Primary Weapon",
            showTacticalText: true
        },
        loadout_secondary: {
            friendlyName: "Loadout: Secondary Weapon",
            showTacticalText: true
        },
        material: {
            friendlyName: "Building Material"
        },
        other: {
            friendlyName: "",
            showTacticalText: true
        },
        shiv: {
            friendlyName: "SHIV Chassis",
            showTacticalText: true
        },
        story: {
            friendlyName: "Story Item",
            showTacticalText: true
        }
    };

    /**
     * Generates a miniature version of the item detail page that can be shown in a modal.
     */
    static async generateMiniPage(item) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-display-page-mini");

        template.querySelector(".column-heading").textContent = item.name;
        const tacticalTextContainer = template.querySelector("#item-details-tactical-text");


        if (item.tactical_text) {
            tacticalTextContainer.innerHTML = item.tactical_text;
        }

        this._addSpecialBulletPoints(item, tacticalTextContainer);

        const statsGrid = await this._createApplicableStatsGridIfAny(item);
        if (statsGrid) {
            tacticalTextContainer.appendChild(statsGrid);
        }

        return template;
    }

    static async generatePreview(data) {
        if (!data.itemId) {
            return null;
        }

        const item = DataHelper.items[data.itemId];

        if (!item) {
            return null;
        }

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-preview");
        template.querySelector(".preview-img-schematic").src = item.icon;
        template.querySelector(".preview-title").textContent = item.name;
        template.querySelector(".preview-description").innerHTML = item.description;

        const statsGrid = await this._createApplicableStatsGridIfAny(item);

        if (statsGrid) {
            template.querySelector("#item-preview-stats-table").appendChild(statsGrid);
        }

        return template;
    }

    static ownsDataObject(dataObj) {
        return dataObj.id.startsWith("item_");
    }

    async load(data) {
        if (!data.itemId) {
            return null;
        }

        const item = DataHelper.items[data.itemId];

        return this.loadFromDataObject(item);
    }

    async loadFromDataObject(item) {
        this.#itemId = item.id;
        const itemTypeConfig = this.#configurationByItemType[item.type];

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-display-page");

        template.querySelector(".details-header-title").textContent = item.name;
        template.querySelector(".details-header-description").innerHTML = item.description;
        template.querySelector("#item-details-type").textContent = itemTypeConfig.friendlyName;
        template.querySelector(".details-header-img-container img").src = item.icon;
        template.querySelector("#change-engineering-settings").addEventListener("click", this._onChangeNumEngineersClicked.bind(this));
        template.querySelector("#change-engineering-settings-2").addEventListener("click", this._onChangeNumEngineersClicked.bind(this));

        if (item.sell_value) {
            template.querySelector("#item-details-sell-value").innerHTML += item.sell_value;
        }
        else {
            template.querySelector("#item-details-sell-value").classList.add("hidden-collapse");
        }

        // Normal/quick build sections
        if (!item.normal_build) {
            template.querySelector("#item-details-build").classList.add("hidden-collapse");
        }
        else {
            this._populateBuildSection(item.normal_build, item.base_engineers, template.querySelector("#item-details-normal-build-cost-container"), false);
            this._populateBuildSection(item.quick_build, item.base_engineers, template.querySelector("#item-details-quick-build-cost-container"), true);
            this._populateEngineeringSettingsDisplay(template);
        }

        if (itemTypeConfig.showTacticalText) {
            template.querySelector("#item-details-tactical-text").innerHTML = item.tactical_text || "";
        }
        else {
            template.querySelector("#item-details-tactical-text-container").classList.add("hidden-collapse");
        }

        this._populatePrerequisites(item, template);

        if (item.usedIn) {
            this._populateUsedInSection(item, template);
        }
        else {
            template.querySelector("#item-details-used-in-container").classList.add("hidden-collapse");
            template.querySelector("#item-details-prerequisites-container").classList.add("flex-grow");
        }

        const tacticalTextContainer = template.querySelector("#item-details-tactical-text");
        ItemDisplayPage._addSpecialBulletPoints(item, tacticalTextContainer);

        const statsGrid = await ItemDisplayPage._createApplicableStatsGridIfAny(item);

        if (statsGrid) {
            tacticalTextContainer.appendChild(statsGrid);
        }

        if (item.id === "item_arc_thrower") {
            tacticalTextContainer.appendChild(await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-arc-thrower-stats-grid"));
        }

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/engineering.png",
                text: "Item Details"
            }
        };
    }

    makeHistoryState() {
        return new PageHistoryState(this, { itemId: this.#itemId });
    }

    static _addSpecialBulletPoints(item, tacticalTextContainer) {
        const typeData = item.type_specific_data;

        if (!typeData) {
            return;
        }

        let bulletPointContainer = tacticalTextContainer.querySelector("ul");

        if (!bulletPointContainer) {
            bulletPointContainer = document.createElement("ul");
            tacticalTextContainer.appendChild(bulletPointContainer);
        }

        const addBulletPoint = function(text) {
            const listItem = document.createElement("li");
            listItem.innerHTML = text;
            bulletPointContainer.appendChild(listItem);
        };

        if (item.type === "loadout_mec_exoskeleton" && typeData.grants_perks) {
            const link = Widgets.createInAppLink(typeData.grants_perks[0]);
            addBulletPoint("This exoskeleton grants the " + link.outerHTML + " perk");
        }

        if (typeData.has_grapple) {
            addBulletPoint("Includes a grapple to hoist soldiers to higher terrain");
        }

        if (typeData.negates_fire) {
            addBulletPoint(item.type === "shiv" ? "Immune to environmental fire damage" : "Provides immunity to environmental fire damage");
        }

        if (typeData.negates_acid) {
            addBulletPoint(item.type === "shiv" ? "Does not suffer mobility penalty or damage from acid" : "Prevents mobility penalty and damage from acid");
        }

        if (typeData.prevents_strangulation) {
            addBulletPoint(item.type === "shiv" ? "Cannot be strangled by Seekers" : "Prevents strangulation by Seekers");
        }

        if (typeData.requires_psionic) {
            addBulletPoint("Only usable by soldiers with Psionic abilities");
        }

        if (typeData.can_steady) {
            addBulletPoint("Can be steadied for additional accuracy on the following shot");
        }

        if (typeData.category === "shotgun") {
            addBulletPoint("Shotguns gain double the aim bonus from being close to the target");
            addBulletPoint("Enemy damage reduction is 50% more effective vs shotguns");
        }

        if (typeData.exclusive_with) {
            const itemLinks = typeData.exclusive_with.map(otherItem => Widgets.createInAppLink(otherItem).outerHTML);
            const otherItems = Utils.join(itemLinks, "or");
            addBulletPoint("Does not stack with " + otherItems);
        }

        if (typeData.class_restriction) {
            const classLinks = typeData.class_restriction.map(c => Widgets.createInAppLink(c).outerHTML);

            addBulletPoint("Usable by " + Utils.join(classLinks));
        }

        // Add text for if MECs and SHIVs can use
        const usableBySoldier = typeData.usable_by_infantry;
        const usableByMec = typeData.category == "mec" || typeData.usable_by_mec;
        const usableByShiv = typeData.category == "shiv" || typeData.usable_by_shiv;
        const useCategories = [];

        if (usableBySoldier && !typeData.class_restriction) {
            useCategories.push("regular (non-MEC) soldiers");
        }

        if (usableByMec) {
            useCategories.push("MEC Troopers");
        }

        if (usableByShiv) {
            useCategories.push("SHIVs");
        }

        if (useCategories.length > 0) {
            const text = "Usable by " + Utils.join(useCategories);
            addBulletPoint(text);
        }
    }

    static async _createApplicableStatsGridIfAny(item) {
        if (item.type === "loadout_secondary" && item.type_specific_data.category === "mec") {
            return this._createMecSecondaryStatsGrid(item);
        }

        if (item.type === "loadout_primary" || item.type === "loadout_secondary") {
            return this._createWeaponStatsGrid(item);
        }

        if (item.type === "loadout_armor" || item.type === "loadout_mec_exoskeleton") {
            return this._createArmorStatsGrid(item);
        }

        if (item.type === "loadout_equipment") {
            return this._createEquipmentStatsGrid(item);
        }

        if (item.type === "aircraft") {
            return this._createInterceptorStatsGrid(item);
        }

        if (item.type === "aircraft_weapon") {
            return this._createInterceptorWeaponStatsGrid(item);
        }

        if (item.type === "shiv") {
            return this._createShivStatsGrid(item);
        }

        return null;
    }

    static async _createArmorStatsGrid(item) {
        const armorData = item.type_specific_data;
        const gridTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-armor-stats-grid");

        gridTemplate.querySelector("#armor-stats-damage-reduction").textContent = armorData.damage_reduction || 0;
        gridTemplate.querySelector("#armor-stats-defense").textContent = armorData.defense || 0;
        gridTemplate.querySelector("#armor-stats-hp").textContent = armorData.hp || 0;
        gridTemplate.querySelector("#armor-stats-hp-extra-con").textContent = armorData.extra_conditioning_bonus_hp || 0;
        gridTemplate.querySelector("#armor-stats-mobility").textContent = armorData.mobility || 0;
        gridTemplate.querySelector("#armor-stats-will").textContent = armorData.will || 0;
        gridTemplate.querySelector("#armor-stats-secondary-weapons").textContent = armorData.num_secondary_weapons || 0;
        gridTemplate.querySelector("#armor-stats-equipment-slots").textContent = armorData.num_equipment_slots || 0;

        if (!armorData.num_equipment_slots || !armorData.num_secondary_weapons) {
            gridTemplate.querySelector("#armor-stats-secondary-weapons-header").classList.add("hidden-collapse");
            gridTemplate.querySelector("#armor-stats-secondary-weapons").classList.add("hidden-collapse");
            gridTemplate.querySelector("#armor-stats-equipment-slots-header").classList.add("hidden-collapse");
            gridTemplate.querySelector("#armor-stats-equipment-slots").classList.add("hidden-collapse");
        }

        return gridTemplate;
    }

    static async _createEquipmentStatsGrid(item) {
        const equipmentData = item.type_specific_data;
        const gridTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-equipment-stats-grid");

        const stats = [ "hp", "damage-reduction", "dr-penetration", "aim", "crit-chance", "mobility", "defense", "will", "range", "effect-radius" ];

        for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            const dataKey = stat.replace("-", "_");

            // Mobility should always be shown, since it's pretty much universal; it'll be confusing if it's missing for a few items
            if (equipmentData[dataKey] || stat == "mobility") {
                gridTemplate.querySelector("#" + stat).textContent = equipmentData[dataKey] || 0;
            }
            else {
                this._hideGridStat(gridTemplate, stat);
            }
        }

        // Damage/crit damage are handled separately since they don't display the same way
        if (equipmentData.damage_min_normal && equipmentData.damage_max_normal) {
            gridTemplate.querySelector("#damage").textContent = equipmentData.damage_min_normal + " - " + equipmentData.damage_max_normal;
        }
        else {
            this._hideGridStat(gridTemplate, "damage");
        }

        if (equipmentData.damage_min_crit && equipmentData.damage_max_crit) {
            gridTemplate.querySelector("#crit-damage").textContent = equipmentData.damage_min_crit + " - " + equipmentData.damage_max_crit;
        }
        else {
            this._hideGridStat(gridTemplate, "crit-damage");
        }

        return gridTemplate;
    }

    static async _createInterceptorStatsGrid(item) {
        const interceptorData = item.type_specific_data;
        const gridTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-interceptor-stats-grid");

        gridTemplate.querySelector("#interceptor-stats-armor").textContent = interceptorData.armor;
        gridTemplate.querySelector("#interceptor-stats-hp").textContent = interceptorData.hp;
        gridTemplate.querySelector("#interceptor-stats-penetration").textContent = interceptorData.penetration;
        gridTemplate.querySelector("#interceptor-stats-speed").textContent = interceptorData.speed;

        return gridTemplate;
    }

    static async _createInterceptorWeaponStatsGrid(item) {
        const weaponData = item.type_specific_data;
        const gridTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-interceptor-weapon-stats-grid");

        gridTemplate.querySelector("#interceptor-weapon-stats-damage").textContent = weaponData.damage_per_hit;
        gridTemplate.querySelector("#interceptor-weapon-stats-time-between-shots").textContent = weaponData.seconds_between_attacks;
        gridTemplate.querySelector("#interceptor-weapon-stats-hit-chance-defensive").textContent = weaponData.hit_chance_defensive;
        gridTemplate.querySelector("#interceptor-weapon-stats-hit-chance-balanced").textContent = weaponData.hit_chance_balanced;
        gridTemplate.querySelector("#interceptor-weapon-stats-hit-chance-aggressive").textContent = weaponData.hit_chance_aggressive;
        gridTemplate.querySelector("#interceptor-weapon-stats-penetration").textContent = weaponData.penetration;

        return gridTemplate;
    }

    static async _createMecSecondaryStatsGrid(item) {
        const data = item.type_specific_data;
        const gridTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-mec-secondary-stats-grid");

        gridTemplate.querySelector("#mec-secondary-stats-mobility").textContent = data.mobility;
        gridTemplate.querySelector("#mec-secondary-stats-healing").textContent = data.healing;
        gridTemplate.querySelector("#mec-secondary-stats-damage").textContent = data.damage_min_normal + " - " + data.damage_max_normal;
        gridTemplate.querySelector("#mec-secondary-stats-crit-damage").textContent = data.damage_min_crit + " - " + data.damage_max_crit;
        gridTemplate.querySelector("#mec-secondary-stats-range").textContent = data.range;
        gridTemplate.querySelector("#mec-secondary-stats-effect-radius").textContent = data.effect_radius;
        gridTemplate.querySelector("#mec-secondary-stats-num-charges").textContent = data.num_charges || "∞";

        if (!data.healing) {
            gridTemplate.querySelector("#mec-secondary-stats-healing").classList.add("hidden-collapse");
            gridTemplate.querySelector("#mec-secondary-stats-healing-header").classList.add("hidden-collapse");
        }

        if (!data.damage_min_normal || !data.damage_max_normal) {
            gridTemplate.querySelector("#mec-secondary-stats-damage").classList.add("hidden-collapse");
            gridTemplate.querySelector("#mec-secondary-stats-damage-header").classList.add("hidden-collapse");
        }

        if (!data.damage_min_crit || !data.damage_max_crit) {
            gridTemplate.querySelector("#mec-secondary-stats-crit-damage").classList.add("hidden-collapse");
            gridTemplate.querySelector("#mec-secondary-stats-crit-damage-header").classList.add("hidden-collapse");
        }

        if (!data.range) {
            gridTemplate.querySelector("#mec-secondary-stats-range").classList.add("hidden-collapse");
            gridTemplate.querySelector("#mec-secondary-stats-range-header").classList.add("hidden-collapse");
        }

        if (!data.effect_radius) {
            gridTemplate.querySelector("#mec-secondary-stats-effect-radius").classList.add("hidden-collapse");
            gridTemplate.querySelector("#mec-secondary-stats-effect-radius-header").classList.add("hidden-collapse");
        }

        return gridTemplate;
    }

    static async _createShivStatsGrid(item) {
        const shivData = item.type_specific_data;
        const gridTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-shiv-stats-grid");

        gridTemplate.querySelector("#shiv-stats-mobility").textContent = shivData.mobility;
        gridTemplate.querySelector("#shiv-stats-hp").textContent = shivData.hp_base + " + " + shivData.hp_armor;
        gridTemplate.querySelector("#shiv-stats-aim").textContent = shivData.aim;
        gridTemplate.querySelector("#shiv-stats-damage-reduction").textContent = shivData.damage_reduction;
        gridTemplate.querySelector("#shiv-stats-defense").textContent = shivData.defense;
        gridTemplate.querySelector("#shiv-stats-equipment-slots").textContent = 3;

        return gridTemplate;
    }

    static async _createWeaponStatsGrid(item) {
        const weaponData = item.type_specific_data;
        const gridTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-weapon-stats-grid");

        gridTemplate.querySelector("#weapon-stats-damage").textContent = weaponData.damage_min_normal + " - " + weaponData.damage_max_normal;
        gridTemplate.querySelector("#weapon-stats-crit-damage").textContent = weaponData.damage_min_crit + " - " + weaponData.damage_max_crit;
        gridTemplate.querySelector("#weapon-stats-aim").textContent = weaponData.aim || 0;
        gridTemplate.querySelector("#weapon-stats-crit-chance").textContent = weaponData.crit_chance || 0;
        gridTemplate.querySelector("#weapon-stats-mobility").textContent = weaponData.mobility || 0;
        gridTemplate.querySelector("#weapon-stats-dr-penetration").textContent = weaponData.dr_penetration || 0;
        gridTemplate.querySelector("#weapon-stats-defense").textContent = weaponData.defense || 0;
        gridTemplate.querySelector("#weapon-stats-ammo").textContent = weaponData.base_ammo;
        gridTemplate.querySelector("#weapon-stats-range").textContent = weaponData.range_normal;
        gridTemplate.querySelector("#weapon-stats-range-overwatch").textContent = weaponData.range_overwatch;
        gridTemplate.querySelector("#weapon-stats-range-squadsight").textContent = weaponData.squadsight_range_normal;
        gridTemplate.querySelector("#weapon-stats-range-squadsight-overwatch").textContent = weaponData.squadsight_range_overwatch;
        gridTemplate.querySelector("#weapon-stats-effect-radius").textContent = weaponData.effect_radius;

        if (!weaponData.damage_min_crit || !weaponData.damage_max_crit) {
            gridTemplate.querySelector("#weapon-stats-crit-damage").classList.add("hidden-collapse");
            gridTemplate.querySelector("#weapon-stats-crit-damage-header").classList.add("hidden-collapse");
            gridTemplate.querySelector("#weapon-stats-crit-chance").classList.add("hidden-collapse");
            gridTemplate.querySelector("#weapon-stats-crit-chance-header").classList.add("hidden-collapse");
        }

        if (!weaponData.dr_penetration) {
            gridTemplate.querySelector("#weapon-stats-dr-penetration").classList.add("hidden-collapse");
            gridTemplate.querySelector("#weapon-stats-dr-penetration-header").classList.add("hidden-collapse");
        }

        if (!weaponData.range_overwatch) {
            gridTemplate.querySelector("#weapon-stats-range-overwatch").classList.add("hidden-collapse");
            gridTemplate.querySelector("#weapon-stats-range-overwatch-header").classList.add("hidden-collapse");
        }

        if (!weaponData.squadsight_range_normal || !weaponData.squadsight_range_overwatch) {
            gridTemplate.querySelector("#weapon-stats-range-squadsight").classList.add("hidden-collapse");
            gridTemplate.querySelector("#weapon-stats-range-squadsight-header").classList.add("hidden-collapse");
            gridTemplate.querySelector("#weapon-stats-range-squadsight-overwatch").classList.add("hidden-collapse");
            gridTemplate.querySelector("#weapon-stats-range-squadsight-overwatch-header").classList.add("hidden-collapse");
        }

        if (!weaponData.effect_radius) {
            gridTemplate.querySelector("#weapon-stats-effect-radius").classList.add("hidden-collapse");
            gridTemplate.querySelector("#weapon-stats-effect-radius-header").classList.add("hidden-collapse");
        }

        return gridTemplate;
    }

    static _hideGridStat(grid, stat) {
        grid.querySelector(`#${stat}`).classList.add("hidden-collapse");
        grid.querySelector(`#${stat}-header`).classList.add("hidden-collapse");
    }

    async _getCurrentEngineeringSettings() {
        const engineeringSettings = await Settings.get("engineering");

        if (engineeringSettings) {
            engineeringSettings.numEngineers = engineeringSettings.numEngineers || 10;
            engineeringSettings.numWorkshops = engineeringSettings.numWorkshops || 0;
            engineeringSettings.numAdjacencies = engineeringSettings.numAdjacencies || 0;
            engineeringSettings.personalizeData = engineeringSettings.personalizeData || false;

            return engineeringSettings;
        }

        return {
            numEngineers: 10,
            numWorkshops: 0,
            numAdjacencies: 0,
            personalizeData: false
        };
    }

    async _onChangeNumEngineersClicked() {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-enter-engineering-settings-modal");
        const currentEngineeringSettings = await this._getCurrentEngineeringSettings();

        const personalizeData = template.querySelector("#personalize-data")
        const numEngineers = template.querySelector("#num-engineers")
        const numWorkshops = template.querySelector("#num-workshops")
        const numAdjacencies = template.querySelector("#num-adjacencies")

        personalizeData.checked = currentEngineeringSettings.personalizeData;
        numEngineers.value = currentEngineeringSettings.numEngineers;
        numWorkshops.value = currentEngineeringSettings.numWorkshops;
        numAdjacencies.value = currentEngineeringSettings.numAdjacencies;

        if (!currentEngineeringSettings.personalizeData) {
            numEngineers.setAttribute("disabled", "");
            numWorkshops.setAttribute("disabled", "");
            numAdjacencies.setAttribute("disabled", "");
        }

        personalizeData.addEventListener("change", event => {
            if (event.target.checked) {
                numEngineers.removeAttribute("disabled");
                numWorkshops.removeAttribute("disabled");
                numAdjacencies.removeAttribute("disabled");
            }
            else {
                numEngineers.setAttribute("disabled", "");
                numWorkshops.setAttribute("disabled", "");
                numAdjacencies.setAttribute("disabled", "");
            }
        });

        template.querySelector("#save-changes").addEventListener("click", () => { this._onSaveNumEngineers(template); });
        template.querySelector("#cancel").addEventListener("click", Modal.close);

        Modal.open(template, null, false);
    }

    async _onSaveNumEngineers(domContainer) {
        const newNumEngineers = domContainer.querySelector("#num-engineers").value;
        const newNumWorkshops = domContainer.querySelector("#num-workshops").value;
        const newNumAdjacencies = domContainer.querySelector("#num-adjacencies").value;
        const newPersonalizeData = domContainer.querySelector("#personalize-data").checked;

        if (newNumEngineers <= 10) {
            // TODO flag invalid or something
            return;
        }

        const newSettings = {
            numEngineers: newNumEngineers,
            numWorkshops: newNumWorkshops,
            numAdjacencies: newNumAdjacencies,
            personalizeData: newPersonalizeData
        };

        await Settings.set("engineering", newSettings);

        // Update UI with new number of engineers and build time
        const item = DataHelper.items[this.#itemId];
        const normalBuildContainer = document.getElementById("item-details-normal-build-cost-container");
        normalBuildContainer.innerHTML = "";
        this._populateBuildSection(item.normal_build, item.base_engineers, normalBuildContainer, false);

        const quickBuildContainer = document.getElementById("item-details-quick-build-cost-container");
        quickBuildContainer.innerHTML = "";
        this._populateBuildSection(item.quick_build, item.base_engineers, quickBuildContainer, true);

        this._populateEngineeringSettingsDisplay(document);

        Modal.close();
    }

    async _populateBuildSection(buildData, numEngineersNeeded, containerElement, isQuickBuild) {
        if (!buildData) {
            if (isQuickBuild) {
                Utils.appendElement(containerElement, "div", "This item cannot be built quickly.");
            }
            else {
                console.error("No build data is present on a normal build. Item " + this.#itemId + "is misconfigured.");
            }

            return;
        }

        // Rebate is always based on the normal build cost
        const currentEngineeringSettings = await this._getCurrentEngineeringSettings();
        const normalBuildCost = DataHelper.items[this.#itemId].normal_build.cost;
        const rebate = Utils.calculateRebate(currentEngineeringSettings.numWorkshops, currentEngineeringSettings.numAdjacencies, normalBuildCost.money, normalBuildCost.item_alien_alloy, normalBuildCost.item_elerium);

        const addCostRow = function(label, content) {
            const div = document.createElement("div");
            div.classList.add("item-details-cost-type");

            Utils.appendElement(div, "span", label, { classes: [ "item-details-cost-quantity" ] });

            if (typeof(content) === "string") {
                Utils.appendElement(div, "span", content);
            }
            else {
                div.appendChild(content);
            }

            containerElement.appendChild(div);
            return div;
        };

        let buildTimeHours = buildData.base_build_time_days * 24;
        let moneyCost = buildData.cost.money;

        if (currentEngineeringSettings.personalizeData) {
            buildTimeHours = Utils.calculateTimeToBuild(DataHelper.items[this.#itemId], currentEngineeringSettings.numEngineers, isQuickBuild);

            // Apply discount from workshops/adjacencies
            moneyCost = normalBuildCost.money - rebate.money;

            // For quick builds we need to recreate the cost formula the same way it's done in-game,
            // or we'll sometimes be off by a dollar due to rounding issues
            // TODO: get rid of quick build data in the input data at all and just calculate it on the fly.
            //       See XGFacility_Engineering#GetItemProjectCost(L2304) for calculations
            // TODO: quick build meld cost is based on cash cost AFTER discount, so having a fixed cost in the JSON is wrong
            //      See XGFacility_Engineering L2320
            if (isQuickBuild) {
                moneyCost = Math.floor(1.5 * moneyCost);
            }
        }

        const buildTimeDays = Math.floor(buildTimeHours / 24);
        buildTimeHours = buildTimeHours % 24;

        let buildTimeString = buildTimeDays !== 1 ? `${buildTimeDays} days` : "1 day";

        if (buildTimeHours !== 0) {
            buildTimeString += buildTimeHours > 1 ? `, ${buildTimeHours} hours` : ", 1 hour";
        }

        addCostRow("Time:", buildTimeString);

        // Handle money first since it's displayed uniquely
        if (moneyCost) {
            addCostRow("Cost:", "<font color='var(--color-green)'>§" + moneyCost + "</font>");
        }

        for (const requiredItemId in buildData.cost) {
            if (requiredItemId === "money") {
                continue;
            }

            const requiredItem = DataHelper.items[requiredItemId];
            const link = Widgets.createInAppLink(requiredItem);

            addCostRow(buildData.cost[requiredItemId] + "x", link);
        }

        // Add the number of engineers, and help text, at the very end
        if (numEngineersNeeded) {
            const helpIcon = Widgets.createHelpIcon("The item's build time is based around having this many engineers. It will go quicker if you have more, and much slower if you have less.");
            const engineerContainer = addCostRow(numEngineersNeeded, "Engineers");
            engineerContainer.appendChild(helpIcon);
        }
    }

    async _populateEngineeringSettingsDisplay(container) {
        const currentEngineeringSettings = await this._getCurrentEngineeringSettings();

        if (!currentEngineeringSettings.personalizeData) {
            container.querySelector("#rebate-block-generic").classList.remove("hidden-collapse");
            container.querySelector("#rebate-block-personalized").classList.add("hidden-collapse");
        }
        else {
            container.querySelector("#rebate-block-generic").classList.add("hidden-collapse");
            container.querySelector("#rebate-block-personalized").classList.remove("hidden-collapse");

            container.querySelector("#build-time-num-engineers").textContent = currentEngineeringSettings.numEngineers;
            container.querySelector("#build-time-num-workshops").textContent = currentEngineeringSettings.numWorkshops;
            container.querySelector("#build-time-num-adjacencies").textContent = currentEngineeringSettings.numAdjacencies;

            const buildCost = DataHelper.items[this.#itemId].normal_build.cost;
            const alloyCost = buildCost.item_alien_alloy || 0;
            const eleriumCost = buildCost.item_elerium || 0;
            const rebate = Utils.calculateRebate(currentEngineeringSettings.numWorkshops, currentEngineeringSettings.numAdjacencies, /* moneyCost; unimportant here */ 0, alloyCost, eleriumCost);

            if (rebate.alloys === 0 && rebate.elerium === 0) {
                container.querySelector("#item-details-rebate-block").textContent = "";
            }
            else {
                const parts = [];

                if (rebate.alloys > 0) {
                    parts.push(rebate.alloys + (rebate.alloys === 1 ? " Alien Alloy" : " Alien Alloys"));
                }

                if (rebate.elerium > 0) {
                    parts.push(rebate.elerium + " elerium");
                }

                container.querySelector("#item-details-rebate-block").textContent = `You will receive a rebate of ${Utils.join(parts)}.`;
            }
        }
    }

    _populatePrerequisites(item, template) {
        if (!item.foundry_prerequisites && !item.research_prerequisites) {
            template.querySelector("#item-details-prerequisites-container").classList.add("hidden-collapse");
            return;
        }

        const container = template.querySelector("#item-details-prerequisites");

        if (item.foundry_prerequisites) {
            for (let i = 0; i < item.foundry_prerequisites.length; i++) {
                const prereq = item.foundry_prerequisites[i];
                const div = document.createElement("div");
                div.appendChild(Widgets.createInAppLink(prereq, { addPrefix: true }));

                container.append(div);
            }
        }

        if (item.research_prerequisites) {
            for (let i = 0; i < item.research_prerequisites.length; i++) {
                const prereq = item.research_prerequisites[i];
                const div = document.createElement("div");
                div.appendChild(Widgets.createInAppLink(prereq, { addPrefix: true }));

                container.append(div);
            }
        }
    }

    _populateUsedInSection(item, template) {
        const section = template.querySelector("#item-details-used-in");

        // Number of rows has to be set explicitly for the container's height to be fixed
        const numRows = Math.ceil(item.usedIn.length / 2);
        section.style = "grid-template-rows: repeat(" + numRows + ", 21px)";

        for (let i = 0; i < item.usedIn.length; i++) {
            const link = Widgets.createInAppLink(item.usedIn[i].outcome, { addPrefix: true });
            const div = document.createElement("div");
            div.appendChild(link);

            if (item.usedIn[i].quantity > 1) {
                div.innerHTML += ` (${item.usedIn[i].quantity})`;
            }

            section.appendChild(div);
        }
    }
}

export default ItemDisplayPage;