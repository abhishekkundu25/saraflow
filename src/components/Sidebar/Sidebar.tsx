import React, { useState, useEffect } from "react";
import Accordion from "@/components/Accordion/Accordion";
import Tabs from "@/components/Tabs/Tabs";
import Tab from "@/components/Tabs/Tab";
import styles from "./Sidebar.module.scss";
import ClassChip from "./ClassChip";
import { NodeCatalogEntry } from "@/utils/types";

type SidebarProps = {
  graphName: string;
  graphDescription: string;
  handleOnDrag: (e: React.DragEvent<HTMLDivElement>, name: string) => void;
  highlighted: string;
  setHighlighted: (name: string) => void;
  isEditable: boolean;
  nodeCatalog: NodeCatalogEntry[];
};

const Sidebar: React.FC<SidebarProps> = ({
  graphName,
  graphDescription,
  handleOnDrag,
  highlighted,
  setHighlighted,
  isEditable,
  nodeCatalog,
}) => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<string>("source");

  // Fetch catalog entries directly from Next.js API route
  console.log(nodeCatalog);
  const categories = [
    ...Array.from(new Set(nodeCatalog.map((n) => n.category))),
  ];

  const filtered = nodeCatalog.filter((n) => {
    const okCat = activeTab === "all" || n.category === activeTab;
    const okLabel = n.label.toLowerCase().includes(search.toLowerCase());
    return okCat && okLabel;
  });

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebar__header}>
        <h3 className={styles.sidebar__primaryHeading}>{graphName}</h3>
        <p className={styles.sidebar__description}>{graphDescription}</p>
      </div>

      <tds-divider orientation="horizontal"></tds-divider>

      <div className={styles.sidebar__search}>
        <h6 className={styles.sidebar__secondaryHeading}>Search Nodes</h6>
        <tds-text-field
          class={styles["tds-text-field"]}
          placeholder="Search..."
          value={search}
          onInput={(e: any) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.sidebar__tabs}>
        <Tabs activeTab={activeTab} onTabChange={setActiveTab}>
          {categories.map((cat) => (
            <Tab key={cat} label={cat} tabKey={cat}>
              <div className={styles.sidebar__chips}>
                {filtered
                  .filter((n) => n.category === cat || cat === "all")
                  .map((n) => (
                    <ClassChip
                      key={n.type}
                      nodeType={n.type}
                      highlightedClass={{ label: n.label, type: n.category }}
                      setHighlightedClass={({ label }) => setHighlighted(label)}
                      NodeLabel={n.label}
                      handleOnDrag={handleOnDrag}
                    />
                  ))}
              </div>
            </Tab>
          ))}
        </Tabs>
      </div>
    </aside>
  );
};

export default Sidebar;
