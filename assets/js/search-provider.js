import * as dataHelper from "./data-helper.js";
import PageManager from "./page-manager.js";

const dataSources = [
    Object.values(dataHelper.baseFacilities),
    Object.values(dataHelper.foundryProjects),
    Object.values(dataHelper.geneMods),
    Object.values(dataHelper.items),
    Object.values(dataHelper.perks),
    Object.values(dataHelper.psiAbilities),
    Object.values(dataHelper.soldierClasses),
    Object.values(dataHelper.technologies)
];

function onDomReady() {
    const searchInput = document.getElementById("nav-search-input");

    searchInput.addEventListener("keydown", event => {
        // TODO could potentially add a dropdown of results below the input field as you type
        const searchString = searchInput.value.trim();

        if (event.key === "Enter" && searchString) {
            const searchResults = search(searchString);
            searchInput.value = "";

            if (searchResults.resultType === "exact") {
                PageManager.instance.loadPageForData(searchResults.result);
            }
            else {
                searchResults.id = "search_results";
                PageManager.instance.loadPageForData(searchResults);
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
        // TODO: might be multiple exact matches (some perks/items share names)
        for (let i = 0; i < matches.length; i++) {
            if (matches[i].name.toLowerCase() === queryLower) {
                return {
                    "result": matches[i],
                    "resultType": "exact",
                    "query": query
                };
            }
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