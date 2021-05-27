class ToggleGroup extends HTMLElement {

    #contentsContainer = null;

    static get observedAttributes() {
        return [ "defaultselected", "options", "rounded" ];
    }

    attributeChangedCallback() {
        this._recreateContents();
    }

    _onOptionClicked(event) {
        this._selectOption(event.target.textContent);
    }

    _recreateContents() {
        if (this.#contentsContainer) {
            this.removeChild(this.#contentsContainer);
        }

        this.#contentsContainer = document.createElement("div");
        this.#contentsContainer.classList.add("toggle-group-container");
        this.#contentsContainer.classList.add(this.rounded ? "toggle-group-container-rounded" : "toggle-group-container-rectangle");
        this.appendChild(this.#contentsContainer);

        const options = this.options;
        let selectedOption = null;

        for (let i = 0; i < options.length; i++) {
            const div = document.createElement("div");
            div.classList.add("toggle-group-option");
            div.textContent = options[i];

            div.addEventListener("click", this._onOptionClicked.bind(this));

            this.#contentsContainer.appendChild(div);

            if (options[i] === this.defaultSelected) {
                selectedOption = options[i];
            }
        }

        this._selectOption(selectedOption || options[0]);
    }

    _selectOption(optionText) {
        const allOptions = this.#contentsContainer.querySelectorAll(".toggle-group-option");
        const selectedOption = Array.prototype.find.call(allOptions, elem => elem.textContent === optionText);

        if (!selectedOption) {
            return;
        }

        Array.prototype.forEach.call(allOptions, elem => elem.classList.remove("selected"));
        selectedOption.classList.add("selected");

        const selectionEvent = new CustomEvent("selectedOptionChanged", { detail: { selectedOption: optionText }});
        this.dispatchEvent(selectionEvent);
    }

    get defaultSelected() {
        return this.getAttribute("defaultSelected");
    }

    set defaultSelected(defaultSelected) {
        this.setAttribute("defaultSelected", defaultSelected);
    }

    get rounded() {
        return this.hasAttribute("rounded");
    }

    set rounded(rounded) {
        if (rounded) {
            this.setAttribute("rounded", true);
        }
        else {
            this.removeAttribute("rounded");
        }
    }

    get options() {
        if (!this.hasAttribute("options")) {
            return [];
        }

        return this.getAttribute("options").split(",").map(val => val.trim());
    }

    set options(options) {
        this.setAttribute("options", options);
    }

    get selectedOption() {
        const option = this.#contentsContainer.querySelector(".toggle-group-option.selected");
        return option.textContent;
    }
}

customElements.define("toggle-group", ToggleGroup);