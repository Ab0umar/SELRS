import * as React from 'react';

/**
 * DropdownMenuSeparator — from selrs-ui@0.0.1.
 */
export interface DropdownMenuSeparatorProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const DropdownMenuSeparator: React.ComponentType<DropdownMenuSeparatorProps>;
