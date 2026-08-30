import * as React from 'react';

/**
 * DropdownMenuGroup — from selrs-ui@0.0.1.
 */
export interface DropdownMenuGroupProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const DropdownMenuGroup: React.ComponentType<DropdownMenuGroupProps>;
