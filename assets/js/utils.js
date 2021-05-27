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

function dateByDaysPassed(days) {
    days = +days;

    // Campaign starts on March 1st, 2016
    const startDate = new Date("2016-03-01T00:00:00");
    startDate.setDate(startDate.getDate() + days);

    return startDate;
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

function join(strings, joinWord, encodeSpaces) {
    joinWord = joinWord || "and";

    const space = encodeSpaces ? "&nbsp;" : " ";

    if (strings.length == 0) {
        return "";
    }

    if (strings.length == 1) {
        return strings[0];
    }

    if (strings.length == 2) {
        return strings[0] + space + joinWord + space + strings[1];
    }

    let output = "";
    for (let i = 0; i < strings.length; i++) {
        output += strings[i];

        if (i != strings.length - 1) {
            output += "," + space;
        }

        if (i == strings.length - 2) {
            output += space + joinWord + space;
        }
    }

    return output;
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
        return x;
    }

    return `${x} to ${y}`;
}

export { appendElement, capitalizeEachWord, createGrid, createImg, dateByDaysPassed, equals, formatCampaignDate, join, truncateText, xToY };