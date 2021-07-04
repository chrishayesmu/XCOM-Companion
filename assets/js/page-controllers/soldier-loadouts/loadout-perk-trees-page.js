import { AppPage, PageHistoryState } from "../app-page.js";
import * as DataHelper from "../../data-helper.js";
import * as Loadouts from "../../loadouts.js";
import PageManager from "../../page-manager.js";
import * as Templates from "../../templates.js";

const perkTreeTypes = {
    ClassPerks: "perks",
    GeneMods: "gene-mods",
    OfficerAbilities: "officer",
    PsiAbilities: "psi"
};

class SoldierLoadoutPerkTreesPage extends AppPage {

    #loadout = null;
    #loadoutSummary = null;
    #pageElement = null;
    #treeType = null;

    static pageId = "loadout-perk-trees-page";

    static async generatePreview(data) {
        return null;
    }

    static ownsDataObject(dataObj) {
        return false;
    }

    async load(data) {
        this.#loadout = Loadouts.getActiveLoadout();
        this.#treeType = data.treeType;

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-perk-trees-page.html", "template-loadout-perk-trees");
        this.#pageElement = template;
        this.#loadoutSummary = template.querySelector("loadout-summary");

        template.querySelector("#perk-tree-container").classList.add(this.#treeType + "-tree");
        template.querySelector("#return-to-loadout").addEventListener("click", this._returnToLoadoutHome.bind(this));

        let treeTemplate = null;
        let pageTitle = null;
        if (this.#treeType === perkTreeTypes.ClassPerks) {
            treeTemplate = await this._loadClassPerksTree();
            pageTitle = "Perks";
        }
        else if (this.#treeType === perkTreeTypes.GeneMods) {
            treeTemplate = await this._loadGeneModTree();
            pageTitle = "Gene Mods";
        }
        else if (this.#treeType === perkTreeTypes.OfficerAbilities) {
            treeTemplate = await this._loadOfficerAbilityTree();
            pageTitle = "Officer Training";
        }
        else if (this.#treeType === perkTreeTypes.PsiAbilities) {
            treeTemplate = await this._loadPsiTree();
            pageTitle = "Psi Training";
        }

        template.querySelector("#perk-tree-container").append(treeTemplate);

        // Add event handlers for perk icons being clicked
        const perkIcons = this._getAllPerkIcons();
        for (const icon of perkIcons) {
            icon.addEventListener("click", this._onPerkIconClicked.bind(this));
        }

        // Sync the UI state to the perks which are already chosen
        const currentPerks = this._getApplicablePerkArray();

        for (const icon of perkIcons) {
            const perkId = icon.perkId;

            if (currentPerks.includes(perkId)) {
                this._onPerkIconClicked( { target: icon } ); // pretend it was clicked to update the whole row
            }
        }

        this._configurePerkIcons();
        this._styleActiveRows();
        this.#loadoutSummary.render(this.#loadout);

        return {
            body: template,
            title: {
                icon: null,
                text: pageTitle
            }
        };
    }

    makeHistoryState() {
        return new PageHistoryState(this, { treeType: this.#treeType });
    }

    _configurePerkIcons() {
        const perkIcons = this._getAllPerkIcons();

        for (const icon of perkIcons) {
            icon.noTooltip = true;
            icon.selectable = true;
        }
    }

    _getAllPerkIcons(source) {
        source = source || this.#pageElement;

        return [... source.querySelectorAll(".perk-tree-row perk-icon")];
    }

    _getApplicablePerkArray() {
        switch (this.#treeType) {
            case perkTreeTypes.ClassPerks:
                return this.#loadout.perks;
            case perkTreeTypes.GeneMods:
                return this.#loadout.geneMods;
            case perkTreeTypes.OfficerAbilities:
                    return this.#loadout.officerAbilities;
            case perkTreeTypes.PsiAbilities:
                return this.#loadout.psiAbilities;
        }
    }

    async _loadClassPerksTree() {
        const classId = this.#loadout.classId;
        const soldierClass = DataHelper.soldierClasses[classId];

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-perk-trees-page.html", "template-class-perks-tree");

        const perkRows = [... template.querySelectorAll(".perk-tree-row")];

        let rowIndex = 0;
        for (const row of perkRows) {
            const perkIcons = this._getAllPerkIcons(row);
            const rowIndexStr = String(rowIndex);

            const perkChoices = soldierClass.perks[rowIndexStr];

            perkIcons[0].perkId = perkChoices[0].id;

            if (perkChoices.length > 1) {
                perkIcons[1].perkId = perkChoices[1].id;
                perkIcons[2].perkId = perkChoices[2].id;
            }

            // Populate stats on level-up
            const statProgression = soldierClass.statProgression[rowIndexStr];
            row.querySelector(".stat-aim").textContent = statProgression.aim;
            row.querySelector(".stat-hp").textContent = statProgression.hp;
            row.querySelector(".stat-will").textContent = statProgression.will;

            rowIndex++;
        }

        return template;
    }

    async _loadGeneModTree() {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-perk-trees-page.html", "template-gene-mods-tree");

        // Psionic soldiers can't take Neural Damping so disable the mod
        if (this.#loadout.psiAbilities.length > 0) {
            const neuralDampingIcon = template.querySelector("perk-icon[perkId='gene_mod_neural_damping']");
            neuralDampingIcon.setAttribute("data-tooltip-text", "Neural Damping is unavailable to psionic soldiers.");
            neuralDampingIcon.setAttribute("disabled", "");
        }

        return template;
    }

    async _loadOfficerAbilityTree() {
        return Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-perk-trees-page.html", "template-officer-perks-tree");
    }

    async _loadPsiTree() {
        return Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-perk-trees-page.html", "template-psi-tree");
    }

    _onPerkIconClicked(event) {
        const perkRow = event.target.closest(".perk-tree-row");
        const rowIndex = +perkRow.dataset.rowIndex;
        const iconsInRow = [... perkRow.querySelectorAll("perk-icon")];
        const loadoutPerkArray = this._getApplicablePerkArray();
        const isDeselecting = event.target.hasAttribute("selected");

        if (this.#treeType === perkTreeTypes.ClassPerks && rowIndex === 0) {
            // Can't deselect the starting perk for the class
            return;
        }

        if (this.#treeType !== perkTreeTypes.GeneMods) {
            if (rowIndex > loadoutPerkArray.length) {
                // Most perk trees have to be done top-to-bottom; don't allow skipping ahead
                return;
            }

            if (isDeselecting && rowIndex < loadoutPerkArray.length - 1) {
                // Perks before the last can be swapped, but not deselected
                return;
            }
        }

        // Psionic soldiers can't take Neural Damping
        if (event.target.perkId === "gene_mod_neural_damping" && this.#loadout.psiAbilities.length > 0) {
            return;
        }

        for (const icon of iconsInRow) {
            loadoutPerkArray.remove(icon.perkId);

            if (isDeselecting) {
                icon.removeAttribute("inactive");
                icon.removeAttribute("selected");
            }
            else {
                icon.setAttribute("inactive", "");
                icon.removeAttribute("selected");
            }
        }

        if (!isDeselecting) {
            // Perks should be in the array in the order that they're presented in the UI (top-to-bottom)
            loadoutPerkArray.splice(rowIndex, 0, event.target.perkId);
            event.target.removeAttribute("inactive");
            event.target.setAttribute("selected", "");
        }

        this._styleActiveRows();
        this.#loadoutSummary.render(this.#loadout);
    }

    _returnToLoadoutHome() {
        const pageData = {
            loadout: this.#loadout
        };

        PageManager.instance.loadPage("loadout-home-page", pageData);
    }

    _styleActiveRows() {
        if (this.#treeType === perkTreeTypes.GeneMods) {
            // Gene mods can be chosen in any order so this doesn't apply
            return;
        }

        const loadoutPerkArray = this._getApplicablePerkArray();
        const allRows = [... this.#pageElement.querySelectorAll(".perk-tree-row")];

        for (const row of allRows) {
            row.classList.remove("active-row");
        }

        if (loadoutPerkArray.length >= allRows.length) {
            return;
        }

        allRows[loadoutPerkArray.length].classList.add("active-row");
    }
}

export default SoldierLoadoutPerkTreesPage;