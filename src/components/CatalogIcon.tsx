// components/CatalogIcon.tsx
import * as FiIcons from "react-icons/fi";
import type { IconType } from "react-icons";

export interface CatalogIconProps {
  /** Icon name exactly as exported from react-icons/fi, e.g. "FiFilter" */
  name: keyof typeof FiIcons;
  size?: number | string;
  className?: string;
}

export default function CatalogIcon({
  name,
  size = 18,
  className,
}: CatalogIconProps) {
  // -------- value land ------------------------------------------------------
  const IconComponent = (FiIcons[name] ?? FiIcons.FiBox) as IconType;
  // --------------------------------------------------------------------------

  return <IconComponent size={size} className={className} />;
}
