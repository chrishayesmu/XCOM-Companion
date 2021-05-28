class InfoBox extends HTMLElement {

    static dismissedIds = [];

    #dismissButton = null;
    #symbol = null;

    constructor() {
        super();

        this._recreateContents();
    }

    _createDismissButton() {
        const span = document.createElement("span");
        span.classList.add("infobox-dismiss-button");
        span.textContent = "✕";
        span.addEventListener("click", this._onDismissButtonClicked.bind(this));
        return span;
    }

    _createSymbol() {
        const span = document.createElement("span");
        span.classList.add("infobox-icon");

        if (this.messageType === "info") {
            span.style = "color: var(--color-strong)";
            span.textContent = "🛈";
        }
        else if (this.messageType === "warning") {
            span.style= "color: yellow";
            span.textContent = "⚠";
        }

        return span;
    }

    _onDismissButtonClicked() {
        this.classList.add("hidden-collapse");

        if (this.messageId) {
            InfoBox.dismissedIds.push(this.messageId);
        }
    }

    _recreateContents() {
        this.classList.add("infobox");

        if (this.dismissable && this.messageId && InfoBox.dismissedIds.includes(this.messageId)) {
            this.classList.add("hidden-collapse");
            return;
        }

        if (this.#dismissButton) {
            this.remove(this.#dismissButton);
        }

        if (this.#symbol) {
            this.remove(this.#symbol);
        }

        this.#symbol = this._createSymbol();
        this.prepend(this.#symbol);

        if (this.dismissable) {
            this.#dismissButton = this._createDismissButton();
            this.appendChild(this.#dismissButton);
        }
    }

    get dismissable() {
        return this.hasAttribute("dismissable");
    }

    set dismissable(dismissable) {
        if (dismissable) {
            this.setAttribute("dismissable", "");
        }
        else {
            this.removeAttribute("dismissable");
        }
    }

    get messageId() {
        return this.getAttribute("messageId");
    }

    set messageId(messageId) {
        this.setAttribute("messageId", messageId);
    }

    get messageType() {
        return this.getAttribute("messageType") || "info";
    }

    set messageType(messageType) {
        this.setAttribute("messageType", messageType);
    }
}

customElements.define("info-box", InfoBox);