import { ContextDefinition } from "jsonld/jsonld";
import { Connection, Edge, Node } from "reactflow";
import {
  FormField,
  IClassConfig,
  NodeCatalogEntry,
  ObjectProperties,
} from "./types";

const RDF_NS = "http://www.w3.org/1999/02/22-rdf-syntax-ns#";
const OWL_NS = "http://www.w3.org/2002/07/owl#";
const RDFS_NS = "http://www.w3.org/2000/01/rdf-schema#";
const IRIS_NS = "https://kg.scania.com/it/iris_orchestration/";
const CORE_NS = "http://kg.scania.com/core/";

const JSON_LD_CONTEXT: ContextDefinition = {
  rdf: RDF_NS,
  owl: OWL_NS,
  rdfs: RDFS_NS,
  iris: IRIS_NS,
  core: CORE_NS,
};

export const generateClassId = () => `${crypto.randomUUID()}`;

interface IState {
  nodes: Node[];
  edges: Edge[];
  metadata: { email: string };
}

export interface GraphData {
  "@context": ContextDefinition;
  "@graph": IClassConfig[];
}

/**
 * Generates JSON-LD payload from graph state.
 * @param state - The state containing nodes and edges.
 * @returns The JSON-LD payload.
 */
export const generateJsonLdFromState = ({
  nodes,
  edges,
  metadata,
}: IState): GraphData => {
  const findNodeFormFields = (nodeId: string): FormData => {
    const node = nodes.find((node) => node.id === nodeId);
    return node ? node.data.formData : null;
  };

  const convertFromFieldsToNodeData = (formData: FormData) => {
    const obj: any = {};
    const { className, formFields } = formData;
    obj["@type"] = ["owl:NamedIndividual", `iris:${className}`];
    formFields.forEach((formField: FormField) => {
      obj[formField.name] = { "@value": formField.value };
    });
    return obj;
  };

  // Array to hold extra nodes (e.g., ResultMetaData nodes)
  const extraNodes: any[] = [];

  const constructNodeData = (nodeId: string) => {
    const formData = findNodeFormFields(nodeId);
    if (!formData) return null;

    const nodeData = convertFromFieldsToNodeData(formData);

    if (formData.className === "Task") {
      const resultMetaDataNodeId = generateClassId();

      const resultMetaDataNode = {
        "@id": resultMetaDataNodeId,
        "@type": ["owl:NamedIndividual", "iris:ResultMetaData"],
        "rdfs:label": { "@value": "Result Metadata" },
        "iris:description": {
          "@value":
            "This instance details will be used as Metadata in resultgraph which will be used for NamedGraph security. This description details will be copied to all the ResultGraph",
        },
        "iris:title": { "@value": "" },
        "core:contributor": { "@value": metadata.email },
        "core:graphType": { "@value": "private" },
        "core:informationResponsible": {
          "@value": metadata.email,
        },
      };

      extraNodes.push(resultMetaDataNode);

      nodeData["iris:hasResultMetaData"] = {
        "@id": resultMetaDataNodeId,
      };
    }

    const outgoingEdges = edges.filter((edge) => edge.source === nodeId);

    outgoingEdges.forEach((edge) => {
      const edgeData = edge.data;
      if (edgeData) {
        for (const [key, value] of Object.entries(edgeData)) {
          if (nodeData[key]) {
            // If the property already exists, we need to handle multiple values
            if (Array.isArray(nodeData[key])) {
              nodeData[key].push(value);
            } else {
              nodeData[key] = [nodeData[key], value];
            }
          } else {
            nodeData[key] = value;
          }
        }
      }
    });

    return { ...nodeData, "@id": nodeId };
  };

  const graphData: IClassConfig[] = nodes
    .map((node) => {
      return constructNodeData(node.id);
    })
    .filter((item): item is IClassConfig => item !== null);

  graphData.push(...extraNodes);
  return {
    "@context": JSON_LD_CONTEXT,
    "@graph": graphData,
  };
};

export const getPaths = ({
  sourceNode,
  targetNode,
}: {
  sourceNode: Node | undefined;
  targetNode: Node | undefined;
}) => {
  const sourceFormData = sourceNode?.data.formData;
  const targetFormData = targetNode?.data.formData;

  if (!sourceFormData || !targetFormData) return [];

  const sourceObjectProperties: ObjectProperties[] =
    sourceFormData.objectProperties;
  const targetClassFullURI = `${IRIS_NS}${targetFormData.className}`;

  const paths = sourceObjectProperties
    .filter((obj) => {
      const classMatches = obj.className === targetClassFullURI;
      const subclassMatches = obj.subClasses.includes(targetClassFullURI);
      return classMatches || subclassMatches;
    })
    .map((item) => item.path);

  return paths;
};

/**
 * Make a connection–validator that React-Flow can consume.
 *
 * @param catalog  dictionary `entry.type  ->  NodeCatalogEntry`
 * @param nodes    current node array
 * @param edges    current edge array
 *
 * @returns  `(conn: Connection) => boolean`
 */
export const isValidConnection =
  (catalog: Record<string, NodeCatalogEntry>, nodes: Node[], edges: Edge[]) =>
  (conn: Connection): boolean => {
    const src = nodes.find((n) => n.id === conn.source);
    const dst = nodes.find((n) => n.id === conn.target);

    /* ------------------------------------------------------------------ */
    /* 0. Basic guards                                                    */
    /* ------------------------------------------------------------------ */
    if (!src || !dst) return false; // dangling end
    if (src.id === dst.id) return false; // self-loop

    const srcCat = catalog[src.data.type];
    const dstCat = catalog[dst.data.type];
    if (!srcCat || !dstCat) return false; // unknown node types

    /* ------------------------------------------------------------------ */
    /* 1. Shape compatibility                                             */
    /* ------------------------------------------------------------------ */
    const outShape = srcCat.io?.out ?? "any";
    const inShape = dstCat.io?.in ?? "any";

    if (outShape !== "any" && inShape !== "any" && outShape !== inShape) {
      return false; // “table” → “rdf” etc.
    }

    /* ------------------------------------------------------------------ */
    /* 2. Fan-out / fan-in limits                                         */
    /* ------------------------------------------------------------------ */
    const outgoing = edges.filter((e) => e.source === src.id).length;
    const incoming = edges.filter((e) => e.target === dst.id).length;

    const maxOut = srcCat.connections?.maxOutputs; // null ⇒ unlimited
    const maxIn = dstCat.connections?.maxInputs;

    if (maxOut != null && outgoing >= maxOut) return false;
    if (maxIn != null && incoming >= maxIn) return false;

    /* 3. All checks passed ✔️ */
    return true;
  };

export const setEdgeProperties = (
  defaultParams: Edge<any> | Connection,
  path: string
) => {
  const commonEdgeProps = {
    ...defaultParams,
    type: "custom-edge",
  };
  const pathName = path;
  const pathNameLabel = pathName?.split("/").pop() || "";
  if (pathName) {
    return {
      ...commonEdgeProps,
      data: {
        [pathName]: {
          "@id": defaultParams.target,
        },
      },
      label: pathNameLabel,
    };
  }
  return commonEdgeProps;
};
