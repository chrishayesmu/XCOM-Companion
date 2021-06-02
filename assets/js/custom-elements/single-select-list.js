const selectedItemClass = "ssl-selected";

class SingleSelectList extends HTMLElement {

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

    select(item) {
        const items = [...this.querySelectorAll("li")];
        items.forEach(item => item.classList.remove(selectedItemClass));

        if (item) {
            item.classList.add(selectedItemClass);
        }

        this.selectedItem = item;
        const selectionEvent = new CustomEvent("selectionChanged", { detail: { selectedItem: this.selectedItem }});
        this.dispatchEvent(selectionEvent);
    }

    _onItemClicked(event) {
        if (this.disabled || event.target.classList.contains("disabled")) {
            return;
        }

        const isSelecting = !event.target.classList.contains(selectedItemClass);

        if (isSelecting) {
            this.select(event.target);
        }
        else {
            this.select(null);
        }
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

    get items() {
        return [...this.querySelectorAll("li")];
    }

    get title() {
        return this.getAttribute("data-title");
    }

    set title(title) {
        this.setAttribute("data-title", title);
    }
}

customElements.define("single-select-list", SingleSelectList);