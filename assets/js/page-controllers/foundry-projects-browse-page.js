import { AppPage, PageHistoryState } from "./app-page.js";
import * as Templates from "../templates.js";

class FoundryProjectsBrowsePage extends AppPage {

    static pageId = "foundry-projects-browse-page";

    async load(_data) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/foundry-projects-browse-page.html", "template-foundry-projects-browse-page");

        if (_data.expandedIds) {
            for (let i = 0; i < _data.expandedIds.length; i++) {
                template.querySelector("#" + _data.expandedIds[i]).setAttribute("open", "");
            }
        }

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/foundry.png",
                text: "Available Foundry Projects"
            }
        };
    }

    makeHistoryState() {
        // Remember which sections are open
        const expandedDetails = document.querySelectorAll("#foundry-project-browse-content-section details[open]");
        const ids = Array.prototype.map.call(expandedDetails, e => e.id);

        return new PageHistoryState(this, { expandedIds: ids });
    }
}

export default FoundryProjectsBrowsePage;