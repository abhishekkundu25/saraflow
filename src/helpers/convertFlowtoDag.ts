/* ------------------------------------------------------------- */
/*  convertFlowToDag.ts                                          */
/* ------------------------------------------------------------- */
import type { Node, Edge } from "reactflow";

type DagNode = {
  id: string;
  type: string;
  conf: Record<string, any>;
};

type DagEdge = { from: string; to: string };

export interface DagDoc {
  id: string;
  version: number;
  nodes: DagNode[];
  edges: DagEdge[];
}

/**
 * Convert React-Flow nodes / edges to execution DAG format
 */
export function convertFlowToDag(
  id: string,
  nodes: Node[],
  edges: Edge[],
  version = 1
): DagDoc {
  /* ------------------------ nodes ------------------------ */
  const dagNodes: DagNode[] = nodes.map((n) => ({
    id: n.id,
    /* `data.type` in RF  ==  `type` in DAG                  */
    type: (n.data as any)?.type,
    /* copy the entire conf object (or {})                   */
    conf: (n.data as any)?.conf ?? {},
  }));

  /* ------------------------ edges ------------------------ */
  const dagEdges: DagEdge[] = edges.map((e) => ({
    from: e.source,
    to: e.target,
  }));

  /* ------------------------ doc -------------------------- */
  return {
    id,
    version,
    nodes: dagNodes,
    edges: dagEdges,
  };
}
