import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";
import * as Utils from "../utils.js";

class BaseFacilityPage extends AppPage {

    static pageId = "base-facility-page";

    #facilityId = null;

    static async generatePreview(data) {
        if (!data.facilityId) {
            return null;
        }

        const facility = DataHelper.baseFacilities[data.facilityId];

        if (!facility) {
            return null;
        }

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/base-facility-page.html", "template-base-facility-preview");
        template.querySelector(".preview-img-schematic").src = facility.icon;
        template.querySelector(".preview-title").textContent = facility.name;
        template.querySelector(".preview-description").textContent = Utils.truncateText(facility.description, 300);

        return template;
    }

    async load(data) {
        const facility = DataHelper.baseFacilities[data.facilityId];

        return this.loadFromDataObject(facility);
    }

    async loadFromDataObject(facility) {
        this.#facilityId = facility.id;

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/base-facility-page.html", "template-base-facility-page");

        template.querySelector(".details-header-title").textContent = facility.name;
        template.querySelector(".details-header-description").textContent = facility.description;
        template.querySelector(".details-header-img-container img").src = facility.icon;
        template.querySelector("#base-facility-details").innerHTML = facility.tactical_text;
        template.querySelector("#base-facility-maintenance-cost").textContent = "§" + facility.maintenance_cost;

        this._addBulletPoints(template, facility);
        this._populateAdjacencyBonus(template, facility);
        this._populateBuildSection(facility.normal_build, template.querySelector("#base-facility-normal-build-cost-container"));
        this._populateBuildSection(facility.quick_build, template.querySelector("#base-facility-quick-build-cost-container"));
        this._populatePower(template, facility);
        this._populatePrerequisite(template, facility);

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/engineering.png",
                text: "Base Facility Details"
            }
        };
    }

    makeHistoryState() {
        return new PageHistoryState(this, { facilityId: this.#facilityId });
    }

    ownsDataObject(dataObj) {
        return dataObj.id.startsWith("facility_");
    }

    _addBulletPoints(template, facility) {
        const ul = template.querySelector("#base-facility-details ul");
        ul.classList.add("details-list");

        const addBulletPoint = function(html) {
            const listItem = document.createElement("li");
            listItem.innerHTML = html;
            ul.appendChild(listItem);
        };

        if (!facility.can_be_deconstructed) {
            addBulletPoint("Cannot be torn down once built");
        }
    }

    _populateAdjacencyBonus(template, facility) {
        const element = template.querySelector("#base-facility-adjacency-type");

        if (!facility.adjacency_type) {
            element.textContent = "None";
            return;
        }

        const adjacencies = {
            laboratory: {
                name: "Laboratory",
                helpText: "Counts as half an additional Laboratory for each adjacency."
            },
            power: {
                name: "Power",
                helpText: "Grants an additional +3 power to XCOM HQ for each adjacency."
            },
            satellite: {
                name: "Satellite",
                helpText: "XCOM HQ can support +1 additional satellite for each adjacency."
            },
            workshop: {
                name: "Workshop",
                helpText: "Counts as half an additional Workshop for each adjacency."
            }
        };

        element.textContent = adjacencies[facility.adjacency_type].name;
        element.appendChild(Widgets.createHelpIcon(adjacencies[facility.adjacency_type].helpText));
    }

    _populateBuildSection(buildData, containerElement) {
        const addCostRow = function(label, content) {
            const div = document.createElement("div");
            div.classList.add("base-facility-cost-type");

            const labelSpan = document.createElement("span");
            labelSpan.classList.add("base-facility-cost-quantity");
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

        addCostRow("Time:", buildData.build_time_days + " days");

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
    }

    _populatePower(template, facility) {
        template.querySelector("#base-facility-power-label").textContent = facility.power_usage < 0 ? "Power Provided" : "Power Consumed";
        template.querySelector("#base-facility-power-value").textContent = Math.abs(facility.power_usage); // TODO color this
    }

    _populatePrerequisite(template, facility) {
        const prereqsContainer = template.querySelector("#base-facility-prerequisite");

        if (!facility.research_prerequisite) {
            const div = document.createElement("div");
            div.textContent = "None";
            prereqsContainer.appendChild(div);

            return;
        }

        const div = document.createElement("div");
        const link = Widgets.createInAppLink(facility.research_prerequisite);

        div.appendChild(link);
        prereqsContainer.appendChild(div);
    }
}

export default BaseFacilityPage;