import * as React from 'react';

/**
 * Badge — from selrs-ui@0.0.1.
 */
export interface BadgeProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "success" | "warning";
  asChild?: boolean;
}

export declare const Badge: React.ComponentType<BadgeProps>;
