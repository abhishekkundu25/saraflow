/* eslint-disable @typescript-eslint/no-misused-promises              */
/* ────────────────────────────────────────────────────────────────────
   Execute a saved flow “graphName”                                UI
   ------------------------------------------------------------------ */

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import styles from "./ExecuteFlow.module.scss";

import Tabs from "@/components/Tabs/Tabs";
import Tab from "@/components/Tabs/Tab";

import Modal from "@/components/Modal/CustomModal";
import ExecutionLog from "@/components/ExecutionLog/ExecutionLog";
import ExecutionResult from "@/components/ExecutionResult/ExecutionResult";
import ExecutionResults from "./ExecutionResults"; // ⚠ update this file to accept { graphName }

import ActionToolbar from "@/components/ActionToolbar/ActionToolbar";
import Tooltip from "@/components/Tooltip/Tooltip";

import { TdsDropdown, TdsDropdownOption } from "@scania/tegel-react";

import { useToast } from "@/hooks/useToast";
import { useForm } from "react-hook-form";
import { isValidJson } from "@/helpers/helper";
import { Parameter as ParameterTemplate } from "@/utils/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Parameter {
  id?: string;
  name: string;
  value: string;
}

interface ExecuteProps {
  graphName: string; //  ← identifier of the flow
  baseUrl: string;
  initParameters?: Parameter[]; //  ← optional
  taskTemplate?: ParameterTemplate[]; //  ← optional
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const ExecuteFlow: React.FC<ExecuteProps> = ({
  graphName,
  baseUrl,
  initParameters = [],
  taskTemplate = [],
}) => {
  /* ───────── state ─────────────────────────────────────────────── */
  const [activeTab, setActiveTab] = useState("execution");
  const [executionType, setExecutionType] = useState<"sync" | "async">("sync");

  /* param-set management */
  const [parameters, setParameters] = useState<Parameter[]>(initParameters);
  const [selectedExecutionMethod, setSelectedExecutionMethod] = useState<
    "Create" | "Existing" | "Editing"
  >(initParameters.length ? "Existing" : "Create");
  const [selectedParameter, setSelectedParameter] = useState<Parameter | null>(
    null
  );

  /* modals */
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [executionResult, setExecutionResult] = useState("");
  const [executionLog, setExecutionLog] = useState<any[]>([]);

  /* misc */
  const [dropdownKey, setDropdownKey] = useState(0); // force-rerender tds-dropdown
  const { showToast, clearToasts } = useToast();

  /* ───────── react-hook-form for JSON textarea ─────────────────── */
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<Parameter>({
    defaultValues: {
      name: "",
      value: JSON.stringify(taskTemplate, null, 2),
    },
  });

  /* ───────── helpers ───────────────────────────────────────────── */

  /** GET all saved param-sets for this flow */
  const fetchParameters = useCallback(async () => {
    try {
      const { data } = await axios.get<Parameter[]>("/api/parameters", {
        params: { graphName },
      });
      setParameters(data);
      return data;
    } catch (e) {
      showToast("error", "Error", "Failed to fetch parameters.");
      return [];
    }
  }, [graphName]);

  /** select a parameter-set from dropdown */
  const selectParameter = (id: string) => {
    const p = parameters.find((x) => x.id === id);
    if (p) {
      setSelectedParameter(p);
      reset({ name: p.name, value: p.value });
    }
  };

  /** open log modal and fetch logs */
  const showLog = (execId: string) => async () => {
    clearToasts();
    setLogModalOpen(true);
    try {
      const { data } = await axios.get(`${baseUrl}/api/execute/logs`, {
        params: { executionId: execId },
      });
      setExecutionLog(data);
    } catch {
      /* ignore */
    }
  };

  /* ───────── side-effects ──────────────────────────────────────── */

  useEffect(() => {
    fetchParameters();
  }, [fetchParameters]);

  /* switch between Create / Existing / Editing */
  useEffect(() => {
    if (selectedExecutionMethod === "Create") {
      reset({ name: "", value: JSON.stringify(taskTemplate, null, 2) });
      setSelectedParameter(null);
    } else if (selectedExecutionMethod === "Existing" && selectedParameter) {
      reset({ name: selectedParameter.name, value: selectedParameter.value });
    }
  }, [selectedExecutionMethod, reset, selectedParameter, taskTemplate]);

  /* ───────── CRUD for parameter sets ───────────────────────────── */

  const saveParameter = async (data: Parameter) => {
    try {
      const { data: saved } = await axios.post("/api/parameter", {
        name: data.name,
        value: data.value,
        graphName,
      });
      await fetchParameters();
      showToast("success", "Saved", "Parameter saved.", 2000);
      reset({ name: "", value: JSON.stringify(taskTemplate, null, 2) });
      setSelectedExecutionMethod("Existing");
      setSelectedParameter(saved);
    } catch (e: any) {
      showToast(
        "error",
        "Error",
        e.response?.data?.error ?? "Save failed.",
        2000
      );
    }
  };

  const saveEditedParameter = async (data: Parameter) => {
    if (!selectedParameter?.id) return;
    try {
      await axios.put(
        "/api/parameter",
        { value: data.value },
        { params: { id: selectedParameter.id } }
      );
      const updated = await fetchParameters();
      setSelectedParameter(updated.find((p) => p.id === selectedParameter.id)!);
      showToast("success", "Updated", "Parameter updated.", 2000);
      setSelectedExecutionMethod("Existing");
    } catch {
      showToast("error", "Error", "Update failed.", 2000);
    }
  };

  const deleteParameter = async () => {
    if (!selectedParameter?.id) return;
    try {
      await axios.delete("/api/parameter", {
        params: { id: selectedParameter.id },
      });
      const remaining = await fetchParameters();
      showToast("success", "Deleted", "Parameter deleted.", 2000);
      if (!remaining.length) setSelectedExecutionMethod("Create");
      setSelectedParameter(null);
      setDropdownKey((k) => k + 1);
    } catch {
      showToast("error", "Error", "Delete failed.", 2000);
    }
  };

  /* ───────── EXECUTION ────────────────────────────────────────── */

  const executeGraph = async () => {
    /* we only support synchronous execution now */
    try {
      const { data } = await axios.post(`${baseUrl}/api/execute/sync`, {
        graphName,
        parameters: JSON.parse(selectedParameter?.value || "{}"),
      });
      setExecutionResult(data);
      setResultModalOpen(true);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ?? err.message ?? "Execution failed";
      const execId = err.response?.headers?.["execution-id"];
      showToast(
        "error",
        "Error",
        msg,
        3500,
        execId ? showLog(execId) : undefined
      );
    }
  };

  /* ───────── RENDER ───────────────────────────────────────────── */

  return (
    <div>
      <ActionToolbar />

      <div className={styles.main}>
        <div className={styles.headerContainer}>
          <h3 className="tds-headline-03" style={{ marginBottom: 16 }}>
            Execution flow
          </h3>

          <div className={styles.headerContainer__detailsContainer}>
            <div className="tds-detail-02">
              Flow:&nbsp;<span className="bold">{graphName}</span>
            </div>
          </div>
        </div>

        {/* ---------- TABS ---------- */}
        <div className={styles.tabs}>
          <Tabs onTabChange={setActiveTab} activeTab={activeTab}>
            {/* EXECUTION TAB ------------------------------------------------ */}
            <Tab label="Execution" tabKey="execution">
              <div className={styles.outerContentContainer}>
                <div className={styles.contentContainer}>
                  {/* choose parameter set */}
                  <h6 className="tds-headline-06">Execute parameter</h6>
                  <hr className="divider" />

                  {/* radio buttons */}
                  <div className={styles.contentContainer__parameterChoice}>
                    <tds-radio-button
                      name="method"
                      radio-id="create"
                      value="Create"
                      onClick={() => setSelectedExecutionMethod("Create")}
                      checked={selectedExecutionMethod === "Create"}
                    >
                      <div slot="label">Create new</div>
                    </tds-radio-button>

                    <tds-radio-button
                      name="method"
                      radio-id="existing"
                      value="Existing"
                      disabled={!parameters.length}
                      onClick={() =>
                        parameters.length &&
                        setSelectedExecutionMethod("Existing")
                      }
                      checked={selectedExecutionMethod !== "Create"}
                    >
                      <div slot="label">Saved sets</div>
                    </tds-radio-button>
                  </div>

                  {/* CREATE NEW ------------------------------------------------ */}
                  {selectedExecutionMethod === "Create" && (
                    <form
                      onSubmit={handleSubmit(saveParameter)}
                      className={styles.contentContainer__parameterContainer}
                    >
                      <tds-text-field
                        label="Name"
                        label-position="outside"
                        size="sm"
                        placeholder="New name"
                        helper={errors.name?.message}
                        state={errors.name ? "error" : "default"}
                        value={watch("name")}
                        onInput={(e) =>
                          setValue("name", (e.target as HTMLInputElement).value)
                        }
                        {...register("name", {
                          required: "Required",
                          pattern: {
                            value: /^[^\s!@#$%^&*()+=\[\]{};':"\\|,.<>\/?]+$/,
                            message: "No spaces / special chars",
                          },
                        })}
                      />
                      <tds-button
                        size="sm"
                        text="Save"
                        type="submit"
                        disabled={!watch("name") || !watch("value")}
                      />
                      <tds-textarea
                        rows={12}
                        label="JSON"
                        label-position="outside"
                        helper={errors.value?.message}
                        state={errors.value ? "error" : "default"}
                        value={watch("value")}
                        onInput={(e) =>
                          setValue(
                            "value",
                            (e.target as HTMLTextAreaElement).value
                          )
                        }
                        {...register("value", {
                          required: "Required",
                          validate: (v) => isValidJson(v) || "Invalid JSON",
                        })}
                      />
                    </form>
                  )}

                  {/* EXISTING or EDITING ------------------------------------- */}
                  {selectedExecutionMethod !== "Create" && (
                    <>
                      <div
                        className={styles.contentContainer__parameterContainer}
                      >
                        <TdsDropdown
                          key={dropdownKey}
                          label="Select Parameter Set"
                          label-position="outside"
                          placeholder="Select…"
                          size="sm"
                          defaultValue={selectedParameter?.id}
                          onTdsChange={(e) => selectParameter(e.detail.value)}
                        >
                          {parameters.map((p) => (
                            <TdsDropdownOption key={p.id} value={p.id}>
                              {p.name}
                            </TdsDropdownOption>
                          ))}
                        </TdsDropdown>

                        {selectedParameter && (
                          <>
                            <tds-button
                              size="sm"
                              text={
                                selectedExecutionMethod === "Editing"
                                  ? "Save"
                                  : "Edit"
                              }
                              onClick={
                                selectedExecutionMethod === "Editing"
                                  ? handleSubmit(saveEditedParameter)
                                  : () => setSelectedExecutionMethod("Editing")
                              }
                            />
                            <tds-button
                              size="sm"
                              variant="secondary"
                              text="Delete"
                              onClick={deleteParameter}
                            />
                          </>
                        )}
                      </div>

                      {/* JSON textarea */}
                      <tds-textarea
                        label="JSON"
                        rows={12}
                        label-position="outside"
                        disabled={selectedExecutionMethod !== "Editing"}
                        helper={errors.value?.message}
                        state={errors.value ? "error" : "default"}
                        value={watch("value")}
                        onInput={(e) =>
                          selectedExecutionMethod === "Editing" &&
                          setValue(
                            "value",
                            (e.target as HTMLTextAreaElement).value
                          )
                        }
                        {...(selectedExecutionMethod === "Editing"
                          ? register("value", {
                              required: "Required",
                              validate: (v) => isValidJson(v) || "Invalid JSON",
                            })
                          : {})}
                      />
                    </>
                  )}

                  {/* EXECUTE --------------------------------------------------- */}
                  {selectedParameter &&
                    selectedExecutionMethod === "Existing" && (
                      <div className={styles.footerContainer}>
                        <Tooltip
                          content="Shows the result directly"
                          direction="top"
                        >
                          <tds-radio-button
                            name="exec-type"
                            value="sync"
                            radio-id="sync"
                            onClick={() => setExecutionType("sync")}
                            checked={executionType === "sync"}
                          >
                            <div slot="label">Synchronous</div>
                          </tds-radio-button>
                        </Tooltip>

                        <tds-button text="Execute" onClick={executeGraph} />
                      </div>
                    )}
                </div>
              </div>
            </Tab>

            {/* RESULTS TAB -------------------------------------------------- */}
            <Tab label="Results" tabKey="results">
              <ExecutionResults graphName={graphName} />
            </Tab>
          </Tabs>
        </div>
      </div>

      {/* -------- result modal -------- */}
      <Modal
        isOpen={resultModalOpen}
        onRequestClose={() => setResultModalOpen(false)}
        title="Execution result"
      >
        <ExecutionResult executionResult={executionResult} />
      </Modal>

      {/* -------- log modal ---------- */}
      <Modal
        isOpen={logModalOpen}
        onRequestClose={() => setLogModalOpen(false)}
        title="Execution log"
        width="lg"
      >
        <ExecutionLog executionLog={executionLog} />
      </Modal>
    </div>
  );
};

export default ExecuteFlow;
