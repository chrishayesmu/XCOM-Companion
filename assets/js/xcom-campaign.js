import * as DataHelper from "./data-helper.js";
import * as Utils from "./utils.js";


function loadCampaign(filePath) {

}

class CampaignQueueItem {

    constructor() {
        this.startDate = null;
        this.result = null;
    }

    getPrerequisites() {
        const prereqs = {
            foundry: [],
            research: []
        };

        return prereqs;
    }
}

class XComCampaign {

    constructor() {
        this.numEngineers = 10;
        this.numScientists = 10;

        this.exaltEnabled = true;
        this.progenyEnabled = true;
        this.slingshotEnabled = true;

        this.startingCountry = "russia_1";

        this.facilityQueue = [];
        this.foundryQueue = [];
        this.interceptorQueue = [];
        this.itemBuildQueue = [];
        this.otsQueue = [];
        this.researchQueue = [];
    }

    getCosts(dataId) {
        if (dataId === "item_satellite" && this.startingCountry === "russia_1") {
            // Roscosmos bonus; half cost satellites

        }
    }

    getWorkPerHour(numExpectedEngineers, isRushJob) {
        return Utils.calculateWorkPerHour(numExpectedEngineers, this.numEngineers, isRushJob);
    }

    saveCampaign() {

    }

}

export default XComCampaign;