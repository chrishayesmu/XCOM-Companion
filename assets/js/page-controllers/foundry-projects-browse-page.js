import { AppPage, PageHistoryState } from "./app-page.js";
import * as Templates from "../templates.js";

class FoundryProjectsBrowsePage extends AppPage {
    constructor() {
        super("foundry-projects-browse-page");
    }

    async load(_data) {
        const template = Templates.instantiateTemplate("assets/html/templates/pages/foundry-projects-browse-page.html", "template-foundry-projects-browse-page");

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/foundry.png",
                text: "Available Foundry Projects"
            }
        };
    }

    onUnloadBeginning(_event) {
        const historyData = {
        };

        return new PageHistoryState(this, historyData);
    }
}

export default FoundryProjectsBrowsePage;