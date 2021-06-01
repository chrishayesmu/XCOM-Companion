const { clipboard } = require("electron");
const visData = require("vis-data");
const visNetwork = require("vis-network");

import { AppPage, PageHistoryState } from "./app-page.js";
import * as DataHelper from "../data-helper.js";
import PageManager from "../page-manager.js";
import * as Templates from "../templates.js";

const techTreeNetworkData = await fetch("assets/data/tech-tree-network-positions.json").then(response => response.json());

class TechTreeDisplayPage extends AppPage {

    static pageId = "tech-tree-display-page";

    static network;
    static treePage;

    #groupConfig = {
        aerospace: {
            color: {
                background: "#3333ff",
                edgeNormal: "#4d6193",
                edgeHover: "#9ba8ca"
            },
            font: { color: "white" }
        },
        armor: {
            color: {
                background: "#701c09",
                edgeNormal: "#94260d",
                edgeHover: "#d33612"
            },
            font: { color: "#eeeeee" }
        },
        autopsy: {
            color: {
                background: "#009999", // cyan
                edgeNormal: "#009999",
                edgeHover: "#66ffff"
            },
            font: { color: "white" }
        },
        gauss_weapons: {
            color: {
                background: "steelblue",
                edgeNormal: "steelblue",
                edgeHover: "skyblue"
            },
            font: { color: "white" }
        },
        interrogation: {
            color: {
                background: "#c74f23",
                edgeNormal: "pink",
                edgeHover: "salmon"
            },
            font: { color: "white" }
        },
        laser_weapons: {
            color: {
                background: "red",
                edgeNormal: "red",
                edgeHover: "firebrick"
            },
            font: { color: "white" }
        },
        none: {
            color: {
                background: "#666666",
                edgeNormal: "gray",
                edgeHover: "white"
            },
            font: { color: "white" }
        },
        plasma_weapons: {
            color: {
                background: "darkgreen",
                edgeNormal: "green",
                edgeHover: "lightgreen"
            },
            font: { color: "white" }
        },
        ufo: {
            color: {
                background: "darkgoldenrod" // UFO researches don't lead anywhere, so only one color needed
            },
            font: { color: "white" }
        },
        xenology: {
            color: {
                background: "#800080", // purple
                edgeNormal: "#F000F0",
                edgeHover: "#ffbdff"
            },
            font: { color: "white" }
        }
    };

    async load(_data) {
        if (TechTreeDisplayPage.treePage) {
            // Need to redraw the network after a very short delay, because on the initial load
            // it doesn't understand the viewport size and won't draw all of the nodes
            setTimeout( () => TechTreeDisplayPage.network.redraw(), 10);
            return TechTreeDisplayPage.treePage;
        }

        const isDebugMode = false;

        const graphOptions = {
            groups: this.#groupConfig,
            interaction: {
                dragNodes: isDebugMode,
                multiselect: isDebugMode,
                hover: true
            },
            layout: {
                improvedLayout: true,
                hierarchical: {
                  direction: "UD",
                  nodeSpacing: 200,
                  shakeTowards: "roots",
                  sortMethod: "directed"
                },
            }
        };

        const template = await Templates.instantiateTemplate("assets/html/templates/pages/tech-tree-display-page.html", "template-tech-tree-display-page");

        const treeContainer = template;

        if (isDebugMode) {
            template.querySelector("#tech-tree-debug-controls").classList.remove("hidden-collapse");

            graphOptions.manipulation = {
                addNode: function(nodeData, callback) {
                    nodeData.label = "";
                    nodeData.shape = "square";
                    nodeData.size = 4;
                    callback(nodeData);
                }
            };
        }

        const techNodes = [];
        const graphEdges = [];
        const nodesById = {};
        let nextEdgeId = 0;

        techTreeNetworkData.forEach( value => {
            nodesById[value.id] = value;
        });

        for (let i = 0; i < techTreeNetworkData.length; i++) {
            const nodeData = techTreeNetworkData[i];
            const isResearchNode = nodeData.id.startsWith("research");
            const tech = isResearchNode ? DataHelper.technologies[nodeData.id] : null;

            const nodeDefinition = {
                id: nodeData.id,
                group: isResearchNode ? tech.ui.group : "autopsy",
                label: isResearchNode ? tech.name : "",
                margin: 10,
                shape: "box",
                x: nodeData.x,
                y: nodeData.y
            };

            if (!isResearchNode) {
                nodeDefinition.shape = "square";
                nodeDefinition.size = isDebugMode ? 5 : 0;
            }

            techNodes.push(nodeDefinition);

            // For research nodes, go through all of their connections and create edges
            if (isResearchNode) {
                const edgeColor = graphOptions.groups[nodeDefinition.group].color.edgeNormal;
                const nodePairs = [];

                for (let j = 0; j < nodeData.edges.length; j++) {
                    nodePairs.push({
                        from: nodeData.id,
                        to: nodeData.edges[j]
                    });
                }

                while (nodePairs.length > 0) {
                    // Create an edge from this pair
                    const pair = nodePairs.pop();
                    const edgeId = nextEdgeId++;

                    graphEdges.push({
                        arrows: pair.to.startsWith("research") ? "to" : "none",
                        arrowStrikethrough: false,
                        id: edgeId,
                        from: pair.from,
                        to: pair.to,
                        hoverWidth: 0,
                        smooth: {
                            roundness: 0,
                            type: "straightCross",
                        },
                        color: edgeColor
                    });

                    // Cascade through non-research nodes; their edges also belong to the original node
                    if (!pair.to.startsWith("research")) {
                        const connectedPairs = nodesById[pair.to].edges.map( node => {
                            return {
                                from: pair.to,
                                to: node
                            }
                        });

                        nodePairs.push(...connectedPairs);
                    }
                }
            }
        }

        const graphData = {
            nodes: new visData.DataSet(techNodes),
            edges: new visData.DataSet(graphEdges)
        };

        const network = new visNetwork.Network(treeContainer, graphData, graphOptions);
        TechTreeDisplayPage.network = network;

        network.on("stabilizationIterationsDone", function() {
            network.setOptions( { layout: { hierarchical: { enabled: false } }, physics: false } );
            network.moveTo({ position: { x: -2875, y: -700}, scale: .65 });

            setTimeout(() => network.setOptions( { layout: { hierarchical: { enabled: false } }, physics: false } ), 1000);
        });

        // Disable the click-to-tech functionality in debug mode or else we'd never be able to move nodes around
        if (!isDebugMode) {
            network.on("click", this._onTechClicked.bind(this));
        }

        // Change mouse cursor to make it more clear that the nodes are links when hovering
        const networkCanvas = treeContainer.getElementsByTagName("canvas")[0];
        const changeCursor = function(cursorType) {
            networkCanvas.style.cursor = cursorType;
        };

        network.on("hoverNode", () => changeCursor("pointer"));
        network.on("blurNode", () => changeCursor("default"));

        // Research preview functionality on hover
        network.on("hoverNode", ( event => this._showTechPreview(event.node, network) ).bind(this));
        network.on("blurNode", _event => PageManager.instance.hideTooltip() );

        // Highlight entire edge trees instead of individual edges by hooking into the hover events
        network.on("hoverNode", ( event => this._highlightConnectedEdgesToNode(event.node, network) ).bind(this));
        network.on("blurNode", ( event => this._restoreConnectedEdgesToNode(event.node, network) ).bind(this));
        network.on("hoverEdge", ( event => this._highlightConnectedEdgesToEdge(event.edge, network, true) ).bind(this));
        network.on("blurEdge", ( event => this._restoreConnectedEdgesToEdge(event.edge, network, true) ).bind(this));

        // DEVELOPMENT ONLY - functionality to help move nodes around
        if (isDebugMode) {
            network.on("selectNode", function(event) {
                if (!event.nodes || event.nodes.length === 0) {
                    return;
                }

                const nodeId = event.nodes[0];
                const position = network.getPosition(nodeId);
                document.getElementById("tech-tree-current-x").textContent = position.x;
                document.getElementById("tech-tree-current-y").textContent = position.y;
            });

            template.querySelector("#tech-tree-move-button").addEventListener("click", function() {
                const selectedNodes = network.getSelectedNodes();

                if (selectedNodes.length === 0) {
                    return;
                }

                const userX = document.getElementById("tech-tree-new-x").value;
                const userY = document.getElementById("tech-tree-new-y").value;

                if (userX === "" && userY === "") {
                    return;
                }

                selectedNodes.forEach( (nodeId, _index) => {
                    const currentPosition = network.getPosition(nodeId);
                    let x = userX, y = userY;

                    if (userX === "") {
                        x = currentPosition.x;
                    }

                    if (userY === "") {
                        y = currentPosition.y;
                    }

                    network.moveNode(nodeId, x, y);
                });
            });

            template.querySelector("#tech-tree-export-button").addEventListener("click", ( () => {
                this._exportNetwork(network);
            }).bind(this));
        }

        TechTreeDisplayPage.treePage = {
            body: template,
            title: {
                icon: "assets/img/misc-icons/research.png",
                text: "Research Tree"
            }
        };

        return TechTreeDisplayPage.treePage;
    }

    _exportNetwork(network) {
        const positions = network.getPositions();
        const positionsAsArray = [];

        for (var id in positions) {
            const obj = positions[id];
            obj.id = id;
            obj.edges = network.getConnectedNodes(id, "to");

            positionsAsArray.push(obj);
        }

        var exportValue = JSON.stringify(positionsAsArray, null, 4);
        clipboard.writeText(exportValue);
    }

    /**
     * Finds all of the edges which are connected to the given edge, without going past any research nodes.
     * For example, if the edge connects two research nodes, then only the edge itself is returned; if it is one
     * of two edges between two research nodes, those edges are returned and no others; and so on.
     */
    _findConnectedEdgeTree(edgeId, network) {
        const edgesToCheck = [ edgeId ];
        const matchingEdges = [];

        // Go backwards to the owning node, and forwards to any target nodes
        let owningNode = null;
        while (edgesToCheck.length > 0) {
            edgeId = edgesToCheck.pop();
            matchingEdges.push(edgeId);

            const potentialNewEdges = [];
            const connectedNodes = network.getConnectedNodes(edgeId);

            // Don't go past any research nodes
            const fromNode = connectedNodes[0];
            if (fromNode.startsWith("research")) {
                owningNode = fromNode;
            }
            else {
                potentialNewEdges.push(... network.getConnectedEdges(fromNode));
            }

            const toNode = connectedNodes[1];
            if (!toNode.startsWith("research")) {
                potentialNewEdges.push(... network.getConnectedEdges(toNode));
            }

            for (let i = 0; i < potentialNewEdges.length; i++) {
                if (!matchingEdges.includes(potentialNewEdges[i])) {
                    edgesToCheck.push(potentialNewEdges[i]);
                }
            }
        }

        return {
            edges: matchingEdges,
            owningNode: owningNode
        }
    }

    _highlightConnectedEdgesToEdge(edgeId, network, controlRedraw) {
        const edgeData = this._findConnectedEdgeTree(edgeId, network);
        const owningNodeGroup = DataHelper.technologies[edgeData.owningNode].ui.group;
        const targetColor = this.#groupConfig[owningNodeGroup].color.edgeHover;

        // Disable redraw or else we suffer a huge performance hit as every edge update triggers a draw
        if (controlRedraw) {
            network.renderer.allowRedraw = false;
        }

        for (let i = 0; i < edgeData.edges.length; i++) {
            network.updateEdge(edgeData.edges[i], {
                color: targetColor
            });
        }

        if (controlRedraw) {
            network.renderer.allowRedraw = true;
        }
    }

    _highlightConnectedEdgesToNode(nodeId, network) {
        const startingEdges = network.getConnectedEdges(nodeId);
        network.renderer.allowRedraw = false;

        for (let i = 0; i < startingEdges.length; i++) {
            this._highlightConnectedEdgesToEdge(startingEdges[i], network);
        }

        network.renderer.allowRedraw = true;
    }

    _onTechClicked(event) {
        if (!event.nodes || event.nodes.length === 0) {
            return;
        }

        const techId = event.nodes[0];

        // It should be impossible to select the intermediate nodes, but just in case
        if (!techId.startsWith("research")) {
            return;
        }

        PageManager.instance.loadPage("tech-details-page", { techId: techId });
    }

    _restoreConnectedEdgesToEdge(edgeId, network, controlRedraw) {
        const edgeData = this._findConnectedEdgeTree(edgeId, network);
        const owningNodeGroup = DataHelper.technologies[edgeData.owningNode].ui.group;
        const targetColor = this.#groupConfig[owningNodeGroup].color.edgeNormal;

        if (controlRedraw) {
            network.renderer.allowRedraw = false;
        }

        for (let i = 0; i < edgeData.edges.length; i++) {
            network.updateEdge(edgeData.edges[i], {
                color: targetColor
            });
        }

        if (controlRedraw) {
            network.renderer.allowRedraw = true;
        }
    }

    _restoreConnectedEdgesToNode(nodeId, network) {
        const startingEdges = network.getConnectedEdges(nodeId);
        network.renderer.allowRedraw = false;

        for (let i = 0; i < startingEdges.length; i++) {
            this._restoreConnectedEdgesToEdge(startingEdges[i], network);
        }

        network.renderer.allowRedraw = true;
    }

    _showTechPreview(techId, network) {
        // Network DOM coordinates are relative to the container, so need to include its offset in the calculation
        const networkContainerRect = document.getElementById("tech-tree-content-section").getBoundingClientRect();
        const nodeBoundingBox = network.getBoundingBox(techId);

        const rectTopLeftPosition = network.canvasToDOM({
            x: nodeBoundingBox.left,
            y: nodeBoundingBox.top
        });

        const rectBottomRightPosition = network.canvasToDOM({
            x: nodeBoundingBox.right,
            y: nodeBoundingBox.bottom
        });

        const rectWidth = rectBottomRightPosition.x - rectTopLeftPosition.x;
        const rectHeight = rectBottomRightPosition.y - rectTopLeftPosition.y;

        const elementRect = new DOMRect(networkContainerRect.left + rectTopLeftPosition.x, networkContainerRect.top + rectTopLeftPosition.y, rectWidth, rectHeight);
        PageManager.instance.showPagePreviewTooltip("tech-details-page", { techId: techId }, elementRect);
    }
}

// Statically create a single instance of the tree so it can begin loading immediately, as vis.js takes a few seconds
if (!TechTreeDisplayPage.treePage) {
    const page = new TechTreeDisplayPage();
    page.load();
}

export default TechTreeDisplayPage;
