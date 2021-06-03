const { ipcRenderer } = require('electron');

async function get(name) {
    try {
        return await ipcRenderer.invoke("get-settings", name);
    }
    catch (e) {
        console.error(`Error while retrieving settings with name "${name}"`);
        console.error(e);
        return null;
    }
}

async function set(name, value) {
    ipcRenderer.send("save-settings", name, value);
}

export { get, set };