import { AppPage, PageHistoryState } from "../app-page.js";
import * as Loadouts from "../../loadouts.js";
import PageManager from "../../page-manager.js";
import * as Templates from "../../templates.js";

class SoldierLoadoutFoundryPage extends AppPage {

    static pageId = "loadout-foundry-page";

    #loadout = null;
    #loadoutSummary = null;

    static async generatePreview(data) {
        // No need for previews for this page
        return null;
    }

    static ownsDataObject(dataObj) {
        return false;
    }

    async load(data) {
        this.#loadout = Loadouts.getActiveLoadout();

        if (!this.#loadout.foundryProjects) {
            this.#loadout.foundryProjects = [];
        }

        const loadoutIsInfantry = this.#loadout.classId.startsWith("infantry");
        const loadoutIsMec = this.#loadout.classId.startsWith("mec");

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-foundry-page.html", "template-loadout-foundry-page");

        this.#loadoutSummary = template.querySelector("loadout-summary");
        this.#loadoutSummary.render(this.#loadout);

        const projectRowHeaderCells = [... template.querySelectorAll("div[data-project-id]")];
        for (const cell of projectRowHeaderCells) {
            const includeMec = cell.dataset.includeMec === "true";
            const includeInfantry = cell.dataset.includeInfantry === "true";

            if ( (loadoutIsMec && !includeMec)
              || (loadoutIsInfantry && !includeInfantry) ) {
                // Hide this cell and the next two
                cell.classList.add("hidden-collapse");
                cell.nextElementSibling.classList.add("hidden-collapse");
                cell.nextElementSibling.nextElementSibling.classList.add("hidden-collapse");
            }
            else {
                const checkbox = cell.querySelector("input[type=checkbox]");

                if (this.#loadout.foundryProjects.includes(cell.dataset.projectId)) {
                    checkbox.checked = true;
                }

                checkbox.addEventListener("change", this._onCheckboxChanged.bind(this));
            }
        }

        template.querySelector("#select-all").addEventListener("click", () => this._setAll(true));
        template.querySelector("#select-none").addEventListener("click", () => this._setAll(false));
        template.querySelector("#return-to-loadout").addEventListener("click", this._returnToLoadoutHome.bind(this));

        return {
            body: template,
            title: {
                icon: null,
                text: "Loadout Foundry Projects"
            }
        };
    }

    makeHistoryState() {
        return new PageHistoryState(this, { });
    }

    _onCheckboxChanged(event) {
        const checkbox = event.target;
        const projectId = checkbox.parentElement.dataset.projectId;

        if (checkbox.checked) {
            if (!this.#loadout.foundryProjects.includes(projectId)) {
                this.#loadout.foundryProjects.push(projectId);
            }
        }
        else {
            this.#loadout.foundryProjects.remove(projectId);
        }

        this.#loadoutSummary.render(this.#loadout);
    }

    _returnToLoadoutHome() {
        const pageData = {
            loadout: this.#loadout
        };

        PageManager.instance.loadPage("loadout-home-page", pageData);
    }

    _setAll(checked) {
        const projectRowHeaderCells = [... document.body.querySelectorAll("#loadout-foundry-page div[data-project-id]")];

        for (const cell of projectRowHeaderCells) {
            if (cell.classList.contains("hidden-collapse")) {
                continue;
            }

            const projectId = cell.dataset.projectId;
            const checkbox = cell.querySelector("input[type=checkbox]");
            checkbox.checked = checked;

            if (checked) {
                if (!this.#loadout.foundryProjects.includes(projectId)) {
                    this.#loadout.foundryProjects.push(projectId);
                }
            }
            else {
                this.#loadout.foundryProjects.remove(projectId);
            }
        }

        this.#loadoutSummary.render(this.#loadout);
    }
}

export default SoldierLoadoutFoundryPage;