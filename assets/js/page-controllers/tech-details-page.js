const appPageModule = require("./app-page");
const dataHelper = require("../data-helper");
const templates = require("../templates");
const utils = require("../utils");
const widgets = require("../widgets");

const AppPage = appPageModule.AppPage;
const PageHistoryState = appPageModule.PageHistoryState;

class TechDetailsPage extends AppPage {
    constructor() {
        super("tech-details-page");

        this.techId = null;
    }

    generatePreview(data) {
        if (!data.techId) {
            return null;
        }

        const tech = dataHelper.technologies[data.techId];

        if (!tech) {
            return null;
        }

        const template = templates.instantiateTemplate("template-tech-preview");
        template.querySelector("#tech-preview-icon img").src = tech.icon;
        template.querySelector("#tech-preview-name").textContent = tech.name;
        template.querySelector("#tech-preview-description").textContent = utils.truncateText(tech.description, 300);

        return template;
    }

    load(hostingElement, event, data) {
        const tech = dataHelper.technologies[data.techId];

        return this.loadFromDataObject(tech);
    }

    loadFromDataObject(tech) {
        this.techId = tech.id;

        const template = templates.instantiateTemplate("template-tech-details-page");

        template.querySelector("#tech-details-name").textContent = tech.name;
        template.querySelector("#tech-details-description").textContent = tech.description;
        template.querySelector("#tech-details-image-container img").src = tech.icon;

        this._populateCost(template, tech);
        this._populateLeadsTo(template, tech);
        this._populatePrerequisites(template, tech);
        this._populateResearchTime(template, tech);
        this._populateUnlocks(template, tech);

        return template;
    }

    ownsDataObject(dataObj) {
        return dataObj.id.startsWith("research_");
    }

    onUnloadBeginning(_event) {
        const historyData = {
            techId: this.techId
        };

        this.techId = null;

        return new PageHistoryState(this, historyData);
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

            const itemLink = widgets.createInAppLink(costType);
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
            const link = widgets.createInAppLink(techId);

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
                const link = widgets.createInAppLink(prereq);

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
                const link = widgets.createInAppLink(prereq);

                div.appendChild(link);
                prereqsContainer.appendChild(div);
            }
        }

        if (tech.prerequisites && tech.prerequisites.missions) {
            for (let i = 0; i < tech.prerequisites.missions.length; i++) {
                hasPrereqs = true;

                let missionName = tech.prerequisites.missions[i].replace("mission_", "").replace("_downed", "");
                missionName = utils.capitalizeEachWord(missionName);

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

    _populateResearchTime(template, tech) {
        // TODO calculate the real time based on user input for # of labs, scientists, etc
        template.querySelector("#tech-details-time").textContent = tech.base_time_in_days;
    }

    _populateUnlocks(template, tech) {
        const unlocksContainer = template.querySelector("#tech-details-unlocks");

        // UFO analysis is special; none of them have conventional unlocks
        if (tech.id.includes("ufo_analysis")) {
            const sectionHeader = template.querySelector("#tech-details-unlocks-heading");
            sectionHeader.textContent = "Research Benefits";

            const div = document.createElement("div");
            const ul = document.createElement("ul");
            div.appendChild(ul);

            let li = document.createElement("li");
            li.textContent = "XCOM's aircraft gain a 10% damage bonus against UFOs of this type";
            ul.appendChild(li);

            li = document.createElement("li");
            li.innerHTML = "20% more " + widgets.createInAppLink("item_alien_alloy").outerHTML + " and " + widgets.createInAppLink("item_elerium").outerHTML + " salvaged from UFOs of this type";
            ul.appendChild(li);

            li = document.createElement("li");
            li.innerHTML = "If the " + widgets.createInAppLink("foundry_ufo_scanners").outerHTML + " Foundry project is complete, the health of UFOs of this type is visible during interception";
            ul.appendChild(li);

            unlocksContainer.appendChild(div);

            return;
        }


        // TODO make all unlocks into links
        if (tech.unlocks.councilRequests) {
            for (let i = 0; i < tech.unlocks.councilRequests.length; i++) {
                const request = tech.unlocks.councilRequests[i];

                const div = document.createElement("div");
                div.appendChild(widgets.createInAppLink(request, { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.unlocks.facilities) {
            for (let i = 0; i < tech.unlocks.facilities.length; i++) {
                const div = document.createElement("div");
                div.appendChild(widgets.createInAppLink(tech.unlocks.facilities[i], { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.unlocks.geneMods) {
            for (let i = 0; i < tech.unlocks.geneMods.length; i++) {
                const div = document.createElement("div");
                div.appendChild(widgets.createInAppLink(tech.unlocks.geneMods[i], { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.unlocks.foundryProjects) {
            for (let i = 0; i < tech.unlocks.foundryProjects.length; i++) {
                const div = document.createElement("div");
                div.appendChild(widgets.createInAppLink(tech.unlocks.foundryProjects[i], { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.unlocks.items) {
            for (let i = 0; i < tech.unlocks.items.length; i++) {
                const div = document.createElement("div");
                div.appendChild(widgets.createInAppLink(tech.unlocks.items[i], { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.unlocks.psiAbilities) {
            for (let i = 0; i < tech.unlocks.psiAbilities.length; i++) {
                const div = document.createElement("div");
                div.appendChild(widgets.createInAppLink(tech.unlocks.psiAbilities[i], { addPrefix: true }));

                unlocksContainer.appendChild(div);
            }
        }

        if (tech.grants_research_credit) {
            const credit = utils.capitalizeEachWord(tech.grants_research_credit);

            const div = document.createElement("div");
            div.textContent = "Research and Foundry Credit: " + credit;
            unlocksContainer.appendChild(div);
        }
    }
}

module.exports.TechDetailsPage = TechDetailsPage;