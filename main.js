const { autoUpdater } = require("electron-updater");

const path = require('path');
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');

const debug = /--debug/.test(process.argv[2]);
const isMac = process.platform === 'darwin';

if (process.mas) {
    app.setName('XCOM Companion');
}

let manualUpdateCheckInProgress = false;
let mainWindow = null;
let settingsWindow = null;

ipcMain.handle("get-window-size", () => {
    return mainWindow.getContentBounds();
});

ipcMain.handle("get-app-version", event => {
    return { version : app.getVersion() };
});

ipcMain.on("app-update-accepted", event => {
    autoUpdater.quitAndInstall();
});

ipcMain.on("close-settings-window", event => {
    if (settingsWindow) {
        settingsWindow.close();
        settingsWindow = null;
    }
});

autoUpdater.on("download-progress", (progress) => {
    mainWindow.webContents.send("app-update-download-progress", progress);
});

autoUpdater.on("update-available", (updateInfo) => {
    mainWindow.webContents.send("app-update-available", updateInfo);
});

autoUpdater.on("update-not-available", (updateInfo) => {
    // Only send this event if this was a manual check, otherwise it'll happen every half hour
    if (manualUpdateCheckInProgress) {
        mainWindow.webContents.send("app-update-not-available", updateInfo);
    }
});

autoUpdater.on("update-downloaded", (updateInfo) => {
    mainWindow.webContents.send("app-update-downloaded", updateInfo);
});

const menuTemplate = [
    {
        label: "&File",
        submenu: [
            isMac ? { role: "close" } : { role: "quit" }
        ]
    },
    {
        label: "&Edit",
        submenu: [
            { role: "undo" },
            { role: "redo" },
            { type: "separator" },
            { role: "cut" },
            { role: "copy" },
            { role: "paste" }
        ]
    },
    {
        label: "&About",
        submenu: [
            {
                label: "GitHub Page",
                click: async () => {
                    await shell.openExternal("https://github.com/chrishayesmu/XCOM-Companion/");
                }
            },
            {
                label: "Check for Updates",
                click: manualUpdateCheck
            }
        ]
    }
];

if (debug) {
    // Settings window is still WIP so hide it behind debug flag
    menuTemplate.push({
        label: "&Options",
        submenu: [
            {
                label: "App Settings",
                click: openSettingsModal
            }
        ]
    });

    menuTemplate.push({
        label: "View",
        submenu: [
            { role: "reload" },
            { role: "toggleDevTools" }
        ]
    });
}

function initialize() {
    makeSingleInstance();

    function createWindow() {
        const windowOptions = {
            width: 1116,
            minWidth: 1116,
            height: 1200,
            minHeight: 1050,
            title: app.getName(),
            webPreferences: {
                contextIsolation: false,
                nodeIntegration: true
            }
        };

        mainWindow = new BrowserWindow(windowOptions);
        mainWindow.loadURL(path.join("file://", __dirname, "/index.html"));

        // Launch with DevTools open, usage: npm run dev
        if (debug) {
            mainWindow.webContents.openDevTools();
        }

        mainWindow.setMenu(Menu.buildFromTemplate(menuTemplate));

        mainWindow.on('closed', () => {
            mainWindow = null;
        });

        mainWindow.once('ready-to-show', () => {
            if (autoUpdater.isUpdaterActive()) {
                autoUpdater.checkForUpdates();

                setInterval(() => { autoUpdater.checkForUpdates() }, 30 * 60 * 1000);
            }
            else {
                console.log("Updater is not active (probably because app is not packaged); not checking for updates");
            }
        });
    }

    app.on('ready', () => {
        createWindow();
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        if (mainWindow === null) {
            createWindow();
        }
    });
}

// Make this app a single instance app.
//
// The main window will be restored and focused instead of a second window
// opened when a person attempts to launch a second instance.
//
// Returns true if the current version of the app should quit instead of
// launching.
function makeSingleInstance() {
    if (process.mas) {
        return
    }

    app.requestSingleInstanceLock();

    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore()
            }

            mainWindow.focus();
        }
    })
}

async function manualUpdateCheck() {
    manualUpdateCheckInProgress = true;

    mainWindow.webContents.send("app-update-check-started");

    autoUpdater.checkForUpdates().then( updateInfo => {
        console.log("Checked for updates, found ", updateInfo);
    }).catch( err => {
        console.error("Update check failed", err);
    }).finally( () => {
        manualUpdateCheckInProgress = false;
    });
}

async function openSettingsModal() {
    const mainWindowBounds = mainWindow.getNormalBounds();
    const mainCenterX = mainWindowBounds.x + (mainWindowBounds.width / 2);
    const mainCenterY = mainWindowBounds.y + (mainWindowBounds.height / 2);
    const width = 400;
    const height = 600;

    settingsWindow = new BrowserWindow({
        frame: false,
        modal: true,
        movable: false,
        parent: mainWindow,
        resizable: false,
        show: false,
        height: height,
        width: width,
        x: mainCenterX - (width / 2),
        y: mainCenterY - (height / 2),
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        }
    });

    settingsWindow.loadURL(path.join("file://", __dirname, "/settings.html"));
    settingsWindow.removeMenu();

    settingsWindow.once("ready-to-show", () => {
        settingsWindow.show();

        if (debug) {
            settingsWindow.webContents.openDevTools();
        }
    });
}

initialize();
