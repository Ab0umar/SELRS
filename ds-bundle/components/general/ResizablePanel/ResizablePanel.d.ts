import * as React from 'react';

/**
 * ResizablePanel — from selrs-ui@0.0.1.
 */
export interface ResizablePanelProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  /** Panel size when collapsed; defaults to 0%. */
  collapsedSize?: string | number;
  /** This panel can be collapsed. ℹ️ A collapsible panel will collapse when it's size is less than of the specified `minSize` */
  collapsible?: boolean;
  /** Default size of Panel within its parent group; default is auto-assigned based on the total number of Panels. ⚠️ Percenta */
  defaultSize?: string | number;
  /** When disabled, a panel cannot be resized either directly or indirectly (by resizing another panel). */
  disabled?: boolean;
  /** Ref attached to the root `HTMLDivElement`. */
  elementRef?: React.Ref;
  /** How should this Panel behave if the parent Group is resized? Defaults to `preserve-relative-size`. - `preserve-relative- */
  groupResizeBehavior?: "preserve-relative-size" | "preserve-pixel-size";
  /** Maximum size of Panel within its parent group; defaults to 100%. */
  maxSize?: string | number;
  /** Minimum size of Panel within its parent group; defaults to 0%. */
  minSize?: string | number;
  /** Exposes the following imperative API: - `collapse(): void` - `expand(): void` - `getSize(): number` - `isCollapsed(): bo */
  panelRef?: React.Ref;
}

export declare const ResizablePanel: React.ComponentType<ResizablePanelProps>;
