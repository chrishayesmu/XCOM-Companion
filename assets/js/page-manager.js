const remote = require("electron").remote;

const searchProvider = require("./search-provider");

const ClassSelectionPage = require("./page-controllers/class-selection-page").ClassSelectionPage;
const FoundryProjectDisplayPage = require("./page-controllers/foundry-project-display-page").FoundryProjectDisplayPage;
const ItemDisplayPage = require("./page-controllers/item-display-page").ItemDisplayPage;
const PerkTreeDisplayPage = require("./page-controllers/perk-tree-display-page").PerkTreeDisplayPage;
const SearchResultsPage = require("./page-controllers/search-results-page").SearchResultsPage;
const TechDetailsPage = require("./page-controllers/tech-details-page").TechDetailsPage;
const TechTreeDisplayPage = require("./page-controllers/tech-tree-display-page").TechTreeDisplayPage;

appPages = [
    new ClassSelectionPage(),
    new FoundryProjectDisplayPage(),
    new ItemDisplayPage(),
    new PerkTreeDisplayPage(),
    new SearchResultsPage(),
    new TechDetailsPage(),
    new TechTreeDisplayPage()
];

pagesById = {}

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

    getPagePreview(pageId, data) {
        if (data.noPreview) {
            return;
        }

        const targetPage = pagesById[pageId];
        return targetPage.generatePreview(data);
    }

    hidePagePreviewTooltip() {
        this.pagePreviewTooltip.innerHTML = "";
        this.pagePreviewTooltip.classList.add("hidden-collapse");
    }

    loadPage(pageId, event, data) {
        if (!(pageId in pagesById)) {
            throw new Error(`Could not find a page with the ID "${pageId}"`);
        }

        const page = pagesById[pageId];
        const pageDocument = page.load(this.pageContentHolder, event, data);

        if (!pageDocument) {
            return;
        }

        this.hidePagePreviewTooltip();
        this._unloadCurrentPage();
        this.currentPage = page;

        // Clear out the contents of the hosting element and replace them with this page
        this.pageContentHolder.innerHTML = "";
        this.pageContentHolder.appendChild(pageDocument);
    }

    loadPageForData(data) {
        for (let i = 0; i < appPages.length; i++) {
            if (appPages[i].ownsDataObject(data)) {
                const page = appPages[i];
                const pageDocument = page.loadFromDataObject(data);

                if (!pageDocument) {
                    return;
                }

                this.hidePagePreviewTooltip();
                this._unloadCurrentPage();
                this.currentPage = page;

                // Clear out the contents of the hosting element and replace them with this page
                this.pageContentHolder.innerHTML = "";
                this.pageContentHolder.appendChild(pageDocument);

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
        const preview = this.getPagePreview(pageId, pageData);

        if (preview) {
            this.pagePreviewTooltip.appendChild(preview);
            this.pagePreviewTooltip.classList.remove("hidden-collapse");

            // tooltip doesn't have a rect until it's part of the DOM, so now we can reposition it
            this._repositionTooltip(targetElementRect);
        }
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

    _repositionTooltip(targetElementRect) {
        const horizontalMargin = 20;
        const verticalMargin = 10;

        const tooltipRect = this.pagePreviewTooltip.getBoundingClientRect();

        const windowBounds = remote.getCurrentWindow().getContentBounds();

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

module.exports.PageManager = PageManager;
module.exports.instance = PageManager.instance;

searchProvider.onDomReady();
PageManager.instance.loadPage("item-display-page", null, { itemId: "item_titan_armor" });