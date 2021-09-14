import { AppPage, PageHistoryState } from "./app-page.js";
import CampaignCreationWizard from "../campaign-creation-wizard.js";
import * as Modal from "../modal.js";
import * as Settings from "../settings.js";
import * as Templates from "../templates.js";

class HomePage extends AppPage {

    static pageId = "home-page";

    async load(_data) {
        setTimeout(this._checkIfCampaignIdSet.bind(this), 100);

        return {
            body: Templates.instantiateTemplate("assets/html/templates/pages/home-page.html", "template-home-page"),
            title: {
                "icon": null,
                "text": "Home Page"
            }
        };
    }

    async _checkIfCampaignIdSet() {
        const currentCampaignId = await Settings.getCurrentCampaignId();

        if (currentCampaignId) {
            return;
        }

        const modalTemplate = await Templates.instantiateTemplate("assets/html/templates/pages/home-page.html", "template-create-campaign-prompt-modal");

        modalTemplate.querySelector("#create-campaign").addEventListener("click", this._onCreateCampaignClicked.bind(this));
        modalTemplate.querySelector("#skip-creation").addEventListener("click", this._onSkipCreationClicked.bind(this));

        Modal.open(modalTemplate, null, false);
    }

    _onCreateCampaignClicked() {
        const wizard = new CampaignCreationWizard();
        wizard.start();
    }

    _onSkipCreationClicked() {
        Settings.setCurrentCampaign(Settings.DELIBERATELY_NONE_CAMPAIGN_ID);
        Modal.close();
    }
}

export default HomePage;