import * as DataHelper from "./data-helper.js";
import * as Templates from "./templates.js";
import * as Utils from "./utils.js";

function createHelpIcon(helpText) {
    const img = document.createElement("img");

    img.classList.add("inline-help-icon");
    img.src = "assets/img/misc-icons/help.png";
    img.title = helpText;

    // TODO: use the same tooltip system as page previews

    return img;
}

function createInAppLink(data, options) {
    let dataId = null;

    if (typeof(data) == "string") {
        dataId = data;
    }
    else if (typeof(data) == "object") {
        if (!data.id) {
            console.error("Cannot create link for unknown object", data);
            throw new Error("Cannot create link for unknown object");
        }

        dataId = data.id;
    }

    options = options || {};
    let link = null, prefix = null;

    if (dataId.startsWith("council_request")) {
        link = _createCouncilRequestLink(dataId, options);
        prefix = "Request: ";
    }
    else if (dataId.startsWith("facility")) {
        link = _createBaseFacilityLink(dataId, options);
        prefix = "Facility: ";
    }
    else if (dataId.startsWith("foundry")) {
        link = _createFoundryProjectLink(dataId, options);
        prefix = "Foundry: ";
    }
    else if (dataId.startsWith("gene_mod")) {
        link = _createGeneModLink(dataId, options);
        prefix = "Gene Mod: ";
    }
    else if (dataId.startsWith("infantry_class") || dataId.startsWith("mec_class")) {
        link = _createClassLink(dataId, options);
        prefix = "Class: ";
    }
    else if (dataId.startsWith("item")) {
        link = _createItemLink(dataId, options);
        prefix = "Item: ";
    }
    else if (dataId.startsWith("perk")) {
        link = _createPerkLink(dataId, options);
        prefix = "Perk: ";
    }
    else if (dataId.startsWith("psi")) {
        link = _createPsiAbilityLink(dataId, options);
        prefix = "Psi Ability: ";
    }
    else if (dataId.startsWith("research")) {
        link = _createTechLink(dataId, options);
        prefix = "Research: ";
    }
    else {
        console.error("Don't know how to create in-app link for ID " + dataId);
        return null;
    }

    if (options.disablePreview) {
        link.setAttribute("data-pagearg-no-preview", true);
    }

    if (options.linkText) {
        link.textContent = options.linkText;
    }

    if (options.addPrefix) {
        const span = document.createElement("span");
        span.textContent = prefix;
        span.appendChild(link);

        return span;
    }

    return link;
}

async function createSelectableIcon(imgSrc, label, size) {
    imgSrc = imgSrc || "assets/img/xcom-logo.png";
    size = size || "medium";

    const icon = await Templates.instantiateTemplate("assets/html/templates/widgets/selectable-icon.html", "selectable-icon-template");

    icon.classList.add(`selectable-icon-${size}`);
    icon.querySelector(".selectable-icon-image").src = imgSrc;

    if (label) {
        icon.querySelector(".selectable-icon-text").innerHTML = label;
    }

    return icon;
}

function _createBaseFacilityLink(facilityId, options) {
    const facility = DataHelper.baseFacilities[facilityId];
    const link = document.createElement("a");

    link.textContent = facility.name;

    link.setAttribute("data-page-on-click", "facility-display-page");
    link.setAttribute("data-pagearg-facility-id", facilityId);

    return link;
}

function _createClassLink(classId, options) {
    const soldierClass = DataHelper.soldierClasses[classId];
    const link = document.createElement("a");

    link.textContent = soldierClass.name;

    link.setAttribute("data-page-on-click", "perk-tree-display-page");
    link.setAttribute("data-pagearg-display-mode", "class-perks");
    link.setAttribute("data-pagearg-class-id", classId);

    return link;
}

function _createCouncilRequestLink(requestId, options) {
    const request = DataHelper.councilRequests[requestId];
    const span = document.createElement("span");

    const link = createInAppLink(request.requested_item);
    span.appendChild(link);
    span.innerHTML += " for ";

    let rewardString = "";
    for (let i = 0; i < request.rewards.length; i++) {
        rewardString += Utils.capitalizeEachWord(request.rewards[i]) + " / "; // TODO capitalize
    }

    rewardString = rewardString.substring(0, rewardString.length - 3);
    span.innerHTML += (rewardString);

    return span;
}

function _createFoundryProjectLink(projectId, options) {
    const project = DataHelper.foundryProjects[projectId];
    const link = document.createElement("a");

    link.textContent = project.name;

    link.setAttribute("data-page-on-click", "foundry-project-display-page");
    link.setAttribute("data-pagearg-project-id", projectId);

    return link;
}

function _createGeneModLink(geneModId, options) {
    const geneMod = DataHelper.geneMods[geneModId];
    const link = document.createElement("a");

    link.textContent = geneMod.perk.name;

    link.setAttribute("data-page-on-click", "perk-tree-display-page");
    link.setAttribute("data-pagearg-display-mode", "gene-mods");
    link.setAttribute("data-pagearg-item-id", geneModId);

    return link;
}

function _createItemLink(itemId, options) {
    const item = DataHelper.items[itemId];
    const link = document.createElement("a");

    link.textContent = item.name;

    link.setAttribute("data-page-on-click", "item-display-page");
    link.setAttribute("data-pagearg-item-id", itemId);

    return link;
}

function _createPerkLink(perkId, options) {
    const perk = DataHelper.perks[perkId];
    const link = document.createElement("a");

    link.textContent = perk.name;

    link.setAttribute("data-page-on-click", "perk-tree-display-page");
    link.setAttribute("data-pagearg-display-mode", "single-perk");
    link.setAttribute("data-pagearg-item-id", perkId);

    return link;
}

function _createPsiAbilityLink(abilityId, options) {
    const ability = DataHelper.psiAbilities[abilityId];
    const link = document.createElement("a");

    link.textContent = ability.name;

    link.setAttribute("data-page-on-click", "perk-tree-display-page");
    link.setAttribute("data-pagearg-display-mode", "psi-training");
    link.setAttribute("data-pagearg-item-id", abilityId);

    return link;
}

function _createTechLink(techId) {
    const tech = DataHelper.technologies[techId];
    const link = document.createElement("a");

    link.textContent = tech.name;

    link.setAttribute("data-page-on-click", "tech-details-page");
    link.setAttribute("data-pagearg-tech-id", techId);

    return link;
}

export { createInAppLink, createHelpIcon, createSelectableIcon };