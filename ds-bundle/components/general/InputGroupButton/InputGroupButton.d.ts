import * as React from 'react';

/**
 * InputGroupButton — from selrs-ui@0.0.1.
 */
export interface InputGroupButtonProps {
  children?: React.ReactNode;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  asChild?: boolean;
  variant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost";
  size?: "sm" | "icon-sm" | "xs" | "icon-xs";
}

export declare const InputGroupButton: React.ComponentType<InputGroupButtonProps>;
