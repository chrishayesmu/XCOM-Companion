const { v4: uuidv4 } = require("uuid");

import * as DataHelper from "./data-helper.js";
import * as Modal from "./modal.js";
import PageManager from "./page-manager.js";
import * as Settings from "./settings.js";
import * as Templates from "./templates.js";
import * as Utils from "./utils.js";
import XComCampaign from "./xcom-campaign.js";

const startingFundsByDifficulty = {
    "normal": 600,
    "classic": 500,
    "brutal": 400,
    "impossible": 300
};

class CampaignCreationWizard {

    #options;

    // Page 1 data
    #difficulty = "normal";
    #exaltEnabled = true;
    #progenyEnabled = true;
    #slingshotEnabled = true;

    // Page 2 data
    #startingCountry = "argentina";
    #startingCountryBonusIndex = 0;

    // Page 3 data
    #campaignName = null;

    constructor(options) {
        this.#options = options || {};
    }

    async start() {
        this._loadPage1();
    }

    async _loadModalPage(pageNum) {
        return Templates.instantiateTemplate("assets/html/templates/campaign-creation-wizard/page" + pageNum + ".html", "template-campaign-creation-wizard-page-" + pageNum);
    }

    async _loadPage1() {
        const modalTemplate = await this._loadModalPage(1);

        modalTemplate.querySelector("#btn-next").addEventListener("click", () => { this._savePage1Data(); this._loadPage2(); });

        const backButton = modalTemplate.querySelector("#btn-previous");

        if (this.#options.firstBackButtonLabel) {
            backButton.textContent = this.#options.firstBackButtonLabel;
        }

        if (this.#options.firstBackButtonCallback) {
            backButton.addEventListener("click", this.#options.firstBackButtonCallback);
        }
        else {
            backButton.addEventListener("click", Modal.close);
        }

        modalTemplate.querySelector("input[type=radio][value=" + this.#difficulty + "]").checked = true;
        modalTemplate.querySelector("#are-exalt-enabled").checked = this.#exaltEnabled;
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

        const country = DataHelper.countries[this.#startingCountry];
        const startingBonus = country.startingBonuses[this.#startingCountryBonusIndex];

        modalTemplate.querySelector("#difficulty").textContent = Utils.capitalizeEachWord(this.#difficulty);
        modalTemplate.querySelector("#are-exalt-enabled").textContent = this.#exaltEnabled ? "Enabled" : "Disabled";
        modalTemplate.querySelector("#are-exalt-enabled").style.color = this.#exaltEnabled ? "var(--color-green)" : "var(--color-red)";
        modalTemplate.querySelector("#is-progeny-enabled").textContent = this.#progenyEnabled ? "Enabled" : "Disabled";
        modalTemplate.querySelector("#is-progeny-enabled").style.color = this.#progenyEnabled ? "var(--color-green)" : "var(--color-red)";
        modalTemplate.querySelector("#is-slingshot-enabled").textContent = this.#slingshotEnabled ? "Enabled" : "Disabled";
        modalTemplate.querySelector("#is-slingshot-enabled").style.color = this.#slingshotEnabled ? "var(--color-green)" : "var(--color-red)";
        modalTemplate.querySelector("#starting-country").textContent = country.name;
        modalTemplate.querySelector("#starting-country-bonus").textContent = startingBonus.name;
        modalTemplate.querySelector("#btn-previous").addEventListener("click", () => { this._loadPage2(); });
        modalTemplate.querySelector("#btn-next").addEventListener("click", () => { this._saveCampaign(); });

        const startBonusHelp = document.createElement("help-icon");
        startBonusHelp.textContent = startingBonus.description;
        modalTemplate.querySelector("#starting-country-bonus").appendChild(startBonusHelp);

        const campaignNameInput = modalTemplate.querySelector("#campaign-name");
        setTimeout(campaignNameInput.focus.bind(campaignNameInput), 100);

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

        document.getElementById("selected-country-name").textContent = countryData.name + " Starting Bonus";

        document.getElementById("country-bonus-name").textContent = bonusData.name + ":";
        document.getElementById("country-bonus-description").textContent = bonusData.description;

        document.getElementById("satellite-bonus-name").textContent = countryData.satelliteBonus.name + ":";
        document.getElementById("satellite-bonus-description").textContent = countryData.satelliteBonus.description;

        document.getElementById("continent-bonus-name").textContent = continentData.bonusName + ":";
        document.getElementById("continent-bonus-description").textContent = continentData.bonusDescription;
    }

    _savePage1Data() {
        this.#difficulty = document.querySelector("input[name=difficulty]:checked").value;
        this.#exaltEnabled = document.getElementById("are-exalt-enabled").checked;
        this.#progenyEnabled = document.getElementById("is-progeny-enabled").checked;
        this.#slingshotEnabled = document.getElementById("is-slingshot-enabled").checked;
    }

    _savePage2Data() {
        const selectList = document.getElementById("starting-country");
        const selectedItem = selectList.selectedItem;

        this.#startingCountry = selectedItem.dataset.country;
        this.#startingCountryBonusIndex = Number(selectedItem.dataset.startingBonusIndex);
    }

    async _saveCampaign() {
        const campaignNameInput = document.getElementById("campaign-name");
        this.#campaignName = campaignNameInput.value;

        if (!this.#campaignName) {
            campaignNameInput.classList.add("invalid");
            return;
        }

        // Set up and persist campaign data
        const campaign = new XComCampaign({
            name: this.#campaignName,
            difficulty: this.#difficulty,
            id: uuidv4(),
            exaltEnabled: this.#exaltEnabled,
            progenyEnabled: this.#progenyEnabled,
            slingshotEnabled: this.#slingshotEnabled,
            startingCountry: this.#startingCountry,
            startingCountryBonusIndex: this.#startingCountryBonusIndex
        });

        // Need to await these so they're in place before changing pages
        await Settings.saveCampaign(campaign);
        await Settings.setCurrentCampaign(campaign.id);

        // Navigate to the campaign planner
        Modal.close();
        PageManager.instance.loadPage("campaign-planner-page", {
            from: "creation-wizard",
            newCampaignId: campaign.id
        });
    }
}

export default CampaignCreationWizard;