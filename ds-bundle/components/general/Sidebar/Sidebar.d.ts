import * as React from 'react';

/**
 * Sidebar — from selrs-ui@0.0.1.
 */
export interface SidebarProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "none" | "icon" | "offcanvas";
  disableTransition?: boolean;
}

export declare const Sidebar: React.ComponentType<SidebarProps>;
