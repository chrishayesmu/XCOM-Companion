const settings = require("electron-settings");

document.body.addEventListener("click", (event) => {
    if (event.target.classList.contains("nav-container")) {
        handleSectionTrigger(event);
    }
});

function showMainContent() {
    document.querySelector(".js-nav").classList.add("is-shown");
    document.querySelector(".js-content").classList.add("is-shown");
}

function handleSectionTrigger(event) {
    // Clicking a container just expands/collapses it
    const subsectionContainer = event.target.querySelector(".nav-subsection-container");

    if (subsectionContainer.classList.contains("is-expanded")) {
        subsectionContainer.classList.remove("is-expanded");
    }
    else {
        subsectionContainer.classList.add("is-expanded");
    }
}

// Default to the view that was active the last time the app was open
const sectionId = settings.get("activeSectionButtonId");
if (sectionId) {
    showMainContent();
    const section = document.getElementById(sectionId);
    if (section) {
        section.click();
    }
} else {
    showMainContent();
}
