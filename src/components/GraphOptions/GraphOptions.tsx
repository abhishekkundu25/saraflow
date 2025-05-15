import { TdsButton } from "@scania/tegel-react";
import styles from "./graphOptions.module.scss";

const GraphOptions = ({ selector, graphDescription, graphName, author }) => {
  return (
    <tds-modal selector={selector} size="xs">
      <h5 className="tds-headline-05" slot="header">
        Options
      </h5>
      <div slot="body" className={styles.body}>
        <tds-text-field
          placeholder="Title"
          label="Title"
          label-position="outside"
          size="md"
          disabled
          value={graphName}
        ></tds-text-field>
        <tds-textarea
          label="Description"
          label-position="outside"
          disabled
          value={graphDescription}
        ></tds-textarea>
        <tds-text-field
          placeholder="Author"
          label="Author"
          label-position="outside"
          size="md"
          disabled
          value={author?.email}
        ></tds-text-field>
        <div style={{ marginTop: "28px" }} />
        <span slot="actions">
          <TdsButton
            size="md"
            text="Import DAG"
            type="submit"
            modeVariant="primary"
          />

          <TdsButton
            size="md"
            text="Export DAG"
            type="submit"
            modeVariant="primary"
            style={{ marginLeft: "20px" }}
          />
        </span>
      </div>
      <span slot="actions"></span>
    </tds-modal>
  );
};

export default GraphOptions;
