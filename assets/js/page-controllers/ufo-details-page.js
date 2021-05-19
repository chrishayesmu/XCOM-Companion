import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";
import * as Utils from "../utils.js";

const ufoWeapons = {
    double_plasma: {
        name: "Double Plasma",
        armorPenetration: 20,
        baseHitChance: 40,
        damagePerShot: 800,
        shotsPerSecond: 1.25,
        tooltipTemplateId: "template-ufo-tooltip-double-plasma"
    },
    fusion_lance: {
        name: "Fusion Lance",
        armorPenetration: 50,
        baseHitChance: 45,
        damagePerShot: 1300,
        shotsPerSecond: 1.25,
        tooltipTemplateId: "template-ufo-tooltip-fusion-lance"

    },
    single_plasma: {
        name: "Single Plasma",
        armorPenetration: 0,
        baseHitChance: 33,
        damagePerShot: 450,
        shotsPerSecond: 1.15,
        tooltipTemplateId: "template-ufo-tooltip-single-plasma"
    }
};

class UfoDetailsPage extends AppPage {
    constructor() {
        super("ufo-details-page");
    }

    async generatePreview(data) {
        if (!data.ufoId) {
            return null;
        }

        const ufo = DataHelper.ufos[data.ufoId];

        if (!ufo) {
            return null;
        }

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/ufo-details-page.html", "template-ufo-details-preview");
        template.querySelector(".preview-img-schematic").src = ufo.image;
        template.querySelector(".preview-title").textContent = ufo.name;
        template.querySelector(".preview-description").textContent = ufo.description;

        return template;
    }

    async load(data) {
        const ufo = DataHelper.ufos[data.ufoId];

        return this.loadFromDataObject(ufo);
    }

    async loadFromDataObject(ufo) {
        this.ufoId = ufo.id;

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/ufo-details-page.html", "template-ufo-details-page");

        template.querySelector(".details-header-title").textContent = ufo.name;
        template.querySelector(".details-header-description").textContent = ufo.description;
        template.querySelector(".details-header-img-container img").src = ufo.image;
        template.querySelector(".details-header-extra").textContent = "Size: " + Utils.capitalizeEachWord(ufo.size);
        template.querySelector("#ufo-details-content-toggle").addEventListener("selectedOptionChanged", this._onSelectedViewModeChanged.bind(this));

        this._populateAirCombat(template, ufo);
        this._populateGroundAssault(template, ufo);
        this._populateMissions(template, ufo);

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/ufo.png",
                text: "UFO Details - " + ufo.name
            }
        };
    }

    onUnloadBeginning(_event) {
        const historyData = {
            ufoId: this.ufoId
        };

        this.ufoId = null;

        return new PageHistoryState(this, historyData);
    }

    ownsDataObject(dataObj) {
        return dataObj.id.startsWith("ufo_");
    }

    _calculateDps(ufo, aimBonus, target, alienResearch) {
        // TODO account for alien research bump in stats
        alienResearch = alienResearch || 0;

        // Damage of every shot is multipled by a random number between 1 and 1.5, so for DPS we just pretend
        // it's a consistent 1.25x multiplier, which would be true enough for infinitely long engagements
        const damageMultiplier = 1.25;

        let totalDps = 0;

        for (let weaponId in ufo.base_armament) {
            const weaponStats = ufoWeapons[weaponId];
            const deltaArmor = (target.armor - (ufo.armor_penetration + weaponStats.armorPenetration)) / 100;
            const armorMitigation = Math.max(Math.min(0.95, deltaArmor), 0.0); // clamp to [0, 0.95]
            const critChance = Math.max(Math.min(0.25, -deltaArmor / 2), 0.05); // clamp to [0.05, 0.25]
            const hitChance = Math.min((weaponStats.baseHitChance + aimBonus) / 100, 0.95); // aim is capped to 95% chance to hit

            const damagePerShot = weaponStats.damagePerShot * (1 - armorMitigation) * (1 + critChance) * damageMultiplier;
            const dps = damagePerShot * weaponStats.shotsPerSecond * hitChance;

            totalDps += dps;
        }

        return Math.round(totalDps);
    }

    _onSelectedViewModeChanged(event) {
        const viewMode = event.detail.selectedOption;

        if (viewMode === "Air Combat") {
            document.getElementById("ufo-details-content-air-combat").classList.remove("hidden-collapse");
            document.getElementById("ufo-details-content-ground-assault").classList.add("hidden-collapse");
            document.getElementById("ufo-details-content-missions").classList.add("hidden-collapse");
        }
        else if (viewMode === "Ground Assault") {
            document.getElementById("ufo-details-content-air-combat").classList.add("hidden-collapse");
            document.getElementById("ufo-details-content-ground-assault").classList.remove("hidden-collapse");
            document.getElementById("ufo-details-content-missions").classList.add("hidden-collapse");
        }
        else if (viewMode === "Missions") {
            document.getElementById("ufo-details-content-air-combat").classList.add("hidden-collapse");
            document.getElementById("ufo-details-content-ground-assault").classList.add("hidden-collapse");
            document.getElementById("ufo-details-content-missions").classList.remove("hidden-collapse");
        }
        else {
            throw new Error(`Unknown viewMode "${viewMode}`);
        }
    }

    _populateAirCombat(template, ufo) {
        template.querySelector("#ufo-ac-stats-hp").textContent = ufo.base_hp;
        template.querySelector("#ufo-ac-stats-resources").textContent = ufo.resource_value;

        const baselineText = function() {
            const div = document.createElement("div");
            div.innerHTML = "<strong>Baseline</strong>";
            return div;
        };

        const upgradedText = function(researchValue) {
            const div = document.createElement("div");
            div.style = "font-weight: bold; text-align: center";
            div.innerHTML = `<br/>Upgrade at ${researchValue > 0 ? researchValue : "??"} Research`;
            return div;
        };

        // Armor
        const armorContainer = template.querySelector("#ufo-ac-stats-armor");
        if (ufo.armor_upgraded) {
            armorContainer.appendChild(baselineText());
            Utils.appendElement(armorContainer, "div", ufo.armor + "%");

            armorContainer.appendChild(upgradedText(ufo.armor_upgrade_threshold));
            Utils.appendElement(armorContainer, "div", ufo.armor_upgraded + "%");
        }
        else {
            armorContainer.textContent = ufo.armor + "%";
        }

        // Armor penetration
        const armorPenetrationContainer = template.querySelector("#ufo-ac-stats-armor-penetration");
        if (ufo.armor_penetration_upgraded) {
            armorPenetrationContainer.appendChild(baselineText());
            Utils.appendElement(armorPenetrationContainer, "div", ufo.armor_penetration + "%");

            armorPenetrationContainer.appendChild(upgradedText(ufo.armor_penetration_upgrade_threshold));
            Utils.appendElement(armorPenetrationContainer, "div", ufo.armor_penetration_upgraded + "%");
        }
        else {
            armorPenetrationContainer.textContent = ufo.armor_penetration + "%";
        }

        // Weaponry
        const weaponDataContainer = template.querySelector("#ufo-ac-stats-weaponry");
        const populateWeaponData = function(armament) {
            for (let weaponId in armament) {
                if (!(weaponId in ufoWeapons)) {
                    continue;
                }

                const weaponConfig = ufoWeapons[weaponId];

                const div = document.createElement("div");
                div.textContent = " x" + armament[weaponId]

                const link = document.createElement("a");
                link.textContent = weaponConfig.name;

                link.setAttribute("data-tooltip-template-file", "assets/html/tooltips/ufo-tooltips.html");
                link.setAttribute("data-tooltip-template-id", weaponConfig.tooltipTemplateId);

                div.prepend(link);
                weaponDataContainer.appendChild(div);
            }
        };

        if (ufo.upgraded_armament) {
            weaponDataContainer.appendChild(baselineText());
        }

        populateWeaponData(ufo.base_armament);

        if (ufo.upgraded_armament) {
            weaponDataContainer.appendChild(upgradedText(ufo.upgraded_armament.upgrade_threshold));
            populateWeaponData(ufo.upgraded_armament);
        }

        // Bounty
        const bountyContainer = template.querySelector("#ufo-ac-stats-bounty");
        const alloyLink = Widgets.createInAppLink("item_alien_alloy", { linkText: "Alien Alloys" });
        const alienMetallurgyLink = Widgets.createInAppLink("foundry_alien_metallurgy");

        Utils.appendElement(bountyContainer, "div", "§" + ufo.bounty.money);
        Utils.appendElement(bountyContainer, "div", `2 to ${ufo.bounty.max_alloys_normal} ${alloyLink.outerHTML} (base)`);
        Utils.appendElement(bountyContainer, "div", `2 to ${ufo.bounty.max_alloys_alien_metallurgy} ${alloyLink.outerHTML} (with ${alienMetallurgyLink.outerHTML})`);

        this._populateAirCombatDerivedStats(template, ufo);
        this._populateAirCombatTimeline(template, ufo);
    }

    _populateAirCombatDerivedStats(template, ufo) {
        const aimBonusDefensive = -15, aimBonusBalanced = 0, aimBonusAggressive = 15;

        const firestormData = DataHelper.items["item_firestorm"].type_specific_data;
        const interceptorData = DataHelper.items["item_interceptor"].type_specific_data;

        const dpsVsInterceptorDefensive = this._calculateDps(ufo, aimBonusDefensive, interceptorData);
        const dpsVsInterceptorBalanced = this._calculateDps(ufo, aimBonusBalanced, interceptorData);
        const dpsVsInterceptorAggressive = this._calculateDps(ufo, aimBonusAggressive, interceptorData);

        const dpsVsFirestormDefensive = this._calculateDps(ufo, aimBonusDefensive, firestormData);
        const dpsVsFirestormBalanced = this._calculateDps(ufo, aimBonusBalanced, firestormData);
        const dpsVsFirestormAggressive = this._calculateDps(ufo, aimBonusAggressive, firestormData);

        // Defensive stance
        template.querySelector("#ufo-ac-derived-stats-def-dps-interceptor").textContent = dpsVsInterceptorDefensive;
        template.querySelector("#ufo-ac-derived-stats-def-dps-firestorm").textContent = dpsVsFirestormDefensive;
        template.querySelector("#ufo-ac-derived-stats-def-ttk-interceptor").textContent = Math.round(10 * interceptorData.hp / dpsVsInterceptorDefensive) / 10 + "s";
        template.querySelector("#ufo-ac-derived-stats-def-ttk-firestorm").textContent = Math.round(10 * firestormData.hp / dpsVsFirestormDefensive) / 10 + "s";
        template.querySelector("#ufo-ac-derived-stats-def-ttk-armored-interceptor").textContent = Math.round(10 * (interceptorData.hp + 1000) / dpsVsInterceptorDefensive) / 10 + "s";
        template.querySelector("#ufo-ac-derived-stats-def-ttk-armored-firestorm").textContent = Math.round(10 * (firestormData.hp + 1000) / dpsVsFirestormDefensive) / 10 + "s";

        // Balanced stance
        template.querySelector("#ufo-ac-derived-stats-bal-dps-interceptor").textContent = dpsVsInterceptorBalanced;
        template.querySelector("#ufo-ac-derived-stats-bal-dps-firestorm").textContent = dpsVsFirestormBalanced;
        template.querySelector("#ufo-ac-derived-stats-bal-ttk-interceptor").textContent = Math.round(10 * interceptorData.hp / dpsVsInterceptorBalanced) / 10 + "s";
        template.querySelector("#ufo-ac-derived-stats-bal-ttk-firestorm").textContent = Math.round(10 * firestormData.hp / dpsVsFirestormBalanced) / 10 + "s";
        template.querySelector("#ufo-ac-derived-stats-bal-ttk-armored-interceptor").textContent = Math.round(10 * (interceptorData.hp + 1000) / dpsVsInterceptorBalanced) / 10 + "s";
        template.querySelector("#ufo-ac-derived-stats-bal-ttk-armored-firestorm").textContent = Math.round(10 * (firestormData.hp + 1000) / dpsVsFirestormBalanced) / 10 + "s";

        // Aggressive stance
        template.querySelector("#ufo-ac-derived-stats-agg-dps-interceptor").textContent = dpsVsInterceptorAggressive;
        template.querySelector("#ufo-ac-derived-stats-agg-dps-firestorm").textContent = dpsVsFirestormAggressive;
        template.querySelector("#ufo-ac-derived-stats-agg-ttk-interceptor").textContent = Math.round(10 * interceptorData.hp / dpsVsInterceptorAggressive) / 10 + "s";
        template.querySelector("#ufo-ac-derived-stats-agg-ttk-firestorm").textContent = Math.round(10 * firestormData.hp / dpsVsFirestormAggressive) / 10 + "s";
        template.querySelector("#ufo-ac-derived-stats-agg-ttk-armored-interceptor").textContent = Math.round(10 * (interceptorData.hp + 1000) / dpsVsInterceptorAggressive) / 10 + "s";
        template.querySelector("#ufo-ac-derived-stats-agg-ttk-armored-firestorm").textContent = Math.round(10 * (firestormData.hp + 1000) / dpsVsFirestormAggressive) / 10 + "s";

    }

    _populateAirCombatTimeline(template, ufo) {
        const timeline = template.querySelector("#ufo-details-air-combat-research-timeline");

        const addEvent = function(at, text, isMajor) {
            const timelineEvent = document.createElement("time-line-event");
            timelineEvent.at = at;
            timelineEvent.innerHTML = text;

            if (isMajor) {
                timelineEvent.major = true;
            }

            timeline.appendChild(timelineEvent);
        }

        // Minor events: UFOs gain stats every 30 points, regardless of type
        for (let i = 30; i <= 960; i += 30) {
            addEvent(i, "+75 HP<br/>+8 damage<br/>+2 aim");
        }

        // Major events come from the data
        if (ufo.upgraded_armament) {
            const weapons = Object.keys(ufo.upgraded_armament).filter(key => key in ufoWeapons).map(key => ufoWeapons[key].name + " x" + ufo.upgraded_armament[key]).join("<br />");
            const weaponUpgradeHtml = `
            <div class="flex-row">
                <div>Weapon Upgrade ⟶&nbsp;</div>
                <div>${weapons}</div>
            </div>
            `;
            addEvent(ufo.upgraded_armament.upgrade_threshold, weaponUpgradeHtml, true);
        }

        if (ufo.armor_penetration_upgrade_threshold) {
            addEvent(ufo.armor_penetration_upgrade_threshold, `Armor Penetration: ${ufo.armor_penetration} ⟶ ${ufo.armor_penetration_upgraded}`, true);
        }

        if (ufo.armor_upgrade_threshold) {
            addEvent(ufo.armor_upgrade_threshold, `Armor: ${ufo.armor} ⟶ ${ufo.armor_upgraded}`, true);
        }
    }

    _populateGroundAssault(template, ufo) {
        const alloysContainer = template.querySelector("#ufo-details-ground-stats-alloys");
        const commandPodContainer = template.querySelector("#ufo-details-ground-stats-command-pod");
        const crewCrashedContainer = template.querySelector("#ufo-details-ground-stats-crew-crashed");
        const crewLandedContainer = template.querySelector("#ufo-details-ground-stats-crew-landed");
        const crewTrapContainer = template.querySelector("#ufo-details-ground-stats-crew-trap");
        const crewUpgradeContainer = template.querySelector("#ufo-details-ground-stats-crew-upgrade");
        const equipmentContainer = template.querySelector("#ufo-details-ground-stats-equipment");

        if (ufo.crew_crashed) {
            crewCrashedContainer.textContent = Utils.xToY(ufo.crew_crashed.min, ufo.crew_crashed.max) + " aliens";
        }
        else {
            crewCrashedContainer.textContent = "Crew size missing for this UFO type.";
        }

        if (ufo.crew_landed) {
            crewLandedContainer.textContent = Utils.xToY(ufo.crew_landed.min, ufo.crew_landed.max) + " aliens";
        }
        else {
            crewLandedContainer.textContent = "This UFO type never lands.";
        }

        if (ufo.crew_trap) {
            crewTrapContainer.textContent = Utils.xToY(ufo.crew_trap.min, ufo.crew_trap.max) + " aliens";
        }
        else {
            crewTrapContainer.textContent = "This UFO type never sets traps.";
        }

        if (ufo.crew_upgrade) {
            crewUpgradeContainer.textContent = `+${ufo.crew_upgrade.additional_crew} aliens at >=${ufo.crew_upgrade.upgrade_threshold} Alien Research`;
        }
        else {
            crewUpgradeContainer.textContent = "Crew upgrade missing for this UFO type.";
        }

        // Command pod
        if (!ufo.command_pod_before_aba || !ufo.command_pod_before_aba) {
            commandPodContainer.textContent = "Command pod missing for this UFO type.";
        }
        else {
            const formatCommandPod = function(pod) {
                if (pod.enemy_outsider) {
                    return pod.enemy_outsider === 1 ? "1 Outsider" : pod.enemy_outsider + " Outsiders";
                }

                if (pod.any_min === pod.any_max) {
                    return pod.any_min + " aliens";
                }

                return `${pod.any_min} to ${pod.any_max} aliens`;
            }

            Utils.appendElement(commandPodContainer, "div", "<strong>Before Alien Base Assault</strong>");
            Utils.appendElement(commandPodContainer, "div", formatCommandPod(ufo.command_pod_before_aba));

            Utils.appendElement(commandPodContainer, "div", "<br/><strong>After Alien Base Assault</strong>");
            Utils.appendElement(commandPodContainer, "div", formatCommandPod(ufo.command_pod_after_aba));
        }

        // Alloys
        const ufoCanLand = !!ufo.crew_landed;
        const minAlloysCrash = Math.floor(ufo.base_alloy_value * 0.3);
        const maxAlloysCrash = Math.ceil(ufo.base_alloy_value * 0.45);
        Utils.appendElement(alloysContainer, "div", "<strong>Crashed</strong>");
        Utils.appendElement(alloysContainer, "div", `${minAlloysCrash} to ${maxAlloysCrash}`);
        Utils.appendElement(alloysContainer, "div", "<br/><strong>Landed</strong>");
        Utils.appendElement(alloysContainer, "div", ufoCanLand ? ufo.base_alloy_value : "N/A");

        for (let itemId in ufo.equipment) {
            const itemLink = Widgets.createInAppLink(itemId);

            Utils.appendElement(equipmentContainer, "div", `${ufo.equipment[itemId]}x ${itemLink.outerHTML}`);
        }
    }

    _populateMissions(template, ufo) {
        let isAlternateColor = false;

        for (let i = 0; i < ufo.missions.length; i++) {
            const mission = ufo.missions[i];
            const missionInfoContainer = template.querySelector("#ufo-details-mission-type-" + mission.type);

            missionInfoContainer.classList.remove("hidden-collapse");

            if (isAlternateColor) {
                missionInfoContainer.classList.add("alternating-bg");
            }

            if (i === 0) {
                missionInfoContainer.classList.add("first-visible");
            }

            isAlternateColor = !isAlternateColor;

            if ("required_research" in mission) {
                missionInfoContainer.querySelector(".ufo-details-required-research").textContent = mission.required_research;
            }

            if ("required_resources" in mission) {
                missionInfoContainer.querySelector(".ufo-details-required-resources").textContent = mission.required_resources;
            }

            if ("grants_resources" in mission) {
                missionInfoContainer.querySelector(".ufo-details-grants-resources").textContent = `${mission.grants_resources.min} to ${mission.grants_resources.max}`;
            }

            if ("grants_research" in mission) {
                missionInfoContainer.querySelector(".ufo-details-grants-research").textContent = mission.grants_research || "Unknown";
            }
        }
    }
}

export default UfoDetailsPage;