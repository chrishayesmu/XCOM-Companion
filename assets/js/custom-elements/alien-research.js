import * as Templates from "../templates.js";
import * as Utils from "../utils.js";

class AlienResearch extends HTMLElement {

    static get observedAttributes() {
        return [ "amount", "hideresearch", "showdate" ];
    }

    attributeChangedCallback() {
        this._recreateContents();
    }

    _recreateContents() {
        if (!this.hasAttribute("amount")) {
            return;
        }

        Templates.instantiateTemplate("assets/html/templates/custom-elements/alien-research.html", "template-alien-research").then(template => {
            this.innerHTML = "";

            const amountContainer = template.querySelector(".ar-amount");
            const maxDateContainer = template.querySelector(".ar-max-date");
            const campaignDate = Utils.formatCampaignDate(Utils.dateByDaysPassed(this.amount));

            amountContainer.textContent = "Alien Research " + this.amount;
            maxDateContainer.textContent = this.amount > 0 ? campaignDate : "Campaign Start";

            if (this.hideResearch) {
                amountContainer.classList.add("hidden-collapse");
            }
            else {
                // Only add parentheses around date if we're showing research value
                maxDateContainer.textContent = `(${maxDateContainer.textContent})`;
            }

            if (!this.showDate) {
                maxDateContainer.classList.add("hidden-collapse");

                amountContainer.setAttribute("data-tooltip-text", `The latest point at which the aliens will have this much research is <strong>${campaignDate}</strong>.`);
            }

            this.appendChild(template);
        });
    }

    get hideResearch() {
        return this.hasAttribute("hideResearch");
    }

    set hideResearch(hideResearch) {
        if (hideResearch) {
            this.setAttribute("hideResearch", "");
        }
        else {
            this.removeAttribute("hideResearch");
        }
    }

    get showDate() {
        return this.hasAttribute("showDate");
    }

    set showDate(showDate) {
        if (showDate) {
            this.setAttribute("showDate", "");
        }
        else {
            this.removeAttribute("showDate");
        }
    }

    get amount() {
        return this.getAttribute("amount");
    }

    set amount(amount) {
        this.setAttribute("amount", amount);
    }
}

customElements.define("alien-research", AlienResearch);