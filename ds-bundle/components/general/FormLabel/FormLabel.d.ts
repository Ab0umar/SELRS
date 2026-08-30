import * as React from 'react';

/**
 * FormLabel — from selrs-ui@0.0.1.
 */
export interface FormLabelProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const FormLabel: React.ComponentType<FormLabelProps>;
