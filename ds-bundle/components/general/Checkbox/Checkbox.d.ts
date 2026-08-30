import * as React from 'react';

/**
 * Checkbox — from selrs-ui@0.0.1.
 * @replaces input[type=checkbox]
 */
export interface CheckboxProps {
  checked?: boolean | "indeterminate";
  defaultChecked?: boolean | "indeterminate";
  required?: boolean;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Checkbox: React.ComponentType<CheckboxProps>;
