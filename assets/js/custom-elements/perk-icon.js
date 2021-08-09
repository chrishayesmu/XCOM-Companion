import * as DataHelper from "../data-helper.js";

const perkTypes = {
    GeneMod: "gene_mod",
    Perk: "perk",
    PsiAbility: "psi"
};

class PerkIcon extends HTMLElement {

    static get observedAttributes() {
        return [ "classid", "notooltip", "perkid", "selectable" ];
    }

    #image = null;
    #descriptionElement = null;
    #nameElement = null;
    #perkStatsElement = null;

    connectedCallback() {
        // Set up the DOM structure but don't populate anything yet
        this.#image = document.createElement("img");

        this.#nameElement = document.createElement("div");
        this.#nameElement.classList.add("perk-icon-name");

        this.#descriptionElement = document.createElement("div");
        this.#descriptionElement.classList.add("perk-icon-description");

        this.#perkStatsElement = document.createElement("div");
        this.#perkStatsElement.classList.add("perk-icon-stats");

        this.append(this.#image);
        this.append(this.#nameElement);
        this.append(this.#perkStatsElement);
        this.append(this.#descriptionElement);

        this._populate();
    }

    attributeChangedCallback() {
        if (this.#image && this.#nameElement && this.#descriptionElement && this.#perkStatsElement) {
            this._populate();
        }
    }

    _getDataObject() {
        if (this.perkType === perkTypes.GeneMod) {
            return DataHelper.geneMods[this.perkId];
        }

        if (this.perkType === perkTypes.Perk) {
            return DataHelper.perks[this.perkId];
        }

        if (this.perkType === perkTypes.PsiAbility) {
            return DataHelper.psiAbilities[this.perkId];
        }

        return null;
    }

    _isValidPerkType(perkType) {
        return perkType === perkTypes.GeneMod || perkType === perkTypes.Perk || perkType === perkTypes.PsiAbility;
    }

    _populate() {
        if (!this.perkId) {
            return;
        }

        const perk = this._getDataObject();

        this.#image.src = perk.icon;
        this.#nameElement.textContent = perk.name;

        this.#descriptionElement.textContent = perk.description;

        if (perk.added_fatigue_hours) {
            this.#descriptionElement.textContent += ` Adds +${perk.added_fatigue_hours} hours post-mission fatigue.`;
        }

        if (this.classId) {
            const classDef = DataHelper.soldierClasses[this.classId];
            const statBonuses = classDef.perkStatBonuses[this.perkId];

            const aim = (statBonuses && statBonuses.aim) || 0;
            const mobility = (statBonuses && statBonuses.mobility) || 0;
            const will = (statBonuses && statBonuses.will) || 0;

            this.#perkStatsElement.textContent = "Aim: " + aim + ", Will: " + will + ", Mobility: " + mobility;
        }

        if (this.noTooltip) {
            this.removeAttribute("data-page-on-click");
            this.removeAttribute("data-pagearg-item-id");
            this.removeAttribute("data-pagearg-display-mode");
        }
        else {
            this.setAttribute("data-page-on-click", "perk-tree-display-page");
            this.setAttribute("data-pagearg-item-id", perk.id);
            this.setAttribute("data-pagearg-display-mode", "single-perk");
        }
    }

    get classId() {
        return this.getAttribute("classId");
    }

    set classId(classId) {
        this.setAttribute("classId", classId);
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

    get perkId() {
        return this.getAttribute("perkId");
    }

    set perkId(perkId) {
        this.setAttribute("perkId", perkId);
    }

    get perkType() {
        if (this.perkId.startsWith("perk")) {
            return perkTypes.Perk;
        }

        if (this.perkId.startsWith("gene")) {
            return perkTypes.GeneMod;
        }

        if (this.perkId.startsWith("psi")) {
            return perkTypes.PsiAbility;
        }

        return null;
    }

    get selectable() {
        return this.hasAttribute("selectable");
    }

    set selectable(selectable) {
        if (selectable) {
            this.setAttribute("selectable", "");
        }
        else {
            this.removeAttribute("selectable");
        }
    }
}

customElements.define("perk-icon", PerkIcon);