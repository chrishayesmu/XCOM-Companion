const loadedFiles = {};

async function instantiateTemplate(filepath, templateId) {
    let fileContents = null;

    if (filepath in loadedFiles) {
        fileContents = loadedFiles[filepath];
    }
    else {
        fileContents = await fetch(filepath).then(response => response.text());
        loadedFiles[filepath] = fileContents;
    }

    const htmlDoc = new DOMParser().parseFromString(fileContents, "text/html");
    const template = htmlDoc.querySelector("#" + templateId);

    return template ? document.importNode(template.content, true).firstElementChild : null;
}

export { instantiateTemplate };
