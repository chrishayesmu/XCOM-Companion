import * as DataHelper from "./data-helper.js";
import PageManager from "./page-manager.js";

const dataSources = [
    Object.values(DataHelper.baseFacilities),
    Object.values(DataHelper.enemies),
    Object.values(DataHelper.foundryProjects),
    Object.values(DataHelper.geneMods),
    Object.values(DataHelper.items),
    Object.values(DataHelper.maps),
    Object.values(DataHelper.perks),
    Object.values(DataHelper.psiAbilities),
    Object.values(DataHelper.soldierClasses),
    Object.values(DataHelper.technologies),
    Object.values(DataHelper.ufos)
];

const amongUsPizzaTriggers = [ "amongus", "amogus", "among us", "pizza" ];

function onDomReady() {
    // Populate auto-complete for search input
    const searchDatalist = document.getElementById("search-datalist");
    const searchTerms = [];

    for (const dataSource of dataSources) {
        const sampleDataId = dataSource[0].id;

        // These data types don't have pages to go to, so keep them out of the auto-complete
        if (sampleDataId.startsWith("gene")
        || sampleDataId.startsWith("perk")
        || sampleDataId.startsWith("psi")) {
            continue;
        }

        searchTerms.push(...dataSource.map(d => ({ name: d.name, id: d.id }) ));
    }

    searchTerms.sort( (a, b) => a.name.localeCompare(b.name));
    for (const term of searchTerms) {
        const option = document.createElement("option");
        option.value = term.name;
        option.textContent = DataHelper.typeOf(term.id);
        searchDatalist.appendChild(option);
    }

    // Add search event handler
    const searchInput = document.getElementById("nav-search-input");

    searchInput.addEventListener("keydown", event => {
        const searchString = searchInput.value.trim();

        if (event.key === "Enter" && searchString) {
            // Have to blur and re-focus to get the autocomplete datalist to go away
            searchInput.value = "";
            searchInput.blur();
            searchInput.focus();

            if (amongUsPizzaTriggers.includes(searchString)) {
                const img = document.getElementById("easter-egg-amongus-pizza");

                if (img.classList.contains("hidden-collapse")) {
                    img.classList.remove("hidden-collapse");
                }
                else {
                    img.classList.add("hidden-collapse");
                }
            }
            else {
                const searchResults = search(searchString);

                if (searchResults.resultType === "exact") {
                    PageManager.instance.loadPageForData(searchResults.result);
                }
                else {
                    searchResults.id = "search_results";
                    PageManager.instance.loadPageForData(searchResults);
                }
            }
        }
    });

    document.body.addEventListener("keydown", event => {
        if (event.key === "f" && event.ctrlKey) {
            searchInput.focus();
        }
    });
}

function search(query) {
    const matches = [];
    const queryLower = query.toLowerCase();

    for (let i = 0; i < dataSources.length; i++) {
        const matchingData = dataSources[i].filter( item => !item.hideInSearch && item.name.toLowerCase().includes(queryLower) );
        matches.push(...matchingData);
    }

    if (matches.length === 0) {
        return {
            "results": [],
            "resultType": "none",
            "query": query
        };
    }
    else if (matches.length === 1) {
        return {
            "result": matches[0],
            "resultType": "exact",
            "query": query
        };
    }
    else {
        // Check if any of the results matches the query exactly
        const exactMatches = [];
        for (let i = 0; i < matches.length; i++) {
            if (matches[i].name.toLowerCase() === queryLower) {
                exactMatches.push(matches[i]);
            }
        }

        if (exactMatches.length === 1) {
            return {
                "result": exactMatches[0],
                "resultType": "exact",
                "query": query
            };
        }

        // Otherwise return everything that matched
        return {
            "results": matches,
            "resultType": "inexact",
            "query": query
        };
    }
}

export { onDomReady, search };