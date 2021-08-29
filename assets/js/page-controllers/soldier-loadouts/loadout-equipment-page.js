import { AppPage, PageHistoryState } from "../app-page.js";
import * as DataHelper from "../../data-helper.js";
import * as Loadouts from "../../loadouts.js";
import * as Modal from "../../modal.js";
import ItemDisplayPage from "../item-display-page.js";
import PageManager from "../../page-manager.js";
import * as Templates from "../../templates.js";
import * as Utils from "../../utils.js";

class SoldierLoadoutEquipmentPage extends AppPage {
    static pageId = "loadout-equipment-page";

    #equipmentCategoriesContainer = null;
    #equipmentChoicesContainer = null;
    #loadout = null;
    #loadoutSummary = null;
    #selectedEquipmentCategory = null;
    #selectedEquipmentChoice = null;

    static async generatePreview(data) {
        return null;
    }

    static ownsDataObject(dataObj) {
        return false;
    }

    async load(_data) {
        this.#loadout = Loadouts.getActiveLoadout();

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/soldier-loadouts/loadout-equipment-page.html", "template-loadout-equipment-page");

        this.#equipmentCategoriesContainer = template.querySelector("#loadout-equipment-slots");
        this.#equipmentChoicesContainer = template.querySelector("#loadout-equipment-choices");
        this.#loadoutSummary = template.querySelector("loadout-summary");
        this.#loadoutSummary.render(this.#loadout);

        this._configureLoadoutSlots();

        const itemContainers = [... template.querySelectorAll("#loadout-equipment-slots .item-container")];
        itemContainers[0].click();

        template.querySelector("#return-to-loadout").addEventListener("click", this._returnToLoadoutHome.bind(this));

        return {
            body: template,
            title: {
                icon: null,
                text: "Loadout Equipment"
            }
        };
    }

    _appendItemElements(container, item, includeRemoveButton) {
        if (!item) {
            return;
        }

        const helpButton = container.querySelector("button.item-help-button");
        const img = container.querySelector("img");
        const span = container.querySelector("span.item-container-name");

        if (!helpButton) {
            const button = Utils.appendElement(container, "button", "", { classes: [ "item-help-button" ] });
            button.addEventListener("click", this._onHelpButtonClicked.bind(this));
        }

        if (img) {
            img.src = item.icon;
        }
        else {
            Utils.appendElement(container, "img", "", { attributes: { src: item.icon } });
        }

        if (span) {
            span.textContent = item.name;
        }
        else {
            Utils.appendElement(container, "span", item.name, { classes: [ "item-container-name" ] });
        }

        if (includeRemoveButton) {
            const removeButton = container.querySelector("button.remove-item-button");

            if (!removeButton) {
                const button = Utils.appendElement(container, "button", "", { classes: [ "remove-item-button" ] });
                button.addEventListener("click", this._onRemoveItemButtonClicked.bind(this));
            }
        }
    }

    _configureLoadoutSlots() {
        const soldierClass = DataHelper.soldierClasses[this.#loadout.classId];
        const soldierIsMec = this.#loadout.classId.startsWith("mec");

        this.#equipmentCategoriesContainer.innerHTML = "";

        const slots = soldierIsMec ? this._getMecLoadoutSlots() : soldierClass.loadoutSlots;

        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            const currentItemId = this.#loadout.equipment[i];
            const currentItem = DataHelper.items[currentItemId];

            const div = document.createElement("div");
            div.classList.add("item-container");
            div.setAttribute("data-item-id", currentItemId);
            div.setAttribute("data-role", slot.role);
            div.setAttribute("data-row-index", i);
            div.addEventListener("click", this._onEquipmentCategoryClicked.bind(this));

            const includeRemoveButton = slot.role === "loadout_equipment" || (soldierIsMec && slot.role === "loadout_secondary");
            this._appendItemElements(div, currentItem, includeRemoveButton);
            this.#equipmentCategoriesContainer.append(div);
        }
    }

    _getMecLoadoutSlots() {
        const loadoutSlots = [
            {
                "role": "loadout_mec_exoskeleton"
            },
            {
                "role": "loadout_primary"
            }
        ];

        const mecSuit = DataHelper.items[this.#loadout.equipment[0]];

        for (var i = 0; i < mecSuit.type_specific_data.num_secondary_weapons; i++) {
            loadoutSlots.push({ "role": "loadout_secondary" });
        }

        for (var i = 0; i < mecSuit.type_specific_data.num_equipment_slots; i++) {
            loadoutSlots.push({ "role": "loadout_equipment" });
        }

        return loadoutSlots;
    }

    _onEquipmentCategoryClicked(event) {
        const role = event.target.dataset.role;
        const rowIndex = event.target.dataset.rowIndex;
        const currentItemInSlot = this.#loadout.equipment[rowIndex];

        // If the clicked item is already selected then don't do anything
        if (this.#selectedEquipmentCategory === event.target) {
            return;
        }

        this.#selectedEquipmentChoice = null;

        if (this.#selectedEquipmentCategory) {
            this.#selectedEquipmentCategory.classList.remove("selected");
        }

        this.#selectedEquipmentCategory = event.target;
        this.#selectedEquipmentCategory.classList.add("selected");

        const primaryWeapon = DataHelper.items[this.#loadout.equipment[1]];

        // Find equipment usable by this soldier for the given role
        const soldierClass = this.#loadout.classId;
        const soldierIsInfantry = this.#loadout.classId.startsWith("infantry");
        const soldierIsMec = this.#loadout.classId.startsWith("mec");
        const soldierIsShiv = this.#loadout.classId.startsWith("shiv");
        const soldierIsPsionic = this.#loadout.psiAbilities.length > 0;

        const filterFunction = (item) => {
            const typeData = item.type_specific_data;
            const isEquippedElsewhere = this.#loadout.equipment.some(equipped => equipped === item.id);
            const mutuallyExclusiveItemEquipped = typeData && typeData.exclusive_with && typeData.exclusive_with.some(eq => eq != currentItemInSlot && this.#loadout.equipment.includes(eq));

            return item.type === role
                && (!typeData.class_restriction || typeData.class_restriction.includes(soldierClass))
                && (!isEquippedElsewhere || typeData.can_equip_multiple || item.id === currentItemInSlot)
                && !mutuallyExclusiveItemEquipped
                && (!typeData.compatible_weapon_categories || typeData.compatible_weapon_categories.includes(primaryWeapon.type_specific_data.category))
                && (typeData.usable_by_infantry || !soldierIsInfantry)
                && (typeData.usable_by_mec || !soldierIsMec)
                && (typeData.usable_by_shiv || !soldierIsShiv)
                && (!typeData.requires_psionic || soldierIsPsionic);
        };

        const matchingItems = Object.values(DataHelper.items).filter(filterFunction);

        this.#equipmentChoicesContainer.innerHTML = "";

        for (const item of matchingItems) {
            const div = document.createElement("div");
            div.classList.add("item-container");
            div.setAttribute("data-item-id", item.id);
            div.addEventListener("click", this._onEquipmentChoiceClicked.bind(this));

            if (item.id === currentItemInSlot) {
                div.classList.add("selected");
                this.#selectedEquipmentChoice = div;
            }

            this._appendItemElements(div, item);

            this.#equipmentChoicesContainer.append(div);
        }
    }

    _onEquipmentChoiceClicked(event) {
        const itemId = event.target.dataset.itemId;
        const item = DataHelper.items[itemId];
        const invSlot = +this.#selectedEquipmentCategory.dataset.rowIndex;
        const previousItem = DataHelper.items[this.#loadout.equipment[invSlot]];

        const soldierIsMec = this.#loadout.classId.startsWith("mec");
        const includeRemoveButton = this.#selectedEquipmentCategory.dataset.role === "loadout_equipment" || (soldierIsMec && this.#selectedEquipmentCategory.dataset.role === "loadout_secondary");
        this._appendItemElements(this.#selectedEquipmentCategory, item, includeRemoveButton);

        this.#selectedEquipmentCategory.setAttribute("data-item-id", itemId);

        // TODO: changing equipment can invalidate other equipment, e.g. changing away from a Strike Rifle means you can't use a Marksman's Scope anymore
        this.#loadout.equipment[invSlot] = itemId;

        if (this.#selectedEquipmentChoice) {
            this.#selectedEquipmentChoice.classList.remove("selected");
        }

        event.target.classList.add("selected");
        this.#selectedEquipmentChoice = event.target;

        // When changing exoskeletons, the number of loadout slots can change
        if (item.type === "loadout_mec_exoskeleton") {
            const changeInSecondaries = item.type_specific_data.num_secondary_weapons - previousItem.type_specific_data.num_secondary_weapons;
            const changeInEquipment = item.type_specific_data.num_equipment_slots - previousItem.type_specific_data.num_equipment_slots;

            if (changeInSecondaries > 0) {
                // Adding secondary weapon slots; insert at the end of previous secondary slots
                const startingIndex = 2 + previousItem.type_specific_data.num_secondary_weapons;
                for (var i = 0; i < changeInSecondaries; i++) {
                    this.#loadout.equipment.splice(startingIndex, 0, "");
                }
            }
            else if (changeInSecondaries < 0) {
                // Removing secondary weapon slots; remove from the end
                const startingIndex = 2 + previousItem.type_specific_data.num_secondary_weapons - 1;
                for (var i = 0; i < Math.abs(changeInSecondaries); i++) {
                    this.#loadout.equipment.splice(startingIndex - i, 1);
                }
            }

            if (changeInEquipment > 0) {
                // Adding equipment slots; insert at the end of inventory
                const startingIndex = this.#loadout.equipment.length;
                for (var i = 0; i < changeInEquipment; i++) {
                    this.#loadout.equipment.splice(startingIndex, 0, "");
                }
            }
            else if (changeInEquipment < 0) {
                // Removing equipment slots; remove from the end
                const startingIndex = this.#loadout.equipment.length - 1;
                for (var i = 0; i < Math.abs(changeInEquipment); i++) {
                    this.#loadout.equipment.splice(startingIndex - i, 1);
                }
            }

            this._configureLoadoutSlots();
        }

        // Re-render summary whenever equipment changes
        this.#loadoutSummary.render(this.#loadout);
    }

    async _onHelpButtonClicked(event) {
        event.stopPropagation();

        const itemId = event.target.parentElement.dataset.itemId;
        const item = DataHelper.items[itemId];

        const miniPage = await ItemDisplayPage.generateMiniPage(item);

        Modal.open(miniPage, null, true);
    }

    _onRemoveItemButtonClicked(event) {
        event.stopPropagation();

        const equipmentCategory = event.target.parentElement;
        const rowIndex = equipmentCategory.dataset.rowIndex;

        this.#loadout.equipment[rowIndex] = "";
        this.#loadoutSummary.render(this.#loadout);

        // Need to null out this field or else the click might be a no-op
        if (this.#selectedEquipmentCategory) {
            this.#selectedEquipmentCategory.classList.remove("selected");
            this.#selectedEquipmentCategory = null;
        }
        equipmentCategory.innerHTML = "";
        equipmentCategory.click();
    }

    _returnToLoadoutHome() {
        const pageData = {
            loadout: this.#loadout
        };

        PageManager.instance.loadPage("loadout-home-page", pageData);
    }
}

export default SoldierLoadoutEquipmentPage;