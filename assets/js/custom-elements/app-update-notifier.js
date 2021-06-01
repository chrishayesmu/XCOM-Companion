const { ipcRenderer } = require('electron');

import * as Templates from "../templates.js";

customElements.define("app-update-notifier",
    class extends HTMLElement {
        constructor() {
            super();

            this.attachShadow({ mode: "open" });

            Templates.instantiateTemplate("assets/html/templates/custom-elements/app-update-notifier.html", "template-app-update-notifier").then(template => {
                this._containerElement = template;
                this.shadowRoot.appendChild(template);

                template.querySelector("#dismiss-button").addEventListener("click", this._onDismissButtonClicked.bind(this));
                template.querySelector("#dismiss-button-2").addEventListener("click", this._onDismissButtonClicked.bind(this));
                template.querySelector("#install-button").addEventListener("click", this._onInstallButtonClicked.bind(this));
            });

            ipcRenderer.on("app-update-available", this._onUpdateAvailable.bind(this));
            ipcRenderer.on("app-update-check-started", this._onManualUpdateCheckStarted.bind(this));
            ipcRenderer.on("app-update-download-progress", this._onUpdateDownloadProgress.bind(this));
            ipcRenderer.on("app-update-downloaded", this._onUpdateDownloaded.bind(this));
            ipcRenderer.on("app-update-not-available", this._onUpdateNotAvailable.bind(this));
        }

        _onDismissButtonClicked() {
            this._containerElement.classList.add("offscreen");
        }

        _onInstallButtonClicked() {
            ipcRenderer.send("app-update-accepted");
        }

        _onManualUpdateCheckStarted() {
            this.shadowRoot.querySelector("#notifier-contents-download-in-progress").classList.add("hidden");
            this.shadowRoot.querySelector("#notifier-contents-no-update-available").classList.add("hidden");
            this.shadowRoot.querySelector("#notifier-contents-ready-to-install").classList.add("hidden");
            this.shadowRoot.querySelector("#notifier-contents-update-check-in-progress").classList.remove("hidden");

            this._containerElement.classList.remove("offscreen");
        }

        _onUpdateAvailable() {
            this.shadowRoot.querySelector("#notifier-contents-download-in-progress").classList.remove("hidden");
            this.shadowRoot.querySelector("#notifier-contents-no-update-available").classList.add("hidden");
            this.shadowRoot.querySelector("#notifier-contents-ready-to-install").classList.add("hidden");
            this.shadowRoot.querySelector("#notifier-contents-update-check-in-progress").classList.add("hidden");

            this.shadowRoot.querySelector("#download-percent").textContent = 0;
            this._containerElement.classList.remove("offscreen");
        }

        _onUpdateDownloaded() {
            this.shadowRoot.querySelector("#notifier-contents-download-in-progress").classList.add("hidden");
            this.shadowRoot.querySelector("#notifier-contents-no-update-available").classList.add("hidden");
            this.shadowRoot.querySelector("#notifier-contents-ready-to-install").classList.remove("hidden");
            this.shadowRoot.querySelector("#notifier-contents-update-check-in-progress").classList.add("hidden");

            this._containerElement.classList.remove("offscreen");
        }

        _onUpdateDownloadProgress(_event, progressInfo) {
            this.shadowRoot.querySelector("#download-percent").textContent = Math.floor(progressInfo.percent);
        }

        _onUpdateNotAvailable() {
            this.shadowRoot.querySelector("#notifier-contents-download-in-progress").classList.add("hidden");
            this.shadowRoot.querySelector("#notifier-contents-no-update-available").classList.remove("hidden");
            this.shadowRoot.querySelector("#notifier-contents-ready-to-install").classList.add("hidden");
            this.shadowRoot.querySelector("#notifier-contents-update-check-in-progress").classList.add("hidden");

            // Auto-hide after 10 seconds
            setTimeout( () => { this._containerElement.classList.add("offscreen") }, 10000);
        }
    }
);
