import { AppPage, PageHistoryState } from "./app-page.js";
import * as AppEvents from "../app-events.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Settings from "../settings.js";
import * as Utils from "../utils.js";

class CampaignPlannerPage extends AppPage {

    static pageId = "campaign-planner-page";

    #activeCampaign = null;
    #currentView = null;

    // Research view variables
    #projectElements = [];
    #researchList = null;

    async load(data) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/campaign-planner-page.html", "template-campaign-planner-page");

        const currentCampaignId = await Settings.getCurrentCampaignId();

        if (currentCampaignId && currentCampaignId !== Settings.DELIBERATELY_NONE_CAMPAIGN_ID) {
            this._loadCampaign(template);
        }
        else {
            // TODO show a screen when no campaign is active
        }

        AppEvents.registerEventListener("campaignDataChanged", data => {
            if (this.#currentView === "research" && data.propertyName === "daysPassed" || data.propertyName === "researchQueue") {
                this._recreateResearchQueue();
            }

            this._populateFacilitiesData(document);
        });

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/strategy-layer-icon.png",
                text: "Campaign Planner"
            }
        };
    }

    async _loadCampaign(pageContainer) {
        this.#activeCampaign = await Settings.getCurrentCampaign();

        const viewSelectorItems = [...pageContainer.querySelectorAll(".view-selector-item")];
        viewSelectorItems.forEach(item => item.addEventListener("click", this._onViewSelectorItemClicked.bind(this)));

        return this._loadView("research", pageContainer);
    }

    async _loadView(viewId, pageContainer) {
        let template = null;
        this.#currentView = viewId;

        switch(viewId) {
            case "facilities":
                template = await this._loadFacilitiesView();
                break;
            case "research":
                template = await this._loadResearchView();
                break;
            case "settings":
                template = await this._loadSettingsView();
                break;
        }

        if (template != null) {
            pageContainer.querySelector("#campaign-planner-active-view-container").replaceChildren(template);
        }
    }

    _onViewSelectorItemClicked(event) {
        if (event.target.disabled || event.target.classList.contains("selected")) {
            return;
        }

        const viewSelectorItems = [...document.querySelectorAll(".view-selector-item")];
        viewSelectorItems.forEach(item => item.classList.remove("selected"));
        event.target.classList.add("selected");

        this._loadView(event.target.dataset.view, document);
    }

    // #region Facilities view functions

    async _loadFacilitiesView() {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/campaign-planner-page.html", "template-campaign-planner-facilities-view");

        template.querySelector("facility-planner").addEventListener("facilityChanged", this._onFacilityChanged.bind(this));

        this._populateFacilitiesData(template);

        return template;
    }

    async _onFacilityChanged() {
        this._populateFacilitiesData(document);
    }

    _populateFacilitiesData(pageContainer) {
        if (this.#currentView !== "facilities") {
            return;
        }

        const hqPower = this.#activeCampaign.getPower(this.#activeCampaign.daysPassed);
        pageContainer.querySelector("#power-used").textContent = hqPower.inUse;
        pageContainer.querySelector("#power-available").textContent = hqPower.available;
        pageContainer.querySelector("#power-container").style.color = hqPower.inUse > hqPower.available ? "var(--color-red)" : "";

        pageContainer.querySelector("#maintenance").textContent = this.#activeCampaign.getMaintenanceCost(this.#activeCampaign.daysPassed);
        pageContainer.querySelector("#satellites").textContent = this.#activeCampaign.getMaxNumSatellites(this.#activeCampaign.daysPassed);

        const numLabs = this.#activeCampaign.numFacilities("facility_laboratory", this.#activeCampaign.daysPassed);
        const numLabAdjacencies = this.#activeCampaign.numAdjacencies("laboratory", this.#activeCampaign.daysPassed);
        const labSpeedupPercent = 20 * numLabs + 10 * numLabAdjacencies;
        pageContainer.querySelector("#research-speed-increase").textContent = labSpeedupPercent;

        const numWorkshops = this.#activeCampaign.numFacilities("facility_workshop", this.#activeCampaign.daysPassed);
        const numWorkshopAdjacencies = this.#activeCampaign.numAdjacencies("workshop", this.#activeCampaign.daysPassed);
        const rebatePercentage = Utils.calculateRebatePercentage(numWorkshops, numWorkshopAdjacencies);

        pageContainer.querySelector("#workshop-rebate").textContent = Math.roundTo(100 * (1 - rebatePercentage), 1);
    }

    // #endregion

    // #region Research view functions

    _getSortedResearch() {
        const techs = Object.values(DataHelper.technologies);

        // TODO: sorting researches by how far they are from being possible (i.e. number of unsatisfied prereqs in their tree)
        //       would probably be more useful than sorting by name

        techs.sort((a, b) => {
            const firstComplete = this.#activeCampaign.isResearchComplete(a.id, this.#activeCampaign.daysPassed);
            const secondComplete = this.#activeCampaign.isResearchComplete(b.id, this.#activeCampaign.daysPassed);

            // Completed research goes after incomplete research
            if (firstComplete && !secondComplete) {
                return 1;
            }

            if (!firstComplete && secondComplete) {
                return -1;
            }

            const firstQueuePosition = this.#activeCampaign.getPositionInResearchQueue(a.id);
            const secondQueuePosition = this.#activeCampaign.getPositionInResearchQueue(b.id);

            // Queued items are always at the very top of the list
            if (firstQueuePosition !== -1 || secondQueuePosition !== -1) {
                if (firstQueuePosition !== -1 && secondQueuePosition !== -1) {
                    return firstQueuePosition < secondQueuePosition ? -1 : 1;
                }

                if (firstQueuePosition !== -1) {
                    return -1;
                }
                else {
                    return 1;
                }
            }

            const firstAvailable = this.#activeCampaign.canResearch(a.id);
            const secondAvailable = this.#activeCampaign.canResearch(b.id);

            // Available research comes before inaccessible research
            if (firstAvailable && !secondAvailable) {
                return -1;
            }

            if (!firstAvailable && secondAvailable) {
                return 1;
            }

            return a.name.localeCompare(b.name);
        });

        return techs;
    }

    async _loadResearchView() {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/campaign-planner-page.html", "template-campaign-planner-research-view");

        // TODO: it would be nice to warn if you try to pick Alien Computers as the first research since it's literally impossible to start on March 1st

        const sortedTechs = this._getSortedResearch();
        this.#researchList = template.querySelector("#research-list");

        for (let i = 0; i < sortedTechs.length; i++) {
            const tech = sortedTechs[i];
            const techElem = document.createElement("research-project");

            techElem.researchId = tech.id;
            techElem.addEventListener("addedToQueue", this._recreateResearchQueue.bind(this));
            techElem.addEventListener("completed", this._recreateResearchQueue.bind(this));
            techElem.addEventListener("removedFromQueue", this._recreateResearchQueue.bind(this));

            this.#projectElements[i] = techElem;
            this.#researchList.append(techElem);
        }

        return template;
    }

    _recreateResearchQueue() {
        const sortedTechs = this._getSortedResearch();

        for (let i = 0; i < sortedTechs.length; i++) {
            if (sortedTechs[i].id !== this.#projectElements[i].researchId) {
                this.#projectElements[i].researchId = sortedTechs[i].id;
            }
            else {
                this.#projectElements[i]._populateData();
            }
        }
    }

    // #endregion

    // #region Settings view functions

    async _loadSettingsView() {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/campaign-planner-page.html", "template-campaign-planner-settings-view");

        template.querySelector("#campaign-name").textContent = this.#activeCampaign.name;
        template.querySelector("#campaign-difficulty").textContent = this.#activeCampaign.difficulty;
        template.querySelector("#campaign-starting-country").textContent = this.#activeCampaign.startingCountry;
        template.querySelector("#campaign-starting-bonus").textContent = this.#activeCampaign.startingCountryBonusIndex;

        return template;
    }

    // #endregion
}

export default CampaignPlannerPage;