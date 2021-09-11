import * as AppEvents from "./app-events.js";
import * as DataHelper from "./data-helper.js";
import * as Settings from "./settings.js";
import * as Utils from "./utils.js";

// Set up an autosave for the active campaign
let isCampaignDataDirty = false;

AppEvents.registerEventListener("campaignDataChanged", data => {
    isCampaignDataDirty = true;
});

setInterval(async () => {
    if (!isCampaignDataDirty) {
        return;
    }

    // This is returning a reference to a single shared object, so it's not the serialized campaign
    // and we aren't immediately re-saving the same object
    const activeCampaign = await Settings.getCurrentCampaign();

    if (!activeCampaign) {
        console.warn("No active campaign found, but isCampaignDataDirty flag was set");
        return;
    }

    await Settings.saveCampaign(activeCampaign);

    isCampaignDataDirty = false;
}, 1000 * 3);


// Models for estimating how many engineers/scientists will be gained from council requests each week.
// Does not incorporate council missions, some of which are fixed; for example, Portent will always be
// the April mission if Operation Progeny is enabled, and it gives 2 engineers and 2 scientists.

const staffPerWeekModels = {
    average: {
        engineers: [ 0 ],
        scientists: [
            // the only council request to start is satellites for engineers, so no incoming scientists at first
            0, // March 8
            0, // March 15
            1, // March 22
            1, // March 29
            1.5, // April 5
            2, // April 12
            2.5, // April 19
            2, // April 26
            2, // May 3
            2, // May 10
            2, // May 17
            2, // May 24
        ]
    }
};

class CampaignQueueItem {

    constructor(resultDataId, startingDaysPassed, endingDaysPassed) {
        this.startingDaysPassed = startingDaysPassed;
        this.endingDaysPassed = endingDaysPassed;
        this.resultDataId = resultDataId;
    }

    getPrerequisites() {
        const prereqs = {
            foundry: [],
            research: []
        };

        return prereqs;
    }
}

/**
 * Class providing a view of an XCOM campaign which evolves over time. The user queues up their intended actions throughout
 * the campaign - building facilities/items, doing research, etc. Each action is associated with a start date, and its end date
 * is calculated dynamically based on the rest of the campaign state at that time. Changing any action causes all dates to be
 * recalculated.
 */
class XComCampaign {

    #daysPassed = null;
    #difficulty = null;
    #id = null;
    #name = null;
    #exaltEnabled = null;
    #progenyEnabled = null;
    #slingshotEnabled = null;
    #startingCountry = null;
    #startingCountryBonusIndex = null;
    #facilityQueue = null;
    #foundryQueue = null;
    #interceptorQueue = null;
    #itemBuildQueue = null;
    #otsQueue = null;
    #researchQueue = null;
    #satelliteQueue = null;

    constructor(campaignData) {
        // These first values are all required when creating a new campaign
        this.#difficulty = campaignData.difficulty;
        this.#id = campaignData.id;
        this.#name = campaignData.name;

        this.#exaltEnabled = campaignData.exaltEnabled;
        this.#progenyEnabled = campaignData.progenyEnabled;
        this.#slingshotEnabled = campaignData.slingshotEnabled;

        this.#startingCountry = campaignData.startingCountry;
        this.#startingCountryBonusIndex = campaignData.startingCountryBonusIndex;

        // These values are loaded if persisted, else initialized for a new campaign
        this.#facilityQueue = campaignData.facilityQueue || [];
        this.#interceptorQueue = campaignData.interceptorQueue || [];
        this.#itemBuildQueue = campaignData.itemBuildQueue || [];
        this.#otsQueue = campaignData.otsQueue || [];
        this.#researchQueue = campaignData.researchQueue || [];

        if (campaignData.facilityQueue) {
            this.#facilityQueue = campaignData.facilityQueue;
        }
        else {
            this._setUpInitialFacilityQueue();
        }

        if (campaignData.foundryQueue) {
            this.#foundryQueue = campaignData.foundryQueue;
        }
        else {
            this._setUpInitialFoundryProjects();
        }

        if (campaignData.satelliteQueue) {
            this.#satelliteQueue = campaignData.satelliteQueue;
        }
        else {
            this.#satelliteQueue = [];
            this.#satelliteQueue[0] = new CampaignQueueItem("satellite", 0, 0);
            this.#satelliteQueue[0].country = this.#startingCountry;
            this.#satelliteQueue[0].ignoreCost = true;
        }

        this.#daysPassed = campaignData.daysPassed || 0;
    }

    toJsonObj() {
        return {
            daysPassed: this.#daysPassed,
            difficulty: this.#difficulty,
            id: this.#id,
            name: this.#name,
            exaltEnabled: this.#exaltEnabled,
            progenyEnabled: this.#progenyEnabled,
            slingshotEnabled: this.#slingshotEnabled,
            startingCountry: this.#startingCountry,
            startingCountryBonusIndex: this.#startingCountryBonusIndex,
            facilityQueue: this.#facilityQueue,
            foundryQueue: this.#foundryQueue,
            interceptorQueue: this.#interceptorQueue,
            itemBuildQueue: this.#itemBuildQueue,
            otsQueue: this.#otsQueue,
            researchQueue: this.#researchQueue,
            satelliteQueue: this.#satelliteQueue
        };
    }

    calculateFoundryTime(projectId) {
        return 0; // TODO
    }

    calculateResearchTime(researchId, startingDaysPassed) {
        this._validateArgumentPresent(startingDaysPassed);

        let requiredTechHours = this.getCreditAdjustedTechHours(researchId, startingDaysPassed);

        if (researchId.contains("autopsy") || researchId.contains("interrogation")) {
            requiredTechHours = Math.floor(requiredTechHours * this.getWeHaveWaysBonus(startingDaysPassed));
        }

        // Go day-by-day until we've accumulated enough scientist-hours to complete the research
        let currentDay = startingDaysPassed, spentTechHours = 0, spentClockHours = 0;

        while (spentTechHours < requiredTechHours) {
            const researchPerHour = this.getResearchPerHour(currentDay);

            for (let i = 0; i < 24; i++) {
                spentClockHours++;
                spentTechHours += researchPerHour;

                if (spentTechHours >= requiredTechHours) {
                    break;
                }
            }

            currentDay++;
        }

        // TODO: validate these numbers
        return spentClockHours / 24;
        //return Utils.calculateResearchTime(requiredTechHours / 24, 10, this.numFacilities("facility_laboratory", startingDaysPassed), this.numAdjacencies("laboratory", startingDaysPassed), false);
    }

    calculateTimeToBuildFacility(facilityId, isRushJob) {
        const facility = DataHelper.baseFacilities[facilityId];
        const buildTimeHours = 24 * facility.normal_build.build_time_days;

        // TODO: this seems right, could use a little more testing
        const timeFactor = (isRushJob ? 0.5 : 1) * (this.hasBaumeister() ? 0.67 : 1);

        return Math.floor(buildTimeHours * timeFactor);
    }

    cancelConstruction(queueIndex) {
        if (!Number.isFinite(queueIndex) || queueIndex < 0 || queueIndex >= this.#facilityQueue.length) {
            return;
        }

        this.#facilityQueue.splice(queueIndex, 1);

        this.recalculateDates();

        this._fireChangeEvent("facilityQueue");
    }

    canResearch(researchId) {
        const research = DataHelper.technologies[researchId];

        if (research.prerequisites && research.prerequisites.research) {
            for (const prereq of research.prerequisites.research) {
                if (this.getPositionInResearchQueue(prereq.id) < 0) {
                    return false;
                }
            }
        }

        return true;
    }

    dequeueResearch(researchId) {
        const queueIndex = this.getPositionInResearchQueue(researchId);
        if (queueIndex < 0) {
            return; // not in queue
        }

        this.#researchQueue.splice(queueIndex, 1);
        const research = DataHelper.technologies[researchId];

        if (research.leadsTo) {
            for (const downstreamTech of Object.keys(research.leadsTo)) {
                const index = this.getPositionInResearchQueue(downstreamTech);
                if (index >= 0) {
                    this.dequeueResearch(downstreamTech);
                }
            }
        }

        this.recalculateDates();

        this._fireChangeEvent("researchQueue");
    }

    earliestFacilityBuildDateAsDaysPassed(facilityId, row, column) {
        const facility = DataHelper.baseFacilities[facilityId];
        const prereq = facility.research_prerequisite;

        let accessLiftDaysPassed = 0;
        let excavationDaysPassed = 0;
        let prereqDaysPassed = 0;

        if (this.isFacilitySpaceEverOccupied(row, column)) {
            // At the moment, only one facility per space, ever
            return -1;
        }

        // TODO factor in power constraints
        if (prereq) {
            const researchQueueIndex = this.getPositionInResearchQueue(prereq.id);

            if (researchQueueIndex >= 0) {
                prereqDaysPassed = this.#researchQueue[researchQueueIndex].endingDaysPassed;
            }
        }

        // Check if/when we're building an access lift to this level
        for (let i = row - 1; i >= 0; i--) {
            const liftItem = this.#facilityQueue.find(item => item.row === i && item.column === 3 && item.resultDataId === "facility_access_lift");

            if (!liftItem) {
                return -1;
            }

            accessLiftDaysPassed = Math.max(accessLiftDaysPassed, liftItem.endingDaysPassed);
        }

        // If not an access lift, we need to find the first point at which its space is excavated
        if (facilityId !== "facility_access_lift") {
            excavationDaysPassed = this.whenWillSpaceBeExcavated(row, column);

            if (excavationDaysPassed < 0) {
                return -1;
            }
        }

        return Math.max(accessLiftDaysPassed, excavationDaysPassed, prereqDaysPassed, 0);
    }

    earliestItemBuildDateAsDaysPassed(itemId) {

    }

    enqueueExcavation(row, column, startingDaysPassed) {
        const excavationDuration = 5; // TODO convert to hours

        const queueItem = new CampaignQueueItem("excavated", startingDaysPassed, startingDaysPassed + excavationDuration);
        queueItem.row = row;
        queueItem.column = column;

        this.#facilityQueue.push(queueItem);

        this._fireChangeEvent("facilityQueue");
    }

    enqueueFacility(facilityId, row, column, isRushJob, startingDaysPassed) {
        const timeToBuildHours = this.calculateTimeToBuildFacility(facilityId, isRushJob);
        const timeToBuildDays = Math.ceil(timeToBuildHours / 24); // TODO convert everything to hours

        // TODO need to validate that this doesn't conflict with any other queue entries in the given time period

        const queueItem = new CampaignQueueItem(facilityId, startingDaysPassed, startingDaysPassed + timeToBuildDays);
        queueItem.row = row;
        queueItem.column = column;

        // TODO do we need to maintain sorting of the queue?
        this.#facilityQueue.push(queueItem);

        this._fireChangeEvent("facilityQueue");
    }

    enqueueResearch(researchId, enqueueMissingPrereqs) {
        if (this.getPositionInResearchQueue(researchId) >= 0) {
            return; // already in queue
        }

        const research = DataHelper.technologies[researchId];

        if (research.prerequisites && research.prerequisites.research) {
            for (const prereq of research.prerequisites.research) {
                if (this.getPositionInResearchQueue(prereq) < 0) {
                    if (!enqueueMissingPrereqs) {
                        return false;
                    }

                    this.enqueueResearch(prereq.id, enqueueMissingPrereqs);
                }
            }
        }

        let startingDaysPassed = 0;

        if (this.#researchQueue.length > 0) {
            // TODO: change all of this.#to work with hours
            const lastQueueItem = this.#researchQueue.last;

            startingDaysPassed = lastQueueItem.endingDaysPassed;
        }

        const queueItem = new CampaignQueueItem(researchId, startingDaysPassed, startingDaysPassed + this.calculateResearchTime(researchId, startingDaysPassed));
        this.#researchQueue.push(queueItem);

        this._fireChangeEvent("researchQueue");

        return true;
    }

    getCosts(dataId) {
        // TODO
        if (dataId === "item_satellite" && this.hasRoscosmos()) {
            // Roscosmos bonus: half cost satellites

        }
    }

    getCreditAdjustedTechHours(dataId, daysPassed) {
        this._validateArgumentPresent(daysPassed);

        const data = dataId.startsWith("foundry") ? DataHelper.foundryProjects[dataId] : DataHelper.technologies[dataId];
        const beneficialCredits = data.benefits_from_research_credit_types || data.benefits_from_credits;

        let techHours = data.hours || 24 * data.base_time_days;

        // Credit calculations adapted from XGTechTree.GetCreditAdjustedTechHours
        if (beneficialCredits) {
            for (const creditType of beneficialCredits) {
                if (!this.hasResearchCredit(creditType, daysPassed)) {
                    continue;
                }

                let bonusPercent = creditType === "all" ? 0.2 : 0.25;
                bonusPercent += this.getExpertiseBonus(daysPassed);

                let hoursReduced = bonusPercent * techHours;

                if (hoursReduced < 24) {
                    hoursReduced = 24;
                }

                techHours -= hoursReduced;

                // Apparently research can't have its baseline time reduced below 24 hours
                if (techHours < 24 && dataId.startsWith("research")) {
                    techHours = 24;
                }
            }
        }

        return techHours;
    }

    getExcavationCost(row) {
        const baseCost = 10 * Math.pow(2, row);

        return this.hasCheyenneMountain() ? baseCost / 2 : baseCost;
    }

    getFacilityStatus(row, column, daysPassed) {
        const facilitiesInSpace = this._filterQueueStartingByDate(this.#facilityQueue, daysPassed)
                                      .filter(fac => fac.row === row && fac.column === column);

        // TODO: should allow queueing excavation also
        if (facilitiesInSpace.length === 0) {
            return {
                id: "unexcavated",
                status: "unexcavated"
            };
        }

        let latestStartDate = -100, latestQueueItem = null;

        for (const queueItem of facilitiesInSpace) {
            if (queueItem.startingDaysPassed > latestStartDate) {
                latestStartDate = queueItem.startingDaysPassed;
                latestQueueItem = queueItem;
            }
        }

        const status = latestQueueItem.endingDaysPassed <= daysPassed ? "complete" : "building";

        return {
            hasFacility: status === "complete" || status === "building",
            id: latestQueueItem.resultDataId,
            status: status,
            queueItem: latestQueueItem
        };
    }

    getMaintenanceCost(daysPassed) {
        let totalCost = 0;

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 7; j++) {
                const facilityStatus = this.getFacilityStatus(i, j, daysPassed);

                if (facilityStatus.status === "complete" && facilityStatus.id.startsWith("facility")) {
                    const facility = DataHelper.baseFacilities[facilityStatus.id];

                    let cost = facility.maintenance_cost;

                    if (["laboratory", "workshop"].includes(facility.adjacencyType) && this.hasArchitectsOfTheFuture()) {
                        cost = Math.floor(0.7 * cost);
                    }
                    else if (facility.adjacencyType === "power" && this.hasPowerToThePeople()) {
                        cost = Math.floor(0.7 * cost);
                    }

                    totalCost += cost;
                }
            }
        }

        // TODO include aircraft maintenance, and split them out for reporting purposes (incl interceptor/firestorm)

        return totalCost;
    }

    getMaxNumSatellites(daysPassed) {
        this._validateArgumentPresent(daysPassed);

        return 2 * this.numFacilities("facility_satellite_nexus", daysPassed) + this.numFacilities("facility_satellite_uplink", daysPassed) + this.numAdjacencies("satellite", daysPassed);
    }

    getPower(daysPassed) {
        this._validateArgumentPresent(daysPassed);

        const power = {
            inUse: 12, // static load
            available: this.#difficulty === "normal" ? 32 : 30
        };

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 7; j++) {
                const facilityStatus = this.getFacilityStatus(i, j, daysPassed);

                if (facilityStatus.hasFacility && facilityStatus.id.startsWith("facility")) {
                    const facility = DataHelper.baseFacilities[facilityStatus.id];

                    if (facility.power_usage > 0) {
                        power.inUse += facility.power_usage;
                    }
                    else {
                        power.available += -1 * facility.power_usage;
                    }
                }
            }
        }

        power.available += 3 * this.numAdjacencies("power", daysPassed);

        return power;
    }

    getResearchPerHour(daysPassed) {
        const adjacencyBonus = this.hasJaiVidwan(daysPassed) ? 0.15 : 0.1;
        const labBonus = 0.2;
        const numLabs = this.numFacilities("facility_laboratory", daysPassed);
        const numAdjacencies = this.numAdjacencies("laboratory", daysPassed);
        const staff = this.getStaff(daysPassed);

        return Math.floor(staff.scientists * (1 + (labBonus * numLabs) + (adjacencyBonus * numAdjacencies)));
    }

    getSellPrice(itemId, daysPassed) {
        this._validateArgumentPresent(daysPassed);

        const item = DataHelper.items[itemId];

        if (!item.sell_value) {
            return 0;
        }

        if (itemId.contains("corpse")) {
            return Math.floor(this.getXenologicalRemediesBonus(daysPassed) * item.sell_value);
        }

        return item.sell_value;
    }

    getStaff(daysPassed) {
        const increaseFromCouncil = this.getIncomeFromCouncil(daysPassed);

        // Estimate staff gained from council requests
        const staffModel = staffPerWeekModels.average;

        let engineersGained = 0, scientistsGained = 0;
        const staffFactor = this.hasQuaidOrsay() ? 1.4 : 1;
        const weeksPassed = Math.floor(daysPassed / 7);

        for (let weekNum = 0; weekNum < weeksPassed; weekNum++) {
            let engineersThisWeek, scientistsThisWeek;

            if (weekNum < staffModel.engineers.length) {
                engineersThisWeek = staffModel.engineers[weekNum];
            }
            else {
                engineersThisWeek = staffModel.engineers.last;
            }

            if (weekNum < staffModel.scientists.length) {
                scientistsThisWeek = staffModel.scientists[weekNum];
            }
            else {
                scientistsThisWeek = staffModel.scientists.last;
            }

            engineersGained += staffFactor * engineersThisWeek;
            scientistsGained += staffFactor * scientistsThisWeek;
        }

        //console.log(`After ${weeksPassed} weeks, model predicts a gain of ${engineersGained} engineers and ${scientistsGained} scientists`);
        engineersGained = Math.floor(engineersGained);
        scientistsGained = Math.floor(scientistsGained);

        return {
            engineers: 10 + increaseFromCouncil.engineers + engineersGained,
            scientists: 10 + increaseFromCouncil.scientists + scientistsGained,
        };
    }

    getIncomeFromCouncil(daysPassed) {
        this._validateArgumentPresent(daysPassed);

        const income = {
            engineers: 0,
            scientists: 0,
            money: 0
        };

        // TODO: centralize this.#so we can show it on the satellite screen
        let coveredIncomeMultiplier = 0, uncoveredIncomeMultiplier = 0;

        switch (this.#difficulty) {
            case "normal":
                coveredIncomeMultiplier = 1.1;
                uncoveredIncomeMultiplier = 0.5;
                break;
            case "classic":
                coveredIncomeMultiplier = 1;
                uncoveredIncomeMultiplier = 0.4;
                break;
            case "brutal":
                coveredIncomeMultiplier = 1;
                uncoveredIncomeMultiplier = 0.33;
                break;
            case "impossible":
                coveredIncomeMultiplier = 1;
                uncoveredIncomeMultiplier = 0.25;
                break;
        }

        let month = 3; // month 3 = April

        while (true) {
            // If month >= 12, the Date constructor will loop into the next year automatically for us
            const currentDate = new Date(2016, month, 1);

            const daysPassedByCouncilReport = Utils.daysPassedByDate(currentDate);

            if (daysPassedByCouncilReport > daysPassed) {
                break;
            }

            // Any satellites scheduled for launch on council report day won't be included in the rewards
            const daysPassedForSatLaunches = daysPassedByCouncilReport - 1;

            for (const countryId of Object.keys(DataHelper.countries)) {
                const country = DataHelper.countries[countryId];

                if (!this.hasSatelliteCoverage(countryId, daysPassedForSatLaunches)) {
                    income.money += Math.floor(uncoveredIncomeMultiplier * country.funding);
                    continue;
                }

                income.money += Math.floor(coveredIncomeMultiplier * country.funding);

                if (country.staff_from_satellite === "engineer") {
                    income.engineers++;
                }
                else {
                    income.scientists++;
                }
            }

            month++;
        }

        return income;
    }

    getPositionInResearchQueue(researchId) {
        return this.#researchQueue.findIndex(queueItem => queueItem.resultDataId === researchId);
    }

    getWorkPerHour(numExpectedEngineers, isRushJob, daysPassed) {
        this._validateArgumentPresent(daysPassed);

        // TODO incorporate daysPassed
        // TODO stop hard-coding engineers
        return Utils.calculateWorkPerHour(numExpectedEngineers, 10, isRushJob);
    }

    hasResearchCredit(creditType, daysPassed) {
        this._validateArgumentPresent(daysPassed);

        switch (creditType) {
            case "aerospace":
                return this.isResearchComplete("research_floater_interrogation", daysPassed);
            case "all":
                return this.isResearchComplete("research_ethereal_interrogation", daysPassed);
            case "armor":
                return this.isResearchComplete("research_muton_berserker_interrogation", daysPassed);
            case "cybernetics":
                return this.isResearchComplete("research_sectoid_interrogation", daysPassed);
            case "gauss_weapons":
                return this.isResearchComplete("research_muton_interrogation", daysPassed);
            case "laser_weapons":
                return this.isResearchComplete("research_thin_man_interrogation", daysPassed);
            case "plasma_weapons":
                return this.isResearchComplete("research_heavy_floater_interrogation", daysPassed);
            case "psionics":
                return this.isResearchComplete("research_sectoid_commander_interrogation", daysPassed);
            case "weapons":
                return this.isResearchComplete("research_muton_elite_interrogation", daysPassed);
            default:
                return false;
        }
    }

    hasSatelliteCoverage(country, daysPassed) {
        this._validateArgumentPresent(daysPassed);

        for (const satellite of this._filterQueueStartingByDate(this.#satelliteQueue, daysPassed)) {
            // Satellite launches are instant, so no need to check end date
            if (satellite.country === country) {
                return true;
            }
        }

        return false;
    }

    isFacilitySpaceEverOccupied(row, column) {
        const facilitiesInSpace = this.#facilityQueue.filter(item => item.row === row && item.column === column && item.resultDataId !== "excavated" && item.resultDataId !== "unexcavated");

        return facilitiesInSpace.length > 0;
    }

    isFacilitySpaceReachable(row, column, daysPassed) {
        // Special check for access lifts: make sure there are lifts above them
        if (column === 3) {
            for (let i = row - 1; i > 0; i--) {
                const facilityStatus = this.getFacilityStatus(i, column, daysPassed);

                if (facilityStatus.id !== "facility_access_lift" || facilityStatus.status !== "complete") {
                    return false;
                }
            }

            return true;
        }

        const startingColumn = column < 3 ? 2 : 4;
        const direction = column < 3 ? -1 : 1;

        for (let i = startingColumn; i >= 0 && i < 7; i += direction) {
            if (i === column) {
                break;
            }

            const facilityStatus = this.getFacilityStatus(row, i, daysPassed);

            if (facilityStatus.id === "unexcavated") {
                return false;
            }

            if (facilityStatus.id === "excavated" && facilityStatus.status !== "complete") {
                return false;
            }
        }

        return true;
    }

    isResearchComplete(researchId, daysPassed) {
        this._validateArgumentPresent(daysPassed);

        const queueIndex = this.getPositionInResearchQueue(researchId);

        if (queueIndex < 0) {
            return false;
        }

        const queueItem = this.#researchQueue[queueIndex];
        return daysPassed >= queueItem.endingDaysPassed;
    }

    moveResearchTowardsBeginningOfQueue(researchId) {
        return this._moveResearchInQueue(researchId, -1);
    }

    moveResearchTowardsEndOfQueue(researchId) {
        return this._moveResearchInQueue(researchId, 1);
    }

    numAdjacencies(adjacencyType, daysPassed) {
        this._validateArgumentPresent(daysPassed);

        let eligibleFacilities = null;
        let adjacencies = 0;

        switch(adjacencyType) {
            case "laboratory":
                eligibleFacilities = [ "facility_genetics_lab", "facility_psionic_labs", "facility_laboratory" ];
                break;
            case "power":
                eligibleFacilities = [ "facility_elerium_generator", "facility_fission_generator", "facility_thermo_generator" ];
                break;
            case "satellite":
                eligibleFacilities = [ "facility_satellite_nexus", "facility_satellite_uplink" ];
                break;
            case "workshop":
                eligibleFacilities = [ "facility_foundry", "facility_repair_bay", "facility_workshop" ];
                break;
        }

        // Have each facility look to its right and beneath it
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 7; j++) {
                const facility = this.getFacilityStatus(i, j, daysPassed);

                if (facility.status !== "complete") {
                    continue;
                }

                if (!eligibleFacilities.includes(facility.id)) {
                    continue;
                }

                if (i !== 3 && eligibleFacilities.includes(this.getFacilityStatus(i + 1, j, daysPassed).id)) {
                    adjacencies++;
                }

                if (j !== 6 && eligibleFacilities.includes(this.getFacilityStatus(i, j + 1, daysPassed).id)) {
                    adjacencies++;
                }
            }
        }

        return adjacencies;
    }

    numFacilities(facilityId, daysPassed, includeBuilding) {
        this._validateArgumentPresent(daysPassed);

        let sum = 0;

        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 7; j++) {
                const facilityStatus = this.getFacilityStatus(i, j, daysPassed);
                if (facilityStatus.id === facilityId && (includeBuilding || facilityStatus.status === "complete")) {
                    sum++;
                }
            }
        }

        return sum;
    }

    recalculateDates() {
        let nextEndDateDaysPassed = 0;

        // TODO include other queue types and interleave everything so their dependencies are handled correctly

        for (let i = 0; i < this.#researchQueue.length; i++) {
            this.#researchQueue[i].startingDaysPassed = nextEndDateDaysPassed;

            const researchTime = this.calculateResearchTime(this.#researchQueue[i].resultDataId, this.#researchQueue[i].startingDaysPassed);

            this.#researchQueue[i].endingDaysPassed = this.#researchQueue[i].startingDaysPassed + researchTime;

            nextEndDateDaysPassed = this.#researchQueue[i].endingDaysPassed;
        }
    }

    whenWillSpaceBeExcavated(row, column) {
        const relevantConstruction = this.#facilityQueue.filter(item => item.row === row && item.column === column && item.resultDataId === "excavated");

        if (relevantConstruction.length === 0) {
            return -1; // space doesn't have an excavation planned
        }

        if (relevantConstruction.length > 1) {
            throw new Error(`There should only be one excavation per space, maximum; invariant broken for row ${row} and column ${column} with ${relevantConstruction.length} excavations`);
        }

        return relevantConstruction[0].endingDaysPassed;
    }

    setStartingCountryAndBonus(startingCountry, bonusIndex) {
        if (this.#startingCountry !== startingCountry || this.#startingCountryBonusIndex !== bonusIndex) {
            this.#startingCountry = startingCountry;
            this.#startingCountryBonusIndex = bonusIndex;

            this._fireChangeEvent("startingCountryAndBonus");
        }
    }

    _cloneQueue(queue) {
        return queue.map( item => ({ ... item }) );
    }

    _filterQueueStartingByDate(queue, daysPassed) {
        return queue.filter(item => item.startingDaysPassed <= daysPassed);
    }

    _fireChangeEvent(propertyName) {
        AppEvents.fireEvent("campaignDataChanged", { propertyName: propertyName });
    }

    _moveResearchInQueue(researchId, indexChange) {
        const queueIndex = this.getPositionInResearchQueue(researchId);

        if (queueIndex < 0) {
            return false;
        }

        if (indexChange !== -1 && indexChange !== 1) {
            throw new Error("Invalid indexChange value: " + indexChange);
        }

        if (indexChange === -1 && queueIndex === 0) {
            return false;
        }

        if (indexChange === 1 && queueIndex === this.#researchQueue.length - 1) {
            return false;
        }

        let firstTech = null, secondTech = null;

        if (indexChange === 1) {
            // Moving down in queue; make sure we aren't passing something that depends on us
            const nextTechId = this.#researchQueue[queueIndex + 1].resultDataId;
            firstTech = DataHelper.technologies[researchId];
            secondTech = DataHelper.technologies[nextTechId];
        }
        else {
            const previousTechId = this.#researchQueue[queueIndex - 1].resultDataId;
            firstTech = DataHelper.technologies[previousTechId];
            secondTech = DataHelper.technologies[researchId];
        }

        if (firstTech.leadsTo) {
            if (Object.keys(firstTech.leadsTo).includes(secondTech.id)) {
                console.log(`Tech ${secondTech.id} depends on tech (${firstTech.id})`);
                return false;
            }
        }

        const temp = this.#researchQueue[queueIndex];
        this.#researchQueue[queueIndex] = this.#researchQueue[queueIndex + indexChange];
        this.#researchQueue[queueIndex + indexChange] = temp;

        this.recalculateDates();

        this._fireChangeEvent("researchQueue");

        return true;
    }

    _setUpInitialFacilityQueue() {
        const addStartingFacility = (facilityId, row, column) => {
            const startingDaysPassed = facilityId === "excavated" ? -1 : 0;
            const queueItem = new CampaignQueueItem(facilityId, startingDaysPassed, 0);
            queueItem.ignoreCost = true;
            queueItem.row = row;
            queueItem.column = column;
            this.#facilityQueue.push(queueItem);
        };

        // Common initial setup for all starts
        addStartingFacility("facility_satellite_uplink", 0, 2);
        addStartingFacility("facility_access_lift", 0, 3);

        if (this.hasCheyenneMountain()) {
            addStartingFacility("facility_access_lift", 1, 3);
            addStartingFacility("facility_access_lift", 2, 3);
            addStartingFacility("facility_access_lift", 3, 3);
        }
        else {
            addStartingFacility("excavated", 1, 3);
            addStartingFacility("excavated", 2, 3);
            addStartingFacility("excavated", 3, 3);
        }

        if (this.hasAdvancedPreparations()) {
            addStartingFacility("facility_laboratory", 0, 4);
            addStartingFacility("facility_workshop", 0, 5);
        }
        else if (this.hasRoscosmos()) {
            addStartingFacility("facility_satellite_uplink", 0, 1);
        }
        else if (this.hasSkunkworks()) {
            addStartingFacility("facility_foundry", 0, 4);
        }
        else if (this.hasWeiRenminFuwu()) {
            addStartingFacility("facility_repair_bay", 0, 4);
            addStartingFacility("facility_workshop", 0, 5);
        }
    }

    _setUpInitialFoundryProjects() {
        this.#foundryQueue = [];

        if (this.hasForTheSakeOfGlory()) {
            const queueItem = new CampaignQueueItem("foundry_advanced_repair", 0, 0);
            queueItem.ignoreCost = true;

            this.#foundryQueue[0] = queueItem;
        }
        else if (this.hasJaiJawan()) {
            const queueItem = new CampaignQueueItem("foundry_elerium_afterburners", 0, 0);
            queueItem.ignoreCost = true;

            this.#foundryQueue[0] = queueItem;
        }
        else if (this.hasResourceful()) {
            let queueItem = new CampaignQueueItem("foundry_advanced_salvage", 0, 0);
            queueItem.ignoreCost = true;

            this.#foundryQueue[0] = queueItem;

            queueItem = new CampaignQueueItem("foundry_alien_metallurgy", 0, 0);
            queueItem.ignoreCost = true;

            this.#foundryQueue[1] = queueItem;
        }
        else if (this.hasTheirFinestHour()) {
            const queueItem = new CampaignQueueItem("foundry_penetrator_weapons", 0, 0);
            queueItem.ignoreCost = true;

            this.#foundryQueue[0] = queueItem;
        }
        else if (this.hasSukhoiCompany()) {
            const queueItem = new CampaignQueueItem("foundry_enhanced_avionics", 0, 0);
            queueItem.ignoreCost = true;

            this.#foundryQueue[0] = queueItem;
        }
    }

    _validateArgumentPresent(arg) {
        if (arg === null || arg === undefined) {
            throw new Error("Required argument not provided");
        }
    }

    // #region Simple functions to check if we have certain starting bonuses or satellite bonuses
    getExpertiseBonus(daysPassed) {
        if (this.#startingCountry === "brazil" && this.#startingCountryBonusIndex === 1) {
            return 0.15;
        }

        if (this.#startingCountry !== "brazil" && this.hasSatelliteCoverage("brazil", daysPassed)) {
            return 0.1;
        }

        return 0;
    }

    getNeoPanzersBonus(daysPassed) {
        if (this.#startingCountry === "germany" && this.#startingCountryBonusIndex === 2) {
            return 0.5;
        }

        if (this.#startingCountry !== "germany" && this.hasSatelliteCoverage("germany", daysPassed)) {
            return 0.85;
        }

        return 1;
    }

    getSandhurstBonus(daysPassed) {
        if (this.#startingCountry === "united_kingdom" && this.#startingCountryBonusIndex === 2) {
            return 0.66;
        }

        if (this.#startingCountry !== "united_kingdom" && this.hasSatelliteCoverage("united_kingdom", daysPassed)) {
            return 0.85;
        }

        return 1;
    }

    getWeHaveWaysBonus(daysPassed) {
        if (this.#startingCountry === "united_states" && this.#startingCountryBonusIndex === 2) {
            return 0.25;
        }

        if (this.#startingCountry !== "united_states" && this.hasSatelliteCoverage("united_states", daysPassed)) {
            return 0.75;
        }

        return 1;
    }

    getXenologicalRemediesBonus(daysPassed) {
        if (this.#startingCountry === "china" && this.#startingCountryBonusIndex === 1) {
            return 2;
        }

        if (this.#startingCountry !== "china" && this.hasSatelliteCoverage("china", daysPassed)) {
            return 1.34;
        }

        return 1;
    }

    hasAdvancedPreparations() {
        return this.#startingCountry === "canada" && this.#startingCountryBonusIndex === 0;
    }

    hasAirSuperiority(daysPassed) {
        return this.hasSatelliteCoverage("canada", daysPassed) && this.hasSatelliteCoverage("mexico", daysPassed) && this.hasSatelliteCoverage("united_states", daysPassed);
    }

    hasArchitectsOfTheFuture(daysPassed) {
        return this.hasSatelliteCoverage("egypt", daysPassed) && this.hasSatelliteCoverage("nigeria", daysPassed) && this.hasSatelliteCoverage("south_africa", daysPassed);
    }

    hasBaumeister() {
        return this.#startingCountry === "germany" && this.#startingCountryBonusIndex === 1;
    }

    hasCheyenneMountain() {
        return this.#startingCountry === "united_states" && this.#startingCountryBonusIndex === 1;
    }

    hasCyberware(daysPassed) {
        return this.#startingCountry !== "france" && this.hasSatelliteCoverage("france", daysPassed);
    }

    hasDeusEx() {
        return this.#startingCountry === "china" && this.#startingCountryBonusIndex === 2;
    }

    hasForTheSakeOfGlory() {
        return this.#startingCountry === "egypt" && this.#startingCountryBonusIndex === 1;
    }

    hasJaiJawan() {
        return this.#startingCountry === "india" && this.#startingCountryBonusIndex === 0;
    }

    hasJaiVidwan(daysPassed) {
        return this.#startingCountry !== "india" && this.hasSatelliteCoverage("india", daysPassed);
    }

    hasNewWarfare(daysPassed) {
        return this.hasSatelliteCoverage("australia", daysPassed) && this.hasSatelliteCoverage("china", daysPassed) && this.hasSatelliteCoverage("india", daysPassed) && this.hasSatelliteCoverage("japan", daysPassed);
    }

    hasPowerToThePeople(daysPassed) {
        return this.hasSatelliteCoverage("argentina", daysPassed) && this.hasSatelliteCoverage("brazil", daysPassed);
    }

    hasQuaidOrsay() {
        return this.#startingCountry === "france" && this.#startingCountryBonusIndex === 0;
    }

    hasResourceful() {
        return this.#startingCountry === "south_africa" && this.#startingCountryBonusIndex === 0;
    }

    hasRoscosmos() {
        return this.#startingCountry === "russia" && this.#startingCountryBonusIndex === 1;
    }

    hasSkunkworks() {
        return this.#startingCountry === "germany" && this.#startingCountryBonusIndex === 0;
    }

    hasSpecialWarfareSchool() {
        return this.#startingCountry === "united_states" && this.#startingCountryBonusIndex === 0;
    }

    hasSukhoiCompany() {
        return this.#startingCountry === "russia" && this.#startingCountryBonusIndex === 0;
    }

    hasTheirFinestHour() {
        return this.#startingCountry === "united_kingdom" && this.#startingCountryBonusIndex === 1;
    }

    hasWealthOfNations(daysPassed) {
        return this.hasSatelliteCoverage("france", daysPassed) && this.hasSatelliteCoverage("germany", daysPassed) && this.hasSatelliteCoverage("russia", daysPassed) && this.hasSatelliteCoverage("united_kingdom", daysPassed);
    }

    hasWeiRenminFuwu() {
        return this.#startingCountry === "china" && this.#startingCountryBonusIndex === 0;
    }
    // #endregion

    // #region Getters and setters

    get daysPassed() {
        return this.#daysPassed;
    }

    set daysPassed(daysPassed) {
        if (daysPassed >= 0 && this.#daysPassed !== daysPassed) {
            this.#daysPassed = daysPassed;
            this._fireChangeEvent("daysPassed");
        }
    }

    get difficulty() {
        return this.#difficulty;
    }

    set difficulty(difficulty) {
        if (this.#difficulty !== difficulty) {
            this.#difficulty = difficulty;
            this._fireChangeEvent("difficulty");
        }
    }

    get exaltEnabled() {
        return this.#exaltEnabled;
    }

    set exaltEnabled(exaltEnabled) {
        if (this.#exaltEnabled !== exaltEnabled) {
            this.#exaltEnabled = exaltEnabled;
            this._fireChangeEvent("exaltEnabled");
        }
    }

    get facilityQueue() {
        return this._cloneQueue(this.#facilityQueue);
    }

    get id() {
        return this.#id;
    }

    get name() {
        return this.#name;
    }

    set name(name) {
        if (this.#name !== name) {
            this.#name = name;
            this._fireChangeEvent("name");
        }
    }

    get progenyEnabled() {
        return this.#progenyEnabled;
    }

    set progenyEnabled(progenyEnabled) {
        if (this.#progenyEnabled !== progenyEnabled) {
            this.#progenyEnabled = progenyEnabled;
            this._fireChangeEvent("progenyEnabled");
        }
    }

    get researchQueue() {
        return this._cloneQueue(this.#researchQueue);
    }

    get slingshotEnabled() {
        return this.#slingshotEnabled;
    }

    set slingshotEnabled(slingshotEnabled) {
        if (this.#slingshotEnabled !== slingshotEnabled) {
            this.#slingshotEnabled = slingshotEnabled;
            this._fireChangeEvent("slingshotEnabled");
        }
    }

    get startingCountry() {
        return this.#startingCountry;
    }

    get startingCountryBonusIndex() {
        return this.#startingCountry;
    }

    // #endregion

}

export default XComCampaign;