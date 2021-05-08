const { ipcRenderer, shell } = require('electron');

import * as Search from "./search-provider.js";

import BaseFacilityPage from "./page-controllers/base-facility-page.js";
import BaseFacilitiesBrowsePage from "./page-controllers/base-facilities-browse-page.js";
import ClassSelectionPage from "./page-controllers/class-selection-page.js";
import FoundryProjectsBrowsePage from "./page-controllers/foundry-projects-browse-page.js";
import FoundryProjectDisplayPage from "./page-controllers/foundry-project-display-page.js";
import HomePage from "./page-controllers/home-page.js";
import ItemDisplayPage from "./page-controllers/item-display-page.js";
import PerkTreeDisplayPage from "./page-controllers/perk-tree-display-page.js";
import SearchResultsPage from "./page-controllers/search-results-page.js";
import TechDetailsPage from "./page-controllers/tech-details-page.js";
import TechTreeDisplayPage from "./page-controllers/tech-tree-display-page.js";

const appPages = [
    new BaseFacilityPage(),
    new BaseFacilitiesBrowsePage(),
    new ClassSelectionPage(),
    new FoundryProjectsBrowsePage(),
    new FoundryProjectDisplayPage(),
    new HomePage(),
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

    constructor(pageContentHolder, pageTitleHolder) {
        this.currentPage = null;
        this.currentTooltipTarget = null;
        this.maxPageHistorySize = 50;
        this._pageContentHolder = pageContentHolder;
        this._pageTitleHolder = pageTitleHolder;
        this.pageHistory = [];
        this.pagePreview = null;
        this._showTooltip = false;

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
        this._showTooltip = false;
        this.pagePreviewTooltip.innerHTML = "";
        this.pagePreviewTooltip.classList.add("hidden-collapse");
    }

    async loadPage(pageId, data) {
        if (!(pageId in pagesById)) {
            throw new Error(`Could not find a page with the ID "${pageId}"`);
        }

        this._unloadCurrentPage();
        this.hidePagePreviewTooltip();
        this.currentPage = pagesById[pageId];

        const pageDocument = await this.currentPage.load(data);
        this._loadPageIntoDom(pageDocument);
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
                    this._loadPageIntoDom(pageDocument);
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
        this._showTooltip = true;
        const previewPromise = this.getPagePreview(pageId, pageData);

        previewPromise.then(preview => {
            if (preview) {
                this.pagePreviewTooltip.appendChild(preview);

                // tooltip doesn't have a rect until it's part of the DOM, so now we can reposition it
                this._repositionTooltip(targetElementRect).then( () => {
                    if (this._showTooltip) {
                        this.pagePreviewTooltip.classList.remove("hidden-collapse")
                    }
                });
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

    async _loadPageIntoDom(pageDocument) {
        const documentBody = await pageDocument.body;

        // Replace the header content entirely
        this._pageTitleHolder.innerHTML = "";

        if (pageDocument.title.icon) {
            const img = document.createElement("img");
            img.src = pageDocument.title.icon;

            this._pageTitleHolder.appendChild(img);
        }

        this._pageTitleHolder.innerHTML += pageDocument.title.text;

        // Clear out the contents of the hosting element and replace them with this page
        this._pageContentHolder.innerHTML = "";
        this._pageContentHolder.appendChild(documentBody);
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

        // Tooltip needs to be briefly visible so its size can be calculated in the DOM, but then hidden
        // again so it's not visible in the wrong place while we use IPC
        this.pagePreviewTooltip.classList.remove("hidden-collapse")
        const tooltipRect = this.pagePreviewTooltip.getBoundingClientRect();
        this.pagePreviewTooltip.classList.add("hidden-collapse")

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

const pageContentHolder = document.getElementById("page-body-container");
const pageTitleHolder = document.getElementById("page-title-container");
PageManager.instance = new PageManager(pageContentHolder, pageTitleHolder);

Search.onDomReady();
PageManager.instance.loadPage("home-page", { });

export default PageManager;