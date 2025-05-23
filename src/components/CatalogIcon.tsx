// components/CatalogIcon.tsx
import * as FiIcons from "react-icons/fi";
import * as FaIcons from "react-icons/fa";
import * as MdIcons from "react-icons/md";
import * as SiIcons from "react-icons/si";
import type { IconType } from "react-icons";

const iconSets: Record<string, Record<string, IconType>> = {
  Fi: FiIcons,
  Fa: FaIcons,
  Md: MdIcons,
  Si: SiIcons,
};

export interface CatalogIconProps {
  /** Icon name like "FaFileCsv", "FiFilter", "MdHome" */
  name: string;
  size?: number | string;
  className?: string;
}

export default function CatalogIcon({
  name,
  size = 18,
  className,
}: CatalogIconProps) {
  const prefix = name.slice(0, 2);
  const iconSet = iconSets[prefix] || FiIcons; // Default fallback set
  const IconComponent = (iconSet[name] ?? FiIcons.FiBox) as IconType;

  return <IconComponent size={size} className={className} />;
}
