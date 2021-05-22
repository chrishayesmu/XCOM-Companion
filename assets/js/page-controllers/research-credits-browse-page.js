import { AppPage } from "./app-page.js";
import * as Templates from "../templates.js";

class ResearchCreditsBrowsePage extends AppPage {

    static pageId = "research-credits-browse-page";

    async load(_data) {
        const template = Templates.instantiateTemplate("assets/html/templates/pages/research-credits-browse-page.html", "template-research-credits-browse-page");

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/research.png",
                text: "Research Credits"
            }
        };
    }
}

export default ResearchCreditsBrowsePage;