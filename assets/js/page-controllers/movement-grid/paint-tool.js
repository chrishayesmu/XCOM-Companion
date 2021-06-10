import CanvasTool from "./canvas-tool.js";

import { colors, gridSquareSize } from "./shared.js";


class PaintTool extends CanvasTool {

    #clearObstacles = "clear-obstacles";
    #decreaseElevation = "decrease-elevation";
    #markGroundObstacles = "mark-ground-obstacles";
    #markTallObstacles = "mark-tall-obstacles";
    #increaseElevation = "increase-elevation";

    #paintedCells = [];

    draw(context, visibleCells, activeCell, _allCells) {
        const paintMode = this.paintMode;

        // Always filter out the active cell so it doesn't conflict with the preview we'll draw later in the frame
        const elevatedCells = visibleCells.filter(cell => cell.elevation > 0);
        const obstacleCells = visibleCells.filter(cell => cell.isObstacle);
        const tallObstacleCells = visibleCells.filter(cell => cell.isTallObstacle);

        if (paintMode === this.#clearObstacles) {
            obstacleCells.remove(activeCell);
            tallObstacleCells.remove(activeCell);
        }
        else if (paintMode === this.#markGroundObstacles) {
            tallObstacleCells.remove(activeCell);
        }
        else if (paintMode === this.#markTallObstacles) {
            obstacleCells.remove(activeCell);
        }

        this._drawObstacleCells(context, obstacleCells);
        this._drawTallObstacleCells(context, tallObstacleCells);
        this._drawElevatedCells(context, elevatedCells);
    }

    drawPreview(context, activeCell, _allCells) {
        const paintMode = this.paintMode;
        const previewAlpha = 0.75;

        if (paintMode === this.#markGroundObstacles) {
            this._drawObstacleCells(context, [ activeCell ], previewAlpha);
        }
        else if (paintMode === this.#markTallObstacles) {
            this._drawTallObstacleCells(context, [ activeCell ], previewAlpha);
        }

        return true;
    }

    mouseDown(activeCell, _cells) {
        return this._paintCell(activeCell);
    }

    mouseMove(activeCell, _cells) {
        return this._paintCell(activeCell);
    }

    mouseUp(_activeCell, _cells) {
        this.#paintedCells = [];
    }

    _drawElevatedCells(context, cells, alpha) {
        alpha = alpha || 1;

        context.save();
        context.fillStyle = "white";
        context.font = "40px sans-serif";
        context.globalAlpha = alpha;

        for (const cellData of cells) {
            context.fillText("▲ " + cellData.elevation, cellData.xPos + 15, cellData.yPos + 40);
        }

        context.restore();
    }

    _drawObstacleCells(context, cells, alpha) {
        alpha = alpha || 1;

        context.save();
        context.fillStyle = colors.obstacle;
        context.globalAlpha = alpha;

        for (const cellData of cells) {
            context.fillRect(cellData.xPos, cellData.yPos, gridSquareSize, gridSquareSize);
        }

        context.restore();

        // Now draw the X on top, to minimize context switches
        context.save();
        context.fillStyle = "#992118";
        context.globalAlpha = alpha;
        context.strokeStyle = "#992118";
        context.lineWidth = 5;
        context.font = gridSquareSize + "px sans-serif";
        context.textBaseline = "top";

        for (const cellData of cells) {
            context.strokeText("🗙", cellData.xPos, cellData.yPos);
        }

        context.restore();
    }

    _drawTallObstacleCells(context, cells, alpha) {
        alpha = alpha || 1;

        context.save();
        context.fillStyle = colors.tallObstacle;
        context.globalAlpha = alpha;

        for (const cellData of cells) {
            context.fillRect(cellData.xPos, cellData.yPos, gridSquareSize, gridSquareSize);
        }

        context.restore();

        context.save();
        context.globalAlpha = alpha;
        context.lineWidth = 5;

        for (const cellData of cells) {
            context.beginPath();

            context.moveTo(cellData.xPos, cellData.yPos);
            context.lineTo(cellData.xPos + gridSquareSize, cellData.yPos + gridSquareSize);

            context.moveTo(cellData.xPos, cellData.yPos + gridSquareSize);
            context.lineTo(cellData.xPos + gridSquareSize, cellData.yPos);

            context.moveTo(cellData.xPos, cellData.yPos + gridSquareSize / 2);
            context.lineTo(cellData.xPos + gridSquareSize, cellData.yPos + gridSquareSize / 2);

            context.moveTo(cellData.xPos + gridSquareSize / 2, cellData.yPos);
            context.lineTo(cellData.xPos + gridSquareSize / 2, cellData.yPos + gridSquareSize);

            context.stroke();
        }

        context.restore();
    }

    _paintCell(cell) {
        const paintMode = this.paintMode;

        // Can't paint obstacles on the starting cell
        if (cell.isStartingCell && this.paintMode.includes("obstacles")) {
            return false;
        }

        // Each cell can only be painted once until paintedCells is reset, most likely by a mouseUp event
        if (this.#paintedCells.includes(cell)) {
            return false;
        }

        // Different paint modes; each returns true if pathfinding should be updated after execution
        const paintModes = {};
        paintModes[this.#clearObstacles] = function(c) {
            if (!c.isObstacle && !c.isTallObstacle) {
                return false;
            }

            c.isObstacle = false;
            c.isTallObstacle = false;
            return true;
        };

        paintModes[this.#decreaseElevation] = function(c) {
            if (c.elevation === 0) {
                return false;
            }

            c.elevation--;
            return true;
        };

        paintModes[this.#increaseElevation] = function(c) {
            if (c.elevation >= 9) {
                return false;
            }

            c.elevation++;
            return true;
        };

        paintModes[this.#markGroundObstacles] = function(c) {
            if (c.isObstacle && !c.isTallObstacle) {
                return false;
            }

            c.isObstacle = true;
            c.isTallObstacle = false;
            return true;
        };

        paintModes[this.#markTallObstacles] = function(c) {
            if (!c.isObstacle && c.isTallObstacle) {
                return false;
            }

            c.isObstacle = false;
            c.isTallObstacle = true;
            return true;
        };

        const activeMode = paintModes[paintMode];
        this.#paintedCells.push(cell);
        return activeMode(cell);
    }

    get paintMode() {
        const modeSelector = document.body.querySelector("#movement-grid-canvas-overlay-container div[data-paint-mode].selected");

        return modeSelector.dataset.paintMode;
    }
}

export default PaintTool;