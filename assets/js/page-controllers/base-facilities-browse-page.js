import { AppPage, PageHistoryState } from "./app-page.js";
import * as Templates from "../templates.js";

class BaseFacilitiesBrowsePage extends AppPage {
    constructor() {
        super("base-facilities-browse-page");
    }

    async load(_data) {
        const template = Templates.instantiateTemplate("assets/html/templates/pages/base-facilities-browse-page.html", "template-base-facilities-browse-page");

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/engineering.png",
                text: "Available Base Facilities"
            }
        };
    }

    onUnloadBeginning(_event) {
        const historyData = {
        };

        return new PageHistoryState(this, historyData);
    }
}

export default BaseFacilitiesBrowsePage;