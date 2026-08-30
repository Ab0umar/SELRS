import * as React from 'react';

/**
 * Spinner — from selrs-ui@0.0.1.
 */
export interface SpinnerProps {
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const Spinner: React.ComponentType<SpinnerProps>;
