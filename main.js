require('update-electron-app')({
    logger: require('electron-log')
});

const path = require('path');
const { app, BrowserWindow, ipcMain } = require('electron');

const debug = /--debug/.test(process.argv[2]);

if (process.mas) {
    app.setName('XCOM Companion');
}

let mainWindow = null;

ipcMain.handle("get-window-size", event => {
    console.log("get-window-size", event);
    return mainWindow.getContentBounds();
});

function initialize() {
    makeSingleInstance();

    function createWindow() {
        const windowOptions = {
            width: 1100,
            minWidth: 1100,
            height: 1200,
            minHeight: 1050,
            title: app.getName(),
            webPreferences: {
                contextIsolation: false,
                nodeIntegration: true
            }
        };

        mainWindow = new BrowserWindow(windowOptions);
        mainWindow.loadURL(path.join('file://', __dirname, '/index.html'));

        // Launch with DevTools open, usage: npm run dev
        if (debug) {
            mainWindow.webContents.openDevTools();
        }

        mainWindow.on('closed', () => {
            mainWindow = null;
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

initialize();