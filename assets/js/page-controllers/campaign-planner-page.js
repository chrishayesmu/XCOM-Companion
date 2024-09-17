import { AppPage, PageHistoryState } from "./app-page.js";
import CampaignCreationWizard from "../campaign-creation-wizard.js";
import * as AppEvents from "../app-events.js";
import * as DataHelper from "../data-helper.js";
import * as Modal from "../modal.js";
import PageManager from "../page-manager.js";
import * as Templates from "../templates.js";
import * as Settings from "../settings.js";
import * as Utils from "../utils.js";

class CampaignPlannerPage extends AppPage {

    static pageId = "campaign-planner-page";

    #activeCampaign = null;
    #currentView = null;

    // Facility view variables
    #showPlannedProjectsCheckbox = null;

    // Research view variables
    #projectElements = [];
    #researchList = null;

    // Timeline view variables
    #timelineElements = [];
    #timelineList = null;

    async load(data) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/campaign-planner-page.html", "template-campaign-planner-page");

        this._loadCampaign(template);

        const viewSelectorItems = [...template.querySelectorAll(".view-selector-item")];
        viewSelectorItems.forEach(item => item.addEventListener("click", this._onViewSelectorItemClicked.bind(this)));

        template.querySelector("#change-campaign").addEventListener("click", this._onChangeCampaignClicked.bind(this));

        const onActiveCampaignChanged = () => {
            this._loadCampaign(document);
        };

        const onCampaignDataChanged = data => {
            if (this.#currentView === "research" && data.propertyName === "daysPassed" || data.propertyName === "researchQueue") {
                this._recreateResearchQueue();
            }

            this._populateFacilitiesData(document);
        };

        AppEvents.registerEventListener("activeCampaignChanged", onActiveCampaignChanged);
        AppEvents.registerEventListener("campaignDataChanged", onCampaignDataChanged);
        AppEvents.registerEventListener("pageChanged", data => {
            if (data.currentPageId !== CampaignPlannerPage.pageId) {
                AppEvents.removeEventListener("campaignDataChanged", onCampaignDataChanged);
                AppEvents.removeEventListener("activeCampaignChanged", onActiveCampaignChanged);
            }
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

        if (this.#activeCampaign) {
            return this._loadView("research", pageContainer);
        }
        else {
            const viewContainer = pageContainer.querySelector("#campaign-planner-active-view-container");

            if (!viewContainer.querySelector("#create-or-load-campaign-warning")) {
                Utils.appendElement(viewContainer, "div", "You must have an active campaign to use the Campaign Planner tool.<br /><br />Click the \"Change Campaign\" link in the top left.", { attributes: { id: "create-or-load-campaign-warning" }});
            }

            // Present the modal to choose or create a campaign
            this._onChangeCampaignClicked();
        }
    }

    async _loadView(viewId, pageContainer) {
        let template = null;
        this.#currentView = viewId;

        this._onViewSelectorItemClicked({
            target: pageContainer.querySelector(`.view-selector-item[data-view="${viewId}"]`)
        });

        switch(viewId) {
            case "facilities":
                template = await this._loadFacilitiesView();
                break;
            case "research":
                template = await this._loadResearchView();
                break;
            case "timeline":
                template = await this._loadTimelineView();
                break;
        }

        if (template != null) {
            pageContainer.querySelector("#campaign-planner-active-view-container").replaceChildren(template);
        }
    }

    async _onChangeCampaignClicked() {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/campaign-planner-page.html", "template-campaign-planner-settings-modal");

        template.querySelector("#delete-campaign").addEventListener("click", this._onDeleteCampaignClicked.bind(this));
        template.querySelector("#load-campaign").addEventListener("click", this._onLoadCampaignClicked.bind(this));
        template.querySelector("#new-campaign").addEventListener("click", this._onNewCampaignClicked.bind(this));

        const allCampaigns = Object.values(await Settings.getAllCampaigns());
        allCampaigns.sort( (a, b) => a.name.localeCompare(b.name));

        const campaignList = template.querySelector("#campaign-list");
        campaignList.addEventListener("selectionChanged", this._onSelectedCampaignChanged.bind(this));

        if (allCampaigns.length === 0) {
            campaignList.replaceWith("You do not have any campaigns saved. Please create a new one to continue.");
        }
        else {
            let selectedItem = null;

            for (const campaign of allCampaigns) {
                const li = Utils.appendElement(campaignList, "li", campaign.name, { classes: [ "campaign-option" ] });
                li.setAttribute("data-campaign-id", campaign.id);

                // Always add a label so each row lines up
                const label = document.createElement("div");
                li.prepend(label);

                if (this.#activeCampaign && campaign.id === this.#activeCampaign.id) {
                    label.classList.add("active-label");
                    label.textContent = "Active";

                    selectedItem = li;
                }
            }

            setTimeout(() => campaignList.select(selectedItem), 20);
        }

        Modal.open(template, null, true);
    }

    _onViewSelectorItemClicked(event) {
        if (event.target.disabled || event.target.classList.contains("selected")) {
            return;
        }

        if (!this.#activeCampaign) {
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
        const campaignDisplaySettings = await Settings.getCampaignDisplaySettings();

        this.#showPlannedProjectsCheckbox = template.querySelector("#show-planned-projects");
        this.#showPlannedProjectsCheckbox.checked = campaignDisplaySettings.facilities.showPlannedProjects;

        template.querySelector("facility-planner").addEventListener("facilityChanged", this._onFacilityChanged.bind(this));
        this.#showPlannedProjectsCheckbox.addEventListener("click", this._onFacilityShowPlannedProjectsChanged.bind(this));

        this._populateFacilitiesData(template);

        return template;
    }

    async _onFacilityChanged() {
        this._populateFacilitiesData(document);
    }

    async _onFacilityShowPlannedProjectsChanged() {
        const displaySettings = await Settings.getCampaignDisplaySettings();

        displaySettings.facilities.showPlannedProjects = this.#showPlannedProjectsCheckbox.checked;
        await Settings.setCampaignDisplaySettings(displaySettings);
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

    // #region Timeline view functions
    async _loadTimelineView() {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/campaign-planner-page.html", "template-campaign-planner-timeline-view");

        const timelineEvents = this._getTimelineEvents();
        this.#timelineList = template.querySelector("#timeline-list");

        for (let i = 0; i < timelineEvents.length; i++) {
            const timelineItem = document.createElement("timeline-item");
            timelineItem.populateFromTimelineEvent(timelineEvents[i], this.#activeCampaign);

            let isFirstEventOfMonth = i === 0;

            if (i > 0) {
                const thisDate = Utils.dateByDaysPassed(timelineEvents[i].daysPassed);
                const previousDate = Utils.dateByDaysPassed(timelineEvents[i-1].daysPassed);

                if (thisDate.getMonth() !== previousDate.getMonth()) {
                    isFirstEventOfMonth = true;
                }
            }

            if (isFirstEventOfMonth) {
                const separator = await Templates.instantiateTemplate("assets/html/templates/pages/campaign-planner-page.html", "template-campaign-planner-timeline-view-separator");
                separator.innerText = Utils.formatCampaignDateAsMonthAndYear(Utils.dateByDaysPassed(timelineEvents[i].daysPassed));

                this.#timelineList.append(separator);
            }

            this.#timelineElements[i] = timelineItem;
            this.#timelineList.append(timelineItem);
        }

        return template;
    }

    _getTimelineEvents() {
        const facilityEvents = this.#activeCampaign.getFacilityEvents();
        const researchEvents = this.#activeCampaign.getResearchEvents();
        const mergedEvents = [...facilityEvents, ...researchEvents];
        const events = [];

        mergedEvents.forEach(e => {
            if (e.startingDaysPassed >= 0) {
                events.push({ dataId: e.dataId, eventType: e.eventType, timelineEvent: "start", daysPassed: e.startingDaysPassed });
            }

            if (e.endingDaysPassed >= 0) {
                events.push({ dataId: e.dataId, eventType: e.eventType, timelineEvent: "end", daysPassed: e.endingDaysPassed });
            }
        });

        // Items (TODO)

        // Council/DLC missions
        let siteReconDaysPassed = 31;
        if (this.#activeCampaign.progenyEnabled) {
            siteReconDaysPassed = 61;

            events.push({ dataId: "portent", eventType: "mission", timelineEvent: "certainThisMonth", daysPassed: 31 });

            const psiLabFacilities = this.#activeCampaign.findFacilityProjectsByType("facility_psionic_labs");

            if (psiLabFacilities.length > 0) {
                const psiLabProject = psiLabFacilities[0]; // can't build more than 1
                const psiLabEndDate = Utils.dateByDaysPassed(psiLabProject.endingDaysPassed);

                // If psi labs finish early enough in the month, give a warning that Deluge is possible in the same month
                // TODO: add a similar warning for the following month in case it doesn't happen
                // TODO: if psi lab is really early, "should happen" should be "will happen"
                let startOfMonthDelugeDate, startOfMonthFuriesDate;
                if (psiLabEndDate.getDate() <= 29) {
                    startOfMonthDelugeDate = new Date(psiLabEndDate);
                    startOfMonthDelugeDate.setDate(0);
                }
                else {
                    startOfMonthDelugeDate = new Date(psiLabEndDate);
                    startOfMonthDelugeDate.setDate(0);
                    startOfMonthDelugeDate.setMonth(startOfMonthDelugeDate.getMonth() + 1);
                }

                // Deluge can't occur before a certain point no matter what
                // TODO: everyone says it's September but XGFundingCouncil seems to suggest it's October? we use Sept here
                if (startOfMonthDelugeDate.getFullYear() === 2016 && startOfMonthDelugeDate.getMonth() < 8) {
                    startOfMonthDelugeDate.setMonth(8, 1);
                }

                startOfMonthFuriesDate = new Date(startOfMonthDelugeDate);
                startOfMonthFuriesDate.setMonth(startOfMonthDelugeDate.getMonth() + 1);

                events.push({ dataId: "deluge", eventType: "mission", timelineEvent: "possibleThisMonth", daysPassed: Utils.daysPassedByDate(startOfMonthDelugeDate) });
                events.push({ dataId: "furies", eventType: "mission", timelineEvent: "possibleThisMonth", daysPassed: Utils.daysPassedByDate(startOfMonthFuriesDate) });
            }
        }

        events.push({ dataId: "site_recon", eventType: "mission", timelineEvent: "likelyThisMonth", daysPassed: siteReconDaysPassed });

        if (this.#activeCampaign.slingshotEnabled) {
            events.push({ dataId: "friends_in_low_places", eventType: "mission", timelineEvent: "instant", daysPassed: 65 });
            events.push({ dataId: "confounding_light", eventType: "mission", timelineEvent: "instant", daysPassed: 120 });
            events.push({ dataId: "gangplank", eventType: "mission", timelineEvent: "instant", daysPassed: 122 });
        }

        const eventTypeToInt = function(eventType) {
            switch (eventType) {
                case "mission":
                    return 3;
                case "research":
                    return 2;
                case "facility":
                    return 1;
                default:
                    return 0;
            }
        };

        events.sort((e1, e2) => {
            if (e1.daysPassed !== e2.daysPassed) {
                return e1.daysPassed - e2.daysPassed;
            }

            if (e1.timelineEvent !== e2.timelineEvent) {
                // When multiple events land on the same day, show the ending ones first so they bracket properly
                // (e.g. you don't start a new research before finishing the current one)
                if (e1.timelineEvent === "start") {
                    return 1;
                }
                else {
                    return -1;
                }
            }

            // Missions before research before facilities
            return eventTypeToInt(e1.eventType) - eventTypeToInt(e2.eventType);
        });

        return events;
    }
    // #endregion

    // #region Campaign selection modal functions

    async _onDeleteCampaignClicked() {
        const campaignList = document.getElementById("campaign-list");

        if (!campaignList.selectedItem) {
            return;
        }

        Modal.close();
        const confirmed = await Modal.confirm("Are you sure you want to delete this campaign? This action is permanent and cannot be undone.", "Confirm Deletion");

        if (!confirmed) {
            return;
        }

        await Settings.deleteCampaign(campaignList.selectedItem.dataset.campaignId);
        PageManager.instance.loadPage(CampaignPlannerPage.pageId);
    }

    async _onLoadCampaignClicked() {
        const campaignList = document.getElementById("campaign-list");

        if (!campaignList.selectedItem) {
            return;
        }

        const campaignId = campaignList.selectedItem.dataset.campaignId;

        if (this.#activeCampaign && this.#activeCampaign.id === campaignId) {
            return;
        }

        if (this.#activeCampaign) {
            await Settings.saveCampaign(this.#activeCampaign);
        }

        await Settings.setCurrentCampaign(campaignId);

        this._loadCampaign(document);
        Modal.close();
    }

    async _onNewCampaignClicked() {
        const wizard = new CampaignCreationWizard();
        wizard.start();
    }

    _onSelectedCampaignChanged(event) {
        if (this.#activeCampaign && this.#activeCampaign.id === event.detail.selectedItem.dataset.campaignId) {
            document.getElementById("load-campaign").classList.add("disabled");
        }
        else {
            document.getElementById("load-campaign").classList.remove("disabled");
        }
    }

    // #endregion
}

export default CampaignPlannerPage;