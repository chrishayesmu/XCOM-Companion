import * as DataHelper from "../data-helper.js";
import PageManager from "../page-manager.js";

import BaseFacilityPage from "../page-controllers/base-facility-page.js";
import EnemyDisplayPage from "../page-controllers/enemy-display-page.js";
import FoundryProjectDisplayPage from "../page-controllers/foundry-project-display-page.js";
import ItemDisplayPage from "../page-controllers/item-display-page.js";
import MapDetailsPage from "../page-controllers/map-details-page.js";
import PerkTreeDisplayPage from "../page-controllers/perk-tree-display-page.js";
import TechDetailsPage from "../page-controllers/tech-details-page.js";
import UfoDetailsPage from "../page-controllers/ufo-details-page.js";

const linkTargets = [
    {
        prefix: "enemy_",
        prefixText: "Enemy",
        targetPage: EnemyDisplayPage,
        dataSource: DataHelper.enemies,
        pageArg: "enemyId"
    },
    {
        prefix: "facility_",
        prefixText: "Facility",
        targetPage: BaseFacilityPage,
        dataSource: DataHelper.baseFacilities,
        pageArg: "facilityId"
    },
    {
        prefix: "foundry_",
        prefixText: "Foundry",
        targetPage: FoundryProjectDisplayPage,
        dataSource: DataHelper.foundryProjects,
        pageArg: "projectId"
    },
    {
        prefix: "gene_mod",
        prefixText: "Gene Mod",
        targetPage: PerkTreeDisplayPage,
        dataSource: DataHelper.geneMods,
        pageArg: "itemId",
        additionalPageArgs: {
            displayMode: "gene-mods"
        }
    },
    {
        prefix: "infantry_class_",
        prefixText: "Class",
        targetPage: PerkTreeDisplayPage,
        dataSource: DataHelper.soldierClasses,
        pageArg: "classId",
        additionalPageArgs: {
            displayMode: "class-perks"
        }
    },
    {
        prefix: "item_",
        prefixText: "Item",
        targetPage: ItemDisplayPage,
        dataSource: DataHelper.items,
        pageArg: "itemId"
    },
    {
        prefix: "map_",
        prefixText: "Map",
        targetPage: MapDetailsPage,
        dataSource: DataHelper.maps,
        pageArg: "mapId"
    },
    {
        prefix: "mec_class_",
        prefixText: "Class",
        targetPage: PerkTreeDisplayPage,
        dataSource: DataHelper.soldierClasses,
        pageArg: "classId",
        additionalPageArgs: {
            displayMode: "class-perks"
        }
    },
    {
        prefix: "perk_",
        prefixText: "Perk",
        targetPage: PerkTreeDisplayPage,
        dataSource: DataHelper.perks,
        pageArg: "itemId",
        additionalPageArgs: {
            displayMode: "single-perk"
        }
    },
    {
        prefix: "psi_",
        prefixText: "Psi Ability",
        targetPage: PerkTreeDisplayPage,
        dataSource: DataHelper.psiAbilities,
        pageArg: "itemId",
        additionalPageArgs: {
            displayMode: "psi-training"
        }
    },
    {
        prefix: "research_",
        prefixText: "Research",
        targetPage: TechDetailsPage,
        dataSource: DataHelper.technologies,
        pageArg: "techId"
    },
    {
        prefix: "ufo_",
        prefixText: "UFO",
        targetPage: UfoDetailsPage,
        dataSource: DataHelper.ufos,
        pageArg: "ufoId"
    }
];

class InAppLink extends HTMLElement {

    #linkTarget = null;

    static get observedAttributes() {
        return [ "addprefix", "linktext", "prefixtext", "to" ];
    }

    attributeChangedCallback() {
        this._recreateContents();
    }

    _getPageArgs() {
        const pageArgs = {};
        pageArgs[this.#linkTarget.pageArg] = this.to;

        if (this.#linkTarget.additionalPageArgs) {
            for (const [key, value] of Object.entries(this.#linkTarget.additionalPageArgs)) {
                pageArgs[key] = value;
            }
        }

        return pageArgs;
    }

    _loadTargetPage() {
        PageManager.instance.loadPage(this.#linkTarget.targetPage.pageId, this._getPageArgs());
    }

    _recreateContents() {
        this.innerHTML = "";

        if (!this.to) {
            return;
        }

        for (const target of linkTargets) {
            if (this.to.startsWith(target.prefix)) {
                this.#linkTarget = target;
                break;
            }
        }

        if (!this.#linkTarget) {
            throw new Error("in-app-link element requires a valid 'to' attribute referencing a data ID");
        }

        const dataObject = this.#linkTarget.dataSource[this.to];
        const link = document.createElement("a");
        link.textContent = this.linkText || dataObject.name;
        link.addEventListener("click", this._loadTargetPage.bind(this));
        link.addEventListener("mouseover", this._showTooltip.bind(this));
        link.addEventListener("mouseout", () => PageManager.instance.hideTooltip());

        this.appendChild(link);

        if (this.addPrefix) {
            const span = document.createElement("span");
            span.textContent = this.prefixText || (this.#linkTarget.prefixText + ": ");
            this.prepend(span);
        }
    }

    _showTooltip() {
        if (this.noTooltip) {
            return;
        }

        const pageArgs = this._getPageArgs();
        PageManager.instance.showPagePreviewTooltip(this.#linkTarget.targetPage.pageId, pageArgs, this.getBoundingClientRect());
    }

    get addPrefix() {
        return this.hasAttribute("addPrefix") || this.prefixText;
    }

    set addPrefix(addPrefix) {
        if (addPrefix) {
            this.setAttribute("addPrefix", "");
        }
        else {
            this.removeAttribute("addPrefix");
        }
    }

    get linkText() {
        return this.getAttribute("linkText");
    }

    set linkText(text) {
        this.setAttribute("linkText", text);
    }

    get noTooltip() {
        return this.hasAttribute("noTooltip");
    }

    set noTooltip(noTooltip) {
        if (noTooltip) {
            this.setAttribute("noTooltip", "");
        }
        else {
            this.removeAttribute("noTooltip");
        }
    }

    get prefixText() {
        return this.getAttribute("prefixText");
    }

    set prefixText(prefixText) {
        this.setAttribute("prefixText", prefixText);
    }

    get to() {
        return this.getAttribute("to");
    }

    set to(to) {
        this.setAttribute("to", to);
    }
}

customElements.define('in-app-link', InAppLink);