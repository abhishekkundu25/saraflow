// components/DynamicNodeForm.tsx
import { memo, useState } from "react";
import Validator from "@rjsf/validator-ajv8";
import { Node } from "reactflow";
import Form from "@rjsf/core";

import useOfdStore from "@/store/ofdStore";
import { NodeCatalogEntry } from "@/utils/types";

// ────────────────────────────────────────────────────────────
// util: deep-clone & strip null / undefined (rjsf dislikes them)
// ────────────────────────────────────────────────────────────
function clean<T>(value: T): T {
  if (value === null || value === undefined) return {} as T;
  if (Array.isArray(value))
    // @ts-ignore – TS can’t infer this map
    return value.map((v) => clean(v));
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== null && v !== undefined) out[k] = clean(v);
    }
    return out as T;
  }
  return value;
}

interface Props {
  node: Node | null;
  /** called after user presses **Save** */
  onSubmit: (conf: Record<string, any>) => void;
}

const DynamicNodeForm = ({ node, onSubmit }: Props) => {
  // 1. nothing selected → render nothing
  if (!node) return null;

  // 2. catalogue lookup
  const catalog = useOfdStore((s) => s.catalog);
  const entry: NodeCatalogEntry | undefined = catalog[(node.data as any)?.type];

  if (!entry) {
    return (
      <p style={{ padding: 8, color: "red" }}>
        Unknown node-type “{(node.data as any)?.type}”
      </p>
    );
  }

  // 3. prepare schemas & initial data
  const schema = clean(entry.configSchema);
  // const uiSchema = clean(entry.uiSchema ?? {});
  const uiSchema = {};
  const defaults = clean(entry.defaultConf ?? {});
  const current = clean((node.data as any)?.conf ?? {});
  const initial = { ...defaults, ...current };

  // 4. keep local formData while user types
  const [formData, setFormData] = useState<Record<string, any>>(initial);

  return (
    <Form
      schema={schema}
      uiSchema={uiSchema}
      formData={formData}
      validator={Validator}
      liveValidate
      noHtml5Validate
      onChange={({ formData }) => setFormData(formData)}
      onSubmit={({ formData }) => onSubmit(formData)}
      onError={(errs) => console.warn("form validation errors", errs)}
    >
      <div style={{ textAlign: "right", marginTop: 8 }}>
        <button type="submit" className="tds-button tds-button--primary">
          Save
        </button>
      </div>
    </Form>
  );
};

export default memo(DynamicNodeForm);
