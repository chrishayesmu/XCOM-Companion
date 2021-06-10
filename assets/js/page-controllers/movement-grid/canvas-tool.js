class CanvasTool {

    id = null;

    /**
     * Draws all visible cells according to the influence of this tool. For example, a tool that is used for marking
     * obstacles might draw an icon in each tile with an obstacle, and nothing at all in other tiles.
     *
     * @param {CanvasRenderingContext2D} context A drawing context to use while rendering.
     * @param {Array<Object>} visibleCells All of the cells which are visible within the current viewport.
     * @param {Object} activeCell The cell which the mouse is currently hovering over, if any.
     * @param {Array<Object>} allCells Flattened list of all cells which are present, regardless of visibility.
     */
    draw(context, visibleCells, activeCell, allCells) {
    }

    /**
     * Draws a preview of what action this tool will perform if the user clicks on the active cell.
     *
     * @param {CanvasRenderingContext2D} context A drawing context to use while rendering.
     * @param {Object} activeCell The cell which the mouse is currently hovering over, if any.
     * @param {Array<Object>} allCells Flattened list of all cells in the tile grid.
     * @returns {Boolean} True if the drawn preview should prevent the ordinary active cell highlight from being drawn.
     */
    drawPreview(context, activeCell, allCells) {
    }

    /**
     * Notifies this tool that the left mouse button has been pressed while this tool is active.
     *
     * @param {Object} activeCell The cell which the mouse is currently hovering over.
     * @param {Array<Array<Object>>} cells All cells in the tile grid.
     * @returns {Boolean} True if anything has changed such that the grid should be redrawn; false otherwise.
     */
    mouseDown(activeCell, cells) {
    }

    /**
     * Notifies this tool that the mouse has been moved while this tool is active. Specifically,
     * this function is called when the mouse enters a different cell.
     *
     * @param {Object} activeCell The cell which the mouse is now hovering over.
     * @param {Array<Array<Object>>} cells All cells in the tile grid.
     * @returns {Boolean} True if anything has changed such that the grid should be redrawn; false otherwise.
     */
    mouseMove(activeCell, cells) {
    }

    /**
     * Notifies this tool that the left mouse button has been released while this tool is active.
     *
     * @param {Object} activeCell The cell which the mouse was hovering over when released.
     * @param {Array<Array<Object>>} cells All cells in the tile grid.
     */
    mouseUp(activeCell, cells) {
    }
}

export default CanvasTool;