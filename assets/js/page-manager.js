const { ipcRenderer, shell } = require('electron');

import * as Search from "./search-provider.js";
import * as Templates from "./templates.js";
import * as Utils from "./utils.js";

import BaseFacilityPage from "./page-controllers/base-facility-page.js";
import BaseFacilitiesBrowsePage from "./page-controllers/base-facilities-browse-page.js";
import CampaignPlannerPage from "./page-controllers/campaign-planner-page.js";
import EnemyBrowsePage from "./page-controllers/enemy-browse-page.js";
import EnemyDisplayPage from "./page-controllers/enemy-display-page.js";
import FoundryProjectsBrowsePage from "./page-controllers/foundry-projects-browse-page.js";
import FoundryProjectDisplayPage from "./page-controllers/foundry-project-display-page.js";
import HomePage from "./page-controllers/home-page.js";
import ItemDisplayPage from "./page-controllers/item-display-page.js";
import MapDetailsPage from "./page-controllers/map-details-page.js";
import MapPossibilitiesPage from "./page-controllers/map-possibilities-page.js";
import PerkTreeDisplayPage from "./page-controllers/perk-tree-display-page.js";
import ResearchCreditsBrowsePage from "./page-controllers/research-credits-browse-page.js";
import SearchResultsPage from "./page-controllers/search-results-page.js";
import SoldierLoadoutEquipmentPage from "./page-controllers/soldier-loadouts/loadout-equipment-page.js";
import SoldierLoadoutFoundryPage from "./page-controllers/soldier-loadouts/loadout-foundry-page.js";
import SoldierLoadoutHomePage from "./page-controllers/soldier-loadouts/loadout-home-page.js";
import SoldierLoadoutPerkTreesPage from "./page-controllers/soldier-loadouts/loadout-perk-trees-page.js";
import SoldierLoadoutSelectionPage from "./page-controllers/soldier-loadouts/loadout-selection-page.js";
import TechDetailsPage from "./page-controllers/tech-details-page.js";
import TechTreeDisplayPage from "./page-controllers/tech-tree-display-page.js";
import UfoBrowsePage from "./page-controllers/ufo-browse-page.js";
import UfoDetailsPage from "./page-controllers/ufo-details-page.js";

const appPages = [
    BaseFacilityPage,
    BaseFacilitiesBrowsePage,
    CampaignPlannerPage,
    EnemyBrowsePage,
    EnemyDisplayPage,
    FoundryProjectsBrowsePage,
    FoundryProjectDisplayPage,
    HomePage,
    ItemDisplayPage,
    MapDetailsPage,
    MapPossibilitiesPage,
    PerkTreeDisplayPage,
    ResearchCreditsBrowsePage,
    SearchResultsPage,
    SoldierLoadoutEquipmentPage,
    SoldierLoadoutFoundryPage,
    SoldierLoadoutHomePage,
    SoldierLoadoutPerkTreesPage,
    SoldierLoadoutSelectionPage,
    TechDetailsPage,
    TechTreeDisplayPage,
    UfoBrowsePage,
    UfoDetailsPage
];

const pagesById = {};

for (let i = 0; i < appPages.length; i++) {
    const page = appPages[i];
    pagesById[page.pageId] = page;
}

class PageManager {
    static instance = null;

    /**
     * currentHistoryIndex points to which history entry we're currently viewing. If the current page is
     * not from the history (i.e. it's just from clicking a link) then this will point one past the end of
     * the #pageHistory array.
     */
    #currentHistoryIndex = 0;

    #currentPage = null;
    #maxPageHistorySize = 50;
    #pageContentHolder = null;
    #pageHistory = [];
    #pagePreviewTooltip = null;
    #pageTitleHolder = null;
    #showTooltip = false;

    constructor(pageContentHolder, pageTitleHolder) {
        this.#pageContentHolder = pageContentHolder;
        this.#pageTitleHolder = pageTitleHolder;

        // Create the tooltip container and make sure it's outside of all other DOM so it always appears on top
        this.#pagePreviewTooltip = document.createElement("div");
        this.#pagePreviewTooltip.classList.add("hidden-collapse");
        this.#pagePreviewTooltip.classList.add("tooltip");
        document.body.appendChild(this.#pagePreviewTooltip);

        document.body.addEventListener("keydown", this._handleKeyDown.bind(this));
        document.body.addEventListener("mouseup", this._handleDocumentClick.bind(this));
        document.body.addEventListener("mouseout", this.hideTooltip.bind(this));
        document.body.addEventListener("mouseover", this._handleElementMouseover.bind(this));

        document.getElementById("history-button-back").addEventListener("click", this.tryGoBack.bind(this));
        document.getElementById("history-button-forward").addEventListener("click", this.tryGoForward.bind(this));
    }

    async getPagePreview(pageId, data) {
        if (data.noPreview) {
            return;
        }

        if (!(pageId in pagesById)) {
            return null;
        }

        const targetPage = pagesById[pageId];

        return targetPage.generatePreview(data);
    }

    hideTooltip() {
        this.#showTooltip = false;
        this.#pagePreviewTooltip.innerHTML = "";
        this.#pagePreviewTooltip.classList.add("hidden-collapse");
    }

    async loadPage(pageId, data) {
        if (!(pageId in pagesById)) {
            throw new Error(`Could not find a page with the ID "${pageId}"`);
        }

        this._unloadCurrentPage(false);
        this.hideTooltip();

        this.#currentPage = new pagesById[pageId]();

        const pageDocument = await this.#currentPage.load(data);
        this._loadPageDocument(pageDocument);
        this._validateHistory();
        this._updateHistoryButtons();
    }

    loadPageForData(data) {
        for (let i = 0; i < appPages.length; i++) {
            if (appPages[i].ownsDataObject(data)) {
                this._unloadCurrentPage(false);
                this.hideTooltip();

                const page = new appPages[i]();
                page.loadFromDataObject(data).then(pageDocument => {
                    this.#currentPage = page;
                    this._loadPageDocument(pageDocument);
                    this._validateHistory();
                    this._updateHistoryButtons();
                })

                return;
            }
        }
    }

    /**
     * Shows the page preview tooltip for a given page, positioning it appropriately based on the rect provided.
     *
     * @param {String} pageId Which page to get the preview for
     * @param {Object} pageData An object with data values for the page to use
     * @param {DOMRect} targetElementRect A DOMRect for the element that the tooltip should be positioned relative to
     */
    showPagePreviewTooltip(pageId, pageData, targetElementRect) {
        this.#showTooltip = true;
        const previewPromise = this.getPagePreview(pageId, pageData);

        previewPromise.then(preview => {
            if (preview) {
                this.#pagePreviewTooltip.classList.remove("content-tooltip");
                this.#pagePreviewTooltip.classList.add("preview-tooltip");
                this.#pagePreviewTooltip.appendChild(preview);

                // tooltip doesn't have a rect until it's part of the DOM, so now we can reposition it
                this._repositionTooltip(targetElementRect).then( () => {
                    if (this.#showTooltip) {
                        this.#pagePreviewTooltip.classList.remove("hidden-collapse")
                    }
                });
            }
        });
    }

    /**
     * Shows a tooltip with arbitrary content, positioning it appropriately based on the rect provided.
     *
     * @param {DOMRect} targetElementRect A DOMRect for the element that the tooltip should be positioned relative to
     * @param {Element} content An HTML element to use as the content of the tooltip
     */
    showTooltip(targetElementRect, content) {
        this.#showTooltip = true;

        this.#pagePreviewTooltip.classList.add("content-tooltip");
        this.#pagePreviewTooltip.classList.remove("preview-tooltip");
        this.#pagePreviewTooltip.appendChild(content);

        // tooltip doesn't have a rect until it's part of the DOM, so now we can reposition it
        this._repositionTooltip(targetElementRect).then( () => {
            if (this.#showTooltip) {
                this.#pagePreviewTooltip.classList.remove("hidden-collapse")
            }
        });
    }

    tryGoBack() {
        if (!this.canGoBack) {
            return false;
        }

        this._loadPageFromHistory(this.#currentHistoryIndex - 1);

        return true;
    }

    tryGoForward() {
        if (!this.canGoForward) {
            return false;
        }

        this._loadPageFromHistory(this.#currentHistoryIndex + 1);

        return true;
    }

    _extractPageDataArgs(element) {
        // Take any data attribute starting with "pagearg" and transform it into an object
        const data = {};
        for (let argName in element.dataset) {
            if (argName.startsWith("pagearg")) {
                const argValue = element.dataset[argName];
                argName = argName.substring("pagearg".length);
                argName = argName[0].toLowerCase() + argName.slice(1);

                data[argName] = argValue;
            }
        }

        return data;
    }

    _handleDocumentClick(event) {
        if (event.button === 3) {
            event.preventDefault();
            this.tryGoBack();
            return;
        }

        if (event.button === 4) {
            event.preventDefault();
            this.tryGoForward();
            return;
        }

        // After this point, we only care about left clicks
        if (event.button != 0) {
            return;
        }

        // For http links, open in an external browser
        if (event.target.href && event.target.href.startsWith("http")) {
            event.preventDefault();
            shell.openExternal(event.target.href);
            return;
        }

        if (!event.target.dataset.pageOnClick) {
            return;
        }

        event.preventDefault();

        const requestedPageId = event.target.dataset.pageOnClick;
        const data = this._extractPageDataArgs(event.target);

        this.loadPage(requestedPageId, data);
    }

    async _handleElementMouseover(event) {
        if (event.target.dataset.tooltipTemplateFile && event.target.dataset.tooltipTemplateId) {
            const template = await Templates.instantiateTemplate(event.target.dataset.tooltipTemplateFile, event.target.dataset.tooltipTemplateId);
            const targetElementRect = event.target.getBoundingClientRect();

            this.showTooltip(targetElementRect, template);
        }
        else if (event.target.dataset.tooltipText) {
            const targetElementRect = event.target.getBoundingClientRect();
            const div = document.createElement("div");
            div.classList.add("text-only-tooltip");
            div.innerHTML = event.target.dataset.tooltipText;

            this.showTooltip(targetElementRect, div);
        }
        else if (event.target.dataset.pageOnClick) {
            const data = this._extractPageDataArgs(event.target);

            if (data.noPreview) {
                return;
            }

            const targetElementRect = event.target.getBoundingClientRect();
            this.showPagePreviewTooltip(event.target.dataset.pageOnClick, data, targetElementRect);
        }
    }

    _handleKeyDown(event) {
        if (event.altKey && event.key === "ArrowLeft" && !event.repeat) {
            event.preventDefault();
            this.tryGoBack();
        }
        else if (event.altKey && event.key === "ArrowRight" && !event.repeat) {
            event.preventDefault();
            this.tryGoForward();
        }
    }

    async _loadPageFromHistory(historyIndex) {
        this.hideTooltip();
        this._unloadCurrentPage(true);

        const historyState = this.#pageHistory[historyIndex];
        this.#currentPage = new pagesById[historyState.pageId]();

        const pageDocument = await this.#currentPage.load(historyState.data);
        this._loadPageDocument(pageDocument);

        this.#currentHistoryIndex = historyIndex;
        this._updateHistoryButtons();
    }

    async _loadPageDocument(pageDocument) {
        const documentBody = await pageDocument.body;

        // Replace the header content entirely
        this.#pageTitleHolder.innerHTML = "";

        if (pageDocument.title.icon) {
            const img = document.createElement("img");
            img.src = pageDocument.title.icon;

            this.#pageTitleHolder.appendChild(img);
        }

        this.#pageTitleHolder.innerHTML += pageDocument.title.text;

        // Clear out the contents of the hosting element and replace them with this page
        this.#pageContentHolder.innerHTML = "";
        this.#pageContentHolder.appendChild(documentBody);
        this.#pageContentHolder.scrollTo(0, 0);
    }

    _pushToHistory(historyState) {
        // Get rid of any history entries after our current position (e.g., if we've gone back a few times
        // then click a link, the 'forward' history should be erased)
        this.#pageHistory = this.#pageHistory.splice(0, this.#currentHistoryIndex);

        while (this.#pageHistory.length >= this.#maxPageHistorySize) {
            // Remove the oldest entries until the history is small enough
            this.#pageHistory.shift();
        }

        if (historyState) {
            // Compare with latest history state and don't add if they match
            const latestHistoryState = this.#pageHistory.last;

            if (!Utils.equals(historyState, latestHistoryState)) {
                this.#pageHistory.push(historyState);
            }
        }

        this.#currentHistoryIndex = this.#pageHistory.length;
        this._updateHistoryButtons();
    }

    async _repositionTooltip(targetElementRect) {
        const horizontalMargin = 20;
        const verticalMargin = 10;

        // Tooltip needs to be briefly visible so its size can be calculated in the DOM, but then hidden
        // again so it's not visible in the wrong place while we use IPC
        this.#pagePreviewTooltip.classList.remove("hidden-collapse")
        const tooltipRect = this.#pagePreviewTooltip.getBoundingClientRect();
        this.#pagePreviewTooltip.classList.add("hidden-collapse")

        let windowBounds = await ipcRenderer.invoke("get-window-size");

        // For horizontal placement, just make sure the tooltip isn't too close to the edge of the window
        let tooltipLeft = targetElementRect.left + (targetElementRect.width / 2) - (tooltipRect.width / 2);
        tooltipLeft = Math.min(tooltipLeft, windowBounds.width - horizontalMargin - tooltipRect.width);
        tooltipLeft = Math.max(tooltipLeft, horizontalMargin);

        // For vertical placement, if the tooltip would be too close to the top of the window,
        // we show it below the target element instead
        let tooltipTop = targetElementRect.top - tooltipRect.height - verticalMargin;

        if (tooltipTop < verticalMargin) {
            tooltipTop = targetElementRect.top + targetElementRect.height + verticalMargin;
        }

        this.#pagePreviewTooltip.style.top = tooltipTop + "px";
        this.#pagePreviewTooltip.style.left = tooltipLeft + "px";
    }

    _unloadCurrentPage(isHistoryNavigation) {
        if (!this.#currentPage) {
            return;
        }

        const newHistoryState = this.#currentPage.makeHistoryState();

        if (!newHistoryState) {
            return;
        }

        if (isHistoryNavigation) {
            // If navigating through history, just overwrite
            this.#pageHistory[this.#currentHistoryIndex] = newHistoryState;
        }
        else {
            this._pushToHistory(newHistoryState);
        }
    }

    _updateHistoryButtons() {
        if (this.canGoBack) {
            document.getElementById("history-button-back").classList.remove("disabled");
        }
        else {
            document.getElementById("history-button-back").classList.add("disabled");
        }

        if (this.canGoForward) {
            document.getElementById("history-button-forward").classList.remove("disabled");
        }
        else {
            document.getElementById("history-button-forward").classList.add("disabled");
        }
    }

    _validateHistory() {
        const currentState = this.#currentPage.makeHistoryState();
        const latestHistoryState = this.#pageHistory.last;

        if (Utils.equals(currentState, latestHistoryState)) {
            // Just delete the latest entry if it matches the current page
            this.#pageHistory.pop();
            this.#currentHistoryIndex = Math.min(this.#currentHistoryIndex, this.#pageHistory.length);
            this._updateHistoryButtons();
        }
    }

    get canGoBack() {
        return this.#currentHistoryIndex > 0;
    }

    get canGoForward() {
        return this.#currentHistoryIndex < this.#pageHistory.length - 1;
    }
}

const pageContentHolder = document.getElementById("page-body-container");
const pageTitleHolder = document.getElementById("page-title-container");
PageManager.instance = new PageManager(pageContentHolder, pageTitleHolder);

Search.onDomReady();
PageManager.instance.loadPage("home-page", { });

export default PageManager;