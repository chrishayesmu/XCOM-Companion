import { AppPage, PageHistoryState } from "./app-page.js";
import * as Templates from "../templates.js";

class BaseFacilitiesBrowsePage extends AppPage {

    static pageId = "base-facilities-browse-page";

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
}

export default BaseFacilitiesBrowsePage;
