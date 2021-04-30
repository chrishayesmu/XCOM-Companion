import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";
import * as Utils from "../utils.js";

class FoundryProjectDisplayPage extends AppPage {
    constructor() {
        super("foundry-project-display-page");

        this.projectId = null;
    }

    async generatePreview(data) {
        if (!data.projectId) {
            return null;
        }

        const project = DataHelper.foundryProjects[data.projectId];

        if (!project) {
            return null;
        }

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/foundry-project-display-page.html", "template-foundry-preview");
        template.querySelector("#foundry-preview-icon img").src = project.icon;
        template.querySelector("#foundry-preview-name").textContent = project.name;
        template.querySelector("#foundry-preview-description").textContent = Utils.truncateText(project.description, 300);

        return template;
    }

    async load(hostingElement, event, data) {
        if (!data.projectId) {
            return null;
        }

        const project = DataHelper.foundryProjects[data.projectId];
        return this.loadFromDataObject(project);
    }

    async loadFromDataObject(project) {
        this.projectId = project.id;

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/foundry-project-display-page.html", "template-foundry-project-display-page");

        template.querySelector("#foundry-project-name").textContent = project.name;
        template.querySelector("#foundry-project-description").textContent = project.description;
        template.querySelector("#foundry-project-image-container img").src = project.icon;

        this._populateBeneficialCredits(template, project);
        this._populateBenefits(template, project);
        this._populateCost(template, project);
        this._populatePrerequisites(template, project);
        this._populateProjectTime(template, project);
        this._populateUnlocks(template, project);

        return template;
    }

    onUnloadBeginning(_event) {
        const historyData = {
            projectId: this.projectId
        };

        return new PageHistoryState(this, historyData);
    }

    ownsDataObject(dataObj) {
        return dataObj.id.startsWith("foundry_");
    }

    _populateBeneficialCredits(template, project) {
        const container = template.querySelector("#foundry-project-research-credits");

        if (!project.benefits_from_credits) {
            container.textContent = "No associated research credits";
            //container.classList.add("hidden-collapse");
            return;
        }

        const creditLinks = project.benefits_from_credits.map(creditType => {
            const sourceTech = DataHelper.getResearchCreditSource(creditType);
            return Widgets.createInAppLink(sourceTech, {
                disablePreview: true,
                linkText: Utils.capitalizeEachWord(creditType, "_", " ")
            }).outerHTML;
        });

        container.innerHTML = "Benefits from " + creditLinks.join(", ") + " research credit";

        if (creditLinks.length > 1) {
            container.innerHTML += "s";
        }
    }

    _populateBenefits(template, project) {
        const benefitsContainer = template.querySelector("#foundry-project-benefits");

        if (!project.tactical_text && !project.unlocks) {
            const div = document.createElement("div");
            const ul = document.createElement("ul");
            const li = document.createElement("li");

            li.innerHTML = "<font color='red'>ERROR:</font> benefit data is missing for this project";

            ul.appendChild(li);
            div.appendChild(ul);
            benefitsContainer.appendChild(div);

            return;
        }

        if (project.tactical_text) {
            benefitsContainer.innerHTML = project.tactical_text;
        }

        if (project.unlocks) {
            const div = document.createElement("div");
            const ul = benefitsContainer.querySelector("ul") || document.createElement("ul");
            const li = document.createElement("li");

            li.textContent = "Unlocks a number of items for manufacture in XCOM's Engineering facilities";

            ul.appendChild(li);
            div.appendChild(ul);
            benefitsContainer.appendChild(div);

            return;
        }
    }

    _populateCost(template, project) {
        const container = template.querySelector("#foundry-project-cost-container");

        for (const costType in project.cost) {
            if (costType === "money") {
                continue;
            }

            const div = document.createElement("div");
            div.classList.add("foundry-project-cost-type");

            const span = document.createElement("span");
            span.classList.add("foundry-project-cost-quantity");
            span.textContent = project.cost[costType] + "x";
            div.appendChild(span);

            const itemLink = Widgets.createInAppLink(costType);
            div.appendChild(itemLink);
            container.appendChild(div);
        }
    }

    _populatePrerequisites(template, project) {
        const prereqsContainer = template.querySelector("#foundry-project-prerequisites");

        for (let i = 0; i < project.research_prerequisites.length; i++) {
            const prereq = project.research_prerequisites[i];

            const div = document.createElement("div");
            const link = Widgets.createInAppLink(prereq);

            div.appendChild(link);
            prereqsContainer.appendChild(div);
        }
    }

    _populateProjectTime(template, project) {
        // TODO calculate the real time based on user input for # of labs, scientists, etc
        template.querySelector("#foundry-project-time").textContent = project.base_time_days;
        template.querySelector("#foundry-project-num-engineers").textContent = project.base_engineers;
    }

    _populateUnlocks(template, project) {
        const unlocksContainer = template.querySelector("#foundry-project-unlocks");

        if (!project.unlocks) {
            const div = document.createElement("div");
            div.textContent = "This project does not unlock any items.";
            unlocksContainer.appendChild(div);

            return;
        }

        for (let i = 0; i < project.unlocks.length; i++) {
            const div = document.createElement("div");
            div.appendChild(Widgets.createInAppLink(project.unlocks[i]));

            unlocksContainer.appendChild(div);
        }
    }
}

export default FoundryProjectDisplayPage;