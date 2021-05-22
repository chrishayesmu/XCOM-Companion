import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";
import * as Utils from "../utils.js";

class FoundryProjectDisplayPage extends AppPage {

    static pageId = "foundry-project-display-page";

    #projectId = null;

    static async generatePreview(data) {
        if (!data.projectId) {
            return null;
        }

        const project = DataHelper.foundryProjects[data.projectId];

        if (!project) {
            return null;
        }

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/foundry-project-display-page.html", "template-foundry-preview");
        template.querySelector(".preview-img-schematic").src = project.icon;
        template.querySelector(".preview-title").textContent = project.name;
        template.querySelector(".preview-description").textContent = Utils.truncateText(project.description, 300);

        return template;
    }

    static ownsDataObject(dataObj) {
        return dataObj.id.startsWith("foundry_");
    }

    async load(data) {
        if (!data.projectId) {
            return null;
        }

        const project = DataHelper.foundryProjects[data.projectId];
        return this.loadFromDataObject(project);
    }

    async loadFromDataObject(project) {
        this.#projectId = project.id;

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/foundry-project-display-page.html", "template-foundry-project-display-page");

        template.querySelector(".details-header-title").textContent = project.name;
        template.querySelector(".details-header-description").textContent = project.description;
        template.querySelector(".details-header-img-container img").src = project.icon;

        this._populateBeneficialCredits(template, project);
        this._populateBenefits(template, project);
        this._populateCost(template, project);
        this._populatePrerequisites(template, project);
        this._populateProjectTime(template, project);
        this._populateUnlocks(template, project);

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/foundry.png",
                text: "Foundry Project"
            }
        };
    }

    makeHistoryState() {
        return new PageHistoryState(this, { projectId: this.#projectId });
    }

    _populateBeneficialCredits(template, project) {
        const container = template.querySelector(".details-header-extra");

        if (!project.benefits_from_credits) {
            container.textContent = "No associated research credits";
            return;
        }

        const creditLinks = project.benefits_from_credits.map(creditType => {
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

        container.append(div);
    }

    _populateBenefits(template, project) {
        const benefitsContainer = template.querySelector("#foundry-project-benefits");

        if (!project.tactical_text && !project.unlocks) {
            benefitsContainer.innerHTML = "<font color='red'>ERROR:</font> benefit data is missing for this project";

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
        }

        const ul = benefitsContainer.querySelector("ul");

        if (ul) {
            ul.classList.add("details-list");
        }
    }

    _populateCost(template, project) {
        const container = template.querySelector("#foundry-project-cost-container");

        // Handle money first since it's displayed uniquely
        if (project.cost.money) {
            const div = document.createElement("div");
            div.classList.add("foundry-project-cost-type");
            div.textContent = "Cost: ";

            const span = document.createElement("span");
            span.classList.add("foundry-project-cost-quantity");
            span.innerHTML = "<font color='#32CD32'>§" + project.cost.money + "</font>";
            div.appendChild(span);
            container.appendChild(div);
        }

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