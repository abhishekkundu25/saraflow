import { memo, useState, useEffect } from "react";
import { Popover } from "react-tiny-popover";
import { Handle, Position, useReactFlow, useKeyPress } from "reactflow";
import styles from "./CircularNode.module.scss";
import ActionsMenu from "../ActionsMenu/ActionsMenu";
import useOfdStore from "@/store/ofdStore";
import CatalogIcon from "../CatalogIcon";

export default memo((node) => {
  //@ts-ignore
  const deletePressed = useKeyPress(["Delete"]);
  const isGraphEditable = useOfdStore((state) => state.isGraphEditable);
  const { data, isConnectable, type, id } = node;
  const label = data?.type;
  const icon = data?.icon;
  const { deleteElements } = useReactFlow();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // Store
  const selectedNode = useOfdStore((state) => state.selectedNode);
  const setSelectedNode = useOfdStore((state) => state.setSelectedNode);
  const setSetupMode = useOfdStore((state) => state.setSetupMode);
  const connectedEdgesFromNode = useOfdStore(
    (state) => state.connectedEdgesFromNode
  );

  useEffect(() => {
    if (deletePressed && node.id === selectedNode?.id) {
      deleteNode();
    }
  }, [deletePressed]);

  const deleteNode = () => {
    if (isGraphEditable) {
      deleteElements({ nodes: [{ id }] });
      setSelectedNode(null);
      setSetupMode(false);
    }
    setIsPopoverOpen(false);
  };

  const disconnectNode = () => {
    deleteElements({ edges: [...connectedEdgesFromNode] });
    setIsPopoverOpen(false);
  };

  return (
    <div
      className={`${node.id === selectedNode?.id ? styles.selected : ""} 
        ${styles.container} ${styles.container__secondary}`}
    >
      <div className={styles.headingContainer}>
        <div
          data-tooltip={label}
          className={`${styles.chip} ${styles.chip__secondary}`}
        >
          {data.label}
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <CatalogIcon name={icon} className={styles.nodeIcon} />
          <Popover
            isOpen={isPopoverOpen}
            onClickOutside={() => setIsPopoverOpen(false)}
            positions={["top", "bottom", "left", "right"]} // preferred positions by priority
            content={
              <ActionsMenu
                onDeleteClick={() => deleteNode()}
                onDisconnectClick={() => disconnectNode()}
              />
            }
          >
            <div
              onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              className={styles.headingContainer__popover}
            >
              <tds-icon name="meatballs" size="20px"></tds-icon>
            </div>
          </Popover>
        </div>
      </div>
      <div data-tooltip={data.label} className={styles.labelContainer}>
        {label ? label : <span className={"opaque-35"}>Label</span>}
      </div>
      {type !== "input" && (
        <Handle
          type="target"
          position={Position.Left}
          id="a"
          isConnectable={isConnectable}
        />
      )}
      {type !== "output" && (
        <Handle
          type="source"
          position={Position.Right}
          id="a"
          isConnectable={isConnectable}
        />
      )}
    </div>
  );
});
