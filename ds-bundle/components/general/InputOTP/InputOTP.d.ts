import * as React from 'react';

/**
 * InputOTP — from selrs-ui@0.0.1.
 */
export interface InputOTPProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  value?: string;
  maxLength: number;
  textAlign?: "center" | "left" | "right";
  pushPasswordManagerStrategy?: "none" | "increase-width";
  pasteTransformer?: (pasted: string) => string;
  containerClassName?: string;
  noScriptCSSFallback?: string;
  render?: (props: RenderProps) => React.ReactNode;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
}

export declare const InputOTP: React.ComponentType<InputOTPProps>;
