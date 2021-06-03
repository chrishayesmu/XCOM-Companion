import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";

customElements.define("base-facility-browse-preview",
    class extends HTMLElement {
        constructor() {
            super();

            const container = this;
            const facility = DataHelper.baseFacilities[this.facilityId];

            Templates.instantiateTemplate("assets/html/templates/custom-elements/base-facilities.html", "template-base-facility-browse-preview").then(template => {
                let researchLink = null;
                if (facility.research_prerequisite) {
                    researchLink = Widgets.createInAppLink(facility.research_prerequisite);
                }
                else {
                    researchLink = document.createElement("span");
                    researchLink.textContent = "-";
                }

                template.querySelector("#name").appendChild(Widgets.createInAppLink(facility, { disablePreview: true }));
                template.querySelector("#description").textContent = facility.description;
                template.querySelector("#maintenance-cost").textContent = "§" + facility.maintenance_cost;
                template.querySelector("#research-prereq").appendChild(researchLink);
                template.querySelector("#cost-money").textContent = "§" + (facility.normal_build.cost.money || 0);
                template.querySelector("#cost-alien-alloys").textContent = facility.normal_build.cost.item_alien_alloy || 0;
                template.querySelector("#cost-elerium").textContent = facility.normal_build.cost.item_elerium || 0;

                this._populatePowerUsage(facility, template);
                this._populateOtherCosts(facility, template);

                container.innerHTML = template.outerHTML;
            });
        }

        get facilityId() {
            return this.getAttribute("facilityId");
        }

        set facilityId(facilityId) {
            this.setAttribute("facilityId", facilityId);
        }

        _populatePowerUsage(facility, template) {
            const element = template.querySelector("#power-usage");
            const sign = facility.power_usage > 0 ? "-" : "+"; // deliberately inverted
            const color = facility.power_usage > 0 ? "var(--color-red)" : "var(--color-green)";

            element.innerHTML = `<span style="color: ${color}">${sign}${Math.abs(facility.power_usage)}</span>`;
        }

        _populateOtherCosts(facility, template) {
            const costContainer = template.querySelector("#cost-other");
            const ignoredCostTypes = [ "money", "item_alien_alloy", "item_elerium" ];

            let hasOtherCosts = false;

            for (let itemId in facility.normal_build.cost) {
                if (ignoredCostTypes.includes(itemId)) {
                    continue;
                }

                hasOtherCosts = true;
                const prefix = facility.normal_build.cost[itemId] + "x ";
                costContainer.appendChild(Widgets.createInAppLink(itemId, { addPrefix: true, prefixText: prefix } ));
            }

            if (!hasOtherCosts) {
                costContainer.textContent = "-";
            }
        }
    }
);

customElements.define("base-facility-browse-preview-header",
    class extends HTMLElement {
        constructor() {
            super();

            const container = this;

            Templates.instantiateTemplate("assets/html/templates/custom-elements/base-facilities.html", "template-base-facility-browse-preview-header").then(template => {
                container.innerHTML = template.outerHTML;
            });
        }
    }
);