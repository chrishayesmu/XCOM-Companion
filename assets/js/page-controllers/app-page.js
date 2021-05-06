class AppPage {
    constructor(id) {
        this.id = id;
    }

    /**
     * Called to generate a small preview of the page that can be shown in a tooltip.
     *
     * @param {*} data Page data to use for the preview.
     * @returns {Element} An element which can be displayed in a tooltip as a preview of the page, or null if not supported.
     */
     async generatePreview(data) {
        return null;
    }

    /**
     * Called when this page should load itself so it can be added to the DOM.
     *
     * @param {Object} dataArgs Data to use while loading, which may come from history or from the caller asking to load the page.
     * @returns {Object} An object with two keys, in the form { body: <Element>, title: { icon: <String>, text: <String> } }
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
     * Called when this page is going to be removed from the DOM. The page should remove any event listeners
     * or other state that will be invalidated.
     *
     * @param {Event} event The event causing this page to be unloaded.
     * @returns {PageHistoryState} A history state so the page can be reloaded into the same state, or null if unsupported.
     */
    onUnloadBeginning(event) {
        return null;
    }

    /**
     * Called to determine which page owns a data object, so that the appropriate page can be opened.
     *
     * @param {*} dataObj
     * @returns {Boolean} True if this page owns the data object, false otherwise.
     */
    ownsDataObject(dataObj) {
        return false;
    }
}

class PageHistoryState {
    constructor(appPage, data) {
        this.pageId = appPage.id;
        this.data = data;
    }
}

export { AppPage, PageHistoryState };