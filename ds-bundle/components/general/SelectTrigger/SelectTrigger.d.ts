import * as React from 'react';

/**
 * SelectTrigger — from selrs-ui@0.0.1.
 */
export interface SelectTriggerProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  size?: "default" | "sm";
}

export declare const SelectTrigger: React.ComponentType<SelectTriggerProps>;
