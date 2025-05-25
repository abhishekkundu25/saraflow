import type { Node } from "reactflow";
import type { ErrorObject, ValidateFunction } from "ajv";
import Ajv from "ajv/dist/2020";

import { NodeCatalogEntry } from "@/utils/types";

export type ErrorMap = Record<string, ErrorObject[]>;

const ajv = new Ajv({ allErrors: true, strict: false });

/** Cache compiled validators so we don’t re-compile on every render. */
const validatorCache = new Map<string, ValidateFunction>();

function getValidator(schema: any, type: string): ValidateFunction {
  const cached = validatorCache.get(type);
  if (cached) return cached;

  const validate = ajv.compile(schema ?? { type: "object" });
  validatorCache.set(type, validate);
  return validate;
}

/**
 * Strip keys whose value is "" or only whitespace — mirrors the
 * stripEmptyStrings helper you added earlier so list & graph
 * validation stay in sync.
 */
function pruneBlanks<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(pruneBlanks) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleaned = pruneBlanks(v);
      const isBlank =
        typeof cleaned === "string" && cleaned.trim().length === 0;
      const isEmptyObj =
        cleaned &&
        typeof cleaned === "object" &&
        !Array.isArray(cleaned) &&
        Object.keys(cleaned).length === 0;
      if (!isBlank && !isEmptyObj) out[k] = cleaned;
    }
    return out as T;
  }
  return value;
}

/**
 * Validate every node’s `data.conf` against its catalog schema.
 * @returns `{ nodeId: AjvError[] }`  — nodes without errors are omitted
 */
export function validateGraph(
  nodes: Node[],
  catalog: Record<string, NodeCatalogEntry>
): ErrorMap {
  const errorMap: ErrorMap = {};

  for (const n of nodes) {
    const entry = catalog[n.data.type];
    if (!entry) continue; // unknown node type → ignore or flag as error

    const validator = getValidator(entry.configSchema, entry.type);
    const conf = pruneBlanks(n.data.conf ?? {});

    if (!validator(conf) && validator.errors) {
      errorMap[n.id] = validator.errors;
    }
  }
  return errorMap;
}
