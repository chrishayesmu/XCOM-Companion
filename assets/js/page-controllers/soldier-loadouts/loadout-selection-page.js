const { clipboard } = require("electron");
const { v4: uuidv4 } = require("uuid");

import { AppPage, PageHistoryState } from "../app-page.js";
import * as DataHelper from "../../data-helper.js";
import * as Loadouts from "../../loadouts.js";
import * as Modal from "../../modal.js";
import PageManager from "../../page-manager.js";
import * as Settings from "../../settings.js";
import * as Templates from "../../templates.js";
import * as Utils from "../../utils.js";

class SoldierLoadoutSelectionPage extends AppPage {

    static pageId = "loadout-selection-page";

    #loadoutSelect = null;
    #loadoutSummary = null;

    #deleteSelectedLoadoutButton = null;
    #exportSelectedLoadoutButton = null;
    #importLoadoutButton = null;
    #openSelectedLoadoutButton = null;

    static async generatePreview(data) {
        // No need for previews for this page
        return null;
    }

    static ownsDataObject(dataObj) {
        return false;
    }

    async load(data) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-selection-page.html", "template-loadout-selection-page");

        this.#loadoutSummary = template.querySelector("loadout-summary");

        this.#loadoutSelect = template.querySelector("#saved-loadouts");
        this.#loadoutSelect.addEventListener("selectionChanged", this._onSelectedLoadoutChanged.bind(this));

        template.querySelector("#new-loadout").addEventListener("click", this._openNewLoadoutModal.bind(this));

        this.#deleteSelectedLoadoutButton = template.querySelector("#delete-loadout");
        this.#deleteSelectedLoadoutButton.addEventListener("click", this._onDeleteLoadoutClicked.bind(this));

        this.#exportSelectedLoadoutButton = template.querySelector("#export-loadout");
        this.#exportSelectedLoadoutButton.addEventListener("click", this._onExportLoadoutClicked.bind(this));

        this.#importLoadoutButton = template.querySelector("#import-loadout");
        this.#importLoadoutButton.addEventListener("click", this._onImportLoadoutClicked.bind(this));

        this.#openSelectedLoadoutButton = template.querySelector("#open-loadout");
        this.#openSelectedLoadoutButton.addEventListener("click", this._openSelectedLoadout.bind(this));

        this._populateLoadouts();

        return {
            body: template,
            title: {
                icon: null,
                text: "Soldier Builds"
            }
        };
    }

    makeHistoryState() {
        return new PageHistoryState(this, { } );
    }

    _getStartingPerkForClass(classId) {
        const clazz = DataHelper.soldierClasses[classId];

        return clazz.perks["0"][0];
    }

    _onClassSelectedForNewLoadout(event) {
        const classId = event.target.dataset.classId;

        Modal.close();

        const soldierClass = DataHelper.soldierClasses[classId];

        const loadout = {
            classId: classId,
            equipment: soldierClass.defaultLoadout,
            id: uuidv4(),
            name: "New Loadout",
            notes: "",
            perks: [ this._getStartingPerkForClass(classId).id ],
            foundryProjects: [],
            geneMods: [],
            officerAbilities: [],
            psiAbilities: []
        };

        Loadouts.setActiveLoadout(loadout);
        PageManager.instance.loadPage("loadout-home-page", { } );
    }

    async _onDeleteLoadoutClicked() {
        const selectedLoadout = await this.selectedLoadout;

        if (!selectedLoadout) {
            return;
        }

        const confirm = await Modal.confirm(`Are you sure you want to delete this build (${selectedLoadout.name})? This action cannot be undone.`, "Confirm Deletion");

        if (confirm) {
            await Settings.deleteSoldierLoadout(selectedLoadout.id);
            this._populateLoadouts();
            this.#loadoutSummary.render(null);
            this._onSelectedLoadoutChanged({ detail: { selectedItem: null } });
        }
    }

    async _onExportLoadoutClicked() {
        const selectedLoadout = await this.selectedLoadout;

        if (!selectedLoadout) {
            return;
        }

        const exportString = Loadouts.toExportString(selectedLoadout);

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-selection-page.html", "template-export-modal");
        template.querySelector("#export-string-display").textContent = exportString;
        template.querySelector("#modal-close").addEventListener("click", Modal.close);

        template.querySelector("#copy-export-string").addEventListener("click", () => {
            clipboard.writeText(exportString);
            template.querySelector("#string-copied-message").classList.remove("hidden-collapse");
        });

        Modal.open(template, null, true);
    }

    async _onImportLoadoutClicked() {
        // If there's a build on the clipboard, offer to import it directly
        const clipboardContents = clipboard.readText();

        if (clipboardContents) {
            const clipboardLoadout = Loadouts.fromExportString(clipboardContents);

            if (clipboardLoadout) {
                const importClipboard = await Modal.confirm(`Found a build on your clipboard named "${clipboardLoadout.name}". Is this the build you want to import?`, "Build Found", "Yes", "No");

                if (importClipboard) {
                    this._tryImportLoadout(clipboardLoadout);
                    return;
                }
            }
        }

        // Otherwise, present a modal to paste the build into
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-selection-page.html", "template-import-modal");
        const inputTextarea = template.querySelector("#import-string-input");
        template.querySelector("#modal-close").addEventListener("click", Modal.close);
        template.querySelector("#modal-import-action").addEventListener("click", () => {
            if (!inputTextarea.value.trim()) {
                return;
            }

            const loadout = Loadouts.fromExportString(inputTextarea.value.trim());

            if (!loadout) {
                template.querySelector("#string-invalid-message").classList.remove("hidden-collapse");
                return;
            }

            Modal.close();
            this._tryImportLoadout(loadout);
        });

        Modal.open(template, null, true);
    }

    async _openSelectedLoadout() {
        const selectedLoadout = await this.selectedLoadout;

        if (!selectedLoadout) {
            return;
        }

        Loadouts.setActiveLoadout(selectedLoadout);

        PageManager.instance.loadPage("loadout-home-page", { } );
    }

    async _onSelectedLoadoutChanged(event) {
        const selectedLoadoutElem = event.detail.selectedItem;

        if (!selectedLoadoutElem) {
            this.#loadoutSummary.render(null);
            this.#deleteSelectedLoadoutButton.classList.add("disabled");
            this.#exportSelectedLoadoutButton.classList.add("disabled");
            this.#openSelectedLoadoutButton.classList.add("disabled");
            return;
        }

        this.#deleteSelectedLoadoutButton.classList.remove("disabled");
        this.#exportSelectedLoadoutButton.classList.remove("disabled");
        this.#openSelectedLoadoutButton.classList.remove("disabled");

        const loadoutId = selectedLoadoutElem.dataset.loadoutId;
        const loadout = await Settings.getSoldierLoadoutById(loadoutId);
        this.#loadoutSummary.render(loadout);
    }

    async _openNewLoadoutModal() {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-selection-page.html", "template-new-loadout-class-selection");

        const classOptions = [ ...template.querySelectorAll("[data-class-id]") ];

        for (const option of classOptions) {
            option.addEventListener("click", this._onClassSelectedForNewLoadout.bind(this));
        }

        Modal.open(template, null, true);
    }

    async _populateLoadouts() {
        var loadouts = await Settings.getSoldierLoadouts();
        loadouts = Object.values(loadouts);

        loadouts.sort( (a, b) => {
            const strCompare = a.classId.localeCompare(b.classId);

            if (strCompare === 0) {
                return a.name.localeCompare(b.name);
            }

            return strCompare;
        });

        this.#loadoutSelect.innerHTML = "";

        for (const loadout of Object.values(loadouts)) {
            const soldierClass = DataHelper.soldierClasses[loadout.classId];

            const listItem = document.createElement("li");
            listItem.setAttribute("data-loadout-id", loadout.id);

            // Class label and icon
            const classLabel = Utils.appendElement(listItem, "div", "", { classes: [ "saved-loadout-class-label" ] } );

            Utils.appendElement(classLabel, "img", "", { attributes: { src: soldierClass.icon } } );
            classLabel.append(soldierClass.name);

            // Loadout name
            Utils.appendElement(listItem, "div", loadout.name, { classes: [ "saved-loadout-name" ] })

            this.#loadoutSelect.append(listItem);
        }
    }

    async _tryImportLoadout(loadout) {
        // Check if a loadout already exists with this ID
        const existingLoadout = await Settings.getSoldierLoadoutById(loadout.id);

        if (existingLoadout) {
            const overwrite = await Modal.confirm(`This appears to be an update to an existing build called "${existingLoadout.name}". Do you want to overwrite that build?`, "Existing Build Found", "Overwrite", "Import as New");

            if (!overwrite) {
                // Give this loadout a new ID so it won't overwrite
                loadout.id = uuidv4();
            }
        }

        await Settings.saveSoldierLoadout(loadout);
        await this._populateLoadouts();

        // Select the newly imported loadout
        const loadoutElem = document.querySelector(`li[data-loadout-id="${loadout.id}"]`);
        this.#loadoutSelect.select(loadoutElem);
    }

    get selectedLoadout() {
        const selectedLoadout = this.#loadoutSelect.selectedItem;

        if (!selectedLoadout) {
            return null;
        }

        const loadoutId = selectedLoadout.dataset.loadoutId;
        return Settings.getSoldierLoadoutById(loadoutId);
    }
}

export default SoldierLoadoutSelectionPage;