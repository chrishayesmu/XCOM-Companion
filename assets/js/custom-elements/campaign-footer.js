import * as AppEvents from "../app-events.js";
import * as DataHelper from "../data-helper.js";
import * as Modal from "../modal.js";
import PageManager from "../page-manager.js";
import * as Settings from "../settings.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";

class CampaignFooter extends HTMLElement {

    #activeCampaign = null;
    #shadowRoot = null;

    // Element references
    #campaignDateDisplay = null;
    #campaignDateInput = null;
    #campaignName = null;
    #currentResearch = null;
    #nextDayArrow = null;
    #previousDayArrow = null;
    #numEngineers = null;
    #numScientists = null;

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: "open" });

        let cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = "assets/css/variables.css";
        this.#shadowRoot.appendChild(cssLink);

        cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = "assets/css/custom-elements/campaign-footer.css";
        this.#shadowRoot.appendChild(cssLink);

        Templates.instantiateTemplate("assets/html/templates/custom-elements/campaign-footer.html", "template-campaign-footer").then(template => {
            this.#shadowRoot.appendChild(template);

            this.#campaignDateDisplay = template.querySelector("#campaign-date-replace-target");
            this.#campaignDateInput = template.querySelector("#campaign-date-input");
            this.#campaignName = template.querySelector("#campaign-name");
            this.#currentResearch = template.querySelector("#current-research");
            this.#nextDayArrow = template.querySelector("#next-day");
            this.#previousDayArrow = template.querySelector("#previous-day");
            this.#numEngineers = template.querySelector("#num-engineers");
            this.#numScientists = template.querySelector("#num-scientists");

            this.#campaignDateInput.addEventListener("change", this._onDateSelected.bind(this));
            this.#nextDayArrow.addEventListener("click", () => { this.#activeCampaign.daysPassed++; })
            this.#previousDayArrow.addEventListener("click", () => { this.#activeCampaign.daysPassed--; })

            // Set up tooltip support within the shadow DOM
            const elementsWithTooltips = [... template.querySelectorAll("[data-tooltip-text]")];
            for (const elem of elementsWithTooltips) {
                elem.addEventListener("mouseenter", this._showTooltip.bind(this));
                elem.addEventListener("mouseout", this._hideTooltip.bind(this));
            }

            // Don't register for events until now, since we wouldn't be able to handle them without a template loaded
            AppEvents.registerEventListener("activeCampaignChanged", this._loadCurrentCampaign.bind(this));
            AppEvents.registerEventListener("campaignDataChanged", this._update.bind(this));

            this._loadCurrentCampaign();
        });
    }

    hide() {
        this.classList.add("hidden-collapse");
    }

    show() {
        this.classList.remove("hidden-collapse");
    }

    async _loadCurrentCampaign() {
        this.#activeCampaign = await Settings.getCurrentCampaign();

        if (this.#activeCampaign === null) {
            this.hide();
        }
        else {
            this._update();
            this.show();
        }
    }

    _getCurrentResearch() {
        const daysPassed = this.#activeCampaign.daysPassed;
        const currentResearchItem = this.#activeCampaign.researchQueue.find(item => item.startingDaysPassed <= daysPassed && item.endingDaysPassed > daysPassed);

        if (currentResearchItem) {
            const research = DataHelper.technologies[currentResearchItem.resultDataId];

            return {
                name: research.name,
                daysRemaining: Math.ceil(currentResearchItem.endingDaysPassed - daysPassed)
            };
        }

        return null;
    }

    _onDateSelected(event) {
        const daysPassed = Utils.daysPassedByDate(Utils.dateFromInputString(event.target.value));

        this.#activeCampaign.daysPassed = daysPassed;
    }

    _hideTooltip() {
        PageManager.instance.hideTooltip();
    }

    _showTooltip(event) {
        const tooltipText = event.target.dataset.tooltipText;
        const targetRect = event.target.getBoundingClientRect();

        PageManager.instance.showTooltip(targetRect, tooltipText);
    }

    _update(event) {
        if (event && event.propertyName) {
            // TODO pick which properties we care about
        }

        this.#campaignName.textContent = this.#activeCampaign.name;

        const currentResearch = this._getCurrentResearch();
        if (currentResearch) {
            const daysLabel = currentResearch.daysRemaining === 1 ? "day" : "days";
            this.#currentResearch.textContent = `${currentResearch.name} (${currentResearch.daysRemaining} ${daysLabel})`;
        }
        else {
            this.#currentResearch.textContent = "None";
        }

        const staff = this.#activeCampaign.getStaff(this.#activeCampaign.daysPassed);
        this.#numEngineers.textContent = staff.engineers;
        this.#numScientists.textContent = staff.scientists;

        const campaignDate = Utils.dateByDaysPassed(this.#activeCampaign.daysPassed);
        const dateString = Utils.formatCampaignDate(campaignDate);
        const dateHtml = dateString.replace(", ", "<br/>");
        const dateInputString = Utils.dateToInputString(campaignDate);

        this.#campaignDateDisplay.innerHTML = dateHtml;
        this.#campaignDateInput.value = dateInputString;

        if (this.#activeCampaign.daysPassed === 0) {
            this.#previousDayArrow.classList.add("disabled");
        }
        else {
            this.#previousDayArrow.classList.remove("disabled");
        }
    }
}

customElements.define("campaign-footer", CampaignFooter);