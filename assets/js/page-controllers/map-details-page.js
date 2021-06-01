import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";

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

class MapDetailsPage extends AppPage {

    static pageId = "map-details-page";

    #mapId = null;

    static async generatePreview(data) {
        if (!data.mapId) {
            return null;
        }

        const map = DataHelper.maps[data.mapId];

        if (!map) {
            return null;
        }

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/map-details-page.html", "template-map-details-preview");

        template.querySelector("#map-preview-name").textContent = "Map: " + map.name;
        template.querySelector("#map-preview-image").src = map.image;

        return template;
    }

    static ownsDataObject(dataObj) {
        return dataObj.id.startsWith("map_");
    }

    async load(data) {
        if (!data.mapId) {
            return null;
        }

        const map = DataHelper.maps[data.mapId];

        if (!map) {
            return null;
        }

        return this.loadFromDataObject(map);
    }

    async loadFromDataObject(map) {
        this.#mapId = map.id;

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/map-details-page.html", "template-map-details-page");

        template.querySelector("#map-details-name").textContent = map.name;
        template.querySelector("#map-details-ao").textContent = areaOfOperations[map.area_of_operations];
        template.querySelector("#map-details-image").src = map.image;

        this._populateSize(template, map);
        this._populateMissionTypesGrid(template, map);

        return {
            body: template,
            title: {
                "icon": null,
                "text": "Map Details"
            }
        };
    }

    makeHistoryState() {
        return new PageHistoryState(this, { mapId: this.#mapId });
    }

    _populateSize(template, map) {
        const container = template.querySelector("#map-details-size");

        if (!map.size) {
            container.textContent = "Unknown";
            container.classList.add("color-subtle");
        }
        else {
            container.textContent = `${map.size.width}x${map.size.length} tiles`;
        }
    }

    _populateMissionTypesGrid(template, map) {
        const outerContainer = template.querySelector("#map-details-mission-data-container");
        const missionTypeConfig = [
            { dataKey: "alien_mission_types", containerElement: template.querySelector("#map-details-alien-missions-container"), dataElement: template.querySelector("#map-details-alien-missions") },
            { dataKey: "council_mission_types", containerElement: template.querySelector("#map-details-council-missions-container"), dataElement: template.querySelector("#map-details-council-missions") },
            { dataKey: "exalt_mission_types", containerElement: template.querySelector("#map-details-exalt-missions-container"), dataElement: template.querySelector("#map-details-exalt-missions") },
            { dataKey: "ufo_crashed_mission_types", containerElement: template.querySelector("#map-details-crashed-ufo-missions-container"), dataElement: template.querySelector("#map-details-crashed-ufo-missions") },
            { dataKey: "ufo_landed_mission_types", containerElement: template.querySelector("#map-details-landed-ufo-missions-container"), dataElement: template.querySelector("#map-details-landed-ufo-missions") }
        ];

        let numColumns = 0;
        for (let i = 0; i < missionTypeConfig.length; i++) {
            const config = missionTypeConfig[i];
            const key = config.dataKey;
            const container = config.containerElement;
            const element = config.dataElement;

            if (map[key]) {
                let missions = "";
                if (key.startsWith("ufo")) {
                    missions = map[key].map(type => Utils.capitalizeEachWord(type.substring(4))).join("<br />")
                }
                else {
                    missions = map[key].map(type => missionTypes[type]).join("<br />");
                }
                element.innerHTML = missions;

                numColumns++;
            }
            else {
                container.classList.add("hidden-collapse");
            }
        }

        outerContainer.style = `grid-template-columns: repeat(${numColumns}, 1fr);`;
    }
}

export default MapDetailsPage;
