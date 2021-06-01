const { ipcRenderer } = require('electron');

const form = document.getElementById("settings-form");
const cancelButton = document.getElementById("cancel");
const saveButton = document.getElementById("save-settings");

const personalizeDataCheckbox = document.querySelector("input[name=personalizeData]");

const numScientistsInput = document.querySelector("input[name=numScientists]");

const allInputs = [...document.querySelectorAll("input")];
allInputs.forEach(input => input.addEventListener("keypress", preventEnter));

function preventEnter(event) {
    if (event.keyCode === 13) {
        event.preventDefault();
    }
}

cancelButton.addEventListener("click", event => {
    ipcRenderer.send("close-settings-window");
});

personalizeDataCheckbox.addEventListener("change", event => {
    numScientistsInput.disabled = !personalizeDataCheckbox.checked;
});

form.addEventListener("submit", event => {
    const formData = new FormData(form);
    console.log("Submit event", formData);
    event.preventDefault();
})
