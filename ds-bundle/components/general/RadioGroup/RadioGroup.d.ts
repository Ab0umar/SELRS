import * as React from 'react';

/**
 * RadioGroup — from selrs-ui@0.0.1.
 */
export interface RadioGroupProps {
  name?: string;
  required?: boolean;
  disabled?: boolean;
  dir?: "ltr" | "rtl";
  orientation?: "horizontal" | "vertical";
  loop?: boolean;
  defaultValue?: string;
  value?: string;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  asChild?: boolean;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const RadioGroup: React.ComponentType<RadioGroupProps>;
