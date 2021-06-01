class AppPage {

    /**
     * Called to determine which page owns a data object, so that the appropriate page can be opened.
     *
     * @param {*} dataObj
     * @returns {Boolean} True if this page owns the data object, false otherwise.
     */
    static ownsDataObject(dataObj) {
        return false;
    }

    /**
     * Called to generate a small preview of the page that can be shown in a tooltip.
     *
     * @param {*} data Page data to use for the preview.
     * @returns {Element} An element which can be displayed in a tooltip as a preview of the page, or null if not supported.
     */
    static async generatePreview(data) {
        return null;
    }

    /**
     * Called when this page should load itself so it can be added to the DOM.
     *
     * @param {Object} dataArgs Data to use while loading, which may come from history or from the caller asking to load the page.
     * @returns {Object} An object with two keys, in the form { body: <Element>, title: { icon: <String?>, text: <String> } }
     */
    async load(dataArgs) {
        return null;
    }

    /**
     * Called to load the page from a supported data object directly.
     *
     * @param {*} dataObj
     * @returns {Object} An object with two keys, in the form { body: <Element>, title: { icon: <String?>, text: <String> } }
     */
    async loadFromDataObject(dataObj) {
        return null;
    }

    /**
     * Creates a history state that can be used to recreate the page in its current state by calling load. It is important for this
     * state object to match the arguments that would be passed if opening the page via a link.
     *
     * This can be called at any time, not only during an unload of the page.
     *
     * @returns {PageHistoryState} A history state so the page can be reloaded into the same state, or null if unsupported.
     */
    makeHistoryState() {
        return new PageHistoryState(this, null);
    }

    /**
     * Called when this page is going to be removed from the DOM. The page should remove any event listeners
     * or other state that will be invalidated.
     */
    unload() {
    }
}

class PageHistoryState {
    constructor(appPage, data) {
        this.pageId = appPage.constructor.pageId;
        this.data = data || {};
    }
}

export { AppPage, PageHistoryState };
