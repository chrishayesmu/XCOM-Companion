const appPageModule = require("./app-page");
const dataHelper = require("../data-helper");
const templates = require("../templates");
const utils = require("../utils");

const AppPage = appPageModule.AppPage;
const PageHistoryState = appPageModule.PageHistoryState;

class FoundryProjectDisplayPage extends AppPage {
    constructor() {
        super("foundry-project-display-page");

        this.projectId = null;
    }

    generatePreview(data) {
        if (!data.projectId) {
            return null;
        }

        const project = dataHelper.foundryProjects[data.projectId];

        if (!project) {
            return null;
        }

        const template = templates.instantiateTemplate("template-foundry-preview");
        template.querySelector("#foundry-preview-icon img").src = project.icon;
        template.querySelector("#foundry-preview-name").textContent = project.name;
        template.querySelector("#foundry-preview-description").textContent = utils.truncateText(project.description, 300);

        return template;
    }

    load(hostingElement, event, data) {
        // TODO
    }

    onUnloadBeginning(_event) {
        const historyData = {
            projectId: this.projectId
        };

        return new PageHistoryState(this, historyData);
    }
}

module.exports.FoundryProjectDisplayPage = FoundryProjectDisplayPage;