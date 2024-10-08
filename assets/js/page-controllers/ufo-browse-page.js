import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import * as Templates from "../templates.js";
import * as Utils from "../utils.js";

class UfoBrowsePage extends AppPage {

    static pageId = "ufo-browse-page";

    static sizeToInt = function(size) {
        switch (size) {
            case "small":
                return 0;
            case "medium":
                return 1;
            case "large":
                return 2;
            case "very_large":
                return 3;
        }

        return -1;
    }

    static sizeCompareFn = function(sizeA, sizeB) {
        return UfoBrowsePage.sizeToInt(sizeA) - UfoBrowsePage.sizeToInt(sizeB);
    }

    async load(data) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/ufo-browse-page.html", "template-ufo-browse-page");
        const container = template.querySelector("#ufo-browse-cats-container");

        const ufos = Object.values(DataHelper.ufos);

        const ufosBySize = {};

        for (let key in ufos) {
            if (!ufosBySize[ufos[key].size]) {
                ufosBySize[ufos[key].size] = [];
            }

            ufosBySize[ufos[key].size].push(ufos[key]);
        }

        const sizes = Object.keys(ufosBySize);
        sizes.sort(UfoBrowsePage.sizeCompareFn);

        for (let size in sizes) {
            // Default categories to open unless they've been manually collapsed
            const isCategoryOpen = !data.expandedCategories || data.expandedCategories.includes(sizes[size]);
            container.appendChild(await this._createUfoCat(sizes[size], ufosBySize[sizes[size]], isCategoryOpen));
        }

        return {
            body: template,
            title: {
                icon: "assets/img/misc-icons/ufo.png",
                text: "UFOs"
            }
        };
    }

    async _createUfoCat(size, ufos, shouldBeOpen) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/ufo-browse-page.html", "template-ufo-browse-category");

        template.setAttribute("data-size", size);
        template.querySelector("#ufo-size-name").textContent = Utils.capitalizeEachWord(size);

        if (shouldBeOpen) {
            template.setAttribute("open", "");
        }

        const container = template.querySelector("#ufo-browse-entries-container");

        ufos.sort((a,b) => a.base_hp - b.base_hp);

        for (let ufo in ufos) {
            container.appendChild(await this._createUfoEntry(ufos[ufo]));
        }

        return template;
    }

    async _createUfoEntry(ufo) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/ufo-browse-page.html", "template-ufo-browse-entry");

        template.querySelector(".ufo-browse-entry-name").textContent = ufo.name;
        template.querySelector(".ufo-browse-entry-img").src = ufo.image;

        template.setAttribute("data-page-on-click", "ufo-details-page");
        template.setAttribute("data-pagearg-no-preview", true);
        template.setAttribute("data-pagearg-ufo-id", ufo.id);

        return template;
    }

    makeHistoryState() {
        // Remember which sections are open
        const expandedDetails = document.querySelectorAll("#ufo-browse-cats-container details[open]");
        const ids = Array.prototype.map.call(expandedDetails, e => e.getAttribute("data-size"));

        return new PageHistoryState(this, { expandedCategories: ids });
    }
}

export default UfoBrowsePage;