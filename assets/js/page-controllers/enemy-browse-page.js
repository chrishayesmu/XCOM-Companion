import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";

class EnemyBrowsePage extends AppPage {

    static pageId = "enemy-browse-page";

    async load(_data) {

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/enemy-browse-page.html", "template-enemy-browse-page");
        const contentSection = template.querySelector("#class-selection-content");

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/alien.png",
                text: "Enemies"
            }
        };
    }
}

export default EnemyBrowsePage;