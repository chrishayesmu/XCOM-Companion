const appPageModule = require("./app-page");
const dataHelper = require("../data-helper");
const templates = require("../templates");
const widgets = require("../widgets");

AppPage = appPageModule.AppPage;
PageHistoryState = appPageModule.PageHistoryState;

class ClassSelectionPage extends AppPage {
    constructor() {
        super("class-selection-page");

        this.classPool = null;
    }

    load(_hostingElement, _event, _data) {
        this.classPool = _data.classPool;

        const template = templates.instantiateTemplate("template-class-selection-page");
        const contentSection = template.querySelector("#class-selection-content");

        let classes = null;
        if (this.classPool == "infantry") {
            classes = dataHelper.getInfantryClasses();
        }
        else if (this.classPool == "mec") {
            classes = dataHelper.getMecClasses();
        }
        else {
            throw new Error(`Unrecognized class pool "${this.classPool}"`);
        }

        for (let i  = 0; i < classes.length; i++) {
            const soldierClass = classes[i];
            const classId = soldierClass.id;

            const icon = widgets.createSelectableIcon(soldierClass.icon, soldierClass.name, "grow");
            icon.classList.add("soldier-grid-cell");
            icon.setAttribute("data-pagearg-class-id", classId);
            icon.setAttribute("data-pagearg-display-mode", "class-perks");
            icon.setAttribute("data-page-on-click", "perk-tree-display-page");

            contentSection.appendChild(icon);
        }

        return template;
    }

    onUnloadBeginning(_event) {
        const historyData = {
            classPool: this.classPool
        };

        this.classPool = null;

        return new PageHistoryState(this, historyData);
    }
}

module.exports.ClassSelectionPage = ClassSelectionPage;