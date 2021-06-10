const { clipboard } = require("electron");

import { AppPage, PageHistoryState } from "./app-page.js";
import * as Templates from "../templates.js";

import PaintTool from "./movement-grid/paint-tool.js";
import { colors, gridSquareSize } from "./movement-grid/shared.js";

const drawFrameRate = 60; // target max frame rate in frames per second
const maxDistancePastBoundary = 100; // how far the grid can be zoomed past its edges
const panSensitivity = 1.75; // multiplier to mouse movement when panning grid
const zoomIncrement = 0.05; // how much to zoom by with each click of the mouse wheel
const zoomMax = 1.0;
const zoomMin = 0.3;

class MovementGridPage extends AppPage {

    static pageId = "movement-grid-page";

    #canvas = null;
    #cellOptionsMenu = null; // DOMElement for context menu on right click
    #drawTimeoutID = null;
    #paintedCells = []; // which cells have been painted already in the current paint operation
    #selectorGlow = null; // glow <img /> element used for highlighting the moused-over cell
    #unitStartCell = null; // where the unit is located and pathing begins from

    // Input option elements
    #baseMobilityInput = null;

    // Tracking the state of the mouse
    #lastCellCoords = { x : -1, y : -1 };
    #lastMouseX = 0;
    #lastMouseY = 0;
    #lastMouseXCanvasSpace = 0;
    #lastMouseYCanvasSpace = 0;

    // Tracking the position and scale of the canvas
    #scale = 0.5;
    #translateX = 0;
    #translateY = 0;

    // Tracking the actual cell data
    #cells = [];
    #numCellsHigh = 40;
    #numCellsWide = 40;

    #tools = [
        new PaintTool()
    ];

    #activeTool = this.#tools[0];

    async load(_data) {
        const template = await Templates.instantiateTemplate("assets/html/templates/pages/movement-grid-page.html", "template-movement-grid-page");

        // Create the cell context menu now, and append it to the document in its collapsed form for later use
        // TODO: destroy it when unloading the page or we could end up with a ton of them
        this.#cellOptionsMenu = await Templates.instantiateTemplate("assets/html/templates/pages/movement-grid-page.html", "template-grid-cell-options-menu");
        this.#cellOptionsMenu.querySelector("#set-as-start").addEventListener("click", this._onSetAsStartClicked.bind(this));
        document.body.appendChild(this.#cellOptionsMenu);

        template.querySelector("#export-layout-button").addEventListener("click", this._onExportAsStringClicked.bind(this));
        template.querySelector("#import-layout-button").addEventListener("click", this._onImportFromStringClicked.bind(this));
        template.querySelector("#load-layout-button").addEventListener("click", () => console.log("Not implemented"));
        template.querySelector("#save-layout-button").addEventListener("click", () => console.log("Not implemented"));

        template.querySelector("#overlay-mark-ground-obstacle").addEventListener("click", this._onPaintModeClicked.bind(this));
        template.querySelector("#overlay-mark-tall-obstacle").addEventListener("click", this._onPaintModeClicked.bind(this));
        template.querySelector("#overlay-clear-obstacle").addEventListener("click", this._onPaintModeClicked.bind(this));
        template.querySelector("#overlay-increase-elevation").addEventListener("click", this._onPaintModeClicked.bind(this));
        template.querySelector("#overlay-decrease-elevation").addEventListener("click", this._onPaintModeClicked.bind(this));

        template.querySelector("#set-grid-size").addEventListener("click", this._onSetGridSizeClicked.bind(this));

        this.#selectorGlow = template.querySelector("#img-selector-glow");

        this.#canvas = template.querySelector("#movement-grid-canvas");
        this.#canvas.addEventListener("mousedown", this._handleMouseDown.bind(this));
        this.#canvas.addEventListener("mousemove", this._handleMouseMove.bind(this));
        this.#canvas.addEventListener("mouseup", this._handleMouseUp.bind(this));
        this.#canvas.addEventListener("wheel", this._handleMouseWheel.bind(this));

        window.addEventListener("resize", this._updateCanvasAspectRatio.bind(this));
        document.body.addEventListener("click", event => {
            let element = event.target;

            while (element) {
                if (element === this.#cellOptionsMenu) {
                    return;
                }

                element = element.parentElement;
            }

            // Click occurred outside the context menu, so close it
            this._closeCellOptionsMenu();
        });

        document.body.addEventListener("mouseup", event => {
            // TODO move to function probably, add same for mousemove
            if (event.button === 1) {
                document.body.style.cursor = "default";
            }
        });

        this.#baseMobilityInput = template.querySelector("#unit-mobility");
        const abilityAndEffectsInputs = [ "effect-acid", "effect-blood-call", "effect-catching-breath", "effect-combat-rush", "effect-combat-stims", "effect-flashbang", "effect-mindfray", "unit-can-fly", "unit-can-jump", "unit-mobility" ];
        abilityAndEffectsInputs.forEach(id => template.querySelector("#" + id).addEventListener("change", this._onAbilitiesAndEffectsChanged.bind(this)));

        // Set the legend colors from code so they're always synced with the grid
        template.querySelector("#movement-grid-legend-blue-move").style = `background-color: ${colors.blueMove}`;
        template.querySelector("#movement-grid-legend-obstacle").style = `background-color: ${colors.obstacle}`;
        template.querySelector("#movement-grid-legend-tall-obstacle").style = `background-color: ${colors.tallObstacle}`;
        template.querySelector("#movement-grid-legend-start").style = `background-color: ${colors.start}`;
        template.querySelector("#movement-grid-legend-yellow-move").style = `background-color: ${colors.yellowMove}`;

        this._initializeCells();
        this._markCellDistancesFromStart();

        setTimeout(this._updateCanvasAspectRatio.bind(this), 50);

        return {
            body: template,
            title: {
                icon: "assets/img/item-stat-icons/mobility.png",
                text: "Movement Grid"
            }
        };
    }

    _areLastCellCoordsValid() {
        return this.#lastCellCoords.x >= 0 && this.#lastCellCoords.x < this.#numCellsWide && this.#lastCellCoords.y >= 0 && this.#lastCellCoords.y < this.#numCellsHigh;
    }

    /**
     * Calculates the DOMRect for the given cell in screen space (not canvas space).
     *
     * @param {Object} cellCoords An object of the form { x: Integer, y: Integer }
     * @returns {DOMRect} The DOMRect, or null if the cell coords are invalid
     */
    _calculateScreenSpaceCellRect(cellCoords) {
        if (!this._areLastCellCoordsValid(cellCoords)) {
            return null;
        }

        // TODO: determine if the given coords are actually on screen
        const canvasRect = this.#canvas.getBoundingClientRect();

        // Canvas space coords: tell us where the cell starts in canvas space
        const canvasSpaceXPos = (cellCoords.x * gridSquareSize) * this.#scale + this.#translateX;
        const canvasSpaceYPos = (cellCoords.y * gridSquareSize) * this.#scale + this.#translateY;

        // Translate those coords to a percentage of the canvas's size; use Canvas.width/height
        // and not the bounding rect, because we're still in canvas space
        const xPosPercent = canvasSpaceXPos / this.#canvas.width;
        const yPosPercent = canvasSpaceYPos / this.#canvas.height;

        // Now use the screen space dimensions to translate the percentages to real coordinates
        const screenSpaceX = canvasRect.x + canvasRect.width * xPosPercent;
        const screenSpaceY = canvasRect.y + canvasRect.height * yPosPercent;

        // Cell dimensions just apply the zoom factor, plus the conversion from canvas space size to screen space size
        const cellHeight = gridSquareSize * this.#scale * (canvasRect.height / this.#canvas.height);
        const cellWidth = gridSquareSize * this.#scale * (canvasRect.width / this.#canvas.width);

        const rect = new DOMRect(screenSpaceX, screenSpaceY, cellWidth, cellHeight);

        return rect;
    }

    _cellCoordsFromMousePosition(mouseX, mouseY) {
        mouseX = (mouseX - this.#translateX) / this.#scale;
        mouseY = (mouseY - this.#translateY) / this.#scale;

        const coordX = Math.floor(mouseX / gridSquareSize);
        const coordY = Math.floor(mouseY / gridSquareSize);

        return { x : coordX, y : coordY };
    }

    _clampTranslations() {
        // Translation values move the grid in the opposite direction, i.e. a +x translation moves the view left, grid right
        const minX = -1 * (this.gridWidth + maxDistancePastBoundary) * this.#scale + this.#canvas.width;
        const minY = -1 * (this.gridHeight + maxDistancePastBoundary) * this.#scale + this.#canvas.height;
        this.#translateX = Math.clamp(this.#translateX, minX, maxDistancePastBoundary * this.#scale);
        this.#translateY = Math.clamp(this.#translateY, minY, maxDistancePastBoundary * this.#scale);
    }

    _closeCellOptionsMenu() {
        if (!this.isCellOptionsMenuOpen) {
            return;
        }

        this.#cellOptionsMenu.classList.add("hidden-collapse");

        // Reset all of the subitems for the next time the menu is opened
        const menuItems = [...this.#cellOptionsMenu.querySelectorAll(".movement-grid-options-item")];
        menuItems.forEach(element => element.classList.remove("hidden-collapse"));

        this._updateLastCellCoords();
        this._queueDraw();
    }

    _drawGrid() {
        // Null out timer first thing: if a user event occurs while draw is happening, we want to be sure
        // the next draw can queue to show the most recent state
        this.#drawTimeoutID = null;

        // Convenient place to update mobility display
        document.getElementById("unit-final-mobility").textContent = Math.roundTo(this.mobility, 3);

        const context = this.#canvas.getContext("2d", { alpha: false });

        // Fill background
        context.fillStyle = colors.background;
        context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

        // Draw cell grid
        context.save();
        context.translate(this.#translateX, this.#translateY);
        context.scale(this.#scale, this.#scale);

        // Limit to visible cells for performance
        const canvasLeftEdge = -this.#translateX / this.#scale;
        const canvasRightEdge = canvasLeftEdge + this.#canvas.width / this.#scale;
        const canvasTopEdge = -this.#translateY / this.#scale;
        const canvasBottomEdge = canvasTopEdge + this.#canvas.height / this.#scale;

        const allCells = this.#cells.flat();
        const visibleCells = allCells.filter(cell => {
            const x = cell.xPos, y = cell.yPos;
            return x <= canvasRightEdge && x + gridSquareSize >= canvasLeftEdge && y <= canvasBottomEdge && y + gridSquareSize >= canvasTopEdge;
        });

        const blueMoveCells = visibleCells.filter(cell => cell.distanceFromStart <= this.mobility);
        const yellowMoveCells = visibleCells.filter(cell => cell.distanceFromStart > this.mobility && cell.distanceFromStart <= 2 * this.mobility);

        // #region All visible cells: draw grid
        context.strokeStyle = colors.gridLines;
        for (const cellData of visibleCells) {
            if (cellData.isStartingCell) {
                context.save();

                context.fillStyle = colors.start;
                context.fillRect(cellData.xPos, cellData.yPos, gridSquareSize, gridSquareSize);

                context.restore();

                context.save();

                context.fillStyle = "white";
                context.font = "32px sans-serif";
                context.textBaseline = "top";

                // Do a little extra math to horizontally and vertically center within the cell
                const textMetrics = context.measureText("Start");
                const height = textMetrics.actualBoundingBoxAscent + textMetrics.actualBoundingBoxDescent;
                const xInset = Math.floor((gridSquareSize - textMetrics.width) / 2);
                const yInset = Math.floor((gridSquareSize - height) / 2);
                context.fillText("Start", cellData.xPos + xInset, cellData.yPos + yInset);

                context.restore();
            }

            context.strokeRect(cellData.xPos, cellData.yPos, gridSquareSize, gridSquareSize);
        }
        // #endregion

        // Tools should draw immediately after the grid for layering
        for (const tool of this.#tools) {
            tool.draw(context, visibleCells, this.lastMousedOverCell, allCells);
        }

        let preventActiveCellHighlight = false;

        if (this.lastMousedOverCell) {
            preventActiveCellHighlight = this.#activeTool.drawPreview(context, this.lastMousedOverCell, allCells);
        }

        // #region Draw cells reachable within blue moves
        context.save();
        context.fillStyle = colors.blueMove;

        for (const cellData of blueMoveCells) {
            context.fillRect(cellData.xPos, cellData.yPos, gridSquareSize, gridSquareSize);
        }

        context.restore();
        // #endregion

        // #region Draw cells reachable within yellow moves
        context.save();
        context.fillStyle = colors.yellowMove;

        for (const cellData of yellowMoveCells) {
            context.fillRect(cellData.xPos, cellData.yPos, gridSquareSize, gridSquareSize);
        }

        context.restore();
        // #endregion

        // #region Draw highlight on the moused-over cell
        if (!preventActiveCellHighlight && this._areLastCellCoordsValid()) {
            const cellData = this.lastMousedOverCell;

            context.save();

            context.globalAlpha = 0.5;
            context.drawImage(this.#selectorGlow, cellData.xPos, cellData.yPos, gridSquareSize, gridSquareSize);

            context.restore();
        }
        // #endregion

        context.restore();
    }

    _getCellNeighbors(cell) {
        const leftX = cell.x - 1;
        const rightX = cell.x + 1;
        const aboveY = cell.y - 1;
        const belowY = cell.y + 1;

        const neighbors = [];

        if (leftX >= 0) {
            neighbors.push(this.#cells[leftX][cell.y]);
        }

        if (rightX < this.#numCellsWide) {
            neighbors.push(this.#cells[rightX][cell.y]);
        }

        if (aboveY >= 0) {
            neighbors.push(this.#cells[cell.x][aboveY]);
        }

        if (belowY < this.#numCellsHigh) {
            neighbors.push(this.#cells[cell.x][belowY]);
        }

        if (leftX >= 0 && aboveY >= 0) {
            neighbors.push(this.#cells[leftX][aboveY]);
        }

        if (leftX >= 0 && belowY < this.#numCellsHigh) {
            neighbors.push(this.#cells[leftX][belowY]);
        }

        if (rightX < this.#numCellsWide && aboveY >= 0) {
            neighbors.push(this.#cells[rightX][aboveY]);
        }

        if (rightX < this.#numCellsWide && belowY < this.#numCellsHigh) {
            neighbors.push(this.#cells[rightX][belowY]);
        }

        return neighbors;
    }

// #region Mouse event handlers

    _handleMouseDown(event) {
        if (event.button === 0) {
            if (this.isCellOptionsMenuOpen) {
                // Something else will handle this; we don't want to modify the grid when someone is
                // just trying to close the context menu
                return;
            }

            event.preventDefault();

            if (this.#activeTool.mouseDown(this.lastMousedOverCell, this.#cells)) {
                this._markCellDistancesFromStart();
                this._queueDraw();
            }
        }
        else if (event.button === 1) {
            // When middle mouse is down inside the canvas, change cursor to show we're panning
            event.preventDefault();
            document.body.style.cursor = "move";
        }
    }

    _handleMouseMove(event) {
        let shouldDraw = false, shouldPath = false;

        if (this._isMiddleMouseDown(event)) {
            const deltaX = event.offsetX - this.#lastMouseX;
            const deltaY = event.offsetY - this.#lastMouseY;

            // TODO: impose constraints on translations
            this.#translateX += panSensitivity * deltaX;
            this.#translateY += panSensitivity * deltaY;

            this._clampTranslations();

            shouldDraw = true;
        }
        else {
            // Try our best to make sure the cursor gets restored no matter what, even if the
            // mouseUp event happened outside of the app window
            document.body.style.cursor = "default";
        }

        this.#lastMouseX = event.offsetX;
        this.#lastMouseY = event.offsetY;

        const canvasRect = this.#canvas.getBoundingClientRect();
        this.#lastMouseXCanvasSpace = this.#lastMouseX * (this.#canvas.width / canvasRect.width);
        this.#lastMouseYCanvasSpace = this.#lastMouseY * (this.#canvas.height / canvasRect.height);

        // Don't update any of this while the context menu is open; we want the cell highlight to
        // remain where it is, for clarity
        if (!this.isCellOptionsMenuOpen) {
            const updated = this._updateLastCellCoords();
            shouldDraw = shouldDraw || updated;
        }

        // Wait to check left mouse (for painting) until after we've updated the mouse state
        if (this._isLeftMouseDown(event)) {
            if (this.lastMousedOverCell) {
                const updated = this.#activeTool.mouseMove(this.lastMousedOverCell, this.#cells);
                shouldDraw = shouldDraw || updated;
                shouldPath = shouldPath || updated;
            }
        }

        if (shouldPath) {
            this._markCellDistancesFromStart();
        }

        if (shouldDraw) {
            this._queueDraw();
        }
    }

    _handleMouseUp(event) {
        if (event.button === 0) { // left click
            this.#activeTool.mouseUp(this.lastMousedOverCell, this.#cells);
        }
        else if (event.button === 1) { // middle click
            document.body.style.cursor = "default";
        }
        else if (event.button === 2) { // right click
            if (this._areLastCellCoordsValid()) {
                this._showCellMenu(this.#lastCellCoords);
            }
        }
    }

    _handleMouseWheel(event) {
        event.preventDefault();

        // Mouse wheel controls zooming in and out
        // TODO: zoom towards the mouse (adjust translation to match)
        this.#scale += -1 * zoomIncrement * Math.sign(event.deltaY);
        this.#scale = Math.clamp(this.#scale, zoomMin, zoomMax);
        this._clampTranslations();

        this.#lastCellCoords = this._cellCoordsFromMousePosition(this.#lastMouseXCanvasSpace, this.#lastMouseYCanvasSpace);

        this._queueDraw();
    }

// #endregion

    _importCellData(data) {
        this.#numCellsHigh = data.size.height;
        this.#numCellsWide = data.size.width;

        // Unmodified cells aren't in the export data, so initialize everything first
        this._initializeCells();

        for (const datum of data.cells) {
            const cell = {
                x: datum.x,
                y: datum.y,
                xPos: datum.x * gridSquareSize,
                yPos: datum.y * gridSquareSize
            };

            cell.elevation = datum.el || 0;
            cell.isObstacle = !!datum.ob;
            cell.isTallObstacle = !!datum.tallOb;
            cell.isStartingCell = !!datum.start;

            this.#cells[cell.x][cell.y] = cell;
        }

        this._markCellDistancesFromStart();
        this._queueDraw();
    }

    _initializeCells() {
        this.#cells = [];

        for (let i = 0; i < this.#numCellsWide; i++) {
            this.#cells[i] = [];

            for (let j = 0; j < this.#numCellsHigh; j++) {
                this.#cells[i][j] = {
                    elevation: 0,
                    isObstacle: false,
                    isTallObstacle: false,
                    x: i,
                    y: j,
                    xPos: i * gridSquareSize,
                    yPos: j * gridSquareSize
                };
            }
        }
    }

    _isLeftMouseDown(mouseEvent) {
        return mouseEvent.buttons & 1;
    }

    _isMiddleMouseDown(mouseEvent) {
        return mouseEvent.buttons & 4;
    }

    _isRightMouseDown(mouseEvent) {
        return mouseEvent.buttons & 2;
    }

    /**
     * Basic implementation of Djikstra's algorithm to set each cell's distance from the starting
     * point, with a few of the rules that govern XCOM's movement system included.
     */
    _markCellDistancesFromStart() {
        if (!this.#unitStartCell) {
            return;
        }

        // These are the in-game distances to traverse a tile
        const orthogonalDistance = 1 / 0.666;
        const diagonalDistance = Math.sqrt(2) / 0.666;

        const unvisitedCells = this.#cells.flat();
        unvisitedCells.forEach(cell => cell.distanceFromStart = Number.POSITIVE_INFINITY);
        this.#unitStartCell.distanceFromStart = 0;

        let currentCell = this.#unitStartCell;

        while (unvisitedCells.length > 0) {
            const neighbors = this._getCellNeighbors(currentCell);

            for (const neighbor of neighbors) {
                if (neighbor.isObstacle && !this.unitCanFly) {
                    continue;
                }

                if (neighbor.isTallObstacle) {
                    // Nothing can bypass a tall obstacle
                    continue;
                }

                // Elevation changes of 2 or more can be dropped down, but not climbed up
                const elevationDifference = neighbor.elevation - currentCell.elevation;
                if (elevationDifference > 1 && !this.unitCanJump && !this.unitCanFly) {
                    continue;
                }

                const isDiagonalMove = neighbor.x !== currentCell.x && neighbor.y !== currentCell.y;

                // If two obstacles are touching diagonally, the space between them can be stepped in,
                // but it can't be used to walk past the obstacles
                if (isDiagonalMove) {
                    const firstAdjacent = this.#cells[currentCell.x][neighbor.y];
                    const secondAdjacent = this.#cells[neighbor.x][currentCell.y];

                    const firstIsObstacle = firstAdjacent.isObstacle || firstAdjacent.isTallObstacle;
                    const secondIsObstacle = secondAdjacent.isObstacle || secondAdjacent.isTallObstacle;

                    if (firstIsObstacle && secondIsObstacle && !this.unitCanFly) {
                        continue;
                    }

                    if (firstAdjacent.isTallObstacle && secondAdjacent.isTallObstacle) {
                        continue;
                    }

                    // The same logic applies to elevation differences of 2+; even if you can jump, you have to
                    // go to one of the adjacent squares first, you can't move diagonally directly
                    const firstElevationDifference = firstAdjacent.elevation - currentCell.elevation;
                    const secondElevationDifference = secondAdjacent.elevation - currentCell.elevation;

                    if (firstElevationDifference >= 2 && secondElevationDifference >= 2 && !this.unitCanFly) {
                        continue;
                    }
                }

                const traversalCost = isDiagonalMove ? diagonalDistance : orthogonalDistance;
                const tentativeDistance = currentCell.distanceFromStart + traversalCost;

                if (tentativeDistance < neighbor.distanceFromStart) {
                    neighbor.distanceFromStart = tentativeDistance;
                }
            }

            unvisitedCells.remove(currentCell);

            let minCell = null;
            for (const cell of unvisitedCells) {
                if (minCell == null || cell.distanceFromStart < minCell.distanceFromStart) {
                    minCell = cell;
                }
            }

            if (minCell && !Number.isFinite(minCell.distanceFromStart)) {
                break;
            }

            currentCell = minCell;
        }
    }

    _onAbilitiesAndEffectsChanged() {
        this._markCellDistancesFromStart();
        this._queueDraw();
    }

    _onExportAsStringClicked() {
        const allCellData = this.#cells.flat().map(cell => {
            const datum = {
                x: cell.x,
                y: cell.y
            };

            if (cell.isObstacle) {
                datum.ob = true;
            }

            if (cell.isTallObstacle) {
                datum.tallOb = true;
            }

            if (cell.elevation) {
                datum.el = cell.elevation;
            }

            if (cell.isStartingCell) {
                datum.start = true;
            }

            return datum;
        })

        // Only bother exporting cells that have data other than their position
        const filteredCellData = allCellData.filter(datum => Object.keys(datum).length > 2);

        const exportData = {
            cells: filteredCellData,
            size: {
                height: this.#numCellsHigh,
                width: this.#numCellsWide
            }
        };

        const layoutName = ""; // document.getElementById("layout-name").value;
        const layoutNotes = ""; //document.getElementById("current-layout-notes").value;

        if (layoutName) {
            exportData.name = layoutName;
        }

        if (layoutNotes) {
            exportData.notes = layoutNotes;
        }

        const exportString = JSON.stringify(exportData);
        clipboard.writeText(exportString);
    }

    _onImportFromStringClicked() {
        const clipboardContents = clipboard.readText();

        let data = null;

        try {
            data = JSON.parse(clipboardContents);
        }
        catch (e) {
            console.error("JSON on clipboard is invalid", e);
            return;
        }

        if (!data.size || !data.size.width || !data.size.height || !data.cells) {
            console.error("Parsed data successfully but it appears to be invalid: ", data);
        }

        this._importCellData(data);
    }

    _onPaintModeClicked(event) {
        const allPaintModeElements = [...document.body.querySelectorAll("#movement-grid-canvas-overlay-container div[data-paint-mode]")];
        allPaintModeElements.forEach(elem => elem.classList.remove("selected"));

        event.target.classList.add("selected");
    }

    _onSetAsStartClicked() {
        if (this.#unitStartCell) {
            delete this.#unitStartCell.isStartingCell;
        }

        this.#cellOptionsMenu.targetCell.isStartingCell = true;
        this.#unitStartCell = this.#cellOptionsMenu.targetCell;

        this._markCellDistancesFromStart();
        this._closeCellOptionsMenu();
    }

    _onSetGridSizeClicked() {
        const height = +document.getElementById("grid-size-height").value;
        const width = +document.getElementById("grid-size-width").value;

        // TODO: confirmation dialog warning that data will be reset
        if (height >= 20 && width >= 20) {
            this.#numCellsHigh = height;
            this.#numCellsWide = width;

            this._initializeCells();
            this._clampTranslations();
            this._queueDraw();
        }
    }

    _paintCell(cell) {
        // Can't paint while the context menu's open
        if (this.isCellOptionsMenuOpen) {
            return;
        }

        // Can't paint obstacles on the starting cell
        if (cell.isStartingCell && this.paintMode.includes("obstacles")) {
            return;
        }

        // Each cell can only be painted once until paintedCells is reset, most likely by a mouseUp event
        if (this.#paintedCells.includes(cell)) {
            return;
        }

        // Different paint modes; each returns true if pathfinding should be updated after execution
        const paintModes = {
            "clear-obstacles": c => {
                if (!c.isObstacle && !c.isTallObstacle) {
                    return false;
                }

                c.isObstacle = false;
                c.isTallObstacle = false;
                return true;
            },

            "decrease-elevation": c => {
                if (c.elevation === 0) {
                    return false;
                }

                c.elevation--;
                return true;
            },

            "increase-elevation": c => {
                if (c.elevation >= 9) {
                    return false;
                }

                c.elevation++;
                return true;
            },

            "mark-ground-obstacles": c => {
                if (c.isObstacle && !c.isTallObstacle) {
                    return false;
                }

                c.isObstacle = true;
                c.isTallObstacle = false;
                return true;
            },

            "mark-tall-obstacles": c => {
                if (!c.isObstacle && c.isTallObstacle) {
                    return false;
                }

                c.isObstacle = false;
                c.isTallObstacle = true;
                return true;
            }
        }

        const activeMode = paintModes[this.paintMode];
        const updateNeeded = activeMode(cell);
        this.#paintedCells.push(cell);

        if (updateNeeded) {
            this._markCellDistancesFromStart();
            this._queueDraw();
        }
    }

    /**
     * Queues a draw call if needed, to limit our maximum number of draws per second for performance.
     */
    _queueDraw() {
        if (this.#drawTimeoutID === null) {
            this.#drawTimeoutID = setTimeout(this._drawGrid.bind(this), 1000 / drawFrameRate);
        }
    }

    /**
     * Shows the cell context menu next to a given cell.
     *
     * @param {Object} cellCoords An object of the form { x: Integer, y: Integer }
     */
    _showCellMenu(cellCoords) {
        const screenSpaceRect = this._calculateScreenSpaceCellRect(cellCoords);

        // Show the menu just to the right of the cell
        const left = screenSpaceRect.x + screenSpaceRect.width + 10;
        const top = screenSpaceRect.y - 10;

        this.#cellOptionsMenu.openedAtCoords = cellCoords;
        this.#cellOptionsMenu.targetCell = this.#cells[cellCoords.x][cellCoords.y];

        const hideById = (id) => {
            this.#cellOptionsMenu.querySelector("#" + id).classList.add("hidden-collapse");
        };

        // Remove menu items that aren't applicable
        if (this.#cellOptionsMenu.targetCell.isStartingCell) {
            hideById("set-as-start");
        }

        if (this.#cellOptionsMenu.targetCell.note) {
            //hideById("set-note");
        }
        else {
            //hideById("delete-note");
        }

        this.#cellOptionsMenu.style = `left: ${left}px; top: ${top}px`;
        this.#cellOptionsMenu.classList.remove("hidden-collapse");
    }

    _updateCanvasAspectRatio() {
        // Scale the height to the width, and redraw immediately instead of using the draw queue, or else
        // there will be flickering of the canvas
        this.#canvas.height = this.#canvas.width * (this.#canvas.clientHeight / this.#canvas.clientWidth);
        this._clampTranslations();
        this._drawGrid();
    }

    _updateLastCellCoords() {
        const cellCoords = this._cellCoordsFromMousePosition(this.#lastMouseXCanvasSpace, this.#lastMouseYCanvasSpace);

        if (cellCoords.x !== this.#lastCellCoords.x || cellCoords.y !== this.#lastCellCoords.y) {
            this.#lastCellCoords = cellCoords;
            return true;
        }

        return false;
    }

    // #region Getters

    get gridHeight() {
        return this.#numCellsHigh * gridSquareSize;
    }

    get gridWidth() {
        return this.#numCellsWide * gridSquareSize;
    }

    get isCellOptionsMenuOpen() {
        return !this.#cellOptionsMenu.classList.contains("hidden-collapse");
    }

    get lastMousedOverCell() {
        if (!this._areLastCellCoordsValid()) {
            return null;
        }

        return this.#cells[this.#lastCellCoords.x][this.#lastCellCoords.y];
    }

    get mobility() {
        let mobility = +this.#baseMobilityInput.value;

        mobility += this.unitHasBloodCall ? 4 : 0;
        mobility += this.unitHasCombatRush ? 2 : 0;
        mobility += this.unitHasCombatStims ? 4 : 0;

        // TODO try to confirm how flashbangs and acid stack
        mobility *= this.unitIsAcided ? 0.75 : 1;
        mobility *= this.unitIsCatchingBreath ? 0.25 : 1;
        mobility *= this.unitIsDisoriented ? 0.6 : 1;
        mobility *= this.unitIsMindfrayed ? 0.6 : 1;

        return mobility;
    }

    get paintMode() {
        const radioButton = document.body.querySelector("#movement-grid-canvas-overlay-container div[data-paint-mode].selected");

        return radioButton.dataset.paintMode;
    }

    get unitCanFly() {
        return document.getElementById("unit-can-fly").checked;
    }

    get unitCanJump() {
        return document.getElementById("unit-can-jump").checked;
    }

    get unitHasBloodCall() {
        return document.getElementById("effect-blood-call").checked;
    }

    get unitHasCombatRush() {
        return document.getElementById("effect-combat-rush").checked;
    }

    get unitHasCombatStims() {
        return document.getElementById("effect-combat-stims").checked;
    }

    get unitIsAcided() {
        return document.getElementById("effect-acid").checked;
    }

    get unitIsCatchingBreath() {
        return document.getElementById("effect-catching-breath").checked;
    }

    get unitIsDisoriented() {
        return document.getElementById("effect-flashbang").checked;
    }

    get unitIsMindfrayed() {
        return document.getElementById("effect-mindfray").checked;
    }

    // #endregion
}



export default MovementGridPage;