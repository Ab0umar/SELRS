import * as React from 'react';

/**
 * SidebarMenuButton — from selrs-ui@0.0.1.
 */
export interface SidebarMenuButtonProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string | TooltipPrimitive.TooltipContentProps & React$1.RefAttributes<HTMLDivElement>;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

export declare const SidebarMenuButton: React.ComponentType<SidebarMenuButtonProps>;
