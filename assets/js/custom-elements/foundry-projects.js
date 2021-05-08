import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";

customElements.define('foundry-project-browse-preview',
    class extends HTMLElement {
        constructor() {
            super();

            const container = this;
            const project = DataHelper.foundryProjects[this.projectId];

            Templates.instantiateTemplate("assets/html/templates/custom-elements/foundry-projects.html", "template-foundry-projects-browse-preview").then(template => {
                const researchLink = Widgets.createInAppLink(project.research_prerequisites[0]);

                template.querySelector("#name").appendChild(Widgets.createInAppLink(project, { disablePreview: true }));
                template.querySelector("#description").textContent = project.description;
                template.querySelector("#research-prereq").appendChild(researchLink);
                template.querySelector("#foundry-browse-cost-money").textContent = "§" + (project.cost.money || 0);
                template.querySelector("#foundry-browse-cost-alien-alloys").textContent = project.cost.item_alien_alloy || 0;
                template.querySelector("#foundry-browse-cost-weapon-fragments").textContent = project.cost.item_weapon_fragment || 0;
                template.querySelector("#foundry-browse-cost-elerium").textContent = project.cost.item_elerium || 0;
                template.querySelector("#foundry-browse-cost-meld").textContent = project.cost.item_meld || 0;

                this._populateOtherCosts(project, template);

                container.innerHTML = template.outerHTML;
            });
        }

        get projectId() {
            return this.getAttribute("projectId");
        }

        set projectId(projectId) {
            this.setAttribute("projectId", projectId);
        }

        _populateOtherCosts(project, template) {
            const costContainer = template.querySelector("#foundry-browse-cost-other");
            const ignoredCostTypes = [ "money", "item_alien_alloy", "item_elerium", "item_meld", "item_weapon_fragment" ];

            let hasOtherCosts = false;

            for (let itemId in project.cost) {
                if (ignoredCostTypes.includes(itemId)) {
                    continue;
                }

                hasOtherCosts = true;
                const prefix = project.cost[itemId] + "x ";
                costContainer.appendChild(Widgets.createInAppLink(itemId, { addPrefix: true, prefixText: prefix } ));
            }

            if (!hasOtherCosts) {
                costContainer.textContent = "-";
            }
        }
    }
);

customElements.define('foundry-project-browse-preview-header',
    class extends HTMLElement {
        constructor() {
            super();

            const container = this;

            Templates.instantiateTemplate("assets/html/templates/custom-elements/foundry-projects.html", "template-foundry-projects-browse-preview-header").then(template => {
                container.innerHTML = template.outerHTML;
            });
        }
    }
);