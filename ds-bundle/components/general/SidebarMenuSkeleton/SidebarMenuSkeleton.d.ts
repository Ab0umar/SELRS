import * as React from 'react';

/**
 * SidebarMenuSkeleton — from selrs-ui@0.0.1.
 */
export interface SidebarMenuSkeletonProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  showIcon?: boolean;
}

export declare const SidebarMenuSkeleton: React.ComponentType<SidebarMenuSkeletonProps>;
