import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";
import * as Widgets from "../widgets.js";

class FacilityPlanner extends HTMLElement {

    #campaign = null; // Will be set if this is being used in the context of a campaign plan
    #allowedFacilities = null; // If set, only these facilities (and the quantities specified) can be built.
                               // If not set and campaign != null, only facilities unlocked in the campaign can be built;
                               // otherwise, all facilities are available.


    #contextMenu = null;

    static get observedAttributes() {
        return [ ];
    }

    constructor() {
        super();

        document.body.addEventListener("click", this._onClick.bind(this));

        Templates.instantiateTemplate("assets/html/templates/custom-elements/facility-planner.html", "template-facility-planner").then(template => {
            this.appendChild(template);
        });
    }

    attributeChangedCallback() {
        //this._recreateContents();
    }

    getFacilityAtPosition(row, column) {
        return this.querySelector(`.facility-icon[data-row="${row}"][data-column="${column}"]`).dataset.facilityId;
    }

    numberOf(facilityType) {
        return this.querySelectorAll(`.facility-icon[data-facility-id=${facilityType}]`).length;
    }

    /**
     * Sets the facilities in the planner. Does not check that the configuration is valid.
     *
     * @param {*} facilities A 4x7 array of facilities.
     */
    setFacilities(facilities) {
        for (var i = 0; i < 4; i++) {
            for (var j = 0; j < 7; j++) {
                const facility = facilities[i][j] || "unexcavated";

                this.querySelector(`.facility-icon[data-row="${i}"][data-column="${j}"]`).setAttribute("data-facility-id", facility);
            }
        }
    }

    async _onClick(event) {
        if (this.#contextMenu) {
            this.#contextMenu.remove();
        }

        if (!event.target.parentElement === this || !event.target.classList.contains("facility-icon")) {
            return;
        }

        const clickedIcon = event.target;
        const iconRect = clickedIcon.getBoundingClientRect();
        const targetColumn = Number(clickedIcon.dataset.column);
        const targetRow = Number(clickedIcon.dataset.row);

        this.#contextMenu = document.createElement("div");
        this.#contextMenu.classList.add("facility-planner-menu");
        this.appendChild(this.#contextMenu);

        // #region Add context menu items
        const addMenuItem = (text, facilityId, isUnique) => {
            if (facilityId === clickedIcon.dataset.facilityId) {
                return false;
            }

            if (targetColumn === 3 && facilityId !== "facility_access_lift" && facilityId !== "excavated") {
                return false;
            }

            if (targetColumn !== 3 && facilityId === "facility_access_lift") {
                return false;
            }

            // TODO: add rules for excavating without an access lift, and for building access lifts in a row
            if (targetColumn !== 3 && this.getFacilityAtPosition(targetRow, 3) !== "facility_access_lift") {
                return false;
            }

            if (targetColumn < 3) {
                for (var i = 2; i > targetColumn; i--) {
                    if (this.getFacilityAtPosition(targetRow, i) === "unexcavated") {
                        return false;
                    }
                }
            }
            else if (targetColumn > 3) {
                for (var i = 4; i < targetColumn; i++) {
                    if (this.getFacilityAtPosition(targetRow, i) === "unexcavated") {
                        return false;
                    }
                }
            }

            if (isUnique && this.numberOf(facilityId) !== 0) {
                return false;
            }

            if (this.#allowedFacilities != null) {
                if (!(facilityId in this.#allowedFacilities)) {
                    return false;
                }

                if (this.numberOf(facilityId) >= this.#allowedFacilities[facilityId]) {
                    return false;
                }
            }

            const div = document.createElement("div");

            if (facilityId.startsWith("facility")) {
                const facility = DataHelper.baseFacilities[facilityId];

                const cost = this.#campaign != null ? this.#campaign.getCosts(facilityId) : facility.normal_build.cost.money;
                text = facility.name;
            }

            div.classList.add("menu-item");
            div.textContent = text;
            div.setAttribute("data-facility-id", facilityId);
            div.addEventListener("click", () => this._onContextMenuItemClicked(div, targetRow, targetColumn));

            this.#contextMenu.appendChild(div);
            return true;
        };

        const addDivider = () => {
            const div = document.createElement("div");
            div.classList.add("menu-divider");

            this.#contextMenu.appendChild(div);
        };

        const excavationCost = 10 * Math.pow(2, targetRow);
        var addedAny = false, addedItem = false;

        addedItem = addMenuItem("Mark Unexcavated", "unexcavated") || addedItem;
        addedItem = addMenuItem(`Excavate (§${excavationCost})`, "excavated") || addedItem;
        addedItem = addMenuItem(null, "facility_access_lift") || addedItem;
        addedAny = addedAny || addedItem;

        if (addedItem && targetColumn !== 3) {
            addDivider();
        }

        addedItem = false;
        addedItem = addMenuItem(null, "facility_satellite_uplink") || addedItem;
        addedItem = addMenuItem(null, "facility_satellite_nexus") || addedItem;
        addedAny = addedAny || addedItem;

        if (addedItem) {
            addDivider();
        }

        addedItem = false;
        addedItem = addMenuItem(null, "facility_fission_generator") || addedItem;
        addedItem = addMenuItem(null, "facility_thermo_generator") || addedItem;
        addedItem = addMenuItem(null, "facility_elerium_generator") || addedItem;
        addedAny = addedAny || addedItem;

        if (addedItem) {
            addDivider();
        }

        addedItem = false;
        addedItem = addMenuItem(null, "facility_laboratory") || addedItem;
        addedItem = addMenuItem(null, "facility_genetics_lab", true) || addedItem;
        addedItem = addMenuItem(null, "facility_psionic_labs", true) || addedItem;
        addedAny = addedAny || addedItem;

        if (addedItem) {
            addDivider();
        }

        addedItem = false;
        addedItem = addMenuItem(null, "facility_workshop") || addedItem;
        addedItem = addMenuItem(null, "facility_foundry", true) || addedItem;
        addedItem = addMenuItem(null, "facility_repair_bay", true) || addedItem;
        addedAny = addedAny || addedItem;

        if (addedItem) {
            addDivider();
        }

        addedAny = addMenuItem(null, "facility_alien_containment", true) || addedAny;
        addedAny = addMenuItem(null, "facility_gollop_chamber", true) || addedAny;
        addedAny = addMenuItem(null, "facility_hyperwave_relay", true) || addedAny;
        addedAny = addMenuItem(null, "facility_officer_training_school", true) || addedAny;

        // #endregion

        if (!addedAny) {
            this.#contextMenu.remove();
            return;
        }

        const menuRect = this.#contextMenu.getBoundingClientRect();
        var menuX = clickedIcon.offsetLeft;
        var menuY = clickedIcon.offsetTop + (iconRect.height / 2) - (menuRect.height / 2);

        if (targetColumn > 3) {
            menuX -= menuRect.width + 20;
        }
        else {
            menuX += iconRect.width + 20;
        }

        this.#contextMenu.style.left = menuX + "px";
        this.#contextMenu.style.top = menuY + "px";
    }

    _onContextMenuItemClicked(item, row, column) {
        this.querySelector(`.facility-icon[data-row="${row}"][data-column="${column}"]`).dataset.facilityId = item.dataset.facilityId;
    }
}

customElements.define("facility-planner", FacilityPlanner);