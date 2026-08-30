import * as React from 'react';

/**
 * SidebarProvider — from selrs-ui@0.0.1.
 */
export interface SidebarProviderProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export declare const SidebarProvider: React.ComponentType<SidebarProviderProps>;
