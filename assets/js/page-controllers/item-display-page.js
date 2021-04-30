import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";

class ItemDisplayPage extends AppPage {
    constructor() {
        super("item-display-page");

        this.itemId = null;

        this._configurationByItemType = {
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
            },
        };
    }

    async generatePreview(data) {
        if (!data.itemId) {
            return null;
        }

        const item = DataHelper.items[data.itemId];

        if (!item) {
            return null;
        }

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-preview");
        template.querySelector("#item-preview-icon img").src = item.icon;
        template.querySelector("#item-preview-name").textContent = item.name;
        template.querySelector("#item-preview-description").textContent = item.description;

        if (item.type === "loadout_primary" || item.type === "loadout_secondary") {
            template.appendChild(await this._createWeaponStatsGrid(item));
        }
        else if (item.type === "loadout_armor" || item.type === "loadout_mec_exoskeleton") {
            template.appendChild(await this._createArmorStatsGrid(item));
        }
        else if (item.type === "aircraft") {
            template.appendChild(await this._createInterceptorStatsGrid(item));
        }
        else if (item.type === "aircraft_weapon") {
            template.appendChild(await this._createInterceptorWeaponStatsGrid(item));
        }

        return template;
    }

    async load(hostingElement, event, data) {
        if (!data.itemId) {
            return null;
        }

        const item = DataHelper.items[data.itemId];

        return this.loadFromDataObject(item);
    }

    async loadFromDataObject(item) {
        this.itemId = item.id;
        const itemTypeConfig = this._configurationByItemType[item.type];

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-display-page");

        template.querySelector("#item-details-name").textContent = item.name;
        template.querySelector("#item-details-description").innerHTML = item.description;
        template.querySelector("#item-details-type").textContent = itemTypeConfig.friendlyName;
        template.querySelector("#item-details-image-container img").src = item.icon;

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
        }

        if (item.type === "loadout_primary" || item.type === "loadout_secondary") {
            this._populateWeaponStats(item, template.querySelector("#item-details-tactical-text"));
        }
        else if (item.type === "loadout_armor" || item.type === "loadout_mec_exoskeleton") {
            this._populateArmorStats(item, template.querySelector("#item-details-tactical-text"));
        }
        else if (item.type === "aircraft") {
            template.querySelector("#item-details-tactical-text").appendChild(await this._createInterceptorStatsGrid(item));
        }
        else if (item.type === "aircraft_weapon") {
            template.querySelector("#item-details-tactical-text").appendChild(await this._createInterceptorWeaponStatsGrid(item));
        }

        return template;
    }

    onUnloadBeginning(_event) {
        // TODO
        const historyData = {
            itemId: this.itemId
        };

        return new PageHistoryState(this, historyData);
    }

    ownsDataObject(dataObj) {
        return dataObj.id.startsWith("item_");
    }

    async _createArmorStatsGrid(item) {
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

    async _createInterceptorStatsGrid(item) {
        const interceptorData = item.type_specific_data;
        const gridTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-interceptor-stats-grid");

        gridTemplate.querySelector("#interceptor-stats-armor").textContent = interceptorData.armor;
        gridTemplate.querySelector("#interceptor-stats-hp").textContent = interceptorData.hp;
        gridTemplate.querySelector("#interceptor-stats-penetration").textContent = interceptorData.penetration;
        gridTemplate.querySelector("#interceptor-stats-speed").textContent = interceptorData.speed;

        return gridTemplate;
    }

    async _createInterceptorWeaponStatsGrid(item) {
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

    async _createWeaponStatsGrid(item) {
        const weaponData = item.type_specific_data;
        const gridTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/item-display-page.html", "template-item-weapon-stats-grid");

        gridTemplate.querySelector("#weapon-stats-damage").textContent = weaponData.damage_min_normal + " - " + weaponData.damage_max_normal;
        gridTemplate.querySelector("#weapon-stats-crit-damage").textContent = weaponData.damage_min_crit + " - " + weaponData.damage_max_crit;
        gridTemplate.querySelector("#weapon-stats-aim").textContent = weaponData.aim || 0;
        gridTemplate.querySelector("#weapon-stats-crit-chance").textContent = weaponData.crit_chance || 0;
        gridTemplate.querySelector("#weapon-stats-mobility").textContent = weaponData.mobility || 0;
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

    async _populateArmorStats(item, container) {
        let bulletPointContainer = container.querySelector("ul");

        if (!bulletPointContainer) {
            bulletPointContainer = document.createElement("ul");
            container.appendChild(bulletPointContainer);
        }

        const armorData = item.type_specific_data;

        const addBulletPoint = function(text) {
            const listItem = document.createElement("li");
            listItem.innerHTML = text;
            bulletPointContainer.appendChild(listItem);
        };

        if (item.type === "loadout_mec_exoskeleton") {
            const link = Widgets.createInAppLink(armorData.grants_perks[0]);
            addBulletPoint("This exoskeleton grants the " + link.outerHTML + " perk");
        }

        if (armorData.has_grapple) {
            addBulletPoint("Includes a grapple to hoist soldiers to higher terrain");
        }

        if (armorData.negates_fire) {
            addBulletPoint("Provides immunity to environmental fire damage");
        }

        if (armorData.negates_acid) {
            addBulletPoint("Prevents mobility penalty and damage from acid");
        }

        if (armorData.prevents_strangulation) {
            addBulletPoint("Prevents strangulation by Seekers");
        }

        if (armorData.requires_psionic) {
            addBulletPoint("Only usable by soldiers with Psionic abilities");
        }

        container.appendChild(await this._createArmorStatsGrid(item));

    }

    _populateBuildSection(buildData, numEngineersNeeded, containerElement) {
        if (!buildData) {
            const div = document.createElement("div");
            div.textContent = "This item cannot be built quickly.";
            containerElement.appendChild(div);

            return;
        }

        const addCostRow = function(label, content) {
            const div = document.createElement("div");
            div.classList.add("item-details-cost-type");

            const labelSpan = document.createElement("span");
            labelSpan.classList.add("item-details-cost-quantity");
            labelSpan.innerHTML = label;
            div.appendChild(labelSpan);

            if (typeof(content) === "string") {
                const contentSpan = document.createElement("span");
                contentSpan.innerHTML = content;
                div.appendChild(contentSpan);
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

    async _populateWeaponStats(item, container) {
        let bulletPointContainer = container.querySelector("ul");

        if (!bulletPointContainer) {
            bulletPointContainer = document.createElement("ul");
            container.appendChild(bulletPointContainer);
        }

        const weaponData = item.type_specific_data;

        const addBulletPoint = function(text) {
            const listItem = document.createElement("li");
            listItem.innerHTML = text;
            bulletPointContainer.appendChild(listItem);
        };

        if (weaponData.can_steady) {
            addBulletPoint("Can be steadied for additional accuracy on the following shot");
        }

        if (weaponData.category === "shotgun") {
            addBulletPoint("Shotguns gain double the aim bonus from being close to the target");
            addBulletPoint("Enemy damage reduction is 50% more effective vs shotguns");
        }

        if (weaponData.class_restriction) {
            let classText = "Usable by ";

            for (let i = 0; i < weaponData.class_restriction.length; i++) {
                let classLink = Widgets.createInAppLink(weaponData.class_restriction[i]);

                if (weaponData.class_restriction.length > 1) {
                    if (i == weaponData.class_restriction.length - 1) {
                        classText += " and " + classLink.outerHTML;
                    }
                    else if (i == weaponData.class_restriction.length - 2) {
                        classText += classLink.outerHTML + " ";
                    }
                    else {
                        classText += classLink.outerHTML + ", ";
                    }
                }
                else {
                    // Only one class can use this
                    classText += classLink.outerHTML;
                }
            }

            addBulletPoint(classText);
        }

        // Add text for if MECs and SHIVs can use
        const usableByMec = weaponData.category == "mec" || weaponData.usable_by_mec;
        const usableByShiv = weaponData.category == "shiv" || weaponData.usable_by_shiv;
        if (usableByMec || usableByShiv) {
            let text = "Usable by ";

            if (usableByMec) {
                text += "MEC Troopers ";
            }

            if (usableByShiv) {
                if (usableByMec) {
                    text += "and ";
                }

                text += "SHIVs";
            }

            addBulletPoint(text);
        }

        // Populate the table with values
        container.appendChild(await this._createWeaponStatsGrid(item));
    }
}

export default ItemDisplayPage;