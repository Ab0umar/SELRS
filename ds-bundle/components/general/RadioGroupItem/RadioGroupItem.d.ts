import * as React from 'react';

/**
 * RadioGroupItem — from selrs-ui@0.0.1.
 */
export interface RadioGroupItemProps {
  value: string;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  checked?: boolean;
  required?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const RadioGroupItem: React.ComponentType<RadioGroupItemProps>;
