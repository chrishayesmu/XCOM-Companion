import { AppPage, PageHistoryState } from "./app-page.js";
import * as Templates from "../templates.js";

class EnemyBrowsePage extends AppPage {

    static pageId = "enemy-browse-page";

    async load(_data) {

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/enemy-browse-page.html", "template-enemy-browse-page");

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/alien.png",
                text: "Enemies by Date"
            }
        };
    }
}

export default EnemyBrowsePage;