import * as React from 'react';

/**
 * Textarea — from selrs-ui@0.0.1.
 * @replaces textarea
 */
export interface TextareaProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
}

export declare const Textarea: React.ComponentType<TextareaProps>;
