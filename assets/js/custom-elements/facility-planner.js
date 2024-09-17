import * as AppEvents from "../app-events.js";
import * as DataHelper from "../data-helper.js";
import * as Modal from "../modal.js";
import * as Settings from "../settings.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";

const relevantCampaignProperties = [ "daysPassed", "difficulty", "facilityQueue", "startingCountryAndBonus" ];

class FacilityPlanner extends HTMLElement {

    #activeCampaign = null;

    constructor() {
        super();

        this.addEventListener("click", this._onClick.bind(this));

        Templates.instantiateTemplate("assets/html/templates/custom-elements/facility-planner.html", "template-facility-planner").then(template => {
            this.appendChild(template);

            Settings.getCurrentCampaign().then(async campaign => {
                this.#activeCampaign = campaign;
                await this._loadFacilitiesFromCampaign();

                AppEvents.registerEventListener("campaignDataChanged", this._loadFacilitiesFromCampaign.bind(this));
                AppEvents.registerEventListener("campaignDisplaySettingsChanged", this._loadFacilitiesFromCampaign.bind(this));
            });
        });
    }

    _getAdjacencyText(adjacencyType) {
        switch (adjacencyType) {
            case "laboratory":
                return "+10% increase to research speed for every adjacent laboratory.";
            case "power":
                return "+3 power for every adjacent power facility.";
            case "satellite":
                return "+1 satellite capacity for every two uplinks constructed adjacent to one another.";
            case "workshop":
                return "Each adjacency counts as half an additional workshop.";
        }
    }

    async _loadFacilitiesFromCampaign() {
        const liftStatuses = [
            null, // irrelevant, row 0 always has a lift
            this.#activeCampaign.getFacilityStatus(1, 3, this.#activeCampaign.daysPassed),
            this.#activeCampaign.getFacilityStatus(2, 3, this.#activeCampaign.daysPassed),
            this.#activeCampaign.getFacilityStatus(3, 3, this.#activeCampaign.daysPassed)
        ]

        const rowHasAccessLift = [
            true,
            liftStatuses[1].id === "facility_access_lift" && liftStatuses[1].status === "complete",
            liftStatuses[2].id === "facility_access_lift" && liftStatuses[2].status === "complete",
            liftStatuses[3].id === "facility_access_lift" && liftStatuses[3].status === "complete"
        ];

        const campaignDisplaySettings = await Settings.getCampaignDisplaySettings();

        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 7; j++) {
                let facilityStatus = this.#activeCampaign.getFacilityStatus(i, j, this.#activeCampaign.daysPassed);
                const icon = this.querySelector(`.facility-icon[data-row="${i}"][data-column="${j}"]`);
                const spaceIsReachable = this.#activeCampaign.isFacilitySpaceReachable(i, j, this.#activeCampaign.daysPassed);

                if (campaignDisplaySettings.facilities.showPlannedProjects) {
                    // For an unexcavated or empty space, we want to look into the future and show what's planned
                    if (facilityStatus.id === "unexcavated" || (facilityStatus.id === "excavated" && facilityStatus.status === "complete")) {
                        // TODO: it might be better to find the excavation event and show that
                        const futureFacility = this.#activeCampaign.getFacilityStatus(i, j, 100000);
                        futureFacility.status = "future";

                        if (futureFacility.id !== facilityStatus.id) {
                            facilityStatus = futureFacility;
                        }
                    }
                }

                icon.setAttribute("data-facility-id", facilityStatus.id);

                // Clear out any previously set attributes
                icon.removeAttribute("can-build");
                icon.removeAttribute("can-excavate");
                icon.removeAttribute("data-days-remaining");
                icon.removeAttribute("data-ending-days-passed");
                icon.removeAttribute("data-start-date");
                icon.removeAttribute("excavate-cost");
                icon.removeAttribute("needs-access-lift");
                icon.removeAttribute("neighbor-unexcavated");

                // TODO: trying to queue a project needs to check the validity of all future projects in queue (e.g.,
                // we might now be using too much power for a future facility to be built)
                if (facilityStatus.hasFacility) {
                    icon.setAttribute("can-demolish", "");
                }

                if (facilityStatus.status === "building") {
                    const daysRemaining = facilityStatus.queueItem.endingDaysPassed - this.#activeCampaign.daysPassed;

                    icon.setAttribute("data-days-remaining", daysRemaining);
                    icon.setAttribute("data-ending-days-passed", facilityStatus.queueItem.endingDaysPassed);
                }
                else if (facilityStatus.status === "future" && facilityStatus.queueItem) {
                    // This is a preview of a future build
                    const futureStartDate = Utils.dateToInputString(Utils.dateByDaysPassed(facilityStatus.queueItem.startingDaysPassed));
                    icon.setAttribute("data-start-date", futureStartDate);
                }

                if ((j !== 3 && !rowHasAccessLift[i]) || (i > 0 && j === 3 && !rowHasAccessLift[i - 1])) {
                    icon.setAttribute("needs-access-lift", "");
                }
                else if (!spaceIsReachable) {
                    icon.setAttribute("neighbor-unexcavated", "");
                }
                else if (facilityStatus.id === "excavated" && facilityStatus.status === "complete") {
                    icon.setAttribute("can-build", "");
                }
                else if (facilityStatus.id === "unexcavated") {
                    icon.setAttribute("can-excavate", "");
                    icon.setAttribute("excavate-cost", this.#activeCampaign.getExcavationCost(i));
                }
            }
        }
    }

    async _onClick(event) {
        const facilityId = event.target.dataset.facilityId;
        const targetColumn = Number(event.target.dataset.column);
        const targetRow = Number(event.target.dataset.row);

        if (event.target.hasAttribute("can-excavate")) {
            this.#activeCampaign.enqueueExcavation(targetRow, targetColumn, this.#activeCampaign.daysPassed);

            await this._loadFacilitiesFromCampaign();

            const customEvent = new CustomEvent("facilityChanged");
            this.dispatchEvent(customEvent);
        }
        else if (event.target.hasAttribute("data-days-remaining") || event.target.hasAttribute("data-start-date")) {
            if (facilityId === "excavated" && this.#activeCampaign.isExcavationRequiredForValidity(targetRow, targetColumn)) {
                Modal.message("You cannot cancel this excavation because a future project depends on it.", "Excavation Required");
                return;
            }

            // TODO: if canceling an excavation, need to also cancel anything building after it, and any future excavations/builds depending on it
            // Canceling an ongoing project
            const message = facilityId === "excavated" ? "Are you sure you want to cancel this excavation?" : "Are you sure you want to cancel this facility's construction?";
            const confirmed = await Modal.confirm(message, "Cancel Facility");

            if (!confirmed) {
                return;
            }

            const queueIndex = this.#activeCampaign.facilityQueue.findIndex( queueItem => queueItem.resultDataId === facilityId
                                                                          && queueItem.row === targetRow
                                                                          && queueItem.column === targetColumn);

            this.#activeCampaign.cancelConstruction(queueIndex);

            await this._loadFacilitiesFromCampaign();

            const customEvent = new CustomEvent("facilityChanged");
            this.dispatchEvent(customEvent);
        }
        else if (event.target.hasAttribute("can-build")) {
            const template = await Templates.instantiateTemplate("assets/html/templates/custom-elements/facility-planner.html", "template-facility-planner-build-modal");

            this._updateModal(template, targetRow, targetColumn, true);

            template.querySelector("#facility-to-build").addEventListener("selectionChanged", () => this._updateModal(document, targetRow, targetColumn, /* resetDates */ true));
            template.querySelector("#build-start-date").addEventListener("change", () => this._updateModal(document, targetRow, targetColumn));
            template.querySelector("#build-quickly").addEventListener("change", () => this._updateModal(document, targetRow, targetColumn));
            template.querySelector("#build").addEventListener("click", () => this._queueBuildingSelectedFacility(document, targetRow, targetColumn));
            template.querySelector("#cancel").addEventListener("click", Modal.close);

            Modal.open(template, null, false);
        }
    }

    _populateModalSummary(pageContainer) {
        const selectedFacilityId = pageContainer.querySelector("#facility-to-build").selectedItem.dataset.facilityId;
        const facility = DataHelper.baseFacilities[selectedFacilityId];
        let facilitySummary = facility.description;

        if (facility.adjacency_type) {
            facilitySummary += "<br/><br/>Adjacency Bonus: " + this._getAdjacencyText(facility.adjacency_type);
        }

        pageContainer.querySelector("#selected-facility-name").textContent = facility.name;
        pageContainer.querySelector("#selected-facility-icon").src = facility.icon;
        pageContainer.querySelector("#selected-facility-summary").innerHTML = facilitySummary;
    }

    _populateModalBuildCosts(pageContainer) {
        const costContainer = pageContainer.querySelector("#selected-facility-cost");
        const selectedFacilityId = pageContainer.querySelector("#facility-to-build").selectedItem.dataset.facilityId;
        const facility = DataHelper.baseFacilities[selectedFacilityId];
        const isRushJob = pageContainer.querySelector("#build-quickly").checked;

        let enoughPowerAvailable = true;
        const facilityCost = isRushJob ? facility.quick_build.cost : facility.normal_build.cost;
        const costs = [];

        if (facility.power_usage > 0) {
            const power = this.#activeCampaign.getPower(this.#activeCampaign.daysPassed);
            const available = power.available - power.inUse;
            enoughPowerAvailable = available >= facility.power_usage;
            const color = !enoughPowerAvailable ? "var(--color-red)" : "";
            costs.push(`<span style="color: ${color}">${facility.power_usage} Power</span>`);
        }

        if (selectedFacilityId === "facility_laboratory") {
            const numScientistsRequired = 10 + 10 * this.#activeCampaign.numFacilities("facility_laboratory", this.#activeCampaign.daysPassed);
            costs.push(`${numScientistsRequired} Scientists`);
        }

        if (selectedFacilityId === "facility_workshop") {
            const numEngineersRequired = 10 + 10 * this.#activeCampaign.numFacilities("facility_workshop", this.#activeCampaign.daysPassed);
            costs.push(`${numEngineersRequired} Engineers`);
        }

        // TODO: satellite calculations are not correct, do more testing
        if (selectedFacilityId === "facility_satellite_nexus") {
            const numEngineersRequired = 20 + 10 * (this.#activeCampaign.numFacilities("facility_satellite_uplink", this.#activeCampaign.daysPassed) - 1)
                                            + 20 * this.#activeCampaign.numFacilities("facility_satellite_nexus", this.#activeCampaign.daysPassed);
            costs.push(`${numEngineersRequired} Engineers`);
        }

        if (selectedFacilityId === "facility_satellite_uplink") {
            const numEngineersRequired = 10 + 10 * (this.#activeCampaign.numFacilities("facility_satellite_uplink", this.#activeCampaign.daysPassed) - 1)
                                            + 20 * this.#activeCampaign.numFacilities("facility_satellite_nexus", this.#activeCampaign.daysPassed);
            costs.push(`${numEngineersRequired} Engineers`);
        }

        costs.push("§" + facilityCost.money);

        if (facilityCost.item_elerium) {
            costs.push(facilityCost.item_elerium + "x Elerium");
        }

        if (facilityCost.item_alien_alloy) {
            costs.push(facilityCost.item_alien_alloy + "x Alloys");
        }

        if (facilityCost.item_ufo_flight_computer) {
            costs.push(facilityCost.item_ufo_flight_computer + "x UFO Flight Computer");
        }

        if (facilityCost.item_ufo_power_source) {
            costs.push(facilityCost.item_ufo_power_source + "x UFO Power Source");
        }

        if (facilityCost.item_meld) {
            costs.push(facilityCost.item_meld + "x Meld");
        }

        costContainer.innerHTML = "Required to Build: " + Utils.join(costs, ",");

        // Time to build is included in the costs section
        const buildTimeInHours = this.#activeCampaign.calculateTimeToBuildFacility(selectedFacilityId, isRushJob);
        const days = Math.floor(buildTimeInHours / 24);
        const hours = buildTimeInHours % 24;

        let buildTimeString = "ETA: " + days + " days";

        if (hours > 0) {
            buildTimeString += ", " + hours + " hours";
        }

        costContainer.innerHTML += "<br />" + buildTimeString;

        // Ideally this wouldn't be here but it'll do for now
        if (enoughPowerAvailable) {
            pageContainer.querySelector("#build").classList.remove("disabled");
        }
        else {
            pageContainer.querySelector("#build").classList.add("disabled");
        }
    }

    _populateModalDates(pageContainer, targetRow, targetColumn) {
        const selectedFacilityId = pageContainer.querySelector("#facility-to-build").selectedItem.dataset.facilityId;
        const startDateElem = pageContainer.querySelector("#build-start-date");
        const warningElem = pageContainer.querySelector("#build-start-date-warning");

        if (!startDateElem.value) {
            const earliestBuildDaysPassed = this.#activeCampaign.earliestFacilityBuildDateAsDaysPassed(selectedFacilityId, targetRow, targetColumn);
            const startDaysPassed = Math.max(earliestBuildDaysPassed, this.#activeCampaign.daysPassed); // Don't suggest a build date earlier than the current campaign date
            const earliestBuildDate = Utils.dateByDaysPassed(startDaysPassed);
            const earliestBuildDateString = Utils.dateToInputString(earliestBuildDate);

            startDateElem.min = earliestBuildDateString;
            startDateElem.value = earliestBuildDateString;

            // Warn the user if they can't start this facility on the current date
            if (startDaysPassed !== this.#activeCampaign.daysPassed) {
                warningElem.textContent = `You cannot start construction on this facility until ${Utils.formatCampaignDate(earliestBuildDate)}.`;
                warningElem.classList.remove("hidden-collapse");
            }
            else {
                warningElem.classList.add("hidden-collapse");
            }
        }

        const isRushJob = pageContainer.querySelector("#build-quickly").checked;
        const buildTimeInHours = this.#activeCampaign.calculateTimeToBuildFacility(selectedFacilityId, isRushJob);
        const buildTimeInMs = 1000 * 60 * 60 * buildTimeInHours;

        const startDate = new Date(startDateElem.value + "T00:00:00");
        const endDate = new Date(startDate.getTime() + buildTimeInMs);

        pageContainer.querySelector("#build-end-date").textContent = Utils.formatCampaignDate(endDate);
    }

    async _queueBuildingSelectedFacility(pageContainer, row, column) {
        const selectedFacilityId = pageContainer.querySelector("#facility-to-build").selectedItem.dataset.facilityId;
        const isRushJob = pageContainer.querySelector("#build-quickly").checked;
        const startDateElem = pageContainer.querySelector("#build-start-date");

        const startingDaysPassed = Utils.daysPassedByDate(startDateElem.value);

        this.#activeCampaign.enqueueFacility(selectedFacilityId, row, column, isRushJob, startingDaysPassed);

        Modal.close();

        await this._loadFacilitiesFromCampaign();

        const event = new CustomEvent("facilityChanged");
        this.dispatchEvent(event);
    }

    _updateModal(pageContainer, targetRow, targetColumn, resetDates) {
        if (resetDates) {
            const dateInput = pageContainer.querySelector("#build-start-date");
            dateInput.value = "";
            dateInput.min = "";
        }

        this._updateModalValidOptions(pageContainer, targetRow, targetColumn);
        this._populateModalBuildCosts(pageContainer, targetRow, targetColumn);
        this._populateModalDates(pageContainer, targetRow, targetColumn);
        this._populateModalSummary(pageContainer, targetRow, targetColumn);
    }

    _updateModalValidOptions(pageContainer, targetRow, targetColumn) {
        const list = pageContainer.querySelector("#facility-to-build");

        for (const facility of Object.values(DataHelper.baseFacilities)) {
            let isValid = true;
            let disabledReason = "";

            if (targetColumn !== 3 && facility.id === "facility_access_lift") {
                isValid = false;
                disabledReason = "Access Lifts can only be built in the center column.";
            }
            else if (targetColumn === 3 && facility.id !== "facility_access_lift") {
                isValid = false;
                disabledReason = "Only Access Lifts can be built in the center column.";
            }
            else if (facility.is_unique && this.#activeCampaign.numFacilities(facility.id, 10000, /* includeBuilding */ true) > 0) {
                isValid = false;
                disabledReason = "You can only have one of this facility.";
            }
            else if (facility.research_prerequisite && this.#activeCampaign.getPositionInResearchQueue(facility.research_prerequisite.id) < 0) {
                isValid = false;
                disabledReason = "You are missing the prerequisite research <b>" + facility.research_prerequisite.name + "</b>. You must queue it before attempting to build this facility, and you will not be able to choose a build date prior to the research's completion date.";
            }

            const listItem = list.querySelector(`li[data-facility-id="${facility.id}"]`);
            if (isValid) {
                listItem.classList.remove("disabled");
                listItem.removeAttribute("data-tooltip-text");
            }
            else {
                listItem.classList.add("disabled");
                listItem.setAttribute("data-tooltip-text", disabledReason);
            }
        }

        if (!list.selectedItem || list.selectedItem.classList.contains("disabled")) {
            list.select(list.querySelector("li:not(.disabled)"));
        }
    }
}

customElements.define("facility-planner", FacilityPlanner);