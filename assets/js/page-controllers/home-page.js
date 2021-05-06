import { AppPage, PageHistoryState } from "./app-page.js";
import * as Templates from "../templates.js";

class HomePage extends AppPage {
    constructor() {
        super("home-page");
    }

    async load(_data) {
        return {
            body: Templates.instantiateTemplate("assets/html/templates/pages/home-page.html", "template-home-page"),
            title: {
                "icon": null,
                "text": "Home Page"
            }
        };
    }

    onUnloadBeginning(_event) {
        const historyData = {
        };

        return new PageHistoryState(this, historyData);
    }
}

export default HomePage;