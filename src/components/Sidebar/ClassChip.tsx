import { NodeCatalogEntry } from "@/utils/types";
import styles from "./Sidebar.module.scss";

interface ClassChipProps {
  highlightedClass: { label: string; type: string };
  NodeLabel: string;
  connectorType: string;
  nodeType: string;
  setHighlightedClass: (highlightedClass: {
    label: string;
    type: string;
  }) => void;
  handleOnDrag: (
    event: React.DragEvent<HTMLDivElement>,
    nodeLabel: string
  ) => void;
}

const ClassChip: React.FC<ClassChipProps> = ({
  highlightedClass,
  NodeLabel,
  connectorType,
  nodeType,
  setHighlightedClass,
  handleOnDrag,
}) => {
  return (
    <div
      draggable
      key={NodeLabel}
      onClick={() =>
        setHighlightedClass({ label: NodeLabel, type: connectorType })
      }
      onDragStart={(e) => handleOnDrag(e, nodeType)}
      className={`${styles.classes__class} ${
        highlightedClass.label === NodeLabel &&
        highlightedClass.type === connectorType
          ? styles.active__chip
          : styles.inactive__chip
      }`}
    >
      <div className={styles.classes__class__content}>
        <div
          className={`${styles.classes__class__content__icon} ${
            highlightedClass.label === NodeLabel &&
            highlightedClass.type === connectorType
              ? styles.active__container
              : ""
          }`}
        >
          <tds-icon name="double_kebab" size="16px"></tds-icon>
        </div>
        <span className={styles.classes__class__content__label}>
          {NodeLabel}
        </span>
      </div>
    </div>
  );
};

export default ClassChip;
