import * as React from 'react';

/**
 * DialogHeader — from selrs-ui@0.0.1.
 */
export interface DialogHeaderProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
}

export declare const DialogHeader: React.ComponentType<DialogHeaderProps>;
