function instantiateTemplate(templateId) {
    const links = document.querySelectorAll('link[rel="import"]')

    for (let i = 0; i < links.length; i++) {
        const template = links[i].import.querySelector("#" + templateId);

        if (!template) {
            continue;
        }

        return document.importNode(template.content, true).firstElementChild;
    }

    return null;
}

module.exports.instantiateTemplate = instantiateTemplate;