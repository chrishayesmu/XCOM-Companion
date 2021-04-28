const appPageModule = require("./app-page");
const dataHelper = require("../data-helper");
const templates = require("../templates");
const widgets = require("../widgets");

const AppPage = appPageModule.AppPage;
const PageHistoryState = appPageModule.PageHistoryState;

class SearchResultsPage extends AppPage {
    constructor() {
        super("search-results-page");

        this._dataGroupByPrefix = {
            "facility": "Base Facility",
            "foundry": "Foundry Project",
            "gene_mod": "Gene Mod",
            "infantry_class": "Class",
            "item": "Item",
            "mec_class": "Class",
            "perk": "Perk",
            "psi": "Psi Ability",
            "research": "Research"
        };

        this.query = null;
    }

    generatePreview(data) {
        // no need for previews for this page
        return null;
    }

    load(hostingElement, event, data) {
        // there shouldn't be any direct links here most likely
        return null;
    }

    loadFromDataObject(searchResults) {
        const template = templates.instantiateTemplate("template-search-results-page");

        template.querySelector("#search-results-query").textContent = searchResults.query;
        template.querySelector("#search-results-count").textContent = searchResults.results.length;

        // Group results by type
        const groups = {};

        for (let i = 0; i < searchResults.results.length; i++) {
            const result = searchResults.results[i];
            const resultGroup = this._dataGroupByPrefix[this._getDataType(result)];

            if (!groups[resultGroup]) {
                groups[resultGroup] = [];
            }

            groups[resultGroup].push(result);
        }

        const sortedGroupKeys = Object.keys(groups).sort();
        const resultsContainer = template.querySelector("#search-results-container");

        for (let i = 0; i < sortedGroupKeys.length; i++) {
            // Sort each group by name before adding to DOM
            const key = sortedGroupKeys[i];

            const groupContainer = document.createElement("div");
            groupContainer.classList.add("search-results-group-container");
            resultsContainer.appendChild(groupContainer);

            groups[key].sort( (a, b) => {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();

                return nameA < nameB ? -1 : nameA > nameB ? 1 : 0;
            });

            for (let j = 0; j < groups[key].length; j++) {
                const result = groups[key][j];

                const div = document.createElement("div");
                div.textContent = key + ": ";
                div.appendChild(widgets.createInAppLink(result));

                groupContainer.appendChild(div);
            }
        }

        return template;
    }

    ownsDataObject(dataObj) {
        return dataObj.id === "search_results";
    }

    onUnloadBeginning(_event) {
        const historyData = {
        };

        return new PageHistoryState(this, historyData);
    }

    _getDataType(data) {
        if (data.id.startsWith("facility")) {
            return "facility";
        }
        else if (data.id.startsWith("foundry")) {
            return "foundry";
        }
        else if (data.id.startsWith("gene_mod")) {
            return "gene_mod";
        }
        else if (data.id.startsWith("infantry_class")) {
            return "infantry_class";
        }
        else if (data.id.startsWith("item")) {
            return "item";
        }
        else if (data.id.startsWith("mec_class")) {
            return "mec_class";
        }
        else if (data.id.startsWith("perk")) {
            return "perk";
        }
        else if (data.id.startsWith("psi")) {
            return "psi";
        }
        else if (data.id.startsWith("research")) {
            return "research";
        }
    }
}

module.exports.SearchResultsPage = SearchResultsPage;