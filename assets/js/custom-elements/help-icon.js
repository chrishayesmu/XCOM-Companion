import PageManager from "../page-manager.js";

customElements.define("help-icon",
    class extends HTMLElement {

        constructor() {
            super();

            this.addEventListener("mouseenter", this._onImgMouseEnter.bind(this));
            this.addEventListener("mouseout", this._onImgMouseOut.bind(this));

            const shadowRoot = this.attachShadow({ mode: "open" });
            shadowRoot.textContent = "?";

            const cssLink = document.createElement("link");
            cssLink.rel = "stylesheet";
            cssLink.href = "assets/css/custom-elements/help-icon-internal.css";

            shadowRoot.prepend(cssLink);
        }

        _onImgMouseEnter(event) {
            const rect = this.getBoundingClientRect();

            const tooltip = document.createElement("div");
            tooltip.classList.add("help-icon-tooltip-container");
            tooltip.innerHTML = this.innerHTML;
            tooltip.style = "max-width: 450px; padding: 8px 10px";

            PageManager.instance.showTooltip(rect, tooltip);
        }

        _onImgMouseOut(event) {
            PageManager.instance.hideTooltip();
        }
    }
);