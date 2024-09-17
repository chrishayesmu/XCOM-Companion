import * as AppEvents from "../app-events.js";
import * as DataHelper from "../data-helper.js";
import * as Modal from "../modal.js";
import * as Settings from "../settings.js";
import * as Utils from "../utils.js";

const relevantCampaignProperties = [ "allData", "daysPassed", "facilityQueue", "satelliteQueue" ];

class ResearchProject extends HTMLElement {

    #activeCampaign = null;
    #shadowRoot = null;

    // DOM elements
    #addToQueueButton;
    #completeLabel;
    #moveDownInQueueButton;
    #moveUpInQueueButton;
    #projectDates;
    #projectName;
    #projectTime;
    #removeFromQueueButton;
    #queuePosition;

    static get observedAttributes() {
        return [ "researchid" ];
    }

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: "open" });
        this._createInitialDom();
        this._populateData();

        AppEvents.registerEventListener("campaignDataChanged", async (data) => {
            if (relevantCampaignProperties.includes(data.propertyName)) {
                await this._populateData();
            }
        });
    }

    attributeChangedCallback() {
        this._populateData();
    }

    _createInitialDom() {
        const cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = "assets/css/custom-elements/research-project-internal.css";

        this.#shadowRoot.prepend(cssLink);

        const nameAndDatesContainer = document.createElement("div");
        nameAndDatesContainer.id = "name-and-dates-container";
        this.#shadowRoot.append(nameAndDatesContainer);

        this.#projectName = document.createElement("div");
        this.#projectName.id = "project-name";
        nameAndDatesContainer.append(this.#projectName);

        this.#projectTime = document.createElement("div");
        this.#projectTime.id = "project-time";
        this.#shadowRoot.append(this.#projectTime);

        const labelContainer = document.createElement("div");
        labelContainer.id = "label-container";
        this.#shadowRoot.append(labelContainer);

        this.#completeLabel = document.createElement("div");
        this.#completeLabel.id = "project-complete-label";
        this.#completeLabel.classList.add("button-label");
        this.#completeLabel.textContent = "Complete";
        labelContainer.append(this.#completeLabel);

        // Queue label
        this.#queuePosition = document.createElement("div");
        this.#queuePosition.id = "project-queue-position-label";
        this.#queuePosition.classList.add("button-label");
        labelContainer.append(this.#queuePosition);

        // Move up in queue
        this.#moveUpInQueueButton = document.createElement("div");
        this.#moveUpInQueueButton.id = "project-move-up-in-queue-button";
        this.#moveUpInQueueButton.classList.add("button-label");
        this.#moveUpInQueueButton.classList.add("interactive");
        this.#moveUpInQueueButton.addEventListener("click", () => {
            if (!this.#moveUpInQueueButton.hasAttribute("disabled")) {
                this.#activeCampaign.moveResearchTowardsBeginningOfQueue(this.researchId);
            }
        });
        labelContainer.append(this.#moveUpInQueueButton);

        // Move down in queue
        this.#moveDownInQueueButton = document.createElement("div");
        this.#moveDownInQueueButton.id = "project-move-down-in-queue-button";
        this.#moveDownInQueueButton.classList.add("button-label");
        this.#moveDownInQueueButton.classList.add("interactive");
        this.#moveDownInQueueButton.addEventListener("click", () => {
            if (!this.#moveDownInQueueButton.hasAttribute("disabled")) {
                this.#activeCampaign.moveResearchTowardsEndOfQueue(this.researchId);
            }
        });
        labelContainer.append(this.#moveDownInQueueButton);

        // Remove from queue
        this.#removeFromQueueButton = document.createElement("div");
        this.#removeFromQueueButton.id = "project-remove-from-queue-button";
        this.#removeFromQueueButton.classList.add("button-label");
        this.#removeFromQueueButton.classList.add("interactive");
        this.#removeFromQueueButton.textContent = "Remove From Queue";
        this.#removeFromQueueButton.addEventListener("click", this._onRemoveFromQueueClicked.bind(this));
        labelContainer.append(this.#removeFromQueueButton);

        this.#addToQueueButton = document.createElement("div");
        this.#addToQueueButton.id = "project-add-to-queue-button";
        this.#addToQueueButton.classList.add("button-label");
        this.#addToQueueButton.classList.add("interactive");
        this.#addToQueueButton.addEventListener("click", this._onAddToQueueClicked.bind(this));
        labelContainer.append(this.#addToQueueButton);

        // Force flex break here to a new row
        const hr = document.createElement("hr");
        nameAndDatesContainer.append(hr);

        // Project dates
        this.#projectDates = document.createElement("div");
        this.#projectDates.id = "project-dates";
        this.#projectDates.classList.add("button-label");
        nameAndDatesContainer.append(this.#projectDates);
    }

    async _populateData() {
        if (!this.#activeCampaign) {
            this.#activeCampaign = await Settings.getCurrentCampaign();
        }

        const research = DataHelper.technologies[this.researchId];
        const queueIndex = this.#activeCampaign.getPositionInResearchQueue(this.researchId);
        let startingDaysPassed = 0;

        if (queueIndex >= 0) {
            startingDaysPassed = this.#activeCampaign.researchQueue[queueIndex].startingDaysPassed;
        }
        else if (this.#activeCampaign.researchQueue.length > 0) {
            startingDaysPassed = this.#activeCampaign.researchQueue.last.endingDaysPassed;
        }

        let researchTime = this.#activeCampaign.calculateResearchTime(this.researchId, startingDaysPassed);

        if (queueIndex >= 0 && startingDaysPassed <= this.#activeCampaign.daysPassed) {
            // Account for time already spent on this research if it's started
            researchTime -= (this.#activeCampaign.daysPassed - startingDaysPassed);
            researchTime = Math.max(researchTime, 0);
        }

        this.#projectName.textContent = research.name;
        this.#projectTime.textContent = Math.roundTo(researchTime, 1) + (researchTime === 1 ? " day": " days");

        if (this.#activeCampaign.isResearchComplete(this.researchId, this.#activeCampaign.daysPassed)) {
            this.#addToQueueButton.classList.add("hidden-collapse");
            this.#moveDownInQueueButton.classList.add("hidden-collapse");
            this.#moveUpInQueueButton.classList.add("hidden-collapse");
            this.#projectDates.classList.add("hidden-collapse");
            this.#queuePosition.classList.add("hidden-collapse");
            this.#removeFromQueueButton.classList.add("hidden-collapse");

            this.#completeLabel.classList.remove("hidden-collapse");

            this.available = false;
            this.complete = true;
            this.missingPrereqs = false;
        }
        else {
            const canResearch = this.#activeCampaign.canResearch(this.researchId);

            this.#completeLabel.classList.add("hidden-collapse");

            this.available = canResearch;
            this.complete = false;
            this.missingPrereqs = !canResearch;

            if (queueIndex >= 0) {
                this.#addToQueueButton.classList.add("hidden-collapse");

                this.#moveDownInQueueButton.classList.remove("hidden-collapse");
                this.#moveUpInQueueButton.classList.remove("hidden-collapse");
                this.#projectDates.classList.remove("hidden-collapse");
                this.#queuePosition.classList.remove("hidden-collapse");
                this.#removeFromQueueButton.classList.remove("hidden-collapse");

                this.#queuePosition.textContent = `#${queueIndex+1} In Queue`;

                if (queueIndex === 0 || this.#activeCampaign.researchQueue[queueIndex - 1].endingDaysPassed <= this.#activeCampaign.daysPassed) {
                    // TODO check if previous item is complete also
                    this.#moveUpInQueueButton.setAttribute("disabled", "");
                }
                else {
                    this.#moveUpInQueueButton.removeAttribute("disabled");
                }

                if (queueIndex === this.#activeCampaign.researchQueue.length - 1) {
                    this.#moveDownInQueueButton.setAttribute("disabled", "");
                }
                else {
                    this.#moveDownInQueueButton.removeAttribute("disabled");
                }


                // Project dates
                const queueItem = this.#activeCampaign.researchQueue[queueIndex];
                const startDate = Utils.formatCampaignDate(Utils.dateByDaysPassed(queueItem.startingDaysPassed));
                const endDate = Utils.formatCampaignDate(Utils.dateByDaysPassed(queueItem.endingDaysPassed));

                this.#projectDates.textContent = startDate + " to " + endDate;
            }
            else {
                this.#moveDownInQueueButton.classList.add("hidden-collapse");
                this.#moveUpInQueueButton.classList.add("hidden-collapse");
                this.#projectDates.classList.add("hidden-collapse");
                this.#queuePosition.classList.add("hidden-collapse");
                this.#removeFromQueueButton.classList.add("hidden-collapse");

                this.#addToQueueButton.classList.remove("hidden-collapse");

                this.#addToQueueButton.textContent = canResearch ? "Add to Queue" : "Add to Queue (+ prereqs)";
            }
        }
    }

    async _onAddToQueueClicked() {
        if (this.missingPrereqs) {
            const confirmed = await Modal.confirm("You are missing prerequisite researches. Do you want to add them to the queue as well?", "Missing Prerequisites", "Yes", "Cancel");

            if (!confirmed) {
                return;
            }
        }

        const addedToQueue = this.#activeCampaign.enqueueResearch(this.researchId, /* enqueueMissingPrereqs */ true);

        if (addedToQueue) {
            this._populateData();

            const event = new CustomEvent("addedToQueue");
            this.dispatchEvent(event);
        }
    }

    async _onRemoveFromQueueClicked() {
        // Check if anything is queued that depends on this
        const research = DataHelper.technologies[this.researchId];

        if (research.leadsTo) {
            let numDependentResearch = 0;

            for (const downstreamTech of Object.keys(research.leadsTo)) {
                if (this.#activeCampaign.getPositionInResearchQueue(downstreamTech) >= 0) {
                    numDependentResearch++;
                }
            }

            if (numDependentResearch > 0) {
                const confirmed = await Modal.confirm("This will cancel " + numDependentResearch + " techs depending on " + research.name + ". Are you sure you want to cancel?", "Dependent Research Conflict", "Yes, Remove", "No, Keep");

                if (!confirmed) {
                    return;
                }
            }
        }

        this.#activeCampaign.dequeueResearch(this.researchId);

        const event = new CustomEvent("removedFromQueue");
        this.dispatchEvent(event);
    }

    get available() {
        return this.hasAttribute("available");
    }

    set available(available) {
        if (available) {
            this.setAttribute("available", "");
        }
        else {
            this.removeAttribute("available");
        }
    }

    get complete() {
        return this.hasAttribute("complete");
    }

    set complete(complete) {
        if (complete) {
            this.setAttribute("complete", "");
        }
        else {
            this.removeAttribute("complete");
        }
    }

    get completionDate() {
        return this.getAttribute("completionDate");
    }

    set completionDate(completionDate) {
        this.setAttribute("completionDate", completionDate);
    }

    get missingPrereqs() {
        return this.hasAttribute("missingPrereqs");
    }

    set missingPrereqs(missingPrereqs) {
        if (missingPrereqs) {
            this.setAttribute("missingPrereqs", "");
        }
        else {
            this.removeAttribute("missingPrereqs");
        }
    }

    get researchId() {
        return this.getAttribute("researchId");
    }

    set researchId(researchId) {
        if (researchId !== this.researchId) {
            this.setAttribute("researchId", researchId);
        }
    }
}

customElements.define("research-project", ResearchProject);