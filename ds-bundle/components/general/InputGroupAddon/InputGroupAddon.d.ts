import * as React from 'react';

/**
 * InputGroupAddon — from selrs-ui@0.0.1.
 */
export interface InputGroupAddonProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  align?: "inline-start" | "inline-end" | "block-start" | "block-end";
}

export declare const InputGroupAddon: React.ComponentType<InputGroupAddonProps>;
