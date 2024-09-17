const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

function appendElement(container, elementType, content, options) {
    options = options || {};

    const element = document.createElement(elementType);

    if (content instanceof Element) {
        element.appendChild(content);
    }
    else {
        element.innerHTML = content;
    }

    if (options.classes && options.classes.length) {
        for (let i = 0; i < options.classes.length; i++) {
            element.classList.add(options.classes[i]);
        }
    }

    if (options.attributes) {
        for (const [key, value] of Object.entries(options.attributes)) {
            element.setAttribute(key, value);
        }
    }

    container.appendChild(element);

    return element;
}

function calculateRebate(numWorkshops, numAdjacencies, moneyCost, numAlloysCost, numEleriumCost) {
    // Note, rush builds do not change the rebate amount
    numWorkshops = Number(numWorkshops);
    numAdjacencies = Number(numAdjacencies);
    numAlloysCost = Number(numAlloysCost);
    numEleriumCost = Number(numEleriumCost);

    // Based off rebates in LW code: XGFacility_Engineering#3000
    const rebate = {
        alloys: 0,
        elerium: 0,
        money: 0
    };

    rebate.alloys = numAlloysCost;
    rebate.elerium = numEleriumCost;
    rebate.money = moneyCost;

    const rebateCoefficient = calculateRebatePercentage(numWorkshops, numAdjacencies);
    rebate.alloys -= Math.floor(numAlloysCost * rebateCoefficient);
    rebate.elerium -= Math.floor(numEleriumCost * rebateCoefficient);
    rebate.money -= Math.floor(moneyCost * rebateCoefficient);

    return rebate;
}

function calculateRebatePercentage(numWorkshops, numAdjacencies) {
    const rebatePerWorkshop = 0.1; // 10% per workshop, 5% per adjacency
    const adjScore = 2 * numWorkshops + numAdjacencies;

    return 0.5 + 0.5 * Math.pow((1.0 - rebatePerWorkshop * 2), adjScore / 2);
}

function calculateResearchTime(baseTimeInDays, numScientists, numLabs, numAdjacencies, hasCredit) {
    // Each lab increases research speed by 20% (additive); each adjacency by 10%
    const labBonus = 1 + numLabs * 0.2 + numAdjacencies * 0.1;

    // Credits from interrogations are a 25% reduction im research time (unclear if multiple credits stack, TBD)
    const creditBonus = hasCredit ? 0.75 : 1;

    // baseTimeInDays is the time for 30 scientists, so everything is scaled based on that
    return baseTimeInDays * (30 / (numScientists * labBonus)) * creditBonus;
}

function calculateTimeToBuild(itemOrFoundryProject, numActualEngineers, isRushJob) {
    const numExpectedEngineers = itemOrFoundryProject.base_engineers;
    // Unfortunately the data format for items and foundry projects is slightly different
    const expectedEngineerHours = 24 * numExpectedEngineers * (itemOrFoundryProject.base_time_days || itemOrFoundryProject.normal_build.base_build_time_days);
    const workPerHour = calculateWorkPerHour(numExpectedEngineers, numActualEngineers, isRushJob);

    var hoursToBuild = Math.floor(expectedEngineerHours / workPerHour);

    if (expectedEngineerHours % workPerHour != 0) {
        hoursToBuild++;
    }

    return hoursToBuild;
}

function calculateWorkPerHour(numExpectedEngineers, numActualEngineers, isRushJob) {
    // Formula from XGFacility_Engineering#117

    const rushFactor = isRushJob ? 2 : 1;
    const timeScaleFactor = 0.03; // this is ABDUCTION_REWARD_ENG in DefaultGameCore.ini
    const engineerRatio = numExpectedEngineers / numActualEngineers;
    const exponent = Math.min(50, 2  * timeScaleFactor * numExpectedEngineers);
    const divisor = (0.5 / rushFactor) * (1 + Math.pow(engineerRatio, exponent));

    var workPerHour = Math.floor(numExpectedEngineers / divisor);
    workPerHour = Math.max(1, workPerHour);
    workPerHour = Math.min(workPerHour, rushFactor * numActualEngineers);

    return workPerHour;
}

function capitalizeEachWord(str, originalSeparator, newSeparator) {
    originalSeparator = originalSeparator || "_";
    newSeparator = newSeparator || " ";

    return str.split(originalSeparator).map( word => word[0].toUpperCase() + word.substring(1) ).join(newSeparator);
}

function createGrid(headers, sizes, values) {
    const gridContainer = document.createElement("div");
    gridContainer.classList.add("grid-container");

    const sizeString = sizes.join(" ");
    gridContainer.style = "grid-template-columns: " + sizeString;

    for (const header of headers) {
        const div = document.createElement("div");
        div.classList.add("grid-header");
        div.append(header);
        gridContainer.append(div);
    }

    for (const value of values) {
        const div = document.createElement("div");
        div.classList.add("grid-value");
        div.append(value);
        gridContainer.append(div);
    }

    return gridContainer;
}

function createImg(src, attributes) {
    const img = document.createElement("img");
    img.src = src;

    if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
            img.setAttribute(key, value);
        }
    }

    return img;
}

function createSelect(options, selectedValue) {
    const select = document.createElement("select");

    for (const option of options) {
        const element = document.createElement("option");
        element.value = option.value;
        element.innerHTML = option.content;

        if (option.value === selectedValue) {
            element.setAttribute("selected", "");
        }

        select.appendChild(element);
    }

    return select;
}

function dateByDaysPassed(days) {
    days = +days;

    const startDate = getCampaignStartDate();
    startDate.setDate(startDate.getDate() + days);

    return startDate;
}

function dateFromInputString(s) {
    return new Date(s + "T00:00:00");
}

function dateToInputString(date) {
    const year = date.getFullYear();
    let month = date.getMonth() + 1;
    let day = date.getDate();

    if (month < 10) {
        month = "0" + String(month);
    }

    if (day < 10) {
        day = "0" + String(day);
    }

    return `${year}-${month}-${day}`;
}

function daysPassedByDate(date) {
    if (typeof date === "string") {
        date = dateFromInputString(date);
    }

    const startDate = getCampaignStartDate();
    const msDiff = date - startDate;

    // Thanks to JS having daylight savings and XCOM not, we need to round the result
    // since it will sometimes be off by one hour
    const daysPassed = Math.round(msDiff / (24 * 60 * 60 * 1000));

    return daysPassed;
}

function equals(first, second) {
    if (typeof(first) !== typeof(second)) {
        return false;
    }

    if (typeof(first) !== "object") {
        return first === second;
    }

    if (Object.is(first, second)) {
        return true;
    }

    const firstEntries = Object.entries(first);
    const secondEntries = Object.entries(second);

    if (firstEntries.length !== secondEntries.length) {
        return false;
    }

    firstEntries.sort( ([key1, _v1], [key2, _v2]) => key1.localeCompare(key2));
    secondEntries.sort( ([key1, _v1], [key2, _v2]) => key1.localeCompare(key2));

    for (let i = 0; i < firstEntries.length; i++) {
        const [firstKey, firstValue] = firstEntries[i];
        const [secondKey, secondValue] = secondEntries[i];

        if (firstKey !== secondKey) {
            return false;
        }

        if (!equals(firstValue, secondValue)) {
            return false;
        }
    }

    return true;
}

function formatCampaignDate(date) {
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day} ${month}, ${year}`;
}

function formatCampaignDateAsMonthAndYear(date) {
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${month} ${year}`;
}

function getCampaignStartDate() {
    return new Date("2016-03-01T00:00:00");
}

function join(strings, joinWord, encodeSpaces) {
    if (!joinWord && joinWord !== "") {
        joinWord = "and";
    }

    const space = encodeSpaces ? "&nbsp;" : " ";

    if (strings.length == 0) {
        return "";
    }

    if (strings.length == 1) {
        return strings[0];
    }

    if (strings.length == 2) {
        if (joinWord === ",") {
            return strings[0] + joinWord + space + strings[1];
        }
        else {
            return strings[0] + space + joinWord + space + strings[1];
        }
    }

    let output = "";
    for (let i = 0; i < strings.length; i++) {
        output += strings[i];

        if (i != strings.length - 1) {
            output += "," + space;
        }

        if (i == strings.length - 2 && joinWord !== ",") {
            output += space + joinWord + space;
        }
    }

    return output;
}

function minResearchByDate(date) {
    // Campaign starts on March 1st, 2016
    const campaignStartDate = new Date("2016-03-01T00:00:00");
    const elapsedMillis = date.getTime() - campaignStartDate.getTime();
    const elapsedDays = elapsedMillis / (1000 * 60 * 60 * 24);

    return Math.ceil(elapsedDays) + 1;
}

function researchThresholdByDifficulty(originalThreshold, difficulty) {
    const difficultyFactors = {
        "normal": 0.7,
        "classic": 1,
        "brutal": 1.1,
        "impossible": 1.3
    };

    const researchFactor = difficultyFactors[difficulty];

    return Math.ceil(originalThreshold / researchFactor);
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) {
        return text;
    }

    const cutoffIndex = Math.min(text.indexOf(" ", maxLength), text.indexOf(".", maxLength) );

    // Check the index in case we're in the last word
    if (cutoffIndex >= maxLength) {
        text = text.substring(0, cutoffIndex) + " …";
    }

    return text;
}

function xToY(x, y) {
    if (x === y) {
        return String(x);
    }

    return `${x} to ${y}`;
}

export {
        appendElement,
        calculateRebate,
        calculateRebatePercentage,
        calculateResearchTime,
        calculateTimeToBuild,
        calculateWorkPerHour,
        capitalizeEachWord,
        createGrid,
        createImg,
        createSelect,
        dateByDaysPassed,
        dateFromInputString,
        dateToInputString,
        daysPassedByDate,
        equals,
        formatCampaignDate,
        formatCampaignDateAsMonthAndYear,
        getCampaignStartDate,
        join,
        minResearchByDate,
        researchThresholdByDifficulty,
        truncateText,
        xToY
};