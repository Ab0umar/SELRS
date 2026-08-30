import * as React from 'react';

/**
 * ContextMenuItem — from selrs-ui@0.0.1.
 */
export interface ContextMenuItemProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  disabled?: boolean;
  textValue?: string;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  inset?: boolean;
  variant?: "default" | "destructive";
}

export declare const ContextMenuItem: React.ComponentType<ContextMenuItemProps>;
