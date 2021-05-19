const selectedItemClass = "ssl-selected";

class SingleSelectList extends HTMLElement {

    #selectedItem = null;

    constructor() {
        super();

        // Technically this is all probably supposed to be in a lifecycle callback, not the constructor
        if (this.title) {
            const div = document.createElement("div");
            div.classList.add("ssl-title");
            div.textContent = this.title;

            this.prepend(div);
        }

        const items = this.querySelectorAll("li");

        for (let i = 0; i < items.length; i++) {
            const listItem = items[i];

            listItem.addEventListener("click", this._onItemClicked.bind(this));
        }
    }

    _onItemClicked(event) {
        if (this.disabled) {
            return;
        }

        const isSelecting = !event.target.classList.contains(selectedItemClass);
        const items = this.querySelectorAll("li");

        for (let i = 0; i < items.length; i++) {
            const listItem = items[i];

            if (isSelecting && event.target === listItem) {
                listItem.classList.add(selectedItemClass);
            }
            else {
                listItem.classList.remove(selectedItemClass);
            }
        }

        this.selectedItem = isSelecting ? event.target : null;
        const selectionEvent = new CustomEvent("selectionChanged", { detail: { selectedItem: this.selectedItem }});
        this.dispatchEvent(selectionEvent);
    }

    get disabled() {
        return this.hasAttribute("disabled");
    }

    set disabled(disabled) {
        if (disabled) {
            this.setAttribute("disabled", "");
        }
        else {
            this.removeAttribute("disabled");
        }
    }

    get title() {
        return this.getAttribute("data-title");
    }

    set title(title) {
        this.setAttribute("data-title", title);
    }
}

customElements.define("single-select-list", SingleSelectList);