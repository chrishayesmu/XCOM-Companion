import * as DataHelper from "./data-helper.js";
import * as Templates from "./templates.js";
import * as Utils from "./utils.js";

function createHelpIcon(helpText) {
    const icon = document.createElement("help-icon");
    icon.innerHTML = helpText;

    return icon;
}

function createInAppLink(data, options) {
    let dataId = null;

    if (typeof(data) === "string") {
        dataId = data;
    }
    else if (typeof(data) === "object") {
        if (!data.id) {
            console.error("Cannot create link for unknown object", data);
            throw new Error("Cannot create link for unknown object");
        }

        dataId = data.id;
    }

    options = options || {};

    if (dataId.startsWith("council_request")) {
        const link = _createCouncilRequestLink(dataId, options);

        if (options.disablePreview) {
            link.setAttribute("data-pagearg-no-preview", true);
        }

        if (options.linkText) {
            link.textContent = options.linkText;
        }

        if (options.addPrefix) {
            const prefix = options.prefixText || "Request: ";

            const span = document.createElement("span");
            span.textContent = prefix;
            span.appendChild(link);

            return span;
        }
    }
    else {
        const link = document.createElement("in-app-link");
        link.to = dataId;
        link.addPrefix = options.addPrefix;

        if (options.disablePreview) {
            link.noPreview = true;
        }

        if (options.linkText) {
            link.linkText = options.linkText;
        }

        if (options.prefixText) {
            link.prefixText = options.prefixText;
        }

        return link;
    }
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

function _createCouncilRequestLink(requestId, options) {
    const request = DataHelper.councilRequests[requestId];
    const span = document.createElement("span");

    let quantityString = null;

    if (request.requested_amount) {
        quantityString = Utils.xToY(request.requested_amount.min, request.requested_amount.max).replace(" ", "x ")  + "x";
    }
    else if (request.prerequisite.id.contains("autopsy")) {
        // All corpses without hardcoded quantities follow the same logic
        // TODO include help icon explaining how this scales
        quantityString = "6x to 20x";
    }
    else {
        // The only other item category is materials (alloys, elerium, fragments, and meld) which also have their own rules
        // TODO include help icon
        quantityString = "12x to 50x";
    }

    span.innerHTML = quantityString + " ";

    const link = createInAppLink(request.requested_item);
    span.appendChild(link);
    span.innerHTML += " for ";

    let rewardString = "";
    for (let i = 0; i < request.rewards.length; i++) {
        let reward = request.rewards[i];
        if (reward === "panic_reduction") {
            reward += " (-20)";
        }

        rewardString += Utils.capitalizeEachWord(reward) + " / ";
    }

    rewardString = rewardString.substring(0, rewardString.length - 3);
    span.innerHTML += (rewardString);

    return span;
}

export { createInAppLink, createHelpIcon, createSelectableIcon };