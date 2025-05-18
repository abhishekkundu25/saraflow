/* ------------------------------------------------------------------ */
/*  src/components/rjsfTdsTheme.tsx                                   */
/* ------------------------------------------------------------------ */
import React, { useEffect, useMemo, useState } from "react";
import {
  WidgetProps,
  FieldTemplateProps,
  ArrayFieldTemplateProps,
  ArrayFieldItemTemplateType,
  IconButtonProps,
  ErrorListProps,
  FieldProps,
  RJSFSchema,
} from "@rjsf/utils";
import {
  TdsTextField,
  TdsTextarea,
  TdsCheckbox,
  TdsDropdown,
  TdsDropdownOption,
  TdsButton,
  TdsBadge,
  // TdsDetail,
} from "@scania/tegel-react";
import CustomModal from "@/components/Modal/CustomModal";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-python"; // syntax
import "prismjs/themes/prism.css";
import { IoExpand } from "react-icons/io5";
/* ───────────────────────────── 1. BASIC WIDGETS ─────────────────── */

export const TextWidget: React.FC<WidgetProps> = ({
  id,
  label,
  value,
  required,
  disabled,
  placeholder,
  onChange,
  onBlur,
  onFocus,
  rawErrors,
}) => {
  const err = Array.isArray(rawErrors) ? rawErrors[0] : undefined;
  return (
    <TdsTextField
      id={id}
      label={label}
      label-position="outside"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      state={err ? "error" : "default"}
      helper={err}
      value={(value as string) ?? ""}
      onInput={(e) => onChange((e.target as HTMLInputElement).value)}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
    />
  );
};

export const TextareaWidget: React.FC<WidgetProps> = ({
  id,
  label,
  value,
  required,
  disabled,
  placeholder,
  onChange,
  onBlur,
  onFocus,
  rawErrors,
}) => {
  const err = Array.isArray(rawErrors) ? rawErrors[0] : undefined;
  return (
    <TdsTextarea
      id={id}
      label={label}
      label-position="outside"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      state={err ? "error" : "default"}
      helper={err}
      value={(value as string) ?? ""}
      onInput={(e) => onChange((e.target as HTMLTextAreaElement).value)}
      onBlur={() => onBlur(id, value)}
      onFocus={() => onFocus(id, value)}
    />
  );
};

export const CheckboxWidget: React.FC<WidgetProps> = ({
  id,
  label,
  value,
  required,
  disabled,
  rawErrors,
  onChange,
}) => {
  const err = Array.isArray(rawErrors) ? rawErrors[0] : undefined;
  return (
    <div style={{ marginBottom: 8 }}>
      <TdsCheckbox
        checkbox-id={id}
        checked={!!value}
        required={required}
        disabled={disabled}
        tds-aria-label={label}
        onTdsChange={(e) => onChange(e.detail.checked)}
      >
        <div slot="label">{label}</div>
      </TdsCheckbox>
      {/* {err && (
        <TdsDetail summary="Error" state="danger">
          {err}
        </TdsDetail>
      )} */}
    </div>
  );
};

const DropdownWidget: React.FC<WidgetProps> = ({
  id,
  schema,
  label,
  placeholder,
  value,
  required,
  disabled,
  rawErrors,
  options,
  onChange,
  onBlur,
  onFocus,
}) => {
  /* ---------- build option list ---------- */
  const items = useMemo(() => {
    if (Array.isArray(options.enumOptions)) {
      return options.enumOptions.map((o) => ({
        label: o.label as string,
        value: o.value as string | number | boolean,
      }));
    }
    if (Array.isArray(options.enum)) {
      const vals = options.enum as (string | number | boolean)[];
      const labels =
        Array.isArray(options.enumNames) &&
        options.enumNames.length === vals.length
          ? (options.enumNames as string[])
          : vals.map(String);
      return vals.map((v, i) => ({ value: v, label: labels[i] }));
    }
    return [];
  }, [options]);

  /* ---------- convert the Dropdown’s string back to the right type ---------- */
  const cast = (raw: string): string | number | boolean | undefined => {
    if (raw === "") return undefined; // user re-selected the blank row

    switch (schema.type) {
      case "number":
      case "integer":
        return Number(raw);
      case "boolean":
        return raw === "true";
      default:
        return raw;
    }
  };

  /* ---------- error handling & helper text ---------- */
  const err = Array.isArray(rawErrors) ? rawErrors[0] : undefined;

  /* ---------- uncontrolled: use defaultValue, remount when it changes ---------- */
  const current = value ?? "";
  const widgetKey = `${id}-${String(current)}`; // forces remount when value differs

  return (
    <TdsDropdown
      key={widgetKey}
      id={id}
      name={id}
      label={label}
      label-position="outside"
      placeholder={placeholder}
      size="sm"
      open-direction="auto"
      normalizeText={true}
      required={required}
      disabled={disabled}
      error={!!err}
      helper={err}
      defaultValue={current as string | number | undefined}
      /* Tegel events --------------------------------------------------------- */
      onTdsChange={(e) => onChange(cast(e.detail.value))}
      onTdsBlur={() => onBlur(id, current)}
      onTdsFocus={() => onFocus(id, current)}
    >
      {items.map(({ value, label }) => (
        <TdsDropdownOption key={String(value)} value={String(value)}>
          {label}
        </TdsDropdownOption>
      ))}
    </TdsDropdown>
  );
};

export default DropdownWidget;

const toString = (v: string | string[]) =>
  Array.isArray(v) ? v.join("\n") : v ?? "";

const toRjsf = (txt: string, arrayMode: boolean) =>
  arrayMode ? txt.split("\n") : txt;

const joinLines = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v.join("\n") : v ?? "";

const splitLines = (txt: string) =>
  // trim trailing blank line RJSF would validate as an empty item
  txt.replace(/\r\n/g, "\n").replace(/\n$/, "").split("\n");

const CodeEditorWidget: React.FC<WidgetProps> = ({
  id,
  label,
  value,
  required,
  disabled,
  placeholder,
  onChange,
  rawErrors,
  options = {}, // ui:options
}) => {
  /* ui:options ---------------------------------------------------- */
  const language = (options as any).language ?? "python";
  const height = (options as any).height ?? 200;
  const arrayMode = Boolean((options as any).arrayMode);

  /* local text state mirrors the prop ----------------------------- */
  const [code, setCode] = useState<string>(joinLines(value));

  /* keep local code in sync if RJSF updates the value externally -- */
  useEffect(() => {
    const incoming = joinLines(value);
    if (incoming !== code) setCode(incoming);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  /* push edits up to RJSF immediately ----------------------------- */
  const handleChange = (txt: string) => {
    setCode(txt);
    onChange(arrayMode ? splitLines(txt) : txt);
  };

  const err = Array.isArray(rawErrors) ? rawErrors[0] : undefined;

  /* ---------- inline (collapsed) editor -------------------------- */
  const inline = (
    <TdsTextarea
      id={id}
      label={label}
      label-position="outside"
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      state={err ? "error" : "default"}
      helper={err}
      value={code}
      rows={Math.round(height / 20)}
      onInput={(e) => handleChange((e.target as HTMLTextAreaElement).value)}
    />
  );

  /* ---------- full-screen modal editor --------------------------- */
  const [open, setOpen] = useState(false);

  const big = (
    <Editor
      value={code}
      onValueChange={handleChange}
      highlight={(src) =>
        Prism.highlight(
          src,
          Prism.languages[language] ?? Prism.languages.python,
          language
        )
      }
      padding={12}
      style={{
        fontFamily: "var(--tds-code-font, monospace)",
        fontSize: 14,
        border: "1px solid #e5e7eb",
        borderRadius: 4,
        minHeight: height,
        background: "#fdfdfd",
        outline: "none",
      }}
    />
  );

  /* ---------- render -------------------------------------------- */
  return (
    <div style={{ position: "relative", paddingRight: 32 }}>
      {inline}

      {!disabled && (
        <IoExpand
          size={18}
          onClick={() => setOpen(true)}
          style={{
            position: "absolute",
            top: 37,
            right: 45,
            padding: 0,
            cursor: "pointer",
          }}
        />
      )}

      <CustomModal
        isOpen={open}
        onRequestClose={() => setOpen(false)}
        width="lg"
        title={label || "Code editor"}
      >
        {big}
        <div style={{ marginTop: 16, textAlign: "right" }}>
          <TdsButton
            variant="primary"
            size="sm"
            text="Done"
            onClick={() => setOpen(false)}
          />
        </div>
      </CustomModal>
    </div>
  );
};

// export default CodeEditorWidget;
/* ───────────────────────────── 2. OBJECT-EDITOR FIELD ───────────── */

export const ObjectEditorField: React.FC<FieldProps> = ({
  formData,
  idSchema,
  onChange,
  disabled,
  required,
  rawErrors = [],
  uiSchema,
  schema,
  // label,
}) => {
  /* local text state – stringify incoming data once */
  const label =
    uiSchema?.["ui:title"] ?? (schema as RJSFSchema).title ?? name ?? "";
  const [text, setText] = useState(() =>
    JSON.stringify(formData ?? {}, null, 2)
  );
  const [parseErr, setParseErr] = useState<string | null>(null);

  /* keep textarea in sync if formData changes externally */
  useEffect(() => {
    setText(JSON.stringify(formData ?? {}, null, 2));
    setParseErr(null);
  }, [formData]);

  /* attempt to parse JSON on blur ----------------------- */
  const handleBlur = () => {
    try {
      const parsed = JSON.parse(text);
      setParseErr(null);
      onChange(parsed);
    } catch (e: any) {
      setParseErr(e.message);
    }
  };
  console.log(label, "label");
  const externalErr = Array.isArray(rawErrors) ? rawErrors[0] : undefined;
  const errorToShow = parseErr || externalErr;

  return (
    // <div style={{ marginBottom: 16 }}>
    //   {label && (
    //     <label
    //       htmlFor={idSchema.$id}
    //       style={{ display: "block", fontWeight: 500, marginBottom: 4 }}
    //     >
    //       {label}
    //       {required ? " *" : ""}
    //     </label>
    //   )}

    <TdsTextarea
      id={idSchema.$id}
      label-position="outside"
      disabled={disabled}
      // required={required}
      placeholder="Enter JSON…"
      state={errorToShow ? "error" : "default"}
      label={label}
      helper={errorToShow ?? undefined}
      value={text}
      rows={8}
      onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
      onBlur={handleBlur}
    />
    // </div>
  );
};

/* ───────────────────────────── 3. TEMPLATES & BUTTONS ───────────── */

export const FieldTemplate: React.FC<FieldTemplateProps> = ({
  children,
  hidden,
}) => (hidden ? null : <div style={{ marginBottom: 16 }}>{children}</div>);

export const ErrorListTemplate: React.FC<ErrorListProps> = ({ errors }) =>
  errors.length ? (
    <div style={{ marginBottom: 16 }}>
      <TdsBadge size="md" variant="danger" text={`Errors (${errors.length})`} />
      <ul style={{ marginTop: 4 }}>
        {errors.map((e, i) => (
          <li key={i} style={{ color: "#b91c1c" }}>
            {e.stack}
          </li>
        ))}
      </ul>
    </div>
  ) : null;

export const ArrayFieldTemplate: React.FC<ArrayFieldTemplateProps> = ({
  canAdd,
  onAddClick,
  items,
}) => (
  <div style={{ marginBottom: 16 }}>
    {items.map((it) => (
      <div key={it.index} style={{ marginBottom: 4 }}>
        {it.children}
      </div>
    ))}
    {canAdd && (
      <TdsButton
        variant="secondary"
        size="sm"
        text="Add"
        onClick={onAddClick}
      />
    )}
  </div>
);

export const ArrayFieldItemTemplate: React.FC<ArrayFieldItemTemplateType> = ({
  children,
}) => <>{children}</>;

export const SubmitButton = (p: IconButtonProps) => (
  <TdsButton text="Submit" variant="primary" {...p} />
);
export const AddButton = (p: IconButtonProps) => (
  <TdsButton text="Add" variant="secondary" size="sm" {...p} />
);
export const RemoveButton = (p: IconButtonProps) => (
  <TdsButton text="Remove" variant="danger" size="sm" {...p} />
);

/* ───────────────────────────── 4. THEME REGISTRY ───────────────── */

export const rjsfTdsTheme = {
  widgets: {
    text: TextWidget,
    textarea: TextareaWidget,
    checkbox: CheckboxWidget,
    select: DropdownWidget,
    codeEditor: CodeEditorWidget,
  },
  fields: {
    objectEditor: ObjectEditorField,
  },
  templates: {
    FieldTemplate,
    ErrorListTemplate,
    ArrayFieldTemplate,
    ArrayFieldItemTemplate,
    ButtonTemplates: {
      SubmitButton,
      AddButton,
      RemoveButton,
    },
  },
} as const;

/* ───────────────────────────── 5. USAGE ───────────────────────────

<Form
  schema={schema}
  uiSchema={{
    headers: { "ui:field": "objectEditor" },
    params:  { "ui:field": "objectEditor" }
  }}
  formData={data}
  validator={Validator}
  {...rjsfTdsTheme}
  onSubmit={({formData}) => …}
/>

-------------------------------------------------------------------- */
