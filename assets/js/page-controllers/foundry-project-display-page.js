import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";

class FoundryProjectDisplayPage extends AppPage {
    constructor() {
        super("foundry-project-display-page");

        this.projectId = null;
    }

    async generatePreview(data) {
        if (!data.projectId) {
            return null;
        }

        const project = DataHelper.foundryProjects[data.projectId];

        if (!project) {
            return null;
        }

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/foundry-project-display-page.html", "template-foundry-preview");
        template.querySelector("#foundry-preview-icon img").src = project.icon;
        template.querySelector("#foundry-preview-name").textContent = project.name;
        template.querySelector("#foundry-preview-description").textContent = Utils.truncateText(project.description, 300);

        return template;
    }

    async load(hostingElement, event, data) {
        // TODO
    }

    onUnloadBeginning(_event) {
        const historyData = {
            projectId: this.projectId
        };

        return new PageHistoryState(this, historyData);
    }
}

export default FoundryProjectDisplayPage;