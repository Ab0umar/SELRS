import * as React from 'react';

/**
 * SidebarMenuAction — from selrs-ui@0.0.1.
 */
export interface SidebarMenuActionProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  asChild?: boolean;
  showOnHover?: boolean;
}

export declare const SidebarMenuAction: React.ComponentType<SidebarMenuActionProps>;
