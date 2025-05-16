// components/DynamicNodeForm.tsx
import React, { memo, useEffect, useState } from "react";
import Form, { WidgetProps } from "@rjsf/core";
import Validator from "@rjsf/validator-ajv8";
import { Node } from "reactflow";
import styles from "./ofd.module.scss";
import useOfdStore from "@/store/ofdStore";
import { NodeCatalogEntry } from "@/utils/types";
import { TdsTextarea, TdsTextField } from "@scania/tegel-react";

/**
 * Deep‑clone & strip null / undefined (RJSF dislikes them).
 */
function clean<T>(value: T): T {
  if (value === null || value === undefined) return {} as T;
  if (Array.isArray(value))
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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

// ────────────────────────────────────────────────────────────
// Custom widgets – wrap Tegel components for RJSF
// ────────────────────────────────────────────────────────────
const TextareaWidget = ({
  id,
  value,
  required,
  disabled,
  placeholder,
  label,
  onChange,
  onBlur,
  onFocus,
  rawErrors = [],
}: WidgetProps) => {
  const hasError = rawErrors.length > 0;

  return (
    <TdsTextarea
      id={id}
      className="tds-text-field"
      label={label}
      label-position="outside"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      state={hasError ? "error" : "default"}
      helper={hasError ? rawErrors[0] : undefined}
      value={value ?? ""}
      onInput={(e: any) => onChange(e.target.value)}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
    />
  );
};

const TextWidget = ({
  id,
  value,
  required,
  disabled,
  placeholder,
  label,
  onChange,
  onBlur,
  onFocus,
  rawErrors = [],
}: WidgetProps) => {
  const hasError = rawErrors.length > 0;

  return (
    <TdsTextField
      id={id}
      className="tds-text-field"
      label={label}
      label-position="outside"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      state={hasError ? "error" : "default"}
      helper={hasError ? rawErrors[0] : undefined}
      value={value ?? ""}
      onInput={(e: any) => onChange(e.target.value)}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
    />
  );
};

// Register widgets with RJSF
const widgets = {
  TextareaWidget, // explicit override when uiSchema { "ui:widget": "TextareaWidget" }
  TextWidget, // default for string fields
  textarea: TextareaWidget, // allow shorthand
  text: TextWidget,
};

// ────────────────────────────────────────────────────────────
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
  // ───────── early‑exit ─────────────────────────────────────
  if (!node) return null;

  // ───────── catalogue lookup ───────────────────────────────
  const catalog = useOfdStore((s) => s.catalog);
  const entry: NodeCatalogEntry | undefined = catalog[(node.data as any)?.type];

  if (!entry) {
    return (
      <p style={{ padding: 8, color: "red" }}>
        Unknown node‑type “{(node.data as any)?.type}”
      </p>
    );
  }

  // ───────── prepare schema & initial data ─────────────────
  const schema = clean(entry.configSchema);
  const uiSchema = clean(entry.uiSchema ?? {});
  const defaults = clean(entry.defaultConf ?? {});
  const current = clean((node.data as any)?.conf ?? {});
  const initial = { ...defaults, ...current };

  // ───────── local form state – reset when node changes ─────
  const [formData, setFormData] = useState<Record<string, any>>(initial);
  useEffect(() => {
    setFormData(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);

  // ───────── render ─────────────────────────────────────────
  return (
    <div className={styles.formWrapper}>
      {/* ───── header */}
      <header className={styles.formHeader}>
        <h4 className="tds-headline-05" title={entry.label || entry.type}>
          {entry.label || entry.type}
        </h4>
        <p className="tds-detail-06" style={{ marginTop: 4 }}>
          {entry.category}
        </p>
      </header>

      {/* ───── body */}
      <Form
        schema={schema}
        uiSchema={uiSchema}
        formData={formData}
        validator={Validator}
        widgets={widgets}
        liveValidate
        noHtml5Validate
        className={styles.rjsfForm}
        onChange={({ formData }) => setFormData(formData)}
        onSubmit={({ formData }) => onSubmit(formData)}
        onError={(errs) => console.warn("form validation errors", errs)}
      >
        {/* internal buttons hidden – we use external action‑bar */}
        <></>
      </Form>

      {/* ───── actions */}
      <footer className={styles.formActions}>
        <tds-button
          type="button"
          size="sm"
          text="Save"
          variant="primary"
          onClick={() => onSubmit(formData)}
        />
        <tds-button
          type="button"
          size="sm"
          variant="secondary"
          text="Close"
          onClick={onClose}
        />
      </footer>
    </div>
  );
};

export default memo(DynamicNodeForm);
