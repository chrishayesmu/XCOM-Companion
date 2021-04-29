const { ipcRenderer } = require('electron');

import * as Search from "./search-provider.js";

import ClassSelectionPage from "./page-controllers/class-selection-page.js";
import FoundryProjectDisplayPage from "./page-controllers/foundry-project-display-page.js";
import ItemDisplayPage from "./page-controllers/item-display-page.js";
import PerkTreeDisplayPage from "./page-controllers/perk-tree-display-page.js";
import SearchResultsPage from "./page-controllers/search-results-page.js";
import TechDetailsPage from "./page-controllers/tech-details-page.js";
import TechTreeDisplayPage from "./page-controllers/tech-tree-display-page.js";

const appPages = [
    new ClassSelectionPage(),
    new FoundryProjectDisplayPage(),
    new ItemDisplayPage(),
    new PerkTreeDisplayPage(),
    new SearchResultsPage(),
    new TechDetailsPage(),
    new TechTreeDisplayPage()
];

const pagesById = {};

for (let i = 0; i < appPages.length; i++) {
    const page = appPages[i];
    pagesById[page.id] = page;
}

class PageManager {
    static instance = null;

    constructor(pageContentHolder) {
        this.currentPage = null;
        this.currentTooltipTarget = null;
        this.maxPageHistorySize = 50;
        this.pageContentHolder = pageContentHolder;
        this.pageHistory = [];
        this.pagePreview = null;

        // Create the tooltip container and make sure it's outside of all other DOM so it always appears on top
        this.pagePreviewTooltip = document.createElement("div");
        this.pagePreviewTooltip.classList.add("hidden-collapse");
        this.pagePreviewTooltip.classList.add("preview-tooltip");
        document.body.appendChild(this.pagePreviewTooltip);

        document.body.addEventListener("click", this._handleDocumentClick.bind(this));
        document.body.addEventListener("mouseout", this.hidePagePreviewTooltip.bind(this));
        document.body.addEventListener("mouseover", this._handleElementMouseover.bind(this));
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

    hidePagePreviewTooltip() {
        this.pagePreviewTooltip.innerHTML = "";
        this.pagePreviewTooltip.classList.add("hidden-collapse");
    }

    async loadPage(pageId, event, data) {
        if (!(pageId in pagesById)) {
            throw new Error(`Could not find a page with the ID "${pageId}"`);
        }

        this._unloadCurrentPage();
        this.hidePagePreviewTooltip();
        this.currentPage = pagesById[pageId];
        const pageDocument = await this.currentPage.load(this.pageContentHolder, event, data);

        // Clear out the contents of the hosting element and replace them with this page
        this.pageContentHolder.innerHTML = "";
        this.pageContentHolder.appendChild(pageDocument);
    }

    loadPageForData(data) {
        for (let i = 0; i < appPages.length; i++) {
            if (appPages[i].ownsDataObject(data)) {
                const page = appPages[i];
                page.loadFromDataObject(data).then(pageDocument => {
                    if (!pageDocument) {
                        return;
                    }

                    this.hidePagePreviewTooltip();
                    this._unloadCurrentPage();
                    this.currentPage = page;

                    // Clear out the contents of the hosting element and replace them with this page
                    this.pageContentHolder.innerHTML = "";
                    this.pageContentHolder.appendChild(pageDocument);
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
        const previewPromise = this.getPagePreview(pageId, pageData);

        previewPromise.then(preview => {
            if (preview) {
                this.pagePreviewTooltip.appendChild(preview);
                this.pagePreviewTooltip.classList.remove("hidden-collapse");

                // tooltip doesn't have a rect until it's part of the DOM, so now we can reposition it
                this._repositionTooltip(targetElementRect);
            }
        });
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
        if (!event.target.dataset.pageOnClick) {
            return;
        }

        event.preventDefault();

        const requestedPageId = event.target.dataset.pageOnClick;
        const data = this._extractPageDataArgs(event.target);

        this.loadPage(requestedPageId, event, data);
    }

    _handleElementMouseover(event) {
        if (!event.target.dataset.pageOnClick) {
            return;
        }

        const data = this._extractPageDataArgs(event.target);

        if (data.noPreview) {
            return;
        }

        const targetElementRect = event.target.getBoundingClientRect();
        this.showPagePreviewTooltip(event.target.dataset.pageOnClick, data, targetElementRect);
    }

    _pushToHistory(historyState) {
        while (this.pageHistory.length >= this.maxPageHistorySize) {
            // Remove the oldest entries until the history is small enough
            this.pageHistory.shift();
        }

        if (historyState) {
            this.pageHistory.push(historyState);
        }
    }

    async _repositionTooltip(targetElementRect) {
        const horizontalMargin = 20;
        const verticalMargin = 10;

        const tooltipRect = this.pagePreviewTooltip.getBoundingClientRect();

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

        this.pagePreviewTooltip.style.top = tooltipTop + "px";
        this.pagePreviewTooltip.style.left = tooltipLeft + "px";
    }

    _unloadCurrentPage() {
        if (this.currentPage) {
            const newHistoryState = this.currentPage.onUnloadBeginning(event);

            if (newHistoryState) {
                this._pushToHistory(newHistoryState);
            }
        }
    }
}

const pageContentHolder = document.getElementById("page-content");
PageManager.instance = new PageManager(pageContentHolder);

Search.onDomReady();
PageManager.instance.loadPage("item-display-page", null, { itemId: "item_titan_armor" });

export default PageManager;