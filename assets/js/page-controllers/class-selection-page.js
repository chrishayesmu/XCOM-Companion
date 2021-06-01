import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Widgets from "../widgets.js";

class ClassSelectionPage extends AppPage {

    static pageId = "class-selection-page";

    #classPool = null;

    async load(_data) {
        this.#classPool = _data.classPool;

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/class-selection-page.html", "template-class-selection-page");
        const contentSection = template.querySelector("#class-selection-content");

        let classes = null;
        let titlePrefix = null;
        if (this.#classPool == "infantry") {
            classes = DataHelper.getInfantryClasses();
            titlePrefix = "Infantry";
        }
        else if (this.#classPool == "mec") {
            classes = DataHelper.getMecClasses();
            titlePrefix = "MEC";
        }
        else {
            throw new Error(`Unrecognized class pool "${this.#classPool}"`);
        }

        for (let i = 0; i < classes.length; i++) {
            const soldierClass = classes[i];
            const classId = soldierClass.id;

            const icon = await Widgets.createSelectableIcon(soldierClass.icon, soldierClass.name, "grow");
            icon.classList.add("soldier-grid-cell");
            icon.setAttribute("data-pagearg-class-id", classId);
            icon.setAttribute("data-pagearg-display-mode", "class-perks");
            icon.setAttribute("data-page-on-click", "perk-tree-display-page");

            contentSection.appendChild(icon);
        }

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/xcom_logo.png",
                text: titlePrefix + " Perk Trees"
            }
        };
    }

    makeHistoryState() {
        return new PageHistoryState(this, { classPool: this.#classPool });
    }
}

export default ClassSelectionPage;
