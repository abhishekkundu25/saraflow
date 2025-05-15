import { Connection, Edge, Node } from "reactflow";
import { useCallback, useRef } from "react";
import { NodeCatalogEntry } from "@/utils/types";

/**
 * Hook that returns:
 *   • validate : (conn) => boolean      – for <ReactFlow isValidConnection />
 *   • lastErr  : string | null          – why the last connection failed
 *   • clearErr : () => void             – reset after you’ve shown the message
 */
export const useConnectionValidator = (
  catalog: Record<string, NodeCatalogEntry>,
  nodes: Node[],
  edges: Edge[]
) => {
  const lastErr = useRef<string | null>(null);

  const validate = useCallback(
    (conn: Connection): boolean => {
      lastErr.current = null; // reset each call
      const src = nodes.find((n) => n.id === conn.source);
      const dst = nodes.find((n) => n.id === conn.target);

      if (!src || !dst) {
        lastErr.current = "One end of the connection is missing.";
        return false;
      }
      if (src.id === dst.id) {
        lastErr.current = "Cannot connect a node to itself.";
        return false;
      }

      const srcCat = catalog[src.data.type];
      const dstCat = catalog[dst.data.type];
      if (!srcCat || !dstCat) {
        lastErr.current = "Unknown node type.";
        return false;
      }

      /* ─ shape compatibility ─────────────────────────────── */
      const outShape = srcCat.io?.out ?? "any";
      const inShape = dstCat.io?.in ?? "any";
      if (outShape !== "any" && inShape !== "any" && outShape !== inShape) {
        lastErr.current = `Shape mismatch: “${outShape}” → “${inShape}”.`;
        return false;
      }

      /* ─ fan-in / fan-out limits ──────────────────────────── */
      const outgoing = edges.filter((e) => e.source === src.id).length;
      const incoming = edges.filter((e) => e.target === dst.id).length;
      const maxOut = srcCat.connections?.maxOutputs;
      const maxIn = dstCat.connections?.maxInputs;

      if (maxOut != null && outgoing >= maxOut) {
        lastErr.current = `“${src.data.label}” already has ${maxOut} outgoing connection(s).`;
        return false;
      }
      if (maxIn != null && incoming >= maxIn) {
        lastErr.current = `“${dst.data.label}” already has ${maxIn} incoming connection(s).`;
        return false;
      }

      /* all good */
      return true;
    },
    [catalog, nodes, edges]
  );

  return {
    validate,
    lastError: () => lastErr.current,
    clearError: () => (lastErr.current = null),
  };
};
