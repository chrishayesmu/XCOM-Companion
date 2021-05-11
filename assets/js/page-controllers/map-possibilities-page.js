import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";

const areaOfOperations = {
    "ao_alien_structure": "Alien Structure",
    "ao_forest": "Forest",
    "ao_plains": "Plains",
    "ao_riparian": "Riparian",
    "ao_roadway": "Roadway",
    "ao_settlement": "Settlement",
    "ao_urban_block": "Urban Block",
    "ao_urban_close_quarters": "Urban Close Quarters",
    "ao_urban_large_structure": "Urban Large Structure",
    "ao_waterfront": "Waterfront"
}

const missionTypes = {
    "mission_abduction": "Abductions",
    "mission_asset_recovery": "Asset Recovery",
    "mission_bomb_disposal": "Bomb Disposal",
    "mission_covert_data_recovery": "Covert Data Recovery",
    "mission_covert_extraction": "Covert Extraction",
    "mission_progeny_deluge": "Deluge (Progeny #2)",
    "mission_progeny_furies": "Furies (Progeny #3)",
    "mission_progeny_portent": "Portent (Progeny #1)",
    "mission_site_recon": "Site Recon",
    "mission_slingshot_confounding_light": "Confounding Light (Slingshot #2)",
    "mission_slingshot_gangplank": "Gangplank (Slingshot #3)",
    "mission_slingshot_low_friends": "Friends In Low Places (Slingshot #1)",
    "mission_target_escort": "Target Escort",
    "mission_target_extraction": "Target Extraction",
    "mission_terror": "Terror Site"
};

class MapPossibilitiesPage extends AppPage {
    constructor() {
        super("map-possibilities-page");
    }

    async load(data) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/map-possibilities-page.html", "template-map-possibilities-page");

        template.querySelector("#map-possibilities-ao-select").addEventListener("selectionChanged", this._onAnySelectionChanged.bind(this));
        template.querySelector("#map-possibilities-mission-type-select").addEventListener("selectionChanged", this._onAnySelectionChanged.bind(this));
        template.querySelector("#map-possibilities-ufo-type-select").addEventListener("selectionChanged", this._onAnySelectionChanged.bind(this));

        return {
            body: template,
            title: {
                "icon": null,
                "text": "Possible Maps"
            }
        };
    }

    onUnloadBeginning(_event) {
        const historyData = {
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

    async _onAnySelectionChanged(_event) {
        const areaOfOperationsSelect = document.getElementById("map-possibilities-ao-select");
        const missionTypeSelect = document.getElementById("map-possibilities-mission-type-select");
        const ufoTypeSelect = document.getElementById("map-possibilities-ufo-type-select");

        const selectedAo =  areaOfOperationsSelect.selectedItem && areaOfOperationsSelect.selectedItem.dataset.ao;
        const selectedMissionTypeDataKey =  missionTypeSelect.selectedItem && missionTypeSelect.selectedItem.dataset.dataKey;
        const selectedUfoType =  ufoTypeSelect.selectedItem && ufoTypeSelect.selectedItem.dataset.ufoType;

        const isUfoMissionTypeSelected = selectedMissionTypeDataKey === "ufo_crashed_mission_types" || selectedMissionTypeDataKey === "ufo_landed_mission_types";
        const selectedMissionType = isUfoMissionTypeSelected ? selectedUfoType : missionTypeSelect.selectedItem && missionTypeSelect.selectedItem.dataset.missionType;

        ufoTypeSelect.disabled = !isUfoMissionTypeSelected;

        // If enough selected, generate list of maps
        const outputContainer = document.getElementById("map-possibilities-results");
        const summaryContainer = document.getElementById("map-possibilities-results-summary");

        if (selectedAo && selectedMissionTypeDataKey && selectedMissionType) {
            outputContainer.innerHTML = "";

            const matchingMaps = Object.values(DataHelper.maps).filter(map => map.area_of_operations === selectedAo && selectedMissionTypeDataKey in map && map[selectedMissionTypeDataKey].includes(selectedMissionType));

            if (matchingMaps.length === 0) {
                summaryContainer.textContent = "There are no maps matching these mission parameters.";
            }
            else {
                summaryContainer.textContent = `There are ${matchingMaps.length} maps possible for this mission.`;

                matchingMaps.forEach(async map => {
                    const preview = await this._createMapPreview(map);
                    outputContainer.appendChild(preview);
                })
            }
        }
        else {
            summaryContainer.innerHTML = "";
            outputContainer.innerHTML = "";
        }
    }
}

export default MapPossibilitiesPage;