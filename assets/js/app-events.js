const eventListeners = {};

function fireEvent(evtName, data) {
    // Fire the event on a delay so current thread can resolve
    setTimeout( () => {
        data = data || {};

        if (eventListeners[evtName]) {
            for (const callback of eventListeners[evtName]) {
                callback(data);
            }
        }
    }, 20);
}

function registerEventListener(evtName, callback) {
    if (!evtName || typeof(evtName) != "string" || typeof(callback) !== "function") {
        throw new Error("Invalid arguments to registerEventListener");
    }

    if (!eventListeners[evtName]) {
        eventListeners[evtName] = [];
    }

    eventListeners[evtName].push(callback);
}

function removeEventListener(evtName, callback) {
    if (!evtName || typeof(evtName) != "string" || typeof(callback) !== "function") {
        throw new Error("Invalid arguments to removeEventListener");
    }

    if (eventListeners[evtName]) {
        eventListeners[evtName].remove(callback);
    }
}

export {
    fireEvent,
    registerEventListener,
    removeEventListener
};