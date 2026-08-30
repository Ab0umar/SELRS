import * as React from 'react';

/**
 * SidebarMenuSubButton — from selrs-ui@0.0.1.
 */
export interface SidebarMenuSubButtonProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  asChild?: boolean;
  size?: "sm" | "md";
  isActive?: boolean;
}

export declare const SidebarMenuSubButton: React.ComponentType<SidebarMenuSubButtonProps>;
