// components/DynamicNodeForm.tsx
import React, { memo, useState } from "react";
import Form from "@rjsf/core";
import Validator from "@rjsf/validator-ajv8";
import { Node } from "reactflow";
import styles from "./ofd.module.scss";
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
  /** called when user clicks external Save */
  onSubmit: (conf: Record<string, any>) => void;
  onClose: () => void;
}

const DynamicNodeForm = ({ node, onSubmit, onClose }: Props) => {
  if (!node) return null;

  const catalog = useOfdStore((s) => s.catalog);
  const entry: NodeCatalogEntry | undefined = catalog[(node.data as any)?.type];
  if (!entry) {
    return (
      <p style={{ padding: 8, color: "red" }}>
        Unknown node-type “{(node.data as any)?.type}”
      </p>
    );
  }

  const schema = clean(entry.configSchema);
  const uiSchema = {};
  const defaults = clean(entry.defaultConf ?? {});
  const current = clean((node.data as any)?.conf ?? {});
  const initial = { ...defaults, ...current };

  const [formData, setFormData] = useState<Record<string, any>>(initial);

  //  handle internal form submit
  const handleFormSubmit = ({ formData }: { formData: any }) => {
    onSubmit(formData);
  };

  return (
    <>
      <div className={styles["form-header"]}>
        <div className={styles.description}>
          <p className="tds-detail-06">{entry.type}</p>
        </div>
      </div>
      <article className={styles["form-body-section"]}>
        <Form
          schema={schema}
          uiSchema={uiSchema}
          formData={formData}
          validator={Validator}
          liveValidate
          noHtml5Validate
          onChange={({ formData }) => setFormData(formData)}
          onSubmit={handleFormSubmit}
          onError={(errs) => console.warn("form validation errors", errs)}
        >
          {/* no internal button */}
          <></>
        </Form>
        <section className={styles["form__action-menu"]}>
          <tds-button
            type="button"
            size="sm"
            text="Save"
            variant="primary"
            onClick={() => onSubmit(formData)}
          ></tds-button>
          <tds-button
            type="button"
            size="sm"
            variant="secondary"
            text="Close"
            onClick={onClose}
          ></tds-button>
        </section>
      </article>
    </>
  );
};

export default memo(DynamicNodeForm);
