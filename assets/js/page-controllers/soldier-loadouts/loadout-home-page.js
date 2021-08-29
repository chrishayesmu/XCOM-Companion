import { AppPage, PageHistoryState } from "../app-page.js";
import * as Loadouts from "../../loadouts.js";
import * as Modal from "../../modal.js";
import PageManager from "../../page-manager.js";
import * as Settings from "../../settings.js";
import * as Templates from "../../templates.js";

class SoldierLoadoutHomePage extends AppPage {
    static pageId = "loadout-home-page";

    #loadout = null;
    #loadoutSummary = null;
    #optionDescription = null;

    static async generatePreview(data) {
        return null;
    }

    static ownsDataObject(dataObj) {
        return false;
    }

    async load(_data) {
        this.#loadout = Loadouts.getActiveLoadout();

        const isMec = this.#loadout.classId.startsWith("mec");
        const isShiv = this.#loadout.classId.startsWith("shiv");

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-home-page.html", "template-loadout-home-page");
        const officerTrainingButton = template.querySelector("#loadout-edit-officer");
        const psiTrainingButton = template.querySelector("#loadout-edit-psi");
        this.#optionDescription = template.querySelector("#loadout-main-menu-selected-option-description");

        template.querySelector("#loadout-name").textContent = this.#loadout.name;

        this.#loadoutSummary = template.querySelector("loadout-summary");
        this.#loadoutSummary.render(this.#loadout);

        template.querySelector("#loadout-close-without-saving").addEventListener("click", this._onCloseWithoutSavingClicked.bind(this));
        template.querySelector("#loadout-edit-equipment").addEventListener("click", this._openEquipmentPage.bind(this));
        template.querySelector("#loadout-edit-foundry").addEventListener("click", this._openFoundryPage.bind(this));
        template.querySelector("#loadout-edit-name").addEventListener("click", this._onEditNameClicked.bind(this));
        template.querySelector("#loadout-edit-notes").addEventListener("click", this._onEditNotesClicked.bind(this));
        template.querySelector("#loadout-edit-perks").addEventListener("click", () => { this._openPerkTreesPage("perks"); } );
        template.querySelector("#loadout-edit-gene-mods").addEventListener("click", () => { this._openPerkTreesPage("gene-mods"); } );
        template.querySelector("#loadout-name-discard-button").addEventListener("click", this._hideEditNameControls.bind(this));
        template.querySelector("#loadout-name-save-button").addEventListener("click", this._onSaveNameClicked.bind(this));
        template.querySelector("#loadout-save-and-close").addEventListener("click", this._onSaveLoadoutClicked.bind(this));

        if (isMec || isShiv) {
            template.querySelector("#loadout-edit-gene-mods").classList.add("hidden-collapse");
            officerTrainingButton.classList.add("hidden-collapse");
            psiTrainingButton.classList.add("hidden-collapse");

            if (isShiv) {
                template.querySelector("#loadout-edit-perks").classList.add("hidden-collapse");
            }
        }

        // Officer training: only if not psi trained
        if (this.#loadout.psiAbilities.length > 0) {
            officerTrainingButton.classList.add("disabled");
            officerTrainingButton.setAttribute("data-tooltip-text", "Psionically gifted soldiers are not eligible to become officers.");
        }
        else {
            officerTrainingButton.addEventListener("click", () => { this._openPerkTreesPage("officer"); } );
        }

        // Psi training: can't be an officer, can't have Neural Damping
        if (this.#loadout.officerAbilities.length > 0) {
            psiTrainingButton.classList.add("disabled");
            psiTrainingButton.setAttribute("data-tooltip-text", "Officers cannot undergo psi training.");
        }
        else if (this.#loadout.geneMods.includes("gene_mod_neural_damping")) {
            psiTrainingButton.classList.add("disabled");
            psiTrainingButton.setAttribute("data-tooltip-text", "Soldiers with the Neural Damping gene mod cannot undergo psi training.");
        }
        else {
            psiTrainingButton.addEventListener("click", () => { this._openPerkTreesPage("psi"); } );
        }

        // Whenever a button is hovered, update the description at the bottom of the menu
        const allButtons = [... template.querySelectorAll("button")];
        allButtons.forEach( btn => btn.addEventListener("mouseenter", this._onButtonHover.bind(this)));

        return {
            body: template,
            title: {
                icon: null,
                text: "Build Details"
            }
        };
    }

    _hideEditNameControls() {
        document.getElementById("loadout-name-edit-container").classList.add("hidden-collapse");

        document.getElementById("loadout-name").classList.remove("hidden-collapse");
        document.getElementById("loadout-edit-name").classList.remove("hidden-collapse");
    }

    _onButtonHover(event) {
        if (event.target.dataset.description) {
            this.#optionDescription.textContent = event.target.dataset.description;
        }
        else {
            this.#optionDescription.textContent = "";
        }
    }

    async _onCloseWithoutSavingClicked() {
        const wasLoadoutEverSaved = !!Settings.getSoldierLoadoutById(this.#loadout.id);

        let prompt = "Are you sure you want to close without saving? ";
        prompt += wasLoadoutEverSaved ? "Any changes you've made to this loadout will be lost." : "This loadout is unsaved and will be lost permanently.";

        const confirm = await Modal.confirm(prompt, "Confirm Closing Loadout");

        if (confirm) {
            Loadouts.setActiveLoadout(null);
            PageManager.instance.loadPage("loadout-selection-page", {});
        }
    }

    _onEditNameClicked() {
        document.getElementById("loadout-name").classList.add("hidden-collapse");
        document.getElementById("loadout-edit-name").classList.add("hidden-collapse");

        const nameInput = document.getElementById("loadout-name-input");
        nameInput.value = this.#loadout.name;

        document.getElementById("loadout-name-edit-container").classList.remove("hidden-collapse");
    }

    async _onEditNotesClicked() {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-home-page.html", "template-loadout-edit-notes");

        const textarea = template.querySelector("#notes-input");
        textarea.value = this.#loadout.notes || "";

        template.querySelector("#edit-notes-discard").addEventListener("click", Modal.close);
        template.querySelector("#edit-notes-save").addEventListener("click", () => {
            this.#loadout.notes = textarea.value.trim();
            this.#loadoutSummary.render(this.#loadout);
            Modal.close();
        });

        Modal.open(template);
    }

    _openEquipmentPage() {
        const pageData = {
            loadout: this.#loadout
        };

        PageManager.instance.loadPage("loadout-equipment-page", pageData);
    }

    _openFoundryPage() {
        const pageData = {
            loadout: this.#loadout
        };

        PageManager.instance.loadPage("loadout-foundry-page", pageData);
    }

    _openPerkTreesPage(perkTreeType) {
        const pageData = {
            loadout: this.#loadout,
            treeType: perkTreeType
        };

        PageManager.instance.loadPage("loadout-perk-trees-page", pageData);
    }

    _onSaveNameClicked() {
        const nameInput = document.getElementById("loadout-name-input");
        this.#loadout.name = nameInput.value;

        document.getElementById("loadout-name").textContent = this.#loadout.name;

        this.#loadoutSummary.render(this.#loadout);
        this._hideEditNameControls();
    }

    async _onSaveLoadoutClicked() {
        await Settings.saveSoldierLoadout(this.#loadout);
        Loadouts.setActiveLoadout(null);

        PageManager.instance.loadPage("loadout-selection-page", {});
    }
}

export default SoldierLoadoutHomePage;