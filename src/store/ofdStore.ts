// store/ofdStore.ts
import { create } from "zustand";
import { NodeCatalogEntry } from "@/utils/types";
import type { ErrorObject } from "ajv";
// ------------------------------------------------------------------
// Types
// ------------------------------------------------------------------
interface Edge {
  id: string;
}
interface Node {
  id: string;
  type: string;
}
export type ErrorMap = Record<string, ErrorObject[]>;
interface OfdStore {
  /* — graph-building state — */
  setupMode: boolean;
  setSetupMode: (v: boolean) => void;

  connectedEdgesFromNode: Edge[];
  addConnectedEdges: (e: Edge | Edge[]) => void;
  clearConnectedEdges: () => void;

  selectedNode: Node | null;
  setSelectedNode: (n: Node | null) => void;

  isGraphEditable: boolean;
  setIsGraphEditable: (v: boolean) => void;

  /* — 🔽 NEW: catalog state — */
  catalog: Record<string, NodeCatalogEntry>;
  setCatalog: (entries: NodeCatalogEntry[]) => void;
  getCatalogList: <K extends keyof NodeCatalogEntry = keyof NodeCatalogEntry>(
    pickKeys?: K[]
  ) => Pick<NodeCatalogEntry, K>[] | NodeCatalogEntry[];
  errorMap: ErrorMap;
  setErrorMap: (map: ErrorMap) => void;
  clearErrorMap: () => void;
}

// ------------------------------------------------------------------
// Store
// ------------------------------------------------------------------
const useOfdStore = create<OfdStore>((set, get) => ({
  /* graph state */
  setupMode: false,
  setSetupMode: (v) => set({ setupMode: v }),

  connectedEdgesFromNode: [],
  addConnectedEdges: (e) =>
    set((s) => ({
      connectedEdgesFromNode: [
        ...s.connectedEdgesFromNode,
        ...(Array.isArray(e) ? e : [e]),
      ],
    })),
  clearConnectedEdges: () => set({ connectedEdgesFromNode: [] }),

  selectedNode: null,
  setSelectedNode: (n) => set({ selectedNode: n }),

  isGraphEditable: false,
  setIsGraphEditable: (v) => set({ isGraphEditable: v }),

  /* catalog */
  catalog: {},

  setCatalog: (entries) =>
    set({
      catalog: Object.fromEntries(
        entries.map((entry) => [entry.type, entry] as const)
      ),
    }),
  getCatalogList: (pickKeys) => {
    const all = Object.values(get().catalog);
    if (!pickKeys) return all;

    return all.map((entry) => {
      const partial: Partial<NodeCatalogEntry> = {};
      pickKeys.forEach((key) => {
        partial[key] = entry[key];
      });
      return partial as Pick<NodeCatalogEntry, (typeof pickKeys)[number]>;
    });
  },
  errorMap: {}, // ⬅️ NEW
  setErrorMap: (map) => set({ errorMap: map }), // ⬅️ NEW
  clearErrorMap: () => set({ errorMap: {} }),
}));

export default useOfdStore;
