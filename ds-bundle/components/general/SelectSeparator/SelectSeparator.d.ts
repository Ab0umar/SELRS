import * as React from 'react';

/**
 * SelectSeparator — from selrs-ui@0.0.1.
 */
export interface SelectSeparatorProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const SelectSeparator: React.ComponentType<SelectSeparatorProps>;
