import { AppPage, PageHistoryState } from "./app-page.js";
import * as Templates from "../templates.js";

class CampaignPlannerPage extends AppPage {

    static pageId = "campaign-planner-page";

    async load(_data) {

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/campaign-planner-page.html", "template-campaign-planner-page");

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/strategy-layer-icon.png",
                text: "Campaign Planner"
            }
        };
    }
}

export default CampaignPlannerPage;