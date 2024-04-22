import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";

class TimelineItem extends HTMLElement {

    static get observedAttributes() {
        return [ "dataId", "daysPassed", "eventType" ];
    }

    #ignoreAttributeUpdates = false;
    #isDomLoaded = false;
    #shadowRoot = null;

    // DOM elements
    #icon;
    #title;
    #date;

    constructor() {
        super();

        this.#shadowRoot = this.attachShadow({ mode: "open" });

        let cssLink = document.createElement("link");
        cssLink.rel = "stylesheet";
        cssLink.href = "assets/css/custom-elements/timeline-item-internal.css";
        this.#shadowRoot.appendChild(cssLink);

        Templates.instantiateTemplate("assets/html/templates/custom-elements/timeline-item.html", "template-timeline-item").then(template => {
            this.#shadowRoot.appendChild(template);

            this.#icon = template.querySelector("#icon");
            this.#title = template.querySelector("#title");
            this.#date = template.querySelector("#date");

            this.#isDomLoaded = true;
            this._populateData();
        });
    }

    attributeChangedCallback() {
        this._populateData();
    }

    populateFromTimelineEvent(e) {
        this.#ignoreAttributeUpdates = true;

        this.dataId = e.dataId;
        this.daysPassed = e.daysPassed;
        this.eventType = e.eventType;
        this.timelineEvent = e.timelineEvent;

        this.#ignoreAttributeUpdates = false;

        this._populateData();
    }

    async _populateData() {
        if (!this.#isDomLoaded || this.#ignoreAttributeUpdates) {
            return;
        }

        let iconSrc = "", title = "";

        switch (this.eventType) {
            case "facility":
                iconSrc = "assets/img/misc-icons/facility-under-construction-sign.png";
                title = this.dataId === "excavated" ? "Excavation" : DataHelper.baseFacilities[this.dataId].name;
                break;
            case "mission":
                iconSrc = "assets/img/misc-icons/tactical-layer-icon.png";
                title = DataHelper.missions[this.dataId].name;
                break;
            case "research":
                iconSrc = "assets/img/misc-icons/research.png";
                title = DataHelper.technologies[this.dataId].name;
                break;
        }

        if (this.timelineEvent === "start") {
            title = "Begin " + title;
        }
        else if (this.timelineEvent === "end") {
            title = "Complete " + title;
        }
        else if (this.timelineEvent === "certainThisMonth") {
            title += " will happen this month";
        }
        else if (this.timelineEvent === "likelyThisMonth") {
            title += " is very likely to happen this month";
        }
        else if (this.timelineEvent === "possibleThisMonth") {
            title += " may happen this month";
        }

        this.#icon.src = iconSrc;
        this.#title.innerHTML = title;

        const campaignDate = Utils.dateByDaysPassed(this.daysPassed);
        this.#date.innerHTML = Utils.formatCampaignDate(campaignDate);
    }

    get dataId() {
        return this.getAttribute("dataId");
    }

    set dataId(id) {
        this.setAttribute("dataId", id);
    }

    get daysPassed() {
        return this.getAttribute("daysPassed");
    }

    set daysPassed(days) {
        this.setAttribute("daysPassed", days);
    }

    get eventType() {
        return this.getAttribute("eventType");
    }

    set eventType(eType) {
        this.setAttribute("eventType", eType);
    }

    get timelineEvent() {
        return this.getAttribute("timelineEvent");
    }

    set timelineEvent(e) {
        this.setAttribute("timelineEvent", e);
    }
}

customElements.define("timeline-item", TimelineItem);