import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
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

        if (item.type === "loadout_secondary" && item.type_specific_data.category === "mec") {
            template.querySelector("#item-preview-stats-table").appendChild(await this._createMecSecondaryStatsGrid(item));
        }
        else if (item.type === "loadout_primary" || item.type === "loadout_secondary") {
            template.querySelector("#item-preview-stats-table").appendChild(await this._createWeaponStatsGrid(item));
        }
        else if (item.type === "loadout_armor" || item.type === "loadout_mec_exoskeleton") {
            template.querySelector("#item-preview-stats-table").appendChild(await this._createArmorStatsGrid(item));
        }
        else if (item.type === "loadout_equipment") {
            template.querySelector("#item-preview-stats-table").appendChild(await this._createEquipmentStatsGrid(item));
        }
        else if (item.type === "aircraft") {
            template.querySelector("#item-preview-stats-table").appendChild(await this._createInterceptorStatsGrid(item));
        }
        else if (item.type === "aircraft_weapon") {
            template.querySelector("#item-preview-stats-table").appendChild(await this._createInterceptorWeaponStatsGrid(item));
        }
        else if (item.type === "shiv") {
            template.querySelector("#item-preview-stats-table").appendChild(await this._createShivStatsGrid(item));
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
            this._populateBuildSection(item.normal_build, item.base_engineers, template.querySelector("#item-details-normal-build-cost-container"));
            this._populateBuildSection(item.quick_build, item.base_engineers, template.querySelector("#item-details-quick-build-cost-container"));
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

        if (item.type === "loadout_secondary" && item.type_specific_data.category === "mec") {
            tacticalTextContainer.appendChild(await ItemDisplayPage._createMecSecondaryStatsGrid(item));
        }
        else if (item.type === "loadout_primary" || item.type === "loadout_secondary") {
            tacticalTextContainer.appendChild(await ItemDisplayPage._createWeaponStatsGrid(item));
        }
        else if (item.type === "loadout_armor" || item.type === "loadout_mec_exoskeleton") {
            tacticalTextContainer.appendChild(await ItemDisplayPage._createArmorStatsGrid(item));
        }
        else if (item.type === "loadout_equipment") {
            tacticalTextContainer.appendChild(await ItemDisplayPage._createEquipmentStatsGrid(item));
        }
        else if (item.type === "aircraft") {
            tacticalTextContainer.appendChild(await ItemDisplayPage._createInterceptorStatsGrid(item));
        }
        else if (item.type === "aircraft_weapon") {
            tacticalTextContainer.appendChild(await ItemDisplayPage._createInterceptorWeaponStatsGrid(item));
        }
        else if (item.type === "shiv") {
            tacticalTextContainer.appendChild(await ItemDisplayPage._createShivStatsGrid(item));
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

        if (usableBySoldier) {
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

    _populateBuildSection(buildData, numEngineersNeeded, containerElement) {
        if (!buildData) {
            Utils.appendElement(containerElement, "div", "This item cannot be built quickly.");
            return;
        }

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

        addCostRow("Time:", buildData.base_build_time_days + " days");

        // Handle money first since it's displayed uniquely
        if (buildData.cost.money) {
            addCostRow("Cost:", "<font color='#32CD32'>§" + buildData.cost.money + "</font>");
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
            const helpIcon = Widgets.createHelpIcon("The time to build is based on having this many engineers. It will go quicker if you have more, and much slower if you have less.");
            const engineerContainer = addCostRow(numEngineersNeeded, "Engineers");
            engineerContainer.appendChild(helpIcon);
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
            // TODO include info about how many are needed for each use
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
