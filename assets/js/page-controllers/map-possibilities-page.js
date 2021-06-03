import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";

class MapPossibilitiesPage extends AppPage {

    static pageId = "map-possibilities-page";

    #allMissionTypeOptions = null;
    #allUfoTypeOptions = null;

    #areaOfOperationsSelect = null;
    #missionTypeSelect = null;
    #ufoTypeSelect = null;

    #outputSummaryContainer = null;
    #outputContainer = null;

    async load(data) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/map-possibilities-page.html", "template-map-possibilities-page");

        this.#areaOfOperationsSelect = template.querySelector("#map-possibilities-ao-select");
        this.#missionTypeSelect = template.querySelector("#map-possibilities-mission-type-select");
        this.#ufoTypeSelect = template.querySelector("#map-possibilities-ufo-type-select");

        this.#outputContainer = template.querySelector("#map-possibilities-results");
        this.#outputSummaryContainer = template.querySelector("#map-possibilities-results-summary");

        // Load data from possible history state; do this before event listeners are attached
        if (data.areaOfOperations) {
            const element = this.#areaOfOperationsSelect.querySelector("li[data-ao=" + data.areaOfOperations + "]");
            this.#areaOfOperationsSelect.select(element);
        }

        if (data.missionTypeDataKey && data.missionTypeDataKey.includes("ufo")) {
            const element = this.#missionTypeSelect.querySelector("li[data-data-key=" + data.missionTypeDataKey + "]");
            this.#missionTypeSelect.select(element);
        }
        else if (data.missionType) {
            const element = this.#missionTypeSelect.querySelector("li[data-mission-type=" + data.missionType + "]");
            this.#missionTypeSelect.select(element);
        }

        if (data.ufoType) {
            const element = this.#ufoTypeSelect.querySelector("li[data-ufo-type=" + data.ufoType + "]");
            this.#ufoTypeSelect.select(element);
        }

        this.#areaOfOperationsSelect.addEventListener("selectionChanged", this._onAnySelectionChanged.bind(this));
        this.#missionTypeSelect.addEventListener("selectionChanged", this._onAnySelectionChanged.bind(this));
        this.#ufoTypeSelect.addEventListener("selectionChanged", this._onAnySelectionChanged.bind(this));

        this.#allMissionTypeOptions = this.#missionTypeSelect.items.map(element => ({ dataKey: element.dataset.dataKey, element: element, missionType: element.dataset.missionType }) );
        this.#allUfoTypeOptions = this.#ufoTypeSelect.items.map(element => ({ element: element, ufoType: element.dataset.ufoType }) );

        // Run selection logic once to sync up with historical page state
        this._onAnySelectionChanged();

        return {
            body: template,
            title: {
                "icon": null,
                "text": "Possible Maps"
            }
        };
    }

    makeHistoryState() {
        const historyData = {
            areaOfOperations: this.areaOfOperations,
            missionType: this.missionType,
            missionTypeDataKey: this.missionTypeDataKey,
            ufoType: this.ufoType
        };

        return new PageHistoryState(this, historyData);
    }

    async _createMapPreview(map) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/map-possibilities-page.html", "template-map-possibilities-map-preview");

        const nameContainer = template.querySelector(".mpm-preview-name");
        nameContainer.textContent = map.name;
        nameContainer.setAttribute("data-pagearg-map-id", map.id);
        nameContainer.setAttribute("data-pagearg-no-preview", true);

        if (map.size) {
            nameContainer.textContent += ` (${map.size.width}x${map.size.length} tiles)`;
        }

        const imageContainer = template.querySelector(".mpm-preview-image");
        imageContainer.src = map.image;
        imageContainer.setAttribute("data-pagearg-map-id", map.id);
        imageContainer.setAttribute("data-pagearg-no-preview", true);

        return template;
    }

    async _disableEmptyChoices() {
        const mapsInAo = Object.values(DataHelper.maps).filter(map => !this.areaOfOperations || map.area_of_operations === this.areaOfOperations);

        for (const option of this.#allMissionTypeOptions) {
            const anyMatching = mapsInAo.some(map => option.dataKey in map && (!option.missionType || map[option.dataKey].includes(option.missionType)));

            if (!anyMatching) {
                option.element.classList.add("disabled");

                if (this.#missionTypeSelect.selectedItem === option.element) {
                    // Selected item just became invalid, so deselect
                    this.#missionTypeSelect.select(null);
                }
            }
            else {
                option.element.classList.remove("disabled");
            }
        }

        // Filter the UFO list also
        const mapsForMissionType = mapsInAo.filter(map => this.missionTypeDataKey in map);

        for (const option of this.#allUfoTypeOptions) {
            const anyMatching = mapsForMissionType.some(map => !this.missionTypeDataKey || map[this.missionTypeDataKey].includes(option.ufoType));

            if (!anyMatching) {
                option.element.classList.add("disabled");

                if (this.#ufoTypeSelect.selectedItem === option.element) {
                    // Selected item just became invalid, so deselect
                    this.#ufoTypeSelect.select(null);
                }
            }
            else {
                option.element.classList.remove("disabled");
            }
        }
    }

    async _onAnySelectionChanged(_event) {
        this._disableEmptyChoices();

        this.#ufoTypeSelect.disabled = !this.isUfoMissionTypeSelected;

        // If enough selected, generate list of maps
        if (this.areaOfOperations && this.missionType && this.missionTypeDataKey) {
            const matchingMaps = Object.values(DataHelper.maps).filter(map => map.area_of_operations === this.areaOfOperations && this.missionTypeDataKey in map && map[this.missionTypeDataKey].includes(this.missionType));

            if (matchingMaps.length === 0) {
                this.#outputContainer.innerHTML = "";
                this.#outputSummaryContainer.textContent = "There are no maps matching these mission parameters.";
            }
            else {
                this.#outputSummaryContainer.textContent = `There ${matchingMaps.length === 1 ? "is 1 map" : "are " + matchingMaps.length + " maps"} possible for this mission.`;

                // Need to be careful how we do this; since we're using async functions, there's concurrency issues to be aware of
                const mapElements = await Promise.all(matchingMaps.map(async map => this._createMapPreview(map)));

                // Now that everything async is done, we can safely clear and refill the container
                this.#outputContainer.innerHTML = "";
                mapElements.forEach(elem => this.#outputContainer.appendChild(elem));
            }
        }
        else {
            this.#outputSummaryContainer.innerHTML = "";
            this.#outputContainer.innerHTML = "";
        }
    }

    get areaOfOperations() {
        return this.#areaOfOperationsSelect.selectedItem && this.#areaOfOperationsSelect.selectedItem.dataset.ao;
    }

    get isUfoMissionTypeSelected() {
        return this.missionTypeDataKey === "ufo_crashed_mission_types" || this.missionTypeDataKey === "ufo_landed_mission_types";
    }

    get missionType() {
        if (this.isUfoMissionTypeSelected) {
            return this.ufoType;
        }

        return this.#missionTypeSelect.selectedItem && this.#missionTypeSelect.selectedItem.dataset.missionType;
    }

    get missionTypeDataKey() {
        return this.#missionTypeSelect.selectedItem && this.#missionTypeSelect.selectedItem.dataset.dataKey;
    }

    get ufoType() {
        return this.#ufoTypeSelect.selectedItem && this.#ufoTypeSelect.selectedItem.dataset.ufoType;
    }
}

export default MapPossibilitiesPage;