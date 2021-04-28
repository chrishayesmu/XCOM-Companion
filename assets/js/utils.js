function capitalizeEachWord(str, originalSeparator, newSeparator) {
    originalSeparator = originalSeparator || "_";
    newSeparator = newSeparator || " ";

    return str.split(originalSeparator).map( word => word[0].toUpperCase() + word.substring(1) ).join(newSeparator);
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

module.exports.capitalizeEachWord = capitalizeEachWord;
module.exports.truncateText = truncateText;