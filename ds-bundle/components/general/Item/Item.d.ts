import * as React from 'react';

/**
 * Item — from selrs-ui@0.0.1.
 */
export interface ItemProps {
  /** Allows getting a ref to the component instance. Once the component unmounts, React will set `ref.current` to `null` (or  */
  ref?: React.Ref;
  className?: string;
  id?: string;
  style?: React$1.CSSProperties;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm";
  asChild?: boolean;
}

export declare const Item: React.ComponentType<ItemProps>;
