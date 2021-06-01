import { AppPage, PageHistoryState } from "./app-page.js";
import * as Templates from "../templates.js";

class HomePage extends AppPage {

    static pageId = "home-page";

    async load(_data) {
        return {
            body: Templates.instantiateTemplate("assets/html/templates/pages/home-page.html", "template-home-page"),
            title: {
                "icon": null,
                "text": "Home Page"
            }
        };
    }
}

export default HomePage;
