// components/DynamicNodeForm.tsx
import React, { memo, useEffect, useState } from "react";
import Form, { FieldTemplateProps, WidgetProps } from "@rjsf/core";
import Validator from "@rjsf/validator-ajv8";
import { Node } from "reactflow";
import styles from "./ofd.module.scss";
import useOfdStore from "@/store/ofdStore";
import { NodeCatalogEntry } from "@/utils/types";
import { rjsfTdsTheme } from "./DynamicFormWidgets";

/**
 * Deep‑clone & strip null / undefined (RJSF dislikes them).
 */
function clean<T>(value: T): T {
  if (value === null || value === undefined) return {} as T;
  if (Array.isArray(value)) return value.map((v) => clean(v)) as unknown as T;
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== null && v !== undefined) out[k] = clean(v);
    }
    return out as T;
  }
  return value;
}

// ────────────────────────────────────────────────────────────
// Register widgets with RJSF
// const widgets = {
//   TextareaWidget,
//   TextWidget,
//   textarea: TextareaWidget,
//   text: TextWidget,
// };

// ────────────────────────────────────────────────────────────
// Suppress RJSF's default labels
const FieldTemplate = ({ children }: FieldTemplateProps) => (
  <div>{children}</div>
);

interface Props {
  node: Node | null;
  /** called when user presses the **Save** button */
  onSubmit: (conf: Record<string, any>) => void;
  onClose: () => void;
}

/**
 * Dynamic form driven by the JSON‑schema in the node‑catalog using Tegel UI.
 */
const DynamicNodeForm = ({ node, onSubmit, onClose }: Props) => {
  if (!node) return null;

  const catalog = useOfdStore((s) => s.catalog);
  const entry: NodeCatalogEntry | undefined = catalog[(node.data as any)?.type];
  if (!entry) {
    return (
      <p style={{ padding: 8, color: "red" }}>
        Unknown node‑type “{(node.data as any)?.type}”
      </p>
    );
  }

  const schema = clean(entry.configSchema);
  const uiSchema = clean(entry.uiSchema ?? {});
  function makeInitialData(n: Node | null) {
    if (!n) return {};
    const entry = catalog[n.data.type];
    const defaults = entry?.defaultConf ?? {};
    const current = n.data.conf ?? {};
    return { ...defaults, ...current };
  }

  const [formData, setFormData] = useState<Record<string, any>>(
    makeInitialData(node)
  );
  useEffect(() => {
    setFormData(makeInitialData(node));
  }, [node?.id]);
  return (
    <div className={styles.formWrapper}>
      <header className={styles.formHeader}>
        <h4 className="tds-headline-05" title={entry.label || entry.type}>
          {entry.label || entry.type}
        </h4>
        <p className="tds-detail-06" style={{ marginTop: 4 }}>
          {entry.category}
        </p>
      </header>

      <Form
        key={node.id}
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        validator={Validator}
        // widgets={widgets}
        // templates={{ FieldTemplate }}
        // validationMode="onSubmit"
        // liveValidate
        noHtml5Validate
        className={styles.rjsfForm}
        onChange={({ formData }) => setFormData(formData)}
        onSubmit={({ formData }) => onSubmit(formData)}
        onError={(errs) => console.warn("form validation errors", errs)}
        {...rjsfTdsTheme}
      >
        <footer className={styles.formActions}>
          <tds-button type="submit" size="sm" variant="primary" text="Save" />
          <tds-button
            type="button"
            size="sm"
            variant="secondary"
            text="Close"
            onClick={onClose}
          />
        </footer>
      </Form>
    </div>
  );
};

export default DynamicNodeForm;
