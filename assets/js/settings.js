const { ipcRenderer } = require('electron');

async function get(name) {
    return ipcRenderer.invoke("get-settings", name);
}

async function set(name, value) {
    ipcRenderer.send("save-settings", name, value);
}

export { get, set };