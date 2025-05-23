import { GraphBody } from "@/services/graphSchema";
import { shallow } from "zustand/shallow";
import {
  generateClassId,
  getPaths,
  isValidConnection,
  setEdgeProperties,
} from "@/utils";
import { IoSpec, NodeCatalogEntry, ObjectProperties } from "@/utils/types.js";
import axios from "axios";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "react-query";
import { Popover } from "react-tiny-popover";
import ReactFlow, {
  addEdge,
  Background,
  Connection,
  Controls,
  Edge,
  getConnectedEdges,
  Node,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import CustomEdge from "../../components/CustomEdge/CustomEdge";
import SelectionMenu from "../../components/ActionsMenu/EdgeSelectionMenu";
import CircularNode from "../../components/CircularNode.tsx";
import ClassForm from "./ClassForm";
import Sidebar from "../../components/Sidebar/Sidebar";
import styles from "./ofd.module.scss";
import { randomizeValue, captureCursorPosition } from "../../helpers/helper";
import { useToast } from "@/hooks/useToast";
import ActionToolbar from "@/components/ActionToolbar/ActionToolbar";
import ConnectionLine from "@/components/ConnectionLine/ConnectionLine";
import useOfdStore from "@/store/ofdStore";
import userPreferencesStore from "@/store/userPreferencesStore"; // Import the Zustand store
import { useConnectionValidator } from "@/hooks/useConnectionValidator";

const edgeTypes = {
  "custom-edge": CustomEdge,
};

const nodeTypes = {
  input: CircularNode,
  output: CircularNode,
  default: CircularNode,
};

interface Author {
  name: string;
  id: string;
  email: string;
}

interface ForceGraphProps {
  apiBaseUrl: string;
  author: Author;
  description?: string;
  graphName: string;
  initEdges?: Edge[];
  isEditable?: boolean;
  isDraftInitial?: boolean;
}
interface FlowNodeData {
  type: string;
  conf: Record<string, any>;
  formData?: Record<string, any>;
}

const ForceGraphComponent: React.FC<ForceGraphProps> = ({
  apiBaseUrl,
  description,
  author,
  graphName,
  initEdges,
  initNodes,
  isEditable = true,
  isDraftInitial = true,
}) => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] =
    useNodesState<FlowNodeData>(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  const { showToast } = useToast();
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const selectedNode = useOfdStore((state) => state.selectedNode);
  const setSelectedNode = useOfdStore((state) => state.setSelectedNode);
  const [highlightedClass, setHighlightedClass] = useState<{
    label: string;
    type: string;
  }>({
    label: "",
    type: "",
  });
  const router = useRouter();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const setupMode = useOfdStore((state) => state.setupMode);
  const setSetupMode = useOfdStore((state) => state.setSetupMode);
  const addConnectedEdges = useOfdStore((state) => state.addConnectedEdges);
  const clearConnectedEdges = useOfdStore((state) => state.clearConnectedEdges);
  const doubleClickToEnterSetupMode = userPreferencesStore(
    (state) => state.doubleClickToEnterSetupMode
  );
  const isGraphEditable = useOfdStore((state) => state.isGraphEditable);
  const setIsGraphEditable = useOfdStore((state) => state.setIsGraphEditable);
  const setCatalog = useOfdStore((s) => s.setCatalog);
  const catalogList = useOfdStore.getState().getCatalogList();
  const catalog = useOfdStore((s) => s.catalog, shallow);
  const [edgeSelections, setEdgeSelections] = useState<string[]>([]);
  const [connectionParams, setConnectionParams] = useState<
    Edge<any> | Connection | null
  >(null);
  const graphDescription = description;
  const [targetNodePosition, setTargetNodePosition] = useState<any>({
    x: 0,
    y: 0,
  });
  const [isDraft, setIsDraft] = useState<boolean>(isDraftInitial);
  const { validate, lastError, clearError } = useConnectionValidator(
    catalog,
    nodes,
    edges
  );
  useEffect(() => {
    fetch("http://localhost:3000/api/catalog/nodes")
      .then((res) => res.json())
      .then((data: NodeCatalogEntry[]) => setCatalog(data))
      .catch(() => console.error("Failed to load catalog"));
  }, []);
  const resetEdgeSelection = () => {
    setConnectionParams(null);
    setEdgeSelections([]);
    setTargetNodePosition({ x: 0, y: 0 });
    setIsPopoverOpen(false);
  };

  useEffect(() => {
    setIsGraphEditable(isEditable);
  }, [isEditable]);

  const onEdgeSelect = (path: string) => {
    setEdges((eds) => {
      if (!connectionParams) return;
      const edge = addEdge(setEdgeProperties(connectionParams, path), eds);
      return edge;
    });
    resetEdgeSelection();
  };

  const saveData = async (data: GraphBody) => {
    const response = await axios.post(`${apiBaseUrl}/api/persist`, data);
    return response.data;
  };

  const mutation = useMutation(saveData, {
    onSuccess: (data, variables) => {
      const { isDraft: savedAsDraft } = variables;
      showToast(
        "success",
        "Success",
        savedAsDraft
          ? "Draft has been successfully saved"
          : "Graph has been successfully saved"
      );
      setIsDraft(savedAsDraft);
    },
    onError: (error) => {
      showToast("error", "Error", "The graph could not be saved");
    },
  });
  const valFn = useMemo(
    () => isValidConnection(catalog, nodes, edges),
    [catalog, nodes, edges]
  );
  // TODO: more comprehensive shacl validation,
  // this only checks for at least one input Parameter,
  // without which leads to sdos error
  const isGraphValid = (nodes: Node[], edges: Edge[]) => {
    const taskNodes = nodes.filter((node) => node.data.label === "Task");
    const invalidTasks = taskNodes.filter((task) => {
      const taskEdges = edges.filter(
        (edge) => edge.source === task.id || edge.target === task.id
      );
      // Check if any edge has the required label for inputParameter
      return !taskEdges.some(
        (edge) =>
          edge.data &&
          edge.data[
            "https://kg.scania.com/it/iris_orchestration/inputParameter"
          ]
      );
    });
    return invalidTasks.length === 0;
  };

  const handleSaveClick = (saveType: string) => {
    let isDraftSave = false;

    if (saveType === "draft") {
      isDraftSave = true;
    }
    if (!graphName) {
      showToast("error", "Validation Error", "Graph Name should be set");
    }
    if (!isGraphValid(nodes, edges) && !isDraftSave) {
      showToast(
        "error",
        "Validation Error",
        "Task node must be connected to at least one input Parameter."
      );
      return;
    }
    const payload = {
      nodes,
      edges,
      graphName: `${graphName}`,
      description: graphDescription,
      isDraft: isDraftSave,
    };
    mutation.mutate(payload);
  };

  const handleFormSubmit = useCallback(
    (data: any) => {
      if (!selectedNode) return;
      setNodes((prevNodes) =>
        prevNodes.map((node: Node) =>
          node.id === selectedNode.id
            ? { ...node, data: { ...node.data, conf: data } }
            : node
        )
      );
    },
    [selectedNode, setNodes]
  );

  const exitSetupMode = useCallback(() => {
    setSelectedNode(null);
    setSetupMode(false);
    setHighlightedClass({ label: "", type: "" });
  }, [setSelectedNode, setSetupMode]);

  const onConnect = useCallback(
    (params: Edge<any> | Connection) => {
      // 1. Find React Flow nodes
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);
      if (!sourceNode || !targetNode) return;

      // 2. Lookup catalog entries
      const sourceEntry = catalog[sourceNode.data.type];
      const targetEntry = catalog[targetNode.data.type];

      // 3. Extract shapes (may be undefined)
      const outShape = sourceEntry?.io.out;
      const inShape = targetEntry?.io.in;

      // 4. Determine final shape label
      let shapeLabel: string;
      if (outShape && outShape !== "any") {
        shapeLabel = outShape;
      } else if (inShape && inShape !== "any") {
        shapeLabel = inShape;
      } else {
        shapeLabel = "any";
      }

      // 5. Add the edge with that label
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "custom-edge",
            label: shapeLabel,
          },
          eds
        )
      );
    },
    [nodes, setEdges]
  );

  const addToGraph = () => {
    if (!isEditable) return;
    const { width, height } = reactFlowWrapper.current.getBoundingClientRect();
    const viewport = reactFlowInstance.getViewport();
    const { x, y, zoom } = viewport;
    const position = {
      x: randomizeValue((width / 2 - x) / zoom),
      y: randomizeValue((height / 2 - y) / zoom),
    };

    setHighlightedClass({ label: "", type: "" });
  };

  const onDragOver = useCallback((event: any) => {
    if (!isEditable) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: any) => {
      if (!isEditable) {
        return;
      }
      event.preventDefault();

      // 1. Pull the node-type string from the drag data
      const type = event.dataTransfer.getData("application/reactflow");
      if (!type) {
        return;
      }

      // 2. Convert screen coords to React Flow coords
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      // console.log(catalog, "catalog");
      // 3. Find the catalog entry for this type
      const catalogEntry = catalog[type];
      if (!catalogEntry) {
        console.warn(`Dropped unknown node type: ${type}`);
        return;
      }
      const nodeTypeVisual = (io: IoSpec) => {
        if (io && io.in === undefined && io.out) {
          return "input"; // source node
        }

        if (io && io.in && io.out === undefined) {
          return "output"; // sink node
        }

        return "default"; // tr
      };
      // 4. Build a new Node object
      const newNode: Node = {
        id: generateClassId(),
        type: nodeTypeVisual(catalogEntry.io), // or use a custom nodeType if you have one per catalogEntry
        position,
        data: {
          type: catalogEntry.type,
          conf: { ...catalogEntry.defaultConf },
          icon: catalogEntry.icon,
          label: catalogEntry.label,
        },
      };
      // 5. Append it to your nodes state
      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, isEditable, setNodes, catalog]
  );
  console.log(nodes, "nodes");

  function handleClassOnDrag(e: React.DragEvent, nodeType: any) {
    e.dataTransfer.setData("application/reactflow", nodeType);
    e.dataTransfer.effectAllowed = "move";
  }

  /* 
    Set selected node on both click and drag start, same functionality
    but split into two functions due to the fact that we might want to
    have them behave differently after user-testing
  */
  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    clearConnectedEdges();
    setSelectedNode(node);
    const connectedEdges = getConnectedEdges([node], edges);
    addConnectedEdges(connectedEdges);
  };

  const handleNodeDragStart = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const handlePaneClick = () => {
    // If popover is open, close it when clicking outside popover
    setIsPopoverOpen(false);

    // De-select node when clicking outside a node, except when in setup-mode
    if (!setupMode) {
      setSelectedNode(null);
    }
  };
  const onConnectStart = () => clearError();
  const onConnectEnd = () => {
    console.log(" end end");
    const err = lastError();
    console.log(err, "error");
    if (err) showToast("error", "Invalid connection", err);
  };

  const handleExecute = () => {
    if (isDraft) {
      showToast(
        "warning",
        "Cannot Execute",
        "Cannot execute a draft. Must be saved to execute"
      );
    } else {
      if (nodes.length === 0) {
        showToast(
          "error",
          "No Nodes",
          "Cannot execute an empty flow. Please add nodes to the graph."
        );
        return;
      }

      router.push(`/executeFlow/iri/${encodeURIComponent(graphName)}`);
    }
  };

  return (
    <div className={styles.page}>
      <ActionToolbar
        graph={{
          name: graphName,
          description: description,
          isDraft: isDraft,
          author,
        }}
        toolbar
        handleExecute={handleExecute}
        handleSaveClick={handleSaveClick}
        isEditable={isEditable}
      />
      <div className={styles.page__main}>
        <Sidebar
          // setupMode={setupMode}
          graphName={graphName}
          graphDescription={graphDescription}
          selectedNode={selectedNode}
          // secondaryProperties={secondaryProperties}
          highlightedClass={highlightedClass}
          setHighlightedClass={setHighlightedClass}
          handleOnDrag={handleClassOnDrag}
          // addToGraph={addToGraph}
          // isEditable={isEditable}
          nodeCatalog={catalogList}
        />

        <section className={styles.graph__canvas}>
          <div>
            <Popover
              isOpen={isPopoverOpen}
              content={
                <SelectionMenu
                  edges={edgeSelections}
                  onEdgeSelect={onEdgeSelect}
                  onClose={() => setIsPopoverOpen(false)}
                ></SelectionMenu>
              }
              containerStyle={{
                position: "fixed",
                left: `${targetNodePosition.x}px`,
                top: `${targetNodePosition.y}px`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div />
            </Popover>
            <ReactFlowProvider>
              <div
                className="reactflow-wrapper"
                ref={reactFlowWrapper}
                style={{
                  height: "calc(100vh - 116px)",
                  position: "relative",
                }}
              >
                <ReactFlow
                  onPaneClick={handlePaneClick}
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  connectionLineComponent={ConnectionLine}
                  // isValidConnection={valFn}
                  isValidConnection={validate}
                  onConnect={onConnect}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  fitView
                  fitViewOptions={{ maxZoom: 1 }}
                  onNodeClick={handleNodeClick}
                  onConnectStart={onConnectStart}
                  onConnectEnd={onConnectEnd}
                  // Doubleclick triggers single click aswell, so we only need to enter setup-mode
                  onDoubleClick={
                    doubleClickToEnterSetupMode
                      ? () => setSetupMode(true)
                      : null
                  }
                  onNodeDragStart={handleNodeDragStart}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  nodesDraggable={isEditable}
                  nodesConnectable={isEditable}
                >
                  <Controls
                    style={{ display: "flex" }}
                    position="top-center"
                    showInteractive={false}
                  />
                  {/* @ts-ignore */}
                  <Background />
                </ReactFlow>
                {setupMode && selectedNode && (
                  <div className={styles.form}>
                    <ClassForm
                      node={selectedNode}
                      // formData={selectedNode.data?.formData}
                      onSubmit={handleFormSubmit}
                      onClose={exitSetupMode}
                      className={selectedNode?.data.label}
                      readOnly={!isEditable}
                    />
                  </div>
                )}
              </div>
            </ReactFlowProvider>
            <div className={styles["setup-button"]}>
              {selectedNode && !setupMode ? (
                <tds-button
                  type="button"
                  variant="primary"
                  size="md"
                  text="Enter Setup"
                  mode-variant="primary"
                  onClick={() => {
                    setSetupMode(true);
                    setHighlightedClass({ label: "", type: "" });
                  }}
                ></tds-button>
              ) : null}

              {setupMode ? (
                <tds-button
                  type="button"
                  variant="secondary"
                  size="md"
                  text="Leave setup"
                  mode-variant="secondary"
                  onClick={exitSetupMode}
                ></tds-button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ForceGraphComponent;
