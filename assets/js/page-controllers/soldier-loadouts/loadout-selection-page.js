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

        if (classId.startsWith("mec")) {
            return;
        }

        Modal.close();

        const soldierClass = DataHelper.soldierClasses[classId];

        const loadout = {
            classId: classId,
            equipment: soldierClass.defaultLoadout,
            id: uuidv4(),
            name: "New Loadout",
            notes: "",
            perks: [ this._getStartingPerkForClass(classId).id ],
            geneMods: [],
            officerAbilities: [],
            psiAbilities: []
        };

        Loadouts.setActiveLoadout(loadout);
        PageManager.instance.loadPage("loadout-home-page", { } );
    }

    async _onDeleteLoadoutClicked() {
        const selectedLoadout = this.#loadoutSelect.selectedItem;

        if (!selectedLoadout) {
            return;
        }

        const loadoutId = selectedLoadout.dataset.loadoutId;
        const loadout = await Settings.getSoldierLoadoutById(loadoutId);

        const confirm = await Modal.confirm(`Are you sure you want to delete this build (${loadout.name})? This action cannot be undone.`, "Confirm Deletion");

        if (confirm) {
            await Settings.deleteSoldierLoadout(loadoutId);
            this._populateLoadouts();
            this.#loadoutSummary.render(null);
            this._onSelectedLoadoutChanged({ detail: { selectedItem: null } });
        }
    }

    async _openSelectedLoadout() {
        const selectedLoadout = this.#loadoutSelect.selectedItem;

        if (!selectedLoadout) {
            return;
        }

        const loadoutId = selectedLoadout.dataset.loadoutId;
        const loadout = await Settings.getSoldierLoadoutById(loadoutId);
        Loadouts.setActiveLoadout(loadout);

        PageManager.instance.loadPage("loadout-home-page", { } );
    }

    async _onSelectedLoadoutChanged(event) {
        const selectedLoadoutElem = event.detail.selectedItem;

        if (!selectedLoadoutElem) {
            this.#loadoutSummary.render(null);
            this.#deleteSelectedLoadoutButton.classList.add("disabled");
            this.#openSelectedLoadoutButton.classList.add("disabled");
            return;
        }

        this.#deleteSelectedLoadoutButton.classList.remove("disabled");
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
        const loadouts = await Settings.getSoldierLoadouts();

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
}

export default SoldierLoadoutSelectionPage;