import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Settings from "../settings.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";
import * as Utils from "../utils.js";

const defaultSettings = {
    numScientists: 30,
    numLabs: 0,
    numAdjacencies: 0
};

class TechDetailsPage extends AppPage {

    static pageId = "tech-details-page";

    #numAdjacenciesInput = null;
    #numLabsInput = null;
    #numScientistsInput = null;

    #numAdjacenciesReadonly = null;
    #numLabsReadonly = null;
    #numScientistsReadonly = null;

    #timeDisplay = null;
    #timeValuesInput = null;
    #timeValuesReadonly = null;

    #tech = null;

    static async generatePreview(data) {
        if (!data.techId) {
            return null;
        }

        const tech = DataHelper.technologies[data.techId];

        if (!tech) {
            return null;
        }

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/tech-details-page.html", "template-tech-preview");
        template.querySelector(".preview-img-schematic").src = tech.icon;
        template.querySelector(".preview-title").textContent = tech.name;
        template.querySelector(".preview-description").textContent = Utils.truncateText(tech.description, 300);

        return template;
    }

    static ownsDataObject(dataObj) {
        return dataObj.id.startsWith("research_");
    }

    async load(data) {
        const tech = DataHelper.technologies[data.techId];

        return this.loadFromDataObject(tech);
    }

    async loadFromDataObject(tech) {
        this.#tech = tech;

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/tech-details-page.html", "template-tech-details-page");

        template.querySelector(".details-header-title").textContent = tech.name;
        template.querySelector(".details-header-description").textContent = tech.description;
        template.querySelector(".details-header-img-container img").src = tech.icon;

        this.#numAdjacenciesInput = template.querySelector("#num-adjacencies");
        this.#numLabsInput = template.querySelector("#num-labs");
        this.#numScientistsInput = template.querySelector("#num-scientists");

        this.#numAdjacenciesReadonly = template.querySelector("#num-adjacencies-readonly");
        this.#numLabsReadonly = template.querySelector("#num-labs-readonly");
        this.#numScientistsReadonly = template.querySelector("#num-scientists-readonly");

        this.#timeDisplay = template.querySelector("#tech-details-time");
        this.#timeValuesInput = template.querySelector("#tech-details-time-values-input");
        this.#timeValuesReadonly = template.querySelector("#tech-details-time-values-readonly");

        this.#numAdjacenciesInput.addEventListener("input", this._validateNumberInput);
        this.#numLabsInput.addEventListener("input", this._validateNumberInput);
        this.#numScientistsInput.addEventListener("input", this._validateNumberInput);

        template.querySelector("#tech-details-change-link").addEventListener("click", this._openResearchTimeChangeView.bind(this));
        template.querySelector("#tech-details-time-discard-button").addEventListener("click", this._discardTimeInputs.bind(this));
        template.querySelector("#tech-details-time-save-button").addEventListener("click", this._saveTimeInputs.bind(this));

        const techSettings = await Settings.get("research") || defaultSettings;

        this._populateBeneficialCredits(template, tech);
        this._populateCost(template, tech);
        this._populateLeadsTo(template, tech);
        this._populatePrerequisites(template, tech);
        this._populateUnlocks(template, tech);

        this._updateResearchTime(techSettings.numScientists, techSettings.numLabs, techSettings.numAdjacencies);

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/research.png",
                text: "Research Details"
            }
        };
    }

    makeHistoryState() {
        return new PageHistoryState(this, { techId: this.#tech.id });
    }

    _discardTimeInputs() {
        // Just hide the inputs; their values will be reset the next time that view is opened anyway
        this.#timeValuesInput.classList.add("hidden-collapse");
        this.#timeValuesReadonly.classList.remove("hidden-collapse");
    }

    _openResearchTimeChangeView() {
        this.#numAdjacenciesInput.value = this.#numAdjacenciesReadonly.textContent;
        this.#numLabsInput.value = this.#numLabsReadonly.textContent;
        this.#numScientistsInput.value = this.#numScientistsReadonly.textContent;

        // Clear any validation styles from last time
        this.#numAdjacenciesInput.style = "";
        this.#numLabsInput.style = "";
        this.#numScientistsInput.style = "";

        this.#timeValuesInput.classList.remove("hidden-collapse");
        this.#timeValuesReadonly.classList.add("hidden-collapse");
    }

    _populateBeneficialCredits(template, tech) {
        const container = template.querySelector(".details-header-extra");

        if (!tech.benefits_from_research_credit_types) {
            container.classList.add("hidden-collapse");
            return;
        }

        const creditLinks = tech.benefits_from_research_credit_types.map(creditType => {
            const sourceTech = DataHelper.getResearchCreditSource(creditType);
            return Widgets.createInAppLink(sourceTech, {
                linkText: Utils.capitalizeEachWord(creditType, "_", " ")
            }).outerHTML;
        });

        const div = document.createElement("div");
        div.innerHTML = "Benefits from " + creditLinks.join(", ") + " research credit";

        if (creditLinks.length > 1) {
            div.innerHTML += "s";
        }

        container.appendChild(div);
    }

    _populateCost(template, tech) {
        const container = template.querySelector("#tech-details-cost-container");

        if (!tech.cost) {
            const div = document.createElement("div");
            div.textContent = "There is no cost to conduct this research.";
            container.appendChild(div);

            return;
        }

        for (const costType in tech.cost) {
            const div = document.createElement("div");
            div.classList.add("tech-details-cost-type");

            const span = document.createElement("span");
            span.classList.add("tech-details-cost-quantity");
            span.textContent = tech.cost[costType] + "x";
            div.appendChild(span);

            const itemLink = Widgets.createInAppLink(costType);
            div.appendChild(itemLink);
            container.appendChild(div);
        }
    }

    _populateLeadsTo(template, tech) {
        const leadsToContainer = template.querySelector("#tech-details-leads-to-research");

        if (!tech.leadsTo) {
            const div = document.createElement("div");
            div.textContent = "None";
            leadsToContainer.appendChild(div);

            return;
        }

        for (let techId in tech.leadsTo) {
            const div = document.createElement("div");
            const link = Widgets.createInAppLink(techId);

            div.appendChild(link);
            leadsToContainer.appendChild(div);
        }
    }

    _populatePrerequisites(template, tech) {
        let hasPrereqs = false;
        const prereqsContainer = template.querySelector("#tech-details-prerequisites");

        // TODO include other prereq types
        if (tech.prerequisites && tech.prerequisites.research) {
            for (let i = 0; i < tech.prerequisites.research.length; i++) {
                hasPrereqs = true;
                const prereq = tech.prerequisites.research[i];

                const div = document.createElement("div");
                const link = Widgets.createInAppLink(prereq);

                div.appendChild(link);
                prereqsContainer.appendChild(div);
            }
        }

        if (tech.prerequisites && tech.prerequisites.items) {
            for (let i = 0; i < tech.prerequisites.items.length; i++) {
                hasPrereqs = true;
                const prereq = tech.prerequisites.items[i];

                prereqsContainer.appendChild(document.createElement("br"));

                const div = document.createElement("div");
                div.textContent = "XCOM must possess ";
                const link = Widgets.createInAppLink(prereq);

                div.appendChild(link);
                prereqsContainer.appendChild(div);
            }
        }

        if (tech.prerequisites && tech.prerequisites.missions) {
            for (let i = 0; i < tech.prerequisites.missions.length; i++) {
                hasPrereqs = true;

                let missionName = tech.prerequisites.missions[i].replace("mission_", "").replace("_downed", "");
                missionName = Utils.capitalizeEachWord(missionName);

                prereqsContainer.appendChild(document.createElement("br"));

                const div = document.createElement("div");
                div.textContent = "XCOM must complete a crashed or landed " + missionName + " mission";
                prereqsContainer.appendChild(div);
            }
        }

        if (tech.id == "research_alien_operations") {
            hasPrereqs = true;

            const div = document.createElement("div");
            div.textContent = "Any interrogation";
            prereqsContainer.appendChild(div);
        }

        if (!hasPrereqs) {
            const div = document.createElement("div");
            div.textContent = "None";
            prereqsContainer.appendChild(div);
        }
    }

    _populateUnlocks(template, tech) {
        const unlocksContainer = template.querySelector("#tech-details-unlocks");

        // UFO analysis is special; none of them have conventional unlocks
        if (tech.id.includes("ufo_analysis")) {
            const sectionHeader = template.querySelector("#tech-details-unlocks-heading");
            sectionHeader.textContent = "Research Benefits";

            const div = document.createElement("div");
            const ul = document.createElement("ul");
            ul.classList.add("details-list");
            div.appendChild(ul);

            let li = document.createElement("li");
            li.textContent = "XCOM's aircraft gain a 10% damage bonus against UFOs of this type";
            ul.appendChild(li);

            li = document.createElement("li");
            li.innerHTML = "20% more " + Widgets.createInAppLink("item_alien_alloy").outerHTML + " and " + Widgets.createInAppLink("item_elerium").outerHTML + " salvaged from UFOs of this type";
            ul.appendChild(li);

            li = document.createElement("li");
            li.innerHTML = "If the " + Widgets.createInAppLink("foundry_ufo_scanners").outerHTML + " Foundry project is complete, the health of UFOs of this type is visible during interception";
            ul.appendChild(li);

            unlocksContainer.appendChild(div);

            return;
        }

        if (tech.unlocks.facilities) {
            for (let i = 0; i < tech.unlocks.facilities.length; i++) {
                const div = document.createElement("div");
                div.appendChild(Widgets.createInAppLink(tech.unlocks.facilities[i], { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.unlocks.geneMods) {
            for (let i = 0; i < tech.unlocks.geneMods.length; i++) {
                const div = document.createElement("div");
                div.appendChild(Widgets.createInAppLink(tech.unlocks.geneMods[i], { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.unlocks.foundryProjects) {
            for (let i = 0; i < tech.unlocks.foundryProjects.length; i++) {
                const div = document.createElement("div");
                div.appendChild(Widgets.createInAppLink(tech.unlocks.foundryProjects[i], { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.unlocks.items) {
            for (let i = 0; i < tech.unlocks.items.length; i++) {
                const div = document.createElement("div");
                div.appendChild(Widgets.createInAppLink(tech.unlocks.items[i], { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.unlocks.psiAbilities) {
            for (let i = 0; i < tech.unlocks.psiAbilities.length; i++) {
                const div = document.createElement("div");
                div.appendChild(Widgets.createInAppLink(tech.unlocks.psiAbilities[i], { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.unlocks.councilRequests) {
            for (let i = 0; i < tech.unlocks.councilRequests.length; i++) {
                const request = tech.unlocks.councilRequests[i];

                const div = document.createElement("div");
                div.appendChild(Widgets.createInAppLink(request, { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.grants_research_credit) {
            const credit = Utils.capitalizeEachWord(tech.grants_research_credit);

            const div = document.createElement("div");
            div.textContent = "Research and Foundry Credit: " + credit;
            unlocksContainer.appendChild(div);
        }
    }

    _saveTimeInputs() {
        const numAdjacencies = this.#numAdjacenciesInput.value;
        const numLabs = this.#numLabsInput.value;
        const numScientists = this.#numScientistsInput.value;

        let isValid = true;
        if (numAdjacencies < 0) {
            this.#numAdjacenciesInput.style = "border-color: red";
            isValid = false;
        }

        if (numLabs < 0) {
            this.#numLabsInput.style = "border-color: red";
            isValid = false;
        }

        if (numScientists < 10) {
            this.#numScientistsInput.style = "border-color: red";
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        // Persist settings so they're used in the future
        const settings = {
            numScientists: numScientists,
            numLabs: numLabs,
            numAdjacencies: numAdjacencies
        };
        Settings.set("research", settings);

        this._updateResearchTime(numScientists, numLabs, numAdjacencies);

        this.#timeValuesInput.classList.add("hidden-collapse");
        this.#timeValuesReadonly.classList.remove("hidden-collapse");
    }

    _updateResearchTime(numScientists, numLabs, numAdjacencies) {
        const researchTime = Utils.calculateResearchTime(this.#tech.base_time_in_days, numScientists, numLabs, numAdjacencies);

        this.#numAdjacenciesReadonly.textContent = numAdjacencies;
        this.#numLabsReadonly.textContent = numLabs;
        this.#numScientistsReadonly.textContent = numScientists;
        this.#timeDisplay.textContent = Math.roundTo(researchTime, 1);
    }

    _validateNumberInput(event) {
        const value = +event.target.value;
        const min = +event.target.min;
        const max = +event.target.max;
        if (value < min || value > max) {
            event.target.isValid = false;
            event.target.style = "border-color: red";
        }
        else {
            event.target.isValid = true;
            event.target.style = "";
        }
    }
}

export default TechDetailsPage;