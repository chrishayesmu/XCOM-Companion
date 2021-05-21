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

    container.appendChild(element);
}

function capitalizeEachWord(str, originalSeparator, newSeparator) {
    originalSeparator = originalSeparator || "_";
    newSeparator = newSeparator || " ";

    return str.split(originalSeparator).map( word => word[0].toUpperCase() + word.substring(1) ).join(newSeparator);
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

export { appendElement, capitalizeEachWord, equals, join, truncateText, xToY };