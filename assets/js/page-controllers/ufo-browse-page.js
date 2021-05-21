import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";

class UfoBrowsePage extends AppPage {

    static pageId = "ufo-browse-page";

    async load(data) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/ufo-browse-page.html", "template-ufo-browse-page");
        const container = template.querySelector("#ufo-browse-entries-container");

        for (let key in DataHelper.ufos) {
            container.appendChild(await this._createUfoEntry(DataHelper.ufos[key]));
        }

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/ufo.png",
                text: "UFOs"
            }
        };
    }

    async _createUfoEntry(ufo) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/ufo-browse-page.html", "template-ufo-browse-entry");

        template.querySelector(".ufo-browse-entry-name").textContent = ufo.name;
        template.querySelector(".ufo-browse-entry-img").src = ufo.image;
        template.querySelector(".ufo-browse-entry-size").textContent = Utils.capitalizeEachWord(ufo.size);

        template.setAttribute("data-page-on-click", "ufo-details-page");
        template.setAttribute("data-pagearg-no-preview", true);
        template.setAttribute("data-pagearg-ufo-id", ufo.id);

        return template;
    }
}

export default UfoBrowsePage;