import * as React from 'react';

/**
 * SidebarSeparator — from selrs-ui@0.0.1.
 */
export interface SidebarSeparatorProps {
  /** Either `vertical` or `horizontal`. Defaults to `horizontal`. */
  orientation?: "horizontal" | "vertical";
  /** Whether or not the component is purely decorative. When true, accessibility-related attributes are updated so that that  */
  decorative?: boolean;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const SidebarSeparator: React.ComponentType<SidebarSeparatorProps>;
