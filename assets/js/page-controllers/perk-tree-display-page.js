import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";

class PerkTreeDisplayPage extends AppPage {

    static pageId = "perk-tree-display-page";

    #displayMode = null;
    #highlightedItem = null;
    #soldierClass = null;

    static async generatePreview(data) {
        if (!data.itemId) {
            return null;
        }

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/perk-tree-display-page.html", "template-perk-preview");

        // Perk and icon class are handled universally, but each type has the opportunity to inject its own logic too
        let perk = null, iconClass = null;

        if (data.itemId.startsWith("gene_mod")) {
            const geneMod = DataHelper.geneMods[data.itemId];
            perk = geneMod.perk;
            iconClass = "preview-gene-mod-icon";

            template.querySelector("#perk-preview-cost").classList.remove("hidden-collapse");
            template.querySelector("#perk-preview-cost-meld").textContent = geneMod.cost_meld;
            template.querySelector("#perk-preview-cost-money").textContent = geneMod.cost_money;
            template.querySelector("#perk-preview-cost-time").textContent = geneMod.cost_time_days;
        }
        else if (data.itemId.startsWith("perk")) {
            perk = DataHelper.perks[data.itemId];
            iconClass = "preview-perk-icon";
        }
        else if (data.itemId.startsWith("psi")) {
            perk = DataHelper.psiAbilities[data.itemId];
            iconClass = "preview-psi-ability-icon";
        }

        const iconImg = template.querySelector("#perk-preview-icon img");
        iconImg.classList.add(iconClass);
        iconImg.src = perk.icon;

        template.querySelector(".preview-title").textContent = perk.name;
        template.querySelector(".preview-description").textContent = perk.description;

        return template;
    }

    async load(data) {
        this.#displayMode = data.displayMode;
        this.#highlightedItem = data.highlighted;

        if (data.displayMode == "class-perks") {
            return this._loadClassPerksTree(data);
        }
        else if (data.displayMode == "gene-mods") {
            return this._loadGeneModTree();
        }
        else if (data.displayMode == "psi-training") {
            return this._loadPsiTree();
        }
        else {
            throw new Error(`Unknown display mode ${data.displayMode}`);
        }
    }

    makeHistoryState() {
        // TODO: persist which perks have been selected
        const historyData = {
            displayMode: this.#displayMode,
            highlightedItem: this.#highlightedItem
        };

        if (this.#soldierClass) {
            historyData.classId = this.#soldierClass.id;
        }

        return new PageHistoryState(this, historyData);
    }

    async _loadClassPerksTree(data) {
        this.#soldierClass = DataHelper.soldierClasses[data.classId];

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/perk-tree-display-page.html", "template-perk-tree-display-page");

        const rows = template.querySelectorAll(".perk-tree-row"); // 7 rows, one per rank

        for (let rank = 0; rank < 7; rank++) {
            const perks = this.#soldierClass.perks[rank];

            // Fill in the stat progression
            const currentRow = rows[rank];
            const stats = this.#soldierClass.statProgression[String(rank)];
            currentRow.querySelector(".stat-aim").textContent = stats.aim;
            currentRow.querySelector(".stat-hp").textContent = stats.hp;
            currentRow.querySelector(".stat-will").textContent = stats.will;

            // Fill in the perks; don't use fixed indices because the first rank in every class only has one perk
            for (let perkIndex = 0; perkIndex < perks.length; perkIndex++) {
                const iconElement = template.querySelector(`#perk_icon_${rank}_${perkIndex}`);
                const iconImage = iconElement.querySelector("img");

                iconImage.setAttribute("data-perk-id", perks[perkIndex].id);
                iconImage.src = perks[perkIndex].icon;
                iconImage.addEventListener("mouseenter", this._onPerkMouseenter.bind(this));
                iconImage.addEventListener("click", this._onPerkClick.bind(this));
            }
        }

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/xcom_logo.png",
                text: "Perk Tree - " + this.#soldierClass.name
            }
        };
    }

    _loadGeneModDetails(geneModId, container) {
        const geneMod = DataHelper.geneMods[geneModId];
        const perk = geneMod.perk;

        container = container || document.body;

        container.querySelector("#perk-tree-details").classList.remove("hidden");
        container.querySelector("#perk-tree-details-name").textContent = perk.name;
        container.querySelector("#perk-tree-details-description").textContent = perk.description;
        container.querySelector("#gene-mod-added-fatigue").textContent = geneMod.added_fatigue_hours;
        container.querySelector("#gene-mod-costs-meld").textContent = geneMod.cost_meld;
        container.querySelector("#gene-mod-costs-money").textContent = geneMod.cost_money;
        container.querySelector("#gene-mod-costs-time-days").textContent = geneMod.cost_time_days;

        const researchElement = container.querySelector("#gene-mod-required-research");
        researchElement.textContent = "Required research: ";
        researchElement.appendChild(Widgets.createInAppLink(geneMod.research_prerequisite));
    }

    async _loadGeneModTree() {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/perk-tree-display-page.html", "template-gene-mods-display-page");

        for (let id in DataHelper.geneMods) {
            const mod = DataHelper.geneMods[id];
            const iconElement = template.querySelector(`#gene-mod-icon-${mod.body_part}-${mod.ui_side}`);
            const iconImage = iconElement.querySelector("img");

            iconImage.setAttribute("data-gene-mod-id", id);
            iconImage.setAttribute("data-perk-id", mod.perk.id);
            iconImage.src = mod.perk.icon;
            iconImage.addEventListener("click", this._onGeneModClick.bind(this));
            iconImage.addEventListener("mouseenter", this._onGeneModMouseenter.bind(this));
        }

        if (this.#highlightedItem) {
            this._loadGeneModDetails(this.#highlightedItem, template);

            // TODO it would be nice to make it selected as though it had been clicked, too
        }

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/gene_mods_2.png",
                text: "Gene Mods"
            }
        };
    }

    async _loadPsiTree() {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/perk-tree-display-page.html", "template-psi-training-display-page");

        template.querySelectorAll(".psi-ability-icon img").forEach(iconImage => {
            iconImage.addEventListener("click", this._onPsiAbilityClick.bind(this));
            iconImage.addEventListener("mouseenter", this._onPsiAbilityMouseenter.bind(this));
        });

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/psionic.png",
                text: "Psionic Training"
            }
        };
    }

    _onGeneModClick(event) {
        event.preventDefault();

        const idParts = event.target.parentElement.id.substring("gene-mod-icon-".length).split("-");
        const bodyPart = idParts[0];

        const geneModsForBodyPart = [
            document.getElementById(`gene-mod-icon-${bodyPart}-left`),
            document.getElementById(`gene-mod-icon-${bodyPart}-right`)
        ];

        if (event.target.parentElement.classList.contains("selected")) {
            // Return both gene mods for this body part to neutral
            for (let i = 0; i < geneModsForBodyPart.length; i++) {
                geneModsForBodyPart[i].classList.remove("selected");
                geneModsForBodyPart[i].classList.remove("unselected");
            }
        }
        else {
            // Select this mod and make sure other mods for this body part are unselected
            for (let i = 0; i < geneModsForBodyPart.length; i++) {
                if (geneModsForBodyPart[i] == event.target.parentElement) {
                    geneModsForBodyPart[i].classList.remove("unselected");
                    geneModsForBodyPart[i].classList.add("selected");
                }
                else {
                    geneModsForBodyPart[i].classList.add("unselected");
                    geneModsForBodyPart[i].classList.remove("selected");
                }
            }
        }
    }

    _onGeneModMouseenter(event) {
        event.preventDefault();

        const geneModId = event.target.dataset.geneModId;
        this._loadGeneModDetails(geneModId);
    }

    _onPerkClick(event) {
        event.preventDefault();

        const idParts = event.target.parentElement.id.substring("perk_icon_".length).split("_");
        const rank = idParts[0];

        // Don't allow selecting or unselecting the first perk in the tree
        if (rank == 0) {
            return;
        }

        const iconsInRank = [
            document.getElementById(`perk_icon_${rank}_0`),
            document.getElementById(`perk_icon_${rank}_1`),
            document.getElementById(`perk_icon_${rank}_2`)
        ];

        if (event.target.parentElement.classList.contains("selected")) {
            // Return all perks in this rank to neutral
            for (let i = 0; i < iconsInRank.length; i++) {
                iconsInRank[i].classList.remove("selected");
                iconsInRank[i].classList.remove("unselected");
            }
        }
        else {
            // Select this perk and make sure other perks in this rank are unselected
            for (let i = 0; i < iconsInRank.length; i++) {
                if (iconsInRank[i] == event.target.parentElement) {
                    iconsInRank[i].classList.remove("unselected");
                    iconsInRank[i].classList.add("selected");
                }
                else {
                    iconsInRank[i].classList.add("unselected");
                    iconsInRank[i].classList.remove("selected");
                }
            }
        }
    }

    _onPerkMouseenter(event) {
        event.preventDefault();

        const perkId = event.target.dataset.perkId;
        const perk = DataHelper.perks[perkId];
        document.getElementById("perk-tree-details").classList.remove("hidden");
        document.getElementById("perk-tree-details-name").textContent = perk.name;
        document.getElementById("perk-tree-details-description").textContent = perk.description;

        let perkAim = 0, perkMobility = 0, perkWill = 0;

        if (perkId in this.#soldierClass.perkStatBonuses) {
            perkAim = this.#soldierClass.perkStatBonuses[perkId].aim || 0;
            perkMobility = this.#soldierClass.perkStatBonuses[perkId].mobility || 0;
            perkWill = this.#soldierClass.perkStatBonuses[perkId].will || 0;
        }

        document.getElementById("perk-stat-aim").textContent = perkAim;
        document.getElementById("perk-stat-mobility").textContent = perkMobility;
        document.getElementById("perk-stat-will").textContent = perkWill;
    }

    _onPsiAbilityClick(event) {
        event.preventDefault();

        const allIconsInRow = event.target.parentElement.parentElement.querySelectorAll('.psi-ability-icon');
        const isSelecting = !event.target.parentElement.classList.contains("selected");

        allIconsInRow.forEach(iconContainer => {
            if (isSelecting) {
                if (iconContainer == event.target.parentElement) {
                    iconContainer.classList.add("selected");
                    iconContainer.classList.remove("unselected");
                }
                else {
                    iconContainer.classList.remove("selected");
                    iconContainer.classList.add("unselected");
                }
            }
            else {
                iconContainer.classList.remove("selected");
                iconContainer.classList.remove("unselected");
            }
        });
    }

    _onPsiAbilityMouseenter(event) {
        event.preventDefault();

        const abilityId = event.target.parentElement.dataset.psiAbility;
        const ability = DataHelper.psiAbilities[abilityId];

        document.getElementById("perk-tree-details").classList.remove("hidden");
        document.getElementById("perk-tree-details-name").textContent = ability.name;
        document.getElementById("perk-tree-details-description").textContent = ability.description;

        const prerequisiteElement = document.getElementById("perk-tree-details-prerequisite");
        if (ability.research_prerequisite) {
            prerequisiteElement.classList.remove("hidden-collapse");
            prerequisiteElement.textContent = "Requires ";
            prerequisiteElement.appendChild(Widgets.createInAppLink(ability.research_prerequisite));
        }
        else if (abilityId == "psi_rift") {
            prerequisiteElement.classList.remove("hidden-collapse");
            prerequisiteElement.innerHTML = "Requires soldier to have Mind Controlled an Ethereal";
        }
        else {
            prerequisiteElement.classList.add("hidden-collapse");
            prerequisiteElement.innerHTML = "";
        }
    }
}

export default PerkTreeDisplayPage;