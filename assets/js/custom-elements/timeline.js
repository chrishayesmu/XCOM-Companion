import PageManager from "../page-manager.js";

class Timeline extends HTMLElement {

    #timelineEventsByPosition = {};

    connectedCallback() {
        if (!this.isConnected) {
            return;
        }

        const startText = document.createElement("div");
        startText.classList.add("tl-label");
        startText.textContent = this.start;
        startText.style = `left: 0px`;

        this.appendChild(startText);

        const endText = document.createElement("div");
        endText.classList.add("tl-label");
        endText.textContent = this.end;
        endText.style = `right: 0px; transform: translateY(120%) translateX(50%)`;

        this.appendChild(endText);
    }

    attachTimelineEvent(timelineEvent) {
        const atPercent = 100 * ( (timelineEvent.at - this.start) / (this.end - this.start));

        const eventDot = document.createElement("div");
        eventDot.style = `left: ${atPercent}%;`;

        eventDot.addEventListener("mouseenter", this._onEventMouseover.bind(this));

        eventDot.classList.add("tl-event");
        eventDot.classList.add(timelineEvent.major ? "tl-event-major" : "tl-event-minor");

        eventDot.setAttribute("data-at", timelineEvent.at);

        this.appendChild(eventDot);

        if (!this.#timelineEventsByPosition[timelineEvent.at]) {
            this.#timelineEventsByPosition[timelineEvent.at] = [];
        }

        this.#timelineEventsByPosition[timelineEvent.at].push({
            content: timelineEvent.innerHTML
        });

        timelineEvent.innerHTML = "";
    }

    _onEventMouseover(event) {
        const eventAt = event.target.dataset.at;

        // Assemble the tooltip content
        const container = document.createElement("div");
        container.classList.add("tl-tooltip-container");

        const titleRow = document.createElement("div");
        titleRow.classList.add("tl-tooltip-title");
        titleRow.textContent = `${this.unit ? this.unit : ""} ${eventAt >= this.start ? eventAt : "Value Unknown"}`;

        container.appendChild(titleRow);

        const events = this.#timelineEventsByPosition[eventAt];
        for (let i = 0; i < events.length; i++) {
            const row = document.createElement("div");
            row.classList.add("tl-tooltip-content-row");
            row.innerHTML = events[i].content;

            container.appendChild(row);
        }

        // Have PageManager handle the positioning/display
        const targetElementRect = event.target.getBoundingClientRect();
        PageManager.instance.showTooltip(targetElementRect, container);
    }

    get start() {
        return this.getAttribute("start") || 0;
    }

    set start(start) {
        this.setAttribute("start", start);
    }

    get end() {
        return this.getAttribute("end") || 100;
    }

    set end(end) {
        this.setAttribute("end", end);
    }

    get unit() {
        return this.getAttribute("unit");
    }

    set unit(unit) {
        this.setAttribute("unit", unit);
    }
}

class TimelineEvent extends HTMLElement {
    connectedCallback() {
        if (!this.isConnected) {
            return;
        }

        if (!this.hasAttribute("at")) {
            throw new Error("time-line-event must have the 'at' attribute");
        }

        const parent =  this.closest("time-line");

        if (!parent) {
            throw new Error("time-line-event can only be used inside of a time-line element");
        }

        parent.attachTimelineEvent(this);
    }

    get at() {
        return this.getAttribute("at");
    }

    set at(at) {
        this.setAttribute("at", at);
    }

    get major() {
        return this.hasAttribute("major");
    }

    set major(major) {
        this.setAttribute("major", major);
    }
}

customElements.define("time-line", Timeline);
customElements.define("time-line-event", TimelineEvent);
