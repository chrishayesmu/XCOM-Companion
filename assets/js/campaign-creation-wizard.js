import * as DataHelper from "./data-helper.js";
import * as Modal from "./modal.js";
import * as Settings from "./settings.js";
import * as Templates from "./templates.js";
import * as Utils from "./utils.js";

const startingFundsByDifficulty = {
    "normal": 600,
    "classic": 500,
    "brutal": 400,
    "impossible": 300
};

class CampaignCreationWizard {

    // Page 1 data
    #difficulty = "normal";
    #progenyEnabled = true;
    #slingshotEnabled = true;

    // Page 2 data
    #startingCountry = "argentina";
    #startingCountryBonusIndex = 0;

    async start() {
        this._loadPage1();
    }

    async _loadModalPage(pageNum) {
        return Templates.instantiateTemplate("assets/html/templates/campaign-creation-wizard/page" + pageNum + ".html", "template-campaign-creation-wizard-page-" + pageNum);
    }

    async _loadPage1() {
        const modalTemplate = await this._loadModalPage(1);

        modalTemplate.querySelector("#btn-next").addEventListener("click", () => { this._savePage1Data(); this._loadPage2(); });

        modalTemplate.querySelector("input[type=radio][value=" + this.#difficulty + "]").checked = true;
        modalTemplate.querySelector("#is-progeny-enabled").checked = this.#progenyEnabled;
        modalTemplate.querySelector("#is-slingshot-enabled").checked = this.#slingshotEnabled;

        Modal.close();
        Modal.open(modalTemplate, null, false);
    }

    async _loadPage2() {
        const modalTemplate = await this._loadModalPage(2);

        // Set up transitions to other wizard pages
        modalTemplate.querySelector("#btn-previous").addEventListener("click", () => { this._savePage2Data(); this._loadPage1(); });
        modalTemplate.querySelector("#btn-next").addEventListener("click", () => { this._savePage2Data(); this._loadPage3(); });

        // Add country data to select list
        const countryList = modalTemplate.querySelector("#starting-country");
        countryList.addEventListener("selectionChanged", this._onSelectedStartingCountryChanged.bind(this));

        var itemToSelect = null;

        for (const countryId in DataHelper.countries) {
            const country = DataHelper.countries[countryId];

            for (const startingBonusIndex in country.startingBonuses) {
                const startingBonus = country.startingBonuses[startingBonusIndex];
                const li = document.createElement("li");

                li.setAttribute("data-country", countryId);
                li.setAttribute("data-starting-bonus-index", startingBonusIndex);

                if (countryId === this.#startingCountry && Number(startingBonusIndex) === this.#startingCountryBonusIndex) {
                    itemToSelect = li;
                }

                Utils.appendElement(li, "div", country.name, { classes: [ "country-name" ] } );
                Utils.appendElement(li, "div", startingBonus.name, { classes: [ "country-starting-bonus" ] } );

                countryList.appendChild(li);
            }
        }

        // We want to wait to select the country until everything's in the DOM
        setTimeout(() => countryList.select(itemToSelect), 20);

        Modal.close();
        Modal.open(modalTemplate, null, false);
    }

    async _loadPage3() {
        const modalTemplate = await this._loadModalPage(3);

        // TODO: should probably configure base layout here; extra sat uplink from Roscosmos, starting facilities from other bonuses, Cheyenne Mountain, etc
        //       also need to place steam vents
        modalTemplate.querySelector("#btn-previous").addEventListener("click", () => { this._loadPage2(); });

        Modal.close();
        Modal.open(modalTemplate, null, false);
    }

    _onSelectedStartingCountryChanged(event) {
        const selectedElem = event.detail.selectedItem;

        const selectedCountry = selectedElem.dataset.country;
        const selectedStartingBonusIndex = Number(selectedElem.dataset.startingBonusIndex);

        const countryData = DataHelper.countries[selectedCountry];
        const bonusData = countryData.startingBonuses[selectedStartingBonusIndex];

        const continentData = DataHelper.continents[countryData.continent];

        document.getElementById("selected-country-name").textContent = countryData.name;

        document.getElementById("country-bonus-name").textContent = bonusData.name + ":";
        document.getElementById("country-bonus-description").textContent = bonusData.description;

        document.getElementById("satellite-bonus-name").textContent = countryData.satelliteBonus.name + ":";
        document.getElementById("satellite-bonus-description").textContent = countryData.satelliteBonus.description;

        document.getElementById("continent-bonus-name").textContent = continentData.bonusName + ":";
        document.getElementById("continent-bonus-description").textContent = continentData.bonusDescription;
    }

    _savePage1Data() {
        this.#difficulty = document.querySelector("input[name=difficulty]:checked").value;
        this.#progenyEnabled = document.getElementById("is-progeny-enabled").checked;
        this.#slingshotEnabled = document.getElementById("is-slingshot-enabled").checked;
    }

    _savePage2Data() {
        const selectList = document.getElementById("starting-country");
        const selectedItem = selectList.selectedItem;

        this.#startingCountry = selectedItem.dataset.country;
        this.#startingCountryBonusIndex = Number(selectedItem.dataset.startingBonusIndex);
    }
}

export default CampaignCreationWizard;