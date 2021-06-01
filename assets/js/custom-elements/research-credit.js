import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";
import * as Widgets from "../widgets.js";

customElements.define("research-credit",
    class extends HTMLElement {
        constructor() {
            super();

            Templates.instantiateTemplate("assets/html/templates/custom-elements/research-credit.html", "template-research-credit").then(template => {
                const nameContainer = template.querySelector("#name");
                const prereqContainer = template.querySelector("#research-prereq");
                const foundryBenefitsContainer = template.querySelector("#benefits-foundry");
                const researchBenefitsContainer = template.querySelector("#benefits-research");

                if (this.isHeader) {
                    nameContainer.textContent = "Credit Type";
                    prereqContainer.textContent = "Granted By";
                    foundryBenefitsContainer.textContent = "Applicable Foundry Projects";
                    researchBenefitsContainer.textContent = "Applicable Research";
                }
                else {
                    const credit = DataHelper.researchCredits[this.creditType];
                    const researchLink = Widgets.createInAppLink(credit.grantedBy);

                    nameContainer.textContent = credit.name;
                    prereqContainer.appendChild(researchLink);

                    if (this.creditType === "all") {
                        foundryBenefitsContainer.textContent = "All Foundry Projects";
                        researchBenefitsContainer.textContent = "All Research";
                    }
                    else {
                        for (let i = 0; i < credit.benefitsFoundryProjects.length; i++) {
                            const project = credit.benefitsFoundryProjects[i];
                            Utils.appendElement(foundryBenefitsContainer, "div", Widgets.createInAppLink(project));
                        }

                        for (let i = 0; i < credit.benefitsResearch.length; i++) {
                            const tech = credit.benefitsResearch[i];
                            Utils.appendElement(researchBenefitsContainer, "div", Widgets.createInAppLink(tech));
                        }
                    }
                }

                this.appendChild(template);
            });
        }

        get creditType() {
            return this.getAttribute("creditType");
        }

        set creditType(creditType) {
            this.setAttribute("creditType", creditType);
        }

        get isHeader() {
            return this.hasAttribute("isHeader");
        }

        set isHeader(isHeader) {
            if (isHeader) {
                this.setAttribute("isHeader", "");
            }
            else {
                this.removeAttribute("isHeader");
            }
        }
    }
);
